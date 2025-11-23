package com.ora.wellbeing.data.repository.impl

import com.google.firebase.firestore.FirebaseFirestore
import com.ora.wellbeing.data.model.onboarding.InformationScreen
import com.ora.wellbeing.data.model.onboarding.OnboardingConfig
import com.ora.wellbeing.domain.repository.InformationScreenRepository
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Firestore implementation of InformationScreenRepository
 *
 * Data Location: onboarding_configs/{configId}.informationScreens (nested array field)
 * Reads information screens from OnboardingConfig documents
 *
 * Collection Structure:
 * onboarding_configs/{configId}
 *   ├── id: String
 *   ├── version: String
 *   ├── status: String ("active", "draft", "archived")
 *   ├── questions: List<OnboardingQuestion>
 *   └── informationScreens: List<InformationScreen> <- THIS FIELD
 *
 * Privacy & Security:
 * - Read: Authenticated users (all users can read active configs)
 * - Write: Admin only via OraWebApp
 */
@Singleton
class InformationScreenRepositoryImpl @Inject constructor(
    private val firestore: FirebaseFirestore
) : InformationScreenRepository {

    companion object {
        private const val COLLECTION_ONBOARDING_CONFIGS = "onboarding_configs"
        private const val FIELD_INFORMATION_SCREENS = "information_screens" // snake_case to match backend schema
        private const val FIELD_STATUS = "status"
        private const val STATUS_ACTIVE = "active"
    }

    /**
     * Observes all information screens for a specific onboarding config in real-time
     * Listens to changes on the config document and extracts informationScreens array
     */
    override fun getInformationScreensForConfig(configId: String): Flow<List<InformationScreen>> = callbackFlow {
        Timber.d("InformationScreenRepository: Setting up listener for config $configId")

        val listener = firestore
            .collection(COLLECTION_ONBOARDING_CONFIGS)
            .document(configId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.e(error, "InformationScreenRepository: Error listening to config $configId")
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                if (snapshot == null || !snapshot.exists()) {
                    Timber.w("InformationScreenRepository: Config $configId not found")
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                // Parse OnboardingConfig to extract informationScreens
                val config = snapshot.toObject(OnboardingConfig::class.java)
                val screens = config?.informationScreens ?: emptyList()

                Timber.d("InformationScreenRepository: Loaded ${screens.size} screens for config $configId")
                trySend(screens)
            }

        awaitClose {
            Timber.d("InformationScreenRepository: Removing listener for config $configId")
            listener.remove()
        }
    }

    /**
     * Gets information screens for a specific position, filtered by display conditions
     * 1. Fetch config document
     * 2. Extract informationScreens array
     * 3. Filter by position
     * 4. Evaluate display conditions against user responses
     */
    override suspend fun getScreensForPosition(
        configId: String,
        position: Int,
        userResponses: Map<String, String>
    ): Result<List<InformationScreen>> {
        return try {
            Timber.d("InformationScreenRepository: Fetching screens for position $position in config $configId")

            val snapshot = firestore
                .collection(COLLECTION_ONBOARDING_CONFIGS)
                .document(configId)
                .get()
                .await()

            if (!snapshot.exists()) {
                Timber.w("InformationScreenRepository: Config $configId not found")
                return Result.success(emptyList())
            }

            val config = snapshot.toObject(OnboardingConfig::class.java)
            val allScreens = config?.informationScreens ?: emptyList()

            // Filter by position and display conditions
            val matchingScreens = allScreens
                .filter { screen -> screen.position == position }
                .filter { screen ->
                    // If no conditions, always show
                    if (screen.displayConditions == null) return@filter true

                    // Check conditions against user responses
                    val conditions = screen.displayConditions!!
                    if (conditions.showIfAnswer != null) {
                        val userAnswer = userResponses[conditions.showIfAnswer]
                        if (userAnswer != null) {
                            return@filter screen.shouldDisplay(conditions.showIfAnswer!!, userAnswer)
                        }
                    }

                    // Default: show if no matching conditions
                    true
                }

            Timber.d("InformationScreenRepository: Found ${matchingScreens.size} screens for position $position (filtered from ${allScreens.size} total)")
            Result.success(matchingScreens)
        } catch (e: Exception) {
            Timber.e(e, "InformationScreenRepository: Failed to fetch screens for position $position")
            Result.failure(e)
        }
    }

    /**
     * Gets a specific information screen by ID
     * Searches through informationScreens array to find matching ID
     */
    override suspend fun getScreenById(configId: String, screenId: String): Result<InformationScreen?> {
        return try {
            Timber.d("InformationScreenRepository: Fetching screen $screenId from config $configId")

            val snapshot = firestore
                .collection(COLLECTION_ONBOARDING_CONFIGS)
                .document(configId)
                .get()
                .await()

            if (!snapshot.exists()) {
                Timber.w("InformationScreenRepository: Config $configId not found")
                return Result.success(null)
            }

            val config = snapshot.toObject(OnboardingConfig::class.java)
            val screen = config?.informationScreens?.find { it.id == screenId }

            if (screen != null) {
                Timber.d("InformationScreenRepository: Found screen $screenId")
            } else {
                Timber.w("InformationScreenRepository: Screen $screenId not found in config $configId")
            }

            Result.success(screen)
        } catch (e: Exception) {
            Timber.e(e, "InformationScreenRepository: Failed to fetch screen $screenId")
            Result.failure(e)
        }
    }

    /**
     * Gets all information screens for a config (one-time fetch)
     * Useful for prefetching or caching
     */
    override suspend fun getAllScreens(configId: String): Result<List<InformationScreen>> {
        return try {
            Timber.d("InformationScreenRepository: Fetching all screens for config $configId")

            val snapshot = firestore
                .collection(COLLECTION_ONBOARDING_CONFIGS)
                .document(configId)
                .get()
                .await()

            if (!snapshot.exists()) {
                Timber.w("InformationScreenRepository: Config $configId not found")
                return Result.success(emptyList())
            }

            val config = snapshot.toObject(OnboardingConfig::class.java)
            val screens = config?.informationScreens ?: emptyList()

            Timber.d("InformationScreenRepository: Loaded ${screens.size} screens for config $configId")
            Result.success(screens)
        } catch (e: Exception) {
            Timber.e(e, "InformationScreenRepository: Failed to fetch all screens")
            Result.failure(e)
        }
    }
}
