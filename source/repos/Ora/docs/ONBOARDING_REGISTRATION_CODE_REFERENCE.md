# Code Reference - Onboarding d'Inscription

Quick reference pour les développeurs travaillant avec l'onboarding d'inscription.

## Architecture Overview

### Flow de création de compte

```kotlin
// 1. User tape email + password dans EmailCollectionScreen
// 2. EmailCollectionViewModel.createAccount() s'exécute

// Step 1: Firebase Auth
authRepository.signUpWithEmail(email, password)
    .onSuccess { localUser ->
        val uid = localUser.id

        // Step 2: Créer Firestore document
        val userProfile = UserProfile(
            uid = uid,
            email = email,
            firstName = null,
            lastName = null,
            planTier = "free",
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )

        firestoreUserProfileRepository.createUserProfile(userProfile)
            .onSuccess {
                // Navigation vers TransitionScreen
                _uiState.value = _uiState.value.copy(accountCreated = true)
            }
    }
    .onFailure { error ->
        // Gestion des erreurs
    }
```

## Fichiers Clés

### 1. RegistrationPreferences.kt (DataStore)

Localisation : `app/src/main/java/com/ora/wellbeing/data/local/RegistrationPreferences.kt`

**Utilisation** :

```kotlin
// Injecter dans ViewModel
@HiltViewModel
class QuestionnaireIntroViewModel @Inject constructor(
    private val registrationPreferences: RegistrationPreferences
) : ViewModel()

// Utiliser dans viewModelScope
viewModelScope.launch {
    // Marquer comme complété
    registrationPreferences.setRegistrationOnboardingCompleted()

    // Ou vérifier le status
    val hasCompleted = registrationPreferences.hasCompletedRegistrationOnboarding()
}
```

**Clés DataStore** :

```kotlin
// Stocké dans "registration_preferences" DataStore
Key: "has_completed_registration_onboarding" (Boolean)
Default: false
```

### 2. EmailCollectionViewModel.kt

Localisation : `app/src/main/java/com/ora/wellbeing/presentation/screens/auth/registration/EmailCollectionViewModel.kt`

**State Management** :

```kotlin
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
```

**Events** :

```kotlin
sealed class EmailCollectionUiEvent {
    data class EmailChanged(val email: String) : EmailCollectionUiEvent()
    data class PasswordChanged(val password: String) : EmailCollectionUiEvent()
    object TogglePasswordVisibility : EmailCollectionUiEvent()
    object CreateAccount : EmailCollectionUiEvent()
    object DismissError : EmailCollectionUiEvent()
}
```

### 3. EmailCollectionScreen.kt

Localisation : `app/src/main/java/com/ora/wellbeing/presentation/screens/auth/registration/EmailCollectionScreen.kt`

**Navigation Setup** :

```kotlin
@Composable
fun EmailCollectionScreen(
    onNavigateToTransition: () -> Unit,
    viewModel: EmailCollectionViewModel = hiltViewModel()
) {
    val uiState = viewModel.uiState.collectAsStateWithLifecycle()

    // Navigate quand account créé
    LaunchedEffect(uiState.value.accountCreated) {
        if (uiState.value.accountCreated) {
            onNavigateToTransition()
        }
    }
}
```

### 4. QuestionnaireIntroViewModel.kt

Localisation : `app/src/main/java/com/ora/wellbeing/presentation/screens/auth/registration/QuestionnaireIntroViewModel.kt`

**Mark Onboarding Complete** :

```kotlin
private fun beginQuestionnaire() {
    viewModelScope.launch {
        try {
            // Marquer l'onboarding comme complété
            registrationPreferences.setRegistrationOnboardingCompleted()

            // Signal pour naviguer vers OnboardingScreen
            _uiState.value = _uiState.value.copy(
                navigateToQuestionnaire = true
            )
        } catch (e: Exception) {
            // Continue anyway, non-blocking
            _uiState.value = _uiState.value.copy(
                navigateToQuestionnaire = true
            )
        }
    }
}
```

### 5. AuthNavGraph.kt

Localisation : `app/src/main/java/com/ora/wellbeing/presentation/navigation/AuthNavGraph.kt`

