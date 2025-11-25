package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.ora.wellbeing.presentation.components.AuthScreenTemplate
import com.ora.wellbeing.presentation.components.PrimaryButton
import timber.log.Timber

/**
 * Écran 3: Collecte email + création compte Firebase + document Firestore
 */
@Composable
fun EmailCollectionScreen(
    onNavigateToTransition: () -> Unit,
    viewModel: EmailCollectionViewModel = hiltViewModel()
) {
    val uiState = viewModel.uiState.collectAsStateWithLifecycle()
    val focusManager = LocalFocusManager.current
    val snackbarHostState = remember { SnackbarHostState() }

    Timber.d("EmailCollectionScreen: Rendering")

    // Navigation après création compte réussie
    LaunchedEffect(uiState.value.accountCreated) {
        if (uiState.value.accountCreated) {
            Timber.d("EmailCollectionScreen: Account created, navigating to Transition")
            onNavigateToTransition()
        }
    }

    // Affichage erreurs
    LaunchedEffect(uiState.value.error) {
        uiState.value.error?.let { error ->
            Timber.e("EmailCollectionScreen: Error: $error")
            snackbarHostState.showSnackbar(
                message = error,
                duration = SnackbarDuration.Short
            )
            viewModel.onEvent(EmailCollectionUiEvent.DismissError)
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        AuthScreenTemplate {
            Spacer(modifier = Modifier.height(32.dp))

            // Titre
            Text(
                text = "Avant de commencer ton voyage…",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Champ Email
            OutlinedTextField(
                value = uiState.value.email,
                onValueChange = { viewModel.onEvent(EmailCollectionUiEvent.EmailChanged(it)) },
                label = { Text("Email") },
                placeholder = { Text("ton@email.com") },
                singleLine = true,
                enabled = !uiState.value.isLoading,
                isError = uiState.value.emailError != null,
                supportingText = {
                    uiState.value.emailError?.let { Text(it) }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    focusedLabelColor = MaterialTheme.colorScheme.primary,
                    cursorColor = MaterialTheme.colorScheme.primary
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                ),
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Champ Password
            OutlinedTextField(
                value = uiState.value.password,
                onValueChange = { viewModel.onEvent(EmailCollectionUiEvent.PasswordChanged(it)) },
                label = { Text("Mot de passe") },
                placeholder = { Text("Minimum 6 caractères") },
                singleLine = true,
                enabled = !uiState.value.isLoading,
                isError = uiState.value.passwordError != null,
                supportingText = {
                    uiState.value.passwordError?.let { Text(it) }
                },
                visualTransformation = if (uiState.value.isPasswordVisible)
                    VisualTransformation.None
                else
                    PasswordVisualTransformation(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    focusedLabelColor = MaterialTheme.colorScheme.primary,
                    cursorColor = MaterialTheme.colorScheme.primary
                ),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        focusManager.clearFocus()
                        if (uiState.value.isFormValid) {
                            viewModel.onEvent(EmailCollectionUiEvent.CreateAccount)
                        }
                    }
                ),
                trailingIcon = {
                    IconButton(
                        onClick = { viewModel.onEvent(EmailCollectionUiEvent.TogglePasswordVisibility) }
                    ) {
                        Icon(
                            imageVector = if (uiState.value.isPasswordVisible)
                                Icons.Default.Visibility
                            else
                                Icons.Default.VisibilityOff,
                            contentDescription = if (uiState.value.isPasswordVisible)
                                "Masquer le mot de passe"
                            else
                                "Afficher le mot de passe",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Bouton Continuer
            PrimaryButton(
                text = "Continuer",
                onClick = {
                    Timber.d("EmailCollectionScreen: User clicked 'Continuer'")
                    viewModel.onEvent(EmailCollectionUiEvent.CreateAccount)
                },
                enabled = uiState.value.isFormValid,
                isLoading = uiState.value.isLoading
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Texte informatif
            Text(
                text = "En créant un compte, tu acceptes nos conditions d'utilisation et notre politique de confidentialité.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
