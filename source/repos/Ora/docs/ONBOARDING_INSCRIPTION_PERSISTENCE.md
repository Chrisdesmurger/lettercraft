# Architecture de Persistence - Onboarding d'Inscription

Documentation de la stratégie de persistence pour l'onboarding d'inscription utilisateur.

## 🎯 Vue d'ensemble

L'onboarding d'inscription utilise **3 systèmes de persistence** différents pour des besoins différents :

1. **DataStore** (local) - Flag de complétion UI
2. **Firebase Auth** - Authentification
3. **Firestore** (cloud) - Données utilisateur

---

## 📊 Stratégie de Persistence

### 1. DataStore (Local) - Flag de complétion uniquement

**Objectif** : Savoir si l'utilisateur a complété l'onboarding d'inscription pour ne pas le revoir à chaque ouverture

**Fichier** : `data/local/RegistrationPreferences.kt`

**Données stockées** :
```kotlin
preferences {
    has_completed_registration_onboarding: Boolean = false
}
```

**Implémentation** :
```kotlin
@Singleton
class RegistrationPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
        name = "registration_preferences"
    )

    companion object {
        val HAS_COMPLETED_REGISTRATION_KEY = booleanPreferencesKey("has_completed_registration_onboarding")
    }

    /**
     * Vérifie si l'onboarding d'inscription a été complété
     */
    suspend fun hasCompletedRegistrationOnboarding(): Boolean {
        return context.dataStore.data.map { preferences ->
            preferences[HAS_COMPLETED_REGISTRATION_KEY] ?: false
        }.first()
    }

    /**
     * Marque l'onboarding d'inscription comme complété
     */
    suspend fun setRegistrationOnboardingCompleted() {
        context.dataStore.edit { preferences ->
            preferences[HAS_COMPLETED_REGISTRATION_KEY] = true
        }
    }

    /**
     * Réinitialise le flag (pour tests ou debug)
     */
    suspend fun resetRegistrationOnboarding() {
        context.dataStore.edit { preferences ->
            preferences[HAS_COMPLETED_REGISTRATION_KEY] = false
        }
    }
}
```

**Cycle de vie** :
- Set à `false` par défaut
- Set à `true` après l'écran 6 (QuestionnaireIntroScreen)
- Persiste même après redémarrage de l'app
- **NE persiste PAS** si app désinstallée (comportement voulu)

---

### 2. Firebase Auth - Authentification

**Objectif** : Gérer l'authentification de l'utilisateur (email/password, Google Sign-In)

**Collection** : Firebase Authentication (pas Firestore)

**Données gérées** :
- `uid` : String (généré automatiquement par Firebase)
- `email` : String
- `password` : String (hashé automatiquement)
- `emailVerified` : Boolean (si vérification activée)
- `displayName` : String? (si fourni)
- `photoURL` : String? (si fourni)

**Repository existant** : `data/repository/AuthRepository.kt`

**Méthodes utilisées** :
```kotlin
// Création de compte
suspend fun signUpWithEmail(email: String, password: String): Result<User>

// Connexion
suspend fun signInWithEmail(email: String, password: String): Result<User>

// Google Sign-In
suspend fun signInWithGoogle(idToken: String): Result<User>

// État actuel
fun getCurrentFirebaseUser(): FirebaseUser?
```

**Cycle de vie** :
- Créé lors de l'écran 3 (Collecte Email)
- Persiste même après désinstallation de l'app
- Géré par Firebase (pas nous)

---

### 3. Firestore (Cloud) - Données utilisateur

**Objectif** : Stocker le profil utilisateur complet accessible depuis tous les appareils et l'admin portal

**Collection** : `users`

**Document ID** : `{uid}` (même UID que Firebase Auth)

**Modèle** : `data/model/UserProfile.kt`

**Structure du document** :
```typescript
users/{uid} {
  // Champs de base (créés lors de l'inscription)
  uid: string,
  email: string,
  first_name: string | null,     // Optionnel, peut être ajouté plus tard
  last_name: string | null,      // Optionnel, peut être ajouté plus tard
  photo_url: string | null,      // Optionnel (Google Sign-In ou upload)
  motto: string | null,          // Optionnel, peut être ajouté plus tard
  plan_tier: string,             // "FREE" par défaut, "PREMIUM" ou "LIFETIME"
  created_at: Timestamp,         // Auto-généré par @ServerTimestamp
  updated_at: Timestamp,         // Auto-généré par @ServerTimestamp

  // Champ ajouté après l'onboarding de personnalisation
  onboarding: {
    completed: boolean,
    config_version: string,
    completed_at: Timestamp,
    started_at: Timestamp,
    answers: [
      {
        question_id: string,
        selected_options: string[],
        text_answer: string | null,
        answered_at: Timestamp
      }
    ],
    metadata: {
      device_type: string,
      app_version: string,
      total_time_seconds: number,
      locale: string
    }
  }
}
```

