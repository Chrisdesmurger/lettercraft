package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ora.wellbeing.presentation.components.AuthScreenTemplate
import com.ora.wellbeing.presentation.components.PrimaryButton
import timber.log.Timber

/**
 * Écran 5: Transition vers le questionnaire de personnalisation
 * Animation fade-in légère pour donner une pause avant le questionnaire
 */
@Composable
fun TransitionScreen(
    onNavigateToQuestionnaireIntro: () -> Unit
) {
    Timber.d("TransitionScreen: Rendering")

    val alphaAnimation = remember { Animatable(0f) }

    // Animation fade-in sur 800ms
    LaunchedEffect(Unit) {
        alphaAnimation.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
    }

    AuthScreenTemplate(
        modifier = Modifier.alpha(alphaAnimation.value)
    ) {
        Spacer(modifier = Modifier.height(32.dp))

        // Titre avec emoji
        Text(
            text = "Ton espace ORA se crée avec toi 🤍",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Texte explicatif
        Text(
            text = "2 minutes pour apprendre à te connaître...",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Bouton CTA
        PrimaryButton(
            text = "Personnaliser mon expérience",
            onClick = {
                Timber.d("TransitionScreen: User clicked 'Personnaliser mon expérience'")
                onNavigateToQuestionnaireIntro()
            }
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}
