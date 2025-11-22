package com.ora.wellbeing.presentation.screens.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ora.wellbeing.data.model.onboarding.AnswerOption
import com.ora.wellbeing.data.model.onboarding.OnboardingQuestion
import com.ora.wellbeing.data.model.onboarding.QuestionTypeKind

/**
 * Main Onboarding Screen
 * Displays questions one by one with progress indicator
 */
@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    // Navigate on completion
    LaunchedEffect(uiState.isComplete) {
        if (uiState.isComplete) {
            onComplete()
        }
    }

    // Show errors
    LaunchedEffect(uiState.error) {
        uiState.error?.let { error ->
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Short
            )
        }
    }

    // Auto-start when loaded
    LaunchedEffect(uiState.config) {
        if (uiState.config != null && !uiState.hasStarted) {
            viewModel.onEvent(OnboardingUiEvent.StartOnboarding)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                uiState.isLoading -> {
                    OnboardingLoadingScreen()
                }
                uiState.config == null -> {
                    OnboardingErrorScreen(
                        error = uiState.error ?: "Impossible de charger le questionnaire",
                        onRetry = { viewModel.onEvent(OnboardingUiEvent.RetryLoad) }
                    )
                }
                else -> {
                    OnboardingQuestionnaireContent(
                        uiState = uiState,
                        onEvent = viewModel::onEvent,
                        progress = viewModel.getProgress()
                    )
                }
            }
        }
    }
}

@Composable
fun OnboardingLoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = "Préparation de votre questionnaire...",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
fun OnboardingErrorScreen(
    error: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "⚠️",
                style = MaterialTheme.typography.displayLarge
            )
            Text(
                text = error,
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
            )
            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Text("Réessayer")
            }
        }
    }
}

@Composable
fun OnboardingQuestionnaireContent(
    uiState: OnboardingUiState,
    onEvent: (OnboardingUiEvent) -> Unit,
    progress: Float
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Progress bar
        LinearProgressIndicator(
            progress = progress,
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp),
            color = MaterialTheme.colorScheme.primary,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )

        // Progress text
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Question ${uiState.currentQuestionIndex + 1} sur ${uiState.totalQuestions}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
            Text(
                text = "${uiState.progressPercentage}%",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        // Content with animation: either information screen OR question
        AnimatedContent(
            targetState = uiState.showingInformationScreen,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            transitionSpec = {
                fadeIn() togetherWith fadeOut()
            },
            label = "content_transition"
        ) { showingInfoScreen ->
            if (showingInfoScreen) {
                // Phase 3: Show information screen
                uiState.currentInformationScreen?.let { informationScreen ->
                    InformationScreenUI(
                        informationScreen = informationScreen,
                        onContinue = { onEvent(OnboardingUiEvent.ContinueFromInformationScreen) }
                    )
                }
            } else {
                // Show question
                AnimatedContent(
                    targetState = uiState.currentQuestionIndex,
                    modifier = Modifier.fillMaxSize(),
                    transitionSpec = {
                        if (targetState > initialState) {
                            slideInHorizontally { width -> width } + fadeIn() togetherWith
                                    slideOutHorizontally { width -> -width } + fadeOut()
                        } else {
                            slideInHorizontally { width -> -width } + fadeIn() togetherWith
                                    slideOutHorizontally { width -> width } + fadeOut()
                        }
                    },
                    label = "question_transition"
                ) { questionIndex ->
                    uiState.currentQuestion?.let { question ->
                        OnboardingQuestionCard(
                            question = question,
                            selectedOptions = uiState.currentAnswers[question.id] ?: emptyList(),
                            onAnswerChange = { selectedOptions, textAnswer ->
                                onEvent(OnboardingUiEvent.AnswerQuestion(selectedOptions, textAnswer))
                            }
                        )
                    }
                }
            }
        }

        // Navigation buttons (hidden when showing information screen)
        if (!uiState.showingInformationScreen) {
            OnboardingNavigationButtons(
                uiState = uiState,
                onEvent = onEvent
            )
        }
    }
}