**Navigation Graph Setup** :

```kotlin
@Composable
fun AuthNavGraph(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    onAuthComplete: () -> Unit
) {
    NavHost(
        navController = navController,
        startDestination = AuthDestinations.Splash.route,
        modifier = modifier.fillMaxSize()
    ) {
        // Écran 1: Splash
        composable(AuthDestinations.Splash.route) {
            SplashScreen(
                onNavigateToWelcome = {
                    navController.navigate(AuthDestinations.Welcome.route) {
                        popUpTo(AuthDestinations.Splash.route) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            )
        }

        // ... autres écrans ...

        // Écran 6: Questionnaire Intro
        composable(AuthDestinations.QuestionnaireIntro.route) {
            QuestionnaireIntroScreen(
                onNavigateToPersonalizationQuestionnaire = {
                    // Appel le callback parent (MainActivity)
                    onAuthComplete()
                }
            )
        }
    }
}
```

**Utilisation dans OraNavigation** :

```kotlin
@Composable
fun OraNavigation() {
    val isAuthenticated by authViewModel.isAuthenticated.collectAsStateWithLifecycle()

    NavHost(
        navController = navController,
        startDestination = if (isAuthenticated) OraDestinations.Home.route
                          else OraDestinations.Auth.route
    ) {
        // Auth Graph (onboarding inscription)
        composable(OraDestinations.Auth.route) {
            AuthScreen(onAuthSuccess = { /* handle login */ })
        }

        // Onboarding Graph (personnalisation)
        composable(OraDestinations.Onboarding.route) {
            OnboardingScreen(onComplete = { /* navigate to home */ })
        }

        // Main App
        composable(OraDestinations.Home.route) {
            HomeScreen()
        }

        // ... autres routes ...
    }
}
```

## Common Patterns

### Pattern 1: Injecter repositories dans ViewModel

```kotlin
@HiltViewModel
class EmailCollectionViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val firestoreUserProfileRepository: FirestoreUserProfileRepository
) : ViewModel()
```

### Pattern 2: Appeler suspend functions dans viewModelScope

```kotlin
fun onEvent(event: EmailCollectionUiEvent) {
    when (event) {
        EmailCollectionUiEvent.CreateAccount -> {
            createAccount()  // Appelle fonction suspend
        }
    }
}

private fun createAccount() {
    viewModelScope.launch {
        try {
            // Suspend functions s'exécutent ici
            authRepository.signUpWithEmail(email, password)
                .onSuccess { /* handle success */ }
                .onFailure { /* handle error */ }
        } catch (e: Exception) {
            // Gestion erreurs inattendues
        }
    }
}
```

### Pattern 3: Navigation LaunchedEffect

```kotlin
@Composable
fun EmailCollectionScreen(
    onNavigateToTransition: () -> Unit,
    viewModel: EmailCollectionViewModel = hiltViewModel()
) {
    val uiState = viewModel.uiState.collectAsStateWithLifecycle()

    // Navigate quand condition change
    LaunchedEffect(uiState.value.accountCreated) {
        if (uiState.value.accountCreated) {
            onNavigateToTransition()
        }
    }
}
```

### Pattern 4: Validation locale avant appel API

```kotlin
private fun createAccount() {
    val email = _uiState.value.email.trim()
    val password = _uiState.value.password

    // Validation locale d'abord
    if (!isEmailValid(email)) {
        _uiState.value = _uiState.value.copy(
            emailError = "Email invalide"
        )
        return  // Stop ici
    }

    if (!isPasswordValid(password)) {
        _uiState.value = _uiState.value.copy(
            passwordError = "Le mot de passe doit contenir au moins 6 caractères"
        )
        return  // Stop ici
    }

    // Seulement appeler API si validation OK
    viewModelScope.launch {
        // Appel Auth + Firestore
    }
}

private fun isEmailValid(email: String): Boolean {
    return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
}

private fun isPasswordValid(password: String): Boolean {
    return password.length >= 6
}
```

### Pattern 5: Gestion d'erreurs Firebase