**Repository existant** : `domain/repository/FirestoreUserProfileRepository.kt`

**Méthodes clés** :
```kotlin
// Créer le profil
suspend fun createUserProfile(userProfile: UserProfile): Result<Unit>

// Lire le profil (Flow pour réactivité)
fun getUserProfile(uid: String): Flow<UserProfile?>

// Mettre à jour le profil
suspend fun updateUserProfile(userProfile: UserProfile): Result<Unit>

// Vérifier si le profil existe
suspend fun doesUserProfileExist(uid: String): Boolean
```

**Cycle de vie** :
- Créé lors de l'écran 3 (Collecte Email) juste après Firebase Auth
- Mis à jour après l'onboarding de personnalisation (champ `onboarding`)
- Persiste même après désinstallation de l'app
- Accessible depuis tous les appareils de l'utilisateur
- Accessible depuis l'admin portal (OraWebApp)

---

## 🔄 Flow de Création de Compte

### Écran 3 : Collecte Email

```kotlin
class EmailCollectionViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val firestoreUserProfileRepository: FirestoreUserProfileRepository,
    private val localUserRepository: UserRepository
) : ViewModel() {

    fun onContinue(email: String, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            try {
                // 1. Créer le compte Firebase Auth
                authRepository.signUpWithEmail(email, password)
                    .onSuccess { localUser ->
                        val uid = localUser.id

                        // 2. Créer le document Firestore users/{uid}
                        val userProfile = UserProfile().apply {
                            this.uid = uid
                            this.email = email
                            firstName = null  // Sera rempli plus tard (optionnel)
                            lastName = null   // Sera rempli plus tard (optionnel)
                            planTier = "FREE" // Par défaut
                            // createdAt et updatedAt auto-générés par @ServerTimestamp
                        }

                        firestoreUserProfileRepository.createUserProfile(userProfile)
                            .onSuccess {
                                // 3. Succès ! Naviguer vers écran suivant
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    navigateToVerification = true
                                )
                                Timber.d("User profile created successfully in Firestore")
                            }
                            .onFailure { firestoreError ->
                                // Firestore a échoué mais Auth a réussi
                                // On peut continuer mais logger l'erreur
                                Timber.e(firestoreError, "Failed to create Firestore profile")
                                _uiState.value = _uiState.value.copy(
                                    isLoading = false,
                                    navigateToVerification = true // Continuer quand même
                                )
                            }
                    }
                    .onFailure { authError ->
                        // Auth a échoué
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = when {
                                authError.message?.contains("email-already-in-use") == true ->
                                    "Cet email est déjà utilisé"
                                authError.message?.contains("invalid-email") == true ->
                                    "Email invalide"
                                else -> "Erreur lors de la création du compte"
                            }
                        )
                    }
            } catch (e: Exception) {
                Timber.e(e, "Unexpected error during account creation")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "Une erreur inattendue s'est produite"
                )
            }
        }
    }
}
```

### Écran 6 : Questionnaire Intro

```kotlin
class QuestionnaireIntroViewModel @Inject constructor(
    private val registrationPreferences: RegistrationPreferences
) : ViewModel() {

    fun onBeginQuestionnaire() {
        viewModelScope.launch {
            // Marquer l'onboarding d'inscription comme complété
            registrationPreferences.setRegistrationOnboardingCompleted()

            // Naviguer vers le questionnaire de personnalisation
            _uiState.value = _uiState.value.copy(
                navigateToPersonalizationQuestionnaire = true
            )
        }
    }
}
```

---

## 🚦 Logique de Routing dans MainActivity

