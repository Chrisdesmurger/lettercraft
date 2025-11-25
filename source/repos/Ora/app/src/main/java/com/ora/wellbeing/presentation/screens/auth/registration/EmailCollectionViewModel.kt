package com.ora.wellbeing.presentation.screens.auth.registration

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ora.wellbeing.data.repository.AuthRepository
import com.ora.wellbeing.domain.model.UserProfile
import com.ora.wellbeing.domain.repository.FirestoreUserProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * ViewModel pour l'écran de collecte d'email et création de compte
 * Gère Firebase Auth + création document Firestore users/{uid}
 */
@HiltViewModel
class EmailCollectionViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val firestoreUserProfileRepository: FirestoreUserProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(EmailCollectionUiState())
    val uiState: StateFlow<EmailCollectionUiState> = _uiState.asStateFlow()

    fun onEvent(event: EmailCollectionUiEvent) {
        when (event) {
            is EmailCollectionUiEvent.EmailChanged -> {
                _uiState.value = _uiState.value.copy(
                    email = event.email,
                    emailError = null
                )
            }
            is EmailCollectionUiEvent.PasswordChanged -> {
                _uiState.value = _uiState.value.copy(
                    password = event.password,
                    passwordError = null
                )
            }
            EmailCollectionUiEvent.TogglePasswordVisibility -> {
                _uiState.value = _uiState.value.copy(
                    isPasswordVisible = !_uiState.value.isPasswordVisible
                )
            }
            EmailCollectionUiEvent.CreateAccount -> {
                createAccount()
            }
            EmailCollectionUiEvent.DismissError -> {
                _uiState.value = _uiState.value.copy(error = null)
            }
        }
    }

    /**
     * Valide l'email (format basique)
     */
    private fun isEmailValid(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    /**
     * Valide le mot de passe (minimum 6 caractères)
     */
    private fun isPasswordValid(password: String): Boolean {
        return password.length >= 6
    }

    /**
     * Crée le compte Firebase Auth + document Firestore users/{uid}
     */
    private fun createAccount() {
        val email = _uiState.value.email.trim()
        val password = _uiState.value.password

        // Validation
        if (!isEmailValid(email)) {
            _uiState.value = _uiState.value.copy(
                emailError = "Email invalide"
            )
            return
        }

        if (!isPasswordValid(password)) {
            _uiState.value = _uiState.value.copy(
                passwordError = "Le mot de passe doit contenir au moins 6 caractères"
            )
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                Timber.d("EmailCollectionViewModel: Creating account for $email")

                // 1. Créer le compte Firebase Auth
                authRepository.signUpWithEmail(email, password)
                    .onSuccess { localUser ->
                        val uid = localUser.id
                        Timber.d("EmailCollectionViewModel: Firebase Auth created, uid=$uid")

                        // 2. Créer le document Firestore users/{uid}
                        val userProfile = UserProfile(
                            uid = uid,
                            email = email,
                            firstName = null, // Sera rempli plus tard (optionnel)
                            lastName = null,
                            planTier = "free", // Par défaut
                            createdAt = System.currentTimeMillis(),
                            updatedAt = System.currentTimeMillis()
                        )

                        firestoreUserProfileRepository.createUserProfile(userProfile)
                            .onSuccess {
                                Timber.i("EmailCollectionViewModel: Firestore profile created successfully")
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    accountCreated = true
                                )
                            }
                            .onFailure { firestoreError ->
                                // Firestore a échoué mais Auth a réussi
                                // On continue quand même (le profil sera créé par SyncManager)
                                Timber.e(firestoreError, "EmailCollectionViewModel: Firestore profile creation failed, continuing anyway")
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    accountCreated = true
                                )
                            }
                    }
                    .onFailure { authError ->
                        Timber.e(authError, "EmailCollectionViewModel: Firebase Auth failed")

                        val errorMessage = when {
                            authError.message?.contains("email-already-in-use", ignoreCase = true) == true ->
                                "Cet email est déjà utilisé"
                            authError.message?.contains("invalid-email", ignoreCase = true) == true ->
                                "Email invalide"
                            authError.message?.contains("weak-password", ignoreCase = true) == true ->
                                "Mot de passe trop faible"
                            else -> "Erreur lors de la création du compte"
                        }

                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = errorMessage
                        )
                    }
            } catch (e: Exception) {
                Timber.e(e, "EmailCollectionViewModel: Unexpected error")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Une erreur inattendue s'est produite"
                )
            }
        }
    }
}

/**
 * UI State pour l'écran de collecte email
 */
data class EmailCollectionUiState(
    val email: String = "",
    val password: String = "",
    val isPasswordVisible: Boolean = false,
    val emailError: String? = null,
    val passwordError: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val accountCreated: Boolean = false
) {
    val isFormValid: Boolean
        get() = email.isNotBlank() && password.length >= 6
}

/**
 * UI Events pour l'écran de collecte email
 */
sealed class EmailCollectionUiEvent {
    data class EmailChanged(val email: String) : EmailCollectionUiEvent()
    data class PasswordChanged(val password: String) : EmailCollectionUiEvent()
    object TogglePasswordVisibility : EmailCollectionUiEvent()
    object CreateAccount : EmailCollectionUiEvent()
    object DismissError : EmailCollectionUiEvent()
}