```kotlin
.onFailure { error ->
    val errorMessage = when {
        error.message?.contains("email-already-in-use", ignoreCase = true) == true ->
            "Cet email est déjà utilisé"
        error.message?.contains("invalid-email", ignoreCase = true) == true ->
            "Email invalide"
        error.message?.contains("weak-password", ignoreCase = true) == true ->
            "Mot de passe trop faible"
        else -> "Erreur lors de la création du compte"
    }

    _uiState.value = _uiState.value.copy(
        isLoading = false,
        error = errorMessage
    )
}
```

## Testing

### Test EmailCollectionViewModel

```kotlin
@Test
fun testCreateAccountSuccess() = runTest {
    // Given
    val viewModel = EmailCollectionViewModel(
        authRepository = mockAuthRepository,
        firestoreUserProfileRepository = mockFirestoreRepository
    )

    // When
    viewModel.onEvent(EmailCollectionUiEvent.EmailChanged("test@example.com"))
    viewModel.onEvent(EmailCollectionUiEvent.PasswordChanged("password123"))
    viewModel.onEvent(EmailCollectionUiEvent.CreateAccount)

    // Then
    val state = viewModel.uiState.first()
    assertThat(state.accountCreated).isTrue()
}

@Test
fun testCreateAccountInvalidEmail() = runTest {
    val viewModel = EmailCollectionViewModel(mockAuth, mockFirestore)

    viewModel.onEvent(EmailCollectionUiEvent.EmailChanged("invalid-email"))
    viewModel.onEvent(EmailCollectionUiEvent.CreateAccount)

    val state = viewModel.uiState.first()
    assertThat(state.emailError).isNotNull()
}
```

### Test RegistrationPreferences

```kotlin
@Test
fun testSetAndGetCompletedOnboarding() = runTest {
    val preferences = RegistrationPreferences(context)

    // Initially false
    assertThat(preferences.hasCompletedRegistrationOnboarding()).isFalse()

    // Set to true
    preferences.setRegistrationOnboardingCompleted()

    // Should be true
    assertThat(preferences.hasCompletedRegistrationOnboarding()).isTrue()
}
```

## Debugging

### Enable Timber Logging

Logs pour chaque écran sont configurés avec Timber :

```
SplashScreen: Starting fade-in animation
SplashScreen: Navigating to Welcome
WelcomeScreen: Rendering
EmailCollectionScreen: Rendering
EmailCollectionViewModel: Creating account for test@example.com
EmailCollectionViewModel: Firebase Auth created, uid=abc123
EmailCollectionViewModel: Firestore profile created successfully
```

### View Logs

```bash
# Filter logs pour onboarding
adb logcat | grep -i "EmailCollection\|Splash\|Transition\|Questionnaire"

# Or in Android Studio: Logcat tab
```

### Firestore Debug

```bash
# Check Firestore state in Firebase Console
# Go to: Firestore Database → Collections → users
# Should see document with ID = user's Firebase UID
```

## Troubleshooting

### Problem: "Email already in use" always shows

**Check**:
- Firebase Console → Authentication → Users
- Verify email isn't already registered
- Try different email address

### Problem: Firestore document not created

**Check**:
- Firestore Security Rules allow creation
- UserProfile model correctly mapped to Firestore
- Check logs for Firestore error

### Problem: DataStore not persisting

**Check**:
- `setRegistrationOnboardingCompleted()` is called
- Check files: `/data/data/com.ora.wellbeing/files/datastore/registration_preferences.preferences_pb`
- Verify DataStore dependency in build.gradle.kts

### Problem: Navigation loop

**Check**:
- `onAuthComplete()` callback only called from QuestionnaireIntroScreen
- MainActivity routing logic correct
- No infinite LaunchedEffect

## Related Files

- Architecture: `CLAUDE.md`
- Specifications: `docs/ONBOARDING_INSCRIPTION_PERSISTENCE.md`
- Theme: `presentation/theme/OraTheme.kt`
- Auth: `data/repository/AuthRepository.kt`
- Firestore: `domain/repository/FirestoreUserProfileRepository.kt`

---

**Last Updated** : 2025-11-26
**For Implementation** : feature/onboarding-inscription
