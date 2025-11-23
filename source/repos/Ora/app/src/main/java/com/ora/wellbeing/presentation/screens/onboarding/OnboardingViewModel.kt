package com.ora.wellbeing.presentation.screens.onboarding

import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.ora.wellbeing.BuildConfig
import com.ora.wellbeing.data.model.onboarding.InformationScreen
import com.ora.wellbeing.data.model.onboarding.OnboardingConfig
import com.ora.wellbeing.data.model.onboarding.OnboardingMetadata
import com.ora.wellbeing.data.model.onboarding.OnboardingQuestion
import com.ora.wellbeing.data.model.onboarding.UserOnboardingAnswer
import com.ora.wellbeing.data.model.onboarding.UserOnboardingResponse
import com.ora.wellbeing.data.repository.OnboardingRepository
import com.ora.wellbeing.domain.repository.InformationScreenRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Locale
import javax.inject.Inject

/**
 * ViewModel for Onboarding Flow
 * Manages question navigation, answer collection, and response persistence
 */
@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val onboardingRepository: OnboardingRepository,
    private val informationScreenRepository: InformationScreenRepository,
    private val userProfileRepository: com.ora.wellbeing.domain.repository.FirestoreUserProfileRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    private var config: OnboardingConfig? = null
    private var startTime: Long = 0L
    private val answers = mutableMapOf<String, UserOnboardingAnswer>()

    init {
        loadOnboardingConfig()
    }

    fun onEvent(event: OnboardingUiEvent) {
        when (event) {
            OnboardingUiEvent.StartOnboarding -> startOnboarding()
            OnboardingUiEvent.NextQuestion -> moveToNextQuestion()
            OnboardingUiEvent.PreviousQuestion -> moveToPreviousQuestion()
            is OnboardingUiEvent.AnswerQuestion -> answerCurrentQuestion(event.selectedOptions, event.textAnswer)
            OnboardingUiEvent.SkipQuestion -> skipCurrentQuestion()
            OnboardingUiEvent.CompleteOnboarding -> completeOnboarding()
            OnboardingUiEvent.RetryLoad -> loadOnboardingConfig()
            OnboardingUiEvent.ContinueFromInformationScreen -> continueFromInformationScreen()
        }
    }

    private fun loadOnboardingConfig() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            onboardingRepository.getActiveOnboardingConfig()
                .onSuccess { loadedConfig ->
                    config = loadedConfig
                    val sortedQuestions = loadedConfig.questions.sortedBy { it.order }

                    _uiState.value = OnboardingUiState(
                        isLoading = false,
                        config = loadedConfig,
                        questions = sortedQuestions,
                        currentQuestionIndex = 0,
                        totalQuestions = sortedQuestions.size,
                        isComplete = false
                    )

                    Timber.d("Onboarding config loaded: ${sortedQuestions.size} questions")
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = "Impossible de charger le questionnaire : ${error.message}"
                    )
                    Timber.e(error, "Failed to load onboarding config")
                }
        }
    }

    private fun startOnboarding() {
        val uid = auth.currentUser?.uid ?: run {
            _uiState.value = _uiState.value.copy(error = "Vous devez être connecté")
            return
        }

        val configVersion = config?.id ?: run {
            _uiState.value = _uiState.value.copy(error = "Configuration non chargée")
            return
        }

        startTime = System.currentTimeMillis()

        viewModelScope.launch {
            onboardingRepository.startOnboarding(uid, configVersion)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(hasStarted = true)
                    Timber.d("Onboarding started for user $uid")

                    // Phase 3: Load information screens for first question (position 0)
                    loadInformationScreensForCurrentPosition()
                }
                .onFailure { error ->
                    Timber.e(error, "Failed to start onboarding")
                }
        }
    }

    private fun answerCurrentQuestion(selectedOptions: List<String>, textAnswer: String?) {
        val currentQuestion = getCurrentQuestion() ?: return
        val currentState = _uiState.value

        // Create answer
        val answer = UserOnboardingAnswer(
            questionId = currentQuestion.id,
            selectedOptions = selectedOptions,
            textAnswer = textAnswer,
            answeredAt = Timestamp.now()
        )

        answers[currentQuestion.id] = answer

        // Update state with new answer
        val updatedAnswers = currentState.currentAnswers.toMutableMap()
        updatedAnswers[currentQuestion.id] = selectedOptions

        _uiState.value = currentState.copy(
            currentAnswers = updatedAnswers,
            canProceed = validateAnswer(currentQuestion, selectedOptions, textAnswer)
        )

        Timber.d("Question ${currentQuestion.id} answered with ${selectedOptions.size} options")
    }

    private fun validateAnswer(
        question: OnboardingQuestion,
        selectedOptions: List<String>,
        textAnswer: String?
    ): Boolean {
        if (!question.required) return true

        return when (question.type.toKind()) {
            com.ora.wellbeing.data.model.onboarding.QuestionTypeKind.TEXT_INPUT -> {
                !textAnswer.isNullOrBlank()
            }
            else -> {
                selectedOptions.isNotEmpty()
            }
        }
    }

    private fun moveToNextQuestion() {
        val currentState = _uiState.value
        if (currentState.currentQuestionIndex < currentState.totalQuestions - 1) {
            val nextIndex = currentState.currentQuestionIndex + 1

            // Phase 3: Load information screens for next position FIRST (before changing index)
            // This prevents the next question from briefly flashing before showing info screens
            val configId = config?.id
            if (configId != null) {
                viewModelScope.launch {
                    // Build user responses map for conditional screen evaluation
                    val userResponses = answers.mapValues { (_, answer) ->
                        answer.selectedOptions.firstOrNull() ?: answer.textAnswer ?: ""
                    }

                    informationScreenRepository.getScreensForPosition(
                        configId = configId,
                        position = nextIndex,
                        userResponses = userResponses
                    )
                        .onSuccess { screens ->
                            if (screens.isNotEmpty()) {
                                // There are information screens, update state with both new index AND screens
                                _uiState.value = currentState.copy(
                                    currentQuestionIndex = nextIndex,
                                    canProceed = isQuestionAnswered(nextIndex),
                                    currentInformationScreens = screens,
                                    currentInformationScreenIndex = 0,
                                    showingInformationScreen = true
                                )
                                Timber.d("Moved to question $nextIndex with ${screens.size} information screens")
                            } else {
                                // No information screens, just move to next question
                                _uiState.value = currentState.copy(
                                    currentQuestionIndex = nextIndex,
                                    canProceed = isQuestionAnswered(nextIndex),
                                    showingInformationScreen = false,
                                    currentInformationScreens = emptyList()
                                )
                                Timber.d("Moved to question $nextIndex (no information screens)")
                            }
                        }
                        .onFailure { error ->
                            Timber.e(error, "Failed to load information screens for position $nextIndex")
                            // Continue to question on error
                            _uiState.value = currentState.copy(
                                currentQuestionIndex = nextIndex,
                                canProceed = isQuestionAnswered(nextIndex),
                                showingInformationScreen = false,
                                currentInformationScreens = emptyList()
                            )
                        }
                }
            } else {
                // No config ID, just move to next question
                _uiState.value = currentState.copy(
                    currentQuestionIndex = nextIndex,
                    canProceed = isQuestionAnswered(nextIndex)
                )
                Timber.d("Moved to question $nextIndex (no config)")
            }
        }
    }

    private fun moveToPreviousQuestion() {
        val currentState = _uiState.value
        if (currentState.currentQuestionIndex > 0) {
            val prevIndex = currentState.currentQuestionIndex - 1
            _uiState.value = currentState.copy(
                currentQuestionIndex = prevIndex,
                canProceed = isQuestionAnswered(prevIndex)
            )
            Timber.d("Moved back to question $prevIndex")
        }
    }

    private fun skipCurrentQuestion() {
        val currentQuestion = getCurrentQuestion() ?: return
        if (!currentQuestion.required) {
            moveToNextQuestion()
        }
    }

    private fun completeOnboarding() {
        val uid = auth.currentUser?.uid ?: run {
            _uiState.value = _uiState.value.copy(error = "Vous devez être connecté")
            return
        }

        val configVersion = config?.id ?: run {
            _uiState.value = _uiState.value.copy(error = "Configuration non chargée")
            return
        }

        _uiState.value = _uiState.value.copy(isSaving = true)

        val totalTimeSeconds = ((System.currentTimeMillis() - startTime) / 1000).toInt()

        val response = UserOnboardingResponse(
            uid = uid,
            configVersion = configVersion,
            completed = true,
            completedAt = Timestamp.now(),
            startedAt = Timestamp(startTime / 1000, 0),
            answers = answers.values.toList(),
            metadata = OnboardingMetadata(
                deviceType = "Android ${Build.VERSION.RELEASE}",
                appVersion = BuildConfig.VERSION_NAME,
                totalTimeSeconds = totalTimeSeconds,
                locale = Locale.getDefault().language
            )
        )

        viewModelScope.launch {
            onboardingRepository.saveUserOnboardingResponse(uid, response)
                .onSuccess {
                    // Update user profile to mark onboarding as completed
                    viewModelScope.launch {
                        userProfileRepository.getUserProfile(uid).collect { profile ->
                            profile?.let {
                                it.hasCompletedOnboarding = true
                                userProfileRepository.updateUserProfile(it)
                            }
                        }
                    }
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        isComplete = true
                    )
                    Timber.d("Onboarding completed successfully for user $uid")
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        error = "Erreur lors de la sauvegarde : ${error.message}"
                    )
                    Timber.e(error, "Failed to save onboarding response")
                }
        }
    }

    private fun getCurrentQuestion(): OnboardingQuestion? {
        val currentState = _uiState.value
        return currentState.questions.getOrNull(currentState.currentQuestionIndex)
    }

    private fun isQuestionAnswered(index: Int): Boolean {
        val question = _uiState.value.questions.getOrNull(index) ?: return false
        val answer = answers[question.id]

        if (!question.required) return true

        return answer != null && when (question.type.toKind()) {
            com.ora.wellbeing.data.model.onboarding.QuestionTypeKind.TEXT_INPUT -> {
                !answer.textAnswer.isNullOrBlank()
            }
            else -> {
                answer.selectedOptions.isNotEmpty()
            }
        }
    }

    fun getProgress(): Float {
        val currentState = _uiState.value
        if (currentState.totalQuestions == 0) return 0f
        return (currentState.currentQuestionIndex + 1) / currentState.totalQuestions.toFloat()
    }

    /**
     * Phase 3: Load information screens for current position
     * Checks if there are information screens to display before the current question
     */
    private fun loadInformationScreensForCurrentPosition() {
        val configId = config?.id ?: return
        val currentState = _uiState.value
        val position = currentState.currentQuestionIndex

        viewModelScope.launch {
            // Build user responses map for conditional screen evaluation
            val userResponses = answers.mapValues { (_, answer) ->
                answer.selectedOptions.firstOrNull() ?: answer.textAnswer ?: ""
            }

            informationScreenRepository.getScreensForPosition(
                configId = configId,
                position = position,
                userResponses = userResponses
            )
                .onSuccess { screens ->
                    if (screens.isNotEmpty()) {
                        _uiState.value = currentState.copy(
                            currentInformationScreens = screens,
                            currentInformationScreenIndex = 0,
                            showingInformationScreen = true
                        )
                        Timber.d("Loaded ${screens.size} information screens for position $position")
                    } else {
                        // No information screens, show question directly
                        _uiState.value = currentState.copy(
                            currentInformationScreens = emptyList(),
                            showingInformationScreen = false
                        )
                    }
                }
                .onFailure { error ->
                    Timber.e(error, "Failed to load information screens for position $position")
                    // Continue to question on error
                    _uiState.value = currentState.copy(
                        currentInformationScreens = emptyList(),
                        showingInformationScreen = false
                    )
                }
        }
    }

    /**
     * Phase 3: Handle continue from information screen
     * Either show next information screen OR proceed to question
     */
    private fun continueFromInformationScreen() {
        val currentState = _uiState.value

        if (currentState.hasMoreInformationScreens) {
            // Show next information screen
            _uiState.value = currentState.copy(
                currentInformationScreenIndex = currentState.currentInformationScreenIndex + 1
            )
            Timber.d("Moved to information screen ${currentState.currentInformationScreenIndex + 1}")
        } else {
            // All information screens viewed, show question
            _uiState.value = currentState.copy(
                showingInformationScreen = false,
                currentInformationScreens = emptyList(),
                currentInformationScreenIndex = 0
            )
            Timber.d("Finished viewing information screens, showing question ${currentState.currentQuestionIndex}")
        }
    }
}