@Composable
fun OnboardingQuestionCard(
    question: OnboardingQuestion,
    selectedOptions: List<String>,
    onAnswerChange: (List<String>, String?) -> Unit
) {
    // Check if question type uses LazyVerticalGrid (no vertical scroll needed)
    val usesLazyGrid = question.type.toKind() in listOf(
        QuestionTypeKind.GRID_SELECTION,
        QuestionTypeKind.IMAGE_CARD
    ) || (question.type.toKind() == QuestionTypeKind.MULTIPLE_CHOICE && question.type.displayMode == "grid")

    Column(
        modifier = Modifier
            .then(
                if (usesLazyGrid) {
                    Modifier.fillMaxSize()
                } else {
                    Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                }
            )
            .background(MaterialTheme.colorScheme.surface)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Category badge
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
            tonalElevation = 1.dp,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        ) {
            Text(
                text = getCategoryLabel(question.category),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        // Question title
        Text(
            text = question.getLocalizedTitle(),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )

        // Subtitle
        question.getLocalizedSubtitle()?.let { subtitle ->
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Options based on question type
        when (question.type.toKind()) {
            QuestionTypeKind.MULTIPLE_CHOICE -> {
                if (question.type.displayMode == "grid") {
                    GridSelectionOptions(
                        options = question.options,
                        selectedOptions = selectedOptions,
                        allowMultiple = question.type.allowMultiple ?: false,
                        gridColumns = question.type.gridColumns ?: 2,
                        onSelectionChange = { newSelection ->
                            onAnswerChange(newSelection, null)
                        }
                    )
                } else {
                    MultipleChoiceOptions(
                        options = question.options,
                        selectedOptions = selectedOptions,
                        allowMultiple = question.type.allowMultiple ?: false,
                        onSelectionChange = { newSelection ->
                            onAnswerChange(newSelection, null)
                        }
                    )
                }
            }
            QuestionTypeKind.TEXT_INPUT -> {
                EnhancedTextInput(
                    question = question,
                    onTextChange = { text ->
                        onAnswerChange(emptyList(), text)
                    }
                )
            }
            QuestionTypeKind.RATING -> {
                RatingOptions(
                    options = question.options,
                    selectedOption = selectedOptions.firstOrNull(),
                    showLabels = question.type.showLabels ?: false,
                    onSelectionChange = { optionId ->
                        onAnswerChange(listOf(optionId), null)
                    }
                )
            }
            QuestionTypeKind.TIME_SELECTION -> {
                TimeSelectionOptions(
                    options = question.options,
                    selectedOptions = selectedOptions,
                    allowMultiple = question.type.allowMultiple ?: false,
                    onSelectionChange = { newSelection ->
                        onAnswerChange(newSelection, null)
                    }
                )
            }
            QuestionTypeKind.GRID_SELECTION -> {
                GridSelectionOptions(
                    options = question.options,
                    selectedOptions = selectedOptions,
                    allowMultiple = question.type.allowMultiple ?: false,
                    gridColumns = question.type.gridColumns ?: 2,
                    onSelectionChange = { newSelection ->
                        onAnswerChange(newSelection, null)
                    }
                )
            }
            QuestionTypeKind.TOGGLE_LIST -> {
                ToggleListOptions(
                    options = question.options,
                    selectedOptions = selectedOptions,
                    onSelectionChange = { newSelection ->
                        onAnswerChange(newSelection, null)
                    }
                )
            }
            QuestionTypeKind.SLIDER -> {
                SliderOptions(
                    question = question,
                    onValueChange = { value ->
                        onAnswerChange(listOf(value.toString()), null)
                    }
                )
            }
            QuestionTypeKind.CIRCULAR_PICKER -> {
                CircularPickerOptions(
                    question = question,
                    initialValue = selectedOptions.firstOrNull()?.toIntOrNull(),
                    onValueChange = { value ->
                        onAnswerChange(listOf(value.toString()), null)
                    }
                )
            }
            QuestionTypeKind.IMAGE_CARD -> {
                ImageCardOptions(
                    options = question.options,
                    selectedOptions = selectedOptions,
                    allowMultiple = question.type.allowMultiple ?: false,
                    gridColumns = question.type.gridColumns ?: 2,
                    onSelectionChange = { newSelection ->
                        onAnswerChange(newSelection, null)
                    }
                )
            }
        }

        // Required indicator
        if (question.required) {
            Text(
                text = "* Cette question est obligatoire",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun MultipleChoiceOptions(
    options: List<AnswerOption>,
    selectedOptions: List<String>,
    allowMultiple: Boolean,
    onSelectionChange: (List<String>) -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        options.sortedBy { it.order }.forEach { option ->
            val isSelected = selectedOptions.contains(option.id)

            OptionCard(
                option = option,
                isSelected = isSelected,
                onClick = {
                    val newSelection = if (allowMultiple) {
                        if (isSelected) {
                            selectedOptions - option.id
                        } else {
                            selectedOptions + option.id
                        }
                    } else {
                        listOf(option.id)
                    }
                    onSelectionChange(newSelection)
                }
            )
        }
    }
}

@Composable
fun RatingOptions(
    options: List<AnswerOption>,
    selectedOption: String?,
    showLabels: Boolean = false,
    onSelectionChange: (String) -> Unit
) {
    val optionCount = options.size
    // Responsive sizing: smaller tiles for 8+ options
    val tileSize = if (optionCount >= 8) 48.dp else 64.dp

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (optionCount > 5) Arrangement.SpaceBetween else Arrangement.SpaceEvenly
    ) {
        options.sortedBy { it.order }.forEach { option ->
            val isSelected = selectedOption == option.id

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .size(tileSize)
                        .clickable { onSelectionChange(option.id) },
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = if (isSelected) {
                        androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                    } else {
                        androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                    },
                    tonalElevation = 2.dp,
                    shadowElevation = if (isSelected) 4.dp else 1.dp
                ) {
                    Box(
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = option.icon ?: option.label,
                            style = if (tileSize < 64.dp) MaterialTheme.typography.titleLarge else MaterialTheme.typography.headlineMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                // Optional label below icon
                if (showLabels) {
                    Text(
                        text = option.getLocalizedLabel(),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                        textAlign = TextAlign.Center,
                        maxLines = 1
                    )
                }
            }
        }
    }
}

@Composable
fun OptionCard(
    option: AnswerOption,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        border = if (isSelected) {
            androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
        } else {
            androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
        },
        tonalElevation = 2.dp,
        shadowElevation = if (isSelected) 4.dp else 1.dp
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Icon
            option.icon?.let { emoji ->
                Text(
                    text = emoji,
                    style = MaterialTheme.typography.headlineMedium
                )
            }

            // Label
            Text(
                text = option.getLocalizedLabel(),
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )

            // Checkmark
            AnimatedVisibility(visible = isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun OnboardingNavigationButtons(
    uiState: OnboardingUiState,
    onEvent: (OnboardingUiEvent) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Previous button
            if (!uiState.isFirstQuestion) {
                OutlinedButton(
                    onClick = { onEvent(OnboardingUiEvent.PreviousQuestion) },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = Icons.Filled.ArrowBack,
                        contentDescription = "Previous",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Précédent")
                }
            }

            // Next/Complete button
            Button(
                onClick = {
                    if (uiState.isLastQuestion) {
                        onEvent(OnboardingUiEvent.CompleteOnboarding)
                    } else {
                        onEvent(OnboardingUiEvent.NextQuestion)
                    }
                },
                modifier = Modifier.weight(1f),
                enabled = uiState.canProceed && !uiState.isSaving,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (uiState.isLastQuestion) {
                        MaterialTheme.colorScheme.secondary
                    } else {
                        MaterialTheme.colorScheme.primary
                    }
                )
            ) {
                if (uiState.isSaving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(
                        text = if (uiState.isLastQuestion) "Terminer" else "Suivant"
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        imageVector = if (uiState.isLastQuestion) {
                            Icons.Default.Check
                        } else {
                            Icons.Filled.ArrowForward
                        },
                        contentDescription = if (uiState.isLastQuestion) "Complete" else "Next",
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

// ========== New Question Type Components ==========

@Composable
fun GridSelectionOptions(
    options: List<AnswerOption>,
    selectedOptions: List<String>,
    allowMultiple: Boolean,
    gridColumns: Int = 2,
    onSelectionChange: (List<String>) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(gridColumns),
        modifier = Modifier.fillMaxHeight(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(options.sortedBy { it.order }) { option ->
            val isSelected = selectedOptions.contains(option.id)

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clickable {
                        val newSelection = if (allowMultiple) {
                            if (isSelected) selectedOptions - option.id
                            else selectedOptions + option.id
                        } else {
                            listOf(option.id)
                        }
                        onSelectionChange(newSelection)
                    },
                shape = RoundedCornerShape(20.dp),
                color = option.color?.let { Color(android.graphics.Color.parseColor(it)) }
                    ?: MaterialTheme.colorScheme.surface,
                border = if (isSelected) {
                    androidx.compose.foundation.BorderStroke(3.dp, MaterialTheme.colorScheme.primary)
                } else null,
                tonalElevation = 4.dp,
                shadowElevation = if (isSelected) 8.dp else 2.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    option.icon?.let { emoji ->
                        Text(
                            text = emoji,
                            style = MaterialTheme.typography.displaySmall,
                            fontSize = 48.sp
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = option.getLocalizedLabel(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }
            }
        }
    }
}

@Composable
fun ToggleListOptions(
    options: List<AnswerOption>,
    selectedOptions: List<String>,
    onSelectionChange: (List<String>) -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.sortedBy { it.order }.forEach { option ->
            val isSelected = selectedOptions.contains(option.id)

            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 1.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = option.getLocalizedLabel(),
                        style = MaterialTheme.typography.bodyLarge,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(
                        checked = isSelected,
                        onCheckedChange = { checked ->
                            val newSelection = if (checked) {
                                selectedOptions + option.id
                            } else {
                                selectedOptions - option.id
                            }
                            onSelectionChange(newSelection)
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = MaterialTheme.colorScheme.primary,
                            checkedTrackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun SliderOptions(
    question: OnboardingQuestion,
    onValueChange: (Int) -> Unit
) {
    val minValue = question.type.sliderMin ?: 0
    val maxValue = question.type.sliderMax ?: 100
    val step = question.type.sliderStep ?: 1
    val unit = question.type.sliderUnit ?: ""

    var currentValue by remember { mutableStateOf(minValue.toFloat()) }

    Column(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Current value display
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.primaryContainer,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        ) {
            Text(
                text = "${currentValue.toInt()} $unit",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
            )
        }

        // Slider
        Slider(
            value = currentValue,
            onValueChange = { currentValue = it },
            onValueChangeFinished = {
                onValueChange(currentValue.toInt())
            },
            valueRange = minValue.toFloat()..maxValue.toFloat(),
            steps = ((maxValue - minValue) / step) - 1,
            colors = SliderDefaults.colors(
                thumbColor = MaterialTheme.colorScheme.primary,
                activeTrackColor = MaterialTheme.colorScheme.primary
            )
        )

        // Min/Max labels
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "$minValue $unit",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
            Text(
                text = "$maxValue $unit",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
        }
    }
}

@Composable
fun CircularPickerOptions(
    question: OnboardingQuestion,
    initialValue: Int?,
    onValueChange: (Int) -> Unit
) {
    val minValue = question.type.sliderMin ?: 1
    val maxValue = question.type.sliderMax ?: 7
    val step = question.type.sliderStep ?: 1
    val unit = question.type.sliderUnit ?: "jours"

    var currentValue by remember { mutableStateOf(initialValue ?: minValue) }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        // Circular display
        Box(
            modifier = Modifier
                .size(200.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = currentValue.toString(),
                    style = MaterialTheme.typography.displayLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = unit,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
            }
        }

        // Increment/Decrement buttons
        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilledIconButton(
                onClick = {
                    if (currentValue > minValue) {
                        currentValue -= step
                        onValueChange(currentValue)
                    }
                },
                enabled = currentValue > minValue,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Remove,
                    contentDescription = "Décrémenter"
                )
            }

            FilledIconButton(
                onClick = {
                    if (currentValue < maxValue) {
                        currentValue += step
                        onValueChange(currentValue)
                    }
                },
                enabled = currentValue < maxValue,
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                )
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Incrémenter"
                )
            }
        }

        // Quick select buttons (optional preset values)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            listOf(minValue, (minValue + maxValue) / 2, maxValue).forEach { presetValue ->
                OutlinedButton(
                    onClick = {
                        currentValue = presetValue
                        onValueChange(currentValue)
                    },
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = if (currentValue == presetValue) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else MaterialTheme.colorScheme.surface
                    )
                ) {
                    Text("$presetValue")
                }
            }
        }
    }
}

@Composable
fun ImageCardOptions(
    options: List<AnswerOption>,
    selectedOptions: List<String>,
    allowMultiple: Boolean,
    gridColumns: Int = 2,
    onSelectionChange: (List<String>) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(gridColumns),
        modifier = Modifier.fillMaxHeight(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(options.sortedBy { it.order }) { option ->
            val isSelected = selectedOptions.contains(option.id)

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val newSelection = if (allowMultiple) {
                            if (isSelected) selectedOptions - option.id
                            else selectedOptions + option.id
                        } else {
                            listOf(option.id)
                        }
                        onSelectionChange(newSelection)
                    },
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                border = if (isSelected) {
                    androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                } else {
                    androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                },
                tonalElevation = 2.dp,
                shadowElevation = if (isSelected) 4.dp else 1.dp
            ) {
                Column {
                    // Image placeholder (Coil integration needed)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .background(
                                option.color?.let { Color(android.graphics.Color.parseColor(it)) }
                                    ?: MaterialTheme.colorScheme.surfaceVariant
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        option.icon?.let { emoji ->
                            Text(
                                text = emoji,
                                style = MaterialTheme.typography.displayMedium
                            )
                        }
                    }

                    // Label
                    Text(
                        text = option.getLocalizedLabel(),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        modifier = Modifier.padding(12.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
fun TimeSelectionOptions(
    options: List<AnswerOption>,
    selectedOptions: List<String>,
    allowMultiple: Boolean,
    onSelectionChange: (List<String>) -> Unit
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        options.sortedBy { it.order }.forEach { option ->
            val isSelected = selectedOptions.contains(option.id)

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        val newSelection = if (allowMultiple) {
                            if (isSelected) selectedOptions - option.id
                            else selectedOptions + option.id
                        } else {
                            listOf(option.id)
                        }
                        onSelectionChange(newSelection)
                    },
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                border = if (isSelected) {
                    androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary)
                } else {
                    androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                },
                tonalElevation = 2.dp,
                shadowElevation = if (isSelected) 4.dp else 1.dp
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Clock icon
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = "Time",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )

                    // Label
                    Text(
                        text = option.getLocalizedLabel(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        modifier = Modifier.weight(1f)
                    )

                    // Checkmark
                    AnimatedVisibility(visible = isSelected) {
                        Icon(
                            imageVector = Icons.Default.Check,
                            contentDescription = "Selected",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun EnhancedTextInput(
    question: OnboardingQuestion,
    onTextChange: (String) -> Unit
) {
    var textInput by remember { mutableStateOf("") }
    val maxLines = question.type.maxLines ?: 1
    val maxCharacters = question.type.maxCharacters ?: 500
    val placeholder = question.type.placeholder ?: question.getLocalizedSubtitle() ?: "Votre réponse"

    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OutlinedTextField(
            value = textInput,
            onValueChange = {
                if (it.length <= maxCharacters) {
                    textInput = it
                    onTextChange(it)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(placeholder) },
            placeholder = { Text(placeholder) },
            maxLines = maxLines,
            minLines = if (maxLines > 1) 3 else 1,
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
            )
        )

        // Character counter
        Text(
            text = "${textInput.length} / $maxCharacters caractères",
            style = MaterialTheme.typography.bodySmall,
            color = if (textInput.length >= maxCharacters) {
                MaterialTheme.colorScheme.error
            } else {
                MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            },
            modifier = Modifier.align(Alignment.End)
        )
    }
}

fun getCategoryLabel(category: String): String {
    return when (category.lowercase()) {
        "goals" -> "🎯 Objectifs"
        "experience" -> "⭐ Expérience"
        "preferences" -> "❤️ Préférences"
        "personalization" -> "✨ Personnalisation"
        else -> category
    }
}
