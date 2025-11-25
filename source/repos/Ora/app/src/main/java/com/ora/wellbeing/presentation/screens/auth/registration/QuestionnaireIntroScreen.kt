package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ora.wellbeing.presentation.components.AuthScreenTemplate
import com.ora.wellbeing.presentation.components.PrimaryButton
import timber.log.Timber

/**
 * Écran 6: Intro au questionnaire de personnalisation
 * Marque l'onboarding d'inscription comme complété avant de naviguer
 */
@Composable
fun QuestionnaireIntroScreen(
    onNavigateToPersonalizationQuestionnaire: () -> Unit,
    viewModel: QuestionnaireIntroViewModel = hiltViewModel()
) {
    val uiState = viewModel.uiState.collectAsStateWithLifecycle()

    Timber.d("QuestionnaireIntroScreen: Rendering")

    // Navigation vers le questionnaire de personnalisation
    LaunchedEffect(uiState.value.navigateToQuestionnaire) {
        if (uiState.value.navigateToQuestionnaire) {
            Timber.d("QuestionnaireIntroScreen: Navigating to personalization questionnaire")
            onNavigateToPersonalizationQuestionnaire()
        }
    }

    AuthScreenTemplate {
        Spacer(modifier = Modifier.height(32.dp))

        // Titre avec emoji
        Text(
            text = "Faisons connaissance 🌿",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Message chaleureux
        Text(
            text = "Réponds avec ton cœur. Il n'y a pas de bonne ou de mauvaise réponse.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Bouton CTA
        PrimaryButton(
            text = "Commencer",
            onClick = {
                Timber.d("QuestionnaireIntroScreen: User clicked 'Commencer'")
                viewModel.onEvent(QuestionnaireIntroUiEvent.BeginQuestionnaire)
            },
            isLoading = uiState.value.isLoading
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}