/**
 * UI State for Onboarding
 */
data class OnboardingUiState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val hasStarted: Boolean = false,
    val isComplete: Boolean = false,
    val error: String? = null,
    val config: OnboardingConfig? = null,
    val questions: List<OnboardingQuestion> = emptyList(),
    val currentQuestionIndex: Int = 0,
    val totalQuestions: Int = 0,
    val currentAnswers: Map<String, List<String>> = emptyMap(),
    val canProceed: Boolean = false,
    // Phase 3: Information screens state
    val currentInformationScreens: List<InformationScreen> = emptyList(),
    val currentInformationScreenIndex: Int = 0,
    val showingInformationScreen: Boolean = false
) {
    val currentQuestion: OnboardingQuestion?
        get() = questions.getOrNull(currentQuestionIndex)

    val currentInformationScreen: InformationScreen?
        get() = currentInformationScreens.getOrNull(currentInformationScreenIndex)

    val isFirstQuestion: Boolean
        get() = currentQuestionIndex == 0

    val isLastQuestion: Boolean
        get() = currentQuestionIndex == totalQuestions - 1

    val hasMoreInformationScreens: Boolean
        get() = currentInformationScreenIndex < currentInformationScreens.size - 1

    val progressPercentage: Int
        get() = if (totalQuestions > 0) {
            ((currentQuestionIndex + 1) * 100 / totalQuestions)
        } else 0
}

/**
 * UI Events for Onboarding
 */
sealed class OnboardingUiEvent {
    object StartOnboarding : OnboardingUiEvent()
    object NextQuestion : OnboardingUiEvent()
    object PreviousQuestion : OnboardingUiEvent()
    data class AnswerQuestion(
        val selectedOptions: List<String>,
        val textAnswer: String? = null
    ) : OnboardingUiEvent()
    object SkipQuestion : OnboardingUiEvent()
    object CompleteOnboarding : OnboardingUiEvent()
    object RetryLoad : OnboardingUiEvent()
    // Phase 3: Information screen events
    object ContinueFromInformationScreen : OnboardingUiEvent()
}