```kotlin
@Composable
fun OraApp() {
    val hasCompletedRegistration by remember {
        registrationPreferences.hasCompletedRegistrationOnboarding().collectAsState(initial = false)
    }

    val currentUser by remember {
        authRepository.currentUserFlow().collectAsState(initial = null)
    }

    val userProfile by remember(currentUser?.id) {
        if (currentUser != null) {
            firestoreUserProfileRepository.getUserProfile(currentUser!!.id)
        } else {
            flowOf(null)
        }
    }.collectAsState(initial = null)

    val hasCompletedPersonalization = userProfile?.onboarding?.completed == true

    when {
        currentUser == null -> {
            // Pas connecté : Onboarding d'INSCRIPTION
            AuthNavGraph()
        }
        !hasCompletedPersonalization -> {
            // Connecté mais pas de personnalisation : Onboarding de PERSONNALISATION
            OnboardingScreen()
        }
        else -> {
            // Tout est complété : App principale
            MainNavGraph()
        }
    }
}
```

**Logique de décision** :

| Condition | Écran affiché |
|-----------|---------------|
| `currentUser == null` | Onboarding d'inscription (AuthNavGraph) |
| `currentUser != null && !hasCompletedPersonalization` | Onboarding de personnalisation (OnboardingScreen) |
| `currentUser != null && hasCompletedPersonalization` | App principale (MainNavGraph) |

**Note** : Le flag `hasCompletedRegistration` (DataStore) n'est plus utilisé pour le routing car Firebase Auth est la source de vérité. Il sert uniquement pour des optimisations UI (ex: skip splash screen).

---

## 🔒 Firestore Security Rules

Ajouter dans `firestore.rules` :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Collection users : Lecture/écriture uniquement pour son propre profil
    match /users/{userId} {
      // L'utilisateur peut lire et écrire son propre profil
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Admin peut lire tous les profils
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';

      // Création : Vérifier que l'UID correspond à l'utilisateur authentifié
      allow create: if request.auth != null &&
        request.auth.uid == userId &&
        request.resource.data.uid == request.auth.uid &&
        request.resource.data.email == request.auth.token.email;
    }
  }
}
```

---

## ✅ Checklist d'implémentation

### Fichiers à créer

- [ ] `data/local/RegistrationPreferences.kt` - DataStore pour flag de complétion
- [ ] `di/DataStoreModule.kt` - Injection Hilt pour DataStore (si pas déjà existant)

### Fichiers à modifier

- [ ] `data/repository/AuthRepository.kt` - Intégrer création Firestore après sign up
- [ ] `presentation/screens/auth/EmailCollectionScreen.kt` - Appeler création Firestore
- [ ] `presentation/screens/auth/QuestionnaireIntroScreen.kt` - Sauvegarder flag DataStore
- [ ] `MainActivity.kt` - Logique de routing basée sur Firebase Auth + Firestore

### Repositories existants à utiliser

- [x] `domain/repository/FirestoreUserProfileRepository.kt` - Déjà implémenté
- [x] `data/repository/impl/FirestoreUserProfileRepositoryImpl.kt` - Déjà implémenté
- [x] `data/model/UserProfile.kt` - Déjà implémenté

### Tests à créer

- [ ] `RegistrationPreferencesTest.kt` - Tests unitaires DataStore
- [ ] `EmailCollectionViewModelTest.kt` - Tests création compte + Firestore
- [ ] `QuestionnaireIntroViewModelTest.kt` - Tests flag de complétion

---

## 📊 Comparaison : Onboarding Inscription vs Personnalisation

| Aspect | Onboarding INSCRIPTION | Onboarding PERSONNALISATION |
|--------|------------------------|---------------------------|
| **Quand** | Première ouverture app | Après création compte |
| **Objectif** | Créer le compte | Personnaliser l'expérience |
| **Durée** | ~1 minute | ~2 minutes |
| **Écrans** | 6 écrans fixes | Questionnaire dynamique + écrans info |
| **Persistence Flag** | DataStore (local) | Firestore (cloud) |
| **Données Utilisateur** | Firestore `users/{uid}` (base) | Firestore `users/{uid}.onboarding` (complet) |
| **Skip possible** | Non (sauf login existant) | Non (requis pour app) |
| **Implémenté** | ❌ À faire (issue #66) | ✅ Fait |

---

## 🔗 Références

- **Issue GitHub** : #66 - feat(auth): Onboarding d'inscription
- **Modèle Firestore** : `data/model/UserProfile.kt`
- **Repository Firestore** : `domain/repository/FirestoreUserProfileRepository.kt`
- **Repository Auth** : `data/repository/AuthRepository.kt`
- **Onboarding Personnalisation** : `presentation/screens/onboarding/OnboardingScreen.kt`

---

**Créé le** : 2025-11-24
**Version** : 1.0
**Statut** : Documentation de référence
