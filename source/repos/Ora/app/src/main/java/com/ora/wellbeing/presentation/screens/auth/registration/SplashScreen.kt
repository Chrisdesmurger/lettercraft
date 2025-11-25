package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import timber.log.Timber

/**
 * Écran 1: Splash avec logo ORA et tagline
 * Auto-transition après 2-3 secondes
 */
@Composable
fun SplashScreen(
    onNavigateToWelcome: () -> Unit
) {
    val alphaAnimation = remember { Animatable(0f) }

    // Animation fade-in du logo et auto-transition
    LaunchedEffect(Unit) {
        Timber.d("SplashScreen: Starting fade-in animation")

        // Fade-in sur 1 seconde
        alphaAnimation.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1000)
        )

        // Attendre 2 secondes de plus (total 3 secondes)
        delay(2000)

        Timber.d("SplashScreen: Navigating to Welcome")
        onNavigateToWelcome()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(alphaAnimation.value),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo ORA en gros
            Text(
                text = "ORA",
                style = MaterialTheme.typography.displayLarge,
                color = MaterialTheme.colorScheme.primary, // Orange coral
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Tagline
            Text(
                text = "Respire. Rayonne.",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
        }
    }
}
