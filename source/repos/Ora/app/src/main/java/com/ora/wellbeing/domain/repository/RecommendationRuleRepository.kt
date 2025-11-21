package com.ora.wellbeing.domain.repository

import com.ora.wellbeing.data.model.recommendation.RecommendationRule
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for recommendation rules engine
 * Collection: recommendation_rules/{ruleId}
 *
 * Read-only: Rules are configured by admins via OraWebApp
 * The app uses them to personalize program recommendations based on onboarding responses
 *
 * Business Logic:
 * - Rules are evaluated client-side after onboarding completion
 * - Multiple rules can match (AND logic within rule, priority-based scoring across rules)
 * - Programs with highest aggregate boost scores are recommended first
 */
interface RecommendationRuleRepository {

    /**
     * Observes all active recommendation rules in real-time
     * Returns Flow<List<RecommendationRule>> ordered by priority DESC (highest priority first)
     * Only includes rules where isActive = true
     *
     * @return Reactive Flow of active recommendation rules
     */
    fun getActiveRules(): Flow<List<RecommendationRule>>

    /**
     * Observes all recommendation rules (active and inactive) in real-time
     * Useful for admin testing or debugging
     *
     * @return Reactive Flow of all recommendation rules
     */
    fun getAllRules(): Flow<List<RecommendationRule>>

    /**
     * Gets a specific recommendation rule by ID
     * Useful for testing individual rules
     *
     * @param ruleId Rule ID
     * @return Result containing the rule if found, null if not found, or error
     */
    suspend fun getRuleById(ruleId: String): Result<RecommendationRule?>

    /**
     * Gets all active rules (one-time fetch)
     * Useful for batch evaluation at onboarding completion
     *
     * @return Result containing list of active rules ordered by priority DESC, or error
     */
    suspend fun getActiveRulesOnce(): Result<List<RecommendationRule>>

    /**
     * Evaluates user responses against all active rules
     * Returns matching rules ordered by priority DESC
     * This is a client-side operation (no Firestore query)
     *
     * @param userResponses Map of questionId -> selected answer
     * @return List of matching rules ordered by priority
     */
    suspend fun getMatchingRules(userResponses: Map<String, String>): Result<List<RecommendationRule>>

    /**
     * Computes recommended program IDs with boost scores
     * Aggregates boost scores from all matching rules
     * Returns map of programId -> total boost score, ordered by score DESC
     *
     * Example:
     * - Rule 1 matches: boosts programs ["prog_meditation_basics", "prog_stress_relief"] by +50
     * - Rule 2 matches: boosts programs ["prog_meditation_basics", "prog_sleep"] by +30
     * - Result: {"prog_meditation_basics": 80, "prog_stress_relief": 50, "prog_sleep": 30}
     *
     * @param userResponses Map of questionId -> selected answer
     * @return Result containing map of programId -> boost score, ordered by score DESC
     */
    suspend fun computeRecommendedPrograms(userResponses: Map<String, String>): Result<Map<String, Int>>
}
