package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.ora.wellbeing.presentation.components.AuthScreenTemplate
import com.ora.wellbeing.presentation.components.PrimaryButton
import com.ora.wellbeing.presentation.components.SecondaryTextButton
import timber.log.Timber

/**
 * Écran 2: Bienvenue avec message chaleureux et CTA principal
 */
@Composable
fun WelcomeScreen(
    onNavigateToEmailCollection: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    Timber.d("WelcomeScreen: Rendering")

    AuthScreenTemplate {
        Spacer(modifier = Modifier.height(32.dp))

        // Titre avec emoji
        Text(
            text = "Bienvenue dans ORA 🌙",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Message chaleureux
        Text(
            text = "Ici, tu peux ralentir, relâcher la pression, te recentrer… Tu es à la bonne place.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Bouton principal
        PrimaryButton(
            text = "Créer mon espace ORA",
            onClick = {
                Timber.d("WelcomeScreen: User clicked 'Créer mon espace ORA'")
                onNavigateToEmailCollection()
            }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Lien vers login existant
        SecondaryTextButton(
            text = "J'ai déjà un compte",
            onClick = {
                Timber.d("WelcomeScreen: User clicked 'J'ai déjà un compte'")
                onNavigateToLogin()
            }
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}
