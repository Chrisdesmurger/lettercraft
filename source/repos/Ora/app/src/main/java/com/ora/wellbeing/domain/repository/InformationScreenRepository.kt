package com.ora.wellbeing.domain.repository

import com.ora.wellbeing.data.model.onboarding.InformationScreen
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for dynamic information screens
 * Collection: onboarding_configs/{configId}.informationScreens (nested array)
 *
 * Read-only: Information screens are configured by admins via OraWebApp
 * The app only reads and displays them conditionally during onboarding
 */
interface InformationScreenRepository {

    /**
     * Observes all information screens for a specific onboarding config in real-time
     * Returns Flow<List<InformationScreen>> which emits whenever screens are updated
     *
     * @param configId Onboarding config ID (typically the active config)
     * @return Reactive Flow of all information screens for the config
     */
    fun getInformationScreensForConfig(configId: String): Flow<List<InformationScreen>>

    /**
     * Gets information screens that should be displayed at a specific position
     * Filters by position and evaluates display conditions against user responses
     *
     * @param configId Onboarding config ID
     * @param position Position in onboarding flow (0 = before Q1, 5 = after Q5, etc.)
     * @param userResponses Map of questionId -> selected answer for condition evaluation
     * @return List of information screens that match position and conditions
     */
    suspend fun getScreensForPosition(
        configId: String,
        position: Int,
        userResponses: Map<String, String>
    ): Result<List<InformationScreen>>

    /**
     * Gets a specific information screen by ID
     * Useful for previewing or testing individual screens
     *
     * @param configId Onboarding config ID
     * @param screenId Information screen ID
     * @return Result containing the screen if found, null if not found, or error
     */
    suspend fun getScreenById(configId: String, screenId: String): Result<InformationScreen?>

    /**
     * Gets all information screens for a config (one-time fetch)
     * Useful for prefetching or caching
     *
     * @param configId Onboarding config ID
     * @return Result containing list of all screens or error
     */
    suspend fun getAllScreens(configId: String): Result<List<InformationScreen>>
}
