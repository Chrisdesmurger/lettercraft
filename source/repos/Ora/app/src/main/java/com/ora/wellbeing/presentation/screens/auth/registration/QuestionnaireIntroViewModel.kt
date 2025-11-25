package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ora.wellbeing.data.local.RegistrationPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * ViewModel pour l'écran d'intro au questionnaire de personnalisation
 * Marque l'onboarding d'inscription comme complété avant de naviguer
 */
@HiltViewModel
class QuestionnaireIntroViewModel @Inject constructor(
    private val registrationPreferences: RegistrationPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(QuestionnaireIntroUiState())
    val uiState: StateFlow<QuestionnaireIntroUiState> = _uiState.asStateFlow()

    fun onEvent(event: QuestionnaireIntroUiEvent) {
        when (event) {
            QuestionnaireIntroUiEvent.BeginQuestionnaire -> {
                beginQuestionnaire()
            }
        }
    }

    /**
     * Marque l'onboarding d'inscription comme complété et navigue vers le questionnaire
     */
    private fun beginQuestionnaire() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                Timber.d("QuestionnaireIntroViewModel: Marking registration onboarding as completed")

                // Marquer l'onboarding d'inscription comme complété dans DataStore
                registrationPreferences.setRegistrationOnboardingCompleted()

                Timber.i("QuestionnaireIntroViewModel: Registration onboarding completed, ready to navigate")

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    navigateToQuestionnaire = true
                )
            } catch (e: Exception) {
                Timber.e(e, "QuestionnaireIntroViewModel: Error saving completion flag")
                // On continue quand même, le flag n'est pas critique
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    navigateToQuestionnaire = true
                )
            }
        }
    }
}

/**
 * UI State pour l'écran d'intro questionnaire
 */
data class QuestionnaireIntroUiState(
    val isLoading: Boolean = false,
    val navigateToQuestionnaire: Boolean = false
)

/**
 * UI Events pour l'écran d'intro questionnaire
 */
sealed class QuestionnaireIntroUiEvent {
    object BeginQuestionnaire : QuestionnaireIntroUiEvent()
}
