package com.ora.wellbeing.data.repository.impl

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.ora.wellbeing.data.model.recommendation.RecommendationRule
import com.ora.wellbeing.domain.repository.RecommendationRuleRepository
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Firestore implementation of RecommendationRuleRepository
 *
 * Data Location: recommendation_rules/{ruleId}
 * Each rule is a top-level document with conditions and program recommendations
 *
 * Collection Structure:
 * recommendation_rules/{ruleId}
 *   ├── id: String
 *   ├── name: String
 *   ├── description: String
 *   ├── priority: Int (higher = evaluated first)
 *   ├── conditions: List<RuleCondition> (AND logic)
 *   ├── programIds: List<String> (programs to recommend if conditions match)
 *   ├── boostScore: Int (points added to program scores)
 *   └── isActive: Boolean (only active rules are evaluated)
 *
 * Business Logic:
 * - Rules are evaluated client-side after onboarding completion
 * - All conditions within a rule must match (AND logic)
 * - Multiple rules can match the same user
 * - Program scores are summed from all matching rules
 * - Programs with highest scores are recommended first
 *
 * Privacy & Security:
 * - Read: Authenticated users (all users can read rules)
 * - Write: Admin only via OraWebApp
 */
@Singleton
class RecommendationRuleRepositoryImpl @Inject constructor(
    private val firestore: FirebaseFirestore
) : RecommendationRuleRepository {

    companion object {
        private const val COLLECTION_RECOMMENDATION_RULES = "recommendation_rules"
        private const val FIELD_IS_ACTIVE = "isActive"
        private const val FIELD_PRIORITY = "priority"
    }

    /**
     * Observes all active recommendation rules in real-time
     * Ordered by priority DESC (highest priority first)
     */
    override fun getActiveRules(): Flow<List<RecommendationRule>> = callbackFlow {
        Timber.d("RecommendationRuleRepository: Setting up listener for active rules")

        val listener = firestore
            .collection(COLLECTION_RECOMMENDATION_RULES)
            .whereEqualTo(FIELD_IS_ACTIVE, true)
            .orderBy(FIELD_PRIORITY, Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.e(error, "RecommendationRuleRepository: Error listening to active rules")
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                if (snapshot == null || snapshot.isEmpty) {
                    Timber.d("RecommendationRuleRepository: No active rules found")
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val rules = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(RecommendationRule::class.java)?.apply {
                        id = doc.id
                    }
                }

                Timber.d("RecommendationRuleRepository: Loaded ${rules.size} active rules")
                trySend(rules)
            }

        awaitClose {
            Timber.d("RecommendationRuleRepository: Removing listener for active rules")
            listener.remove()
        }
    }

    /**
     * Observes all recommendation rules (active and inactive) in real-time
     * Ordered by priority DESC
     */
    override fun getAllRules(): Flow<List<RecommendationRule>> = callbackFlow {
        Timber.d("RecommendationRuleRepository: Setting up listener for all rules")

        val listener = firestore
            .collection(COLLECTION_RECOMMENDATION_RULES)
            .orderBy(FIELD_PRIORITY, Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.e(error, "RecommendationRuleRepository: Error listening to all rules")
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                if (snapshot == null || snapshot.isEmpty) {
                    Timber.d("RecommendationRuleRepository: No rules found")
                    trySend(emptyList())
                    return@addSnapshotListener
                }

                val rules = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(RecommendationRule::class.java)?.apply {
                        id = doc.id
                    }
                }

                Timber.d("RecommendationRuleRepository: Loaded ${rules.size} total rules (active + inactive)")
                trySend(rules)
            }

        awaitClose {
            Timber.d("RecommendationRuleRepository: Removing listener for all rules")
            listener.remove()
        }
    }

    /**
     * Gets a specific recommendation rule by ID
     */
    override suspend fun getRuleById(ruleId: String): Result<RecommendationRule?> {
        return try {
            Timber.d("RecommendationRuleRepository: Fetching rule $ruleId")

            val snapshot = firestore
                .collection(COLLECTION_RECOMMENDATION_RULES)
                .document(ruleId)
                .get()
                .await()

            if (!snapshot.exists()) {
                Timber.w("RecommendationRuleRepository: Rule $ruleId not found")
                return Result.success(null)
            }

            val rule = snapshot.toObject(RecommendationRule::class.java)?.apply {
                id = snapshot.id
            }

            Timber.d("RecommendationRuleRepository: Loaded rule ${rule?.name}")
            Result.success(rule)
        } catch (e: Exception) {
            Timber.e(e, "RecommendationRuleRepository: Failed to fetch rule $ruleId")
            Result.failure(e)
        }
    }

    /**
     * Gets all active rules (one-time fetch)
     * Ordered by priority DESC
     */
    override suspend fun getActiveRulesOnce(): Result<List<RecommendationRule>> {
        return try {
            Timber.d("RecommendationRuleRepository: Fetching active rules once")

            val snapshot = firestore
                .collection(COLLECTION_RECOMMENDATION_RULES)
                .whereEqualTo(FIELD_IS_ACTIVE, true)
                .orderBy(FIELD_PRIORITY, Query.Direction.DESCENDING)
                .get()
                .await()

            if (snapshot.isEmpty) {
                Timber.w("RecommendationRuleRepository: No active rules found")
                return Result.success(emptyList())
            }

            val rules = snapshot.documents.mapNotNull { doc ->
                doc.toObject(RecommendationRule::class.java)?.apply {
                    id = doc.id
                }
            }

            Timber.d("RecommendationRuleRepository: Loaded ${rules.size} active rules")
            Result.success(rules)
        } catch (e: Exception) {
            Timber.e(e, "RecommendationRuleRepository: Failed to fetch active rules")
            Result.failure(e)
        }
    }

    /**
     * Evaluates user responses against all active rules (client-side)
     * Returns matching rules ordered by priority DESC
     *
     * Algorithm:
     * 1. Fetch all active rules
     * 2. For each rule, check if ALL conditions match (AND logic)
     * 3. Return matching rules in priority order
     */
    override suspend fun getMatchingRules(userResponses: Map<String, String>): Result<List<RecommendationRule>> {
        return try {
            Timber.d("RecommendationRuleRepository: Evaluating ${userResponses.size} user responses against active rules")

            // Fetch all active rules
            val rulesResult = getActiveRulesOnce()
            if (rulesResult.isFailure) {
                return Result.failure(rulesResult.exceptionOrNull() ?: Exception("Failed to fetch rules"))
            }

            val allRules = rulesResult.getOrNull() ?: emptyList()

            // Filter rules where ALL conditions match (client-side evaluation)
            val matchingRules = allRules.filter { rule ->
                rule.matches(userResponses)
            }

            Timber.d("RecommendationRuleRepository: ${matchingRules.size} rules matched out of ${allRules.size} active rules")
            matchingRules.forEach { rule ->
                Timber.d("  - Matched: ${rule.name} (priority ${rule.priority}, boost +${rule.boostScore})")
            }

            Result.success(matchingRules)
        } catch (e: Exception) {
            Timber.e(e, "RecommendationRuleRepository: Failed to evaluate matching rules")
            Result.failure(e)
        }
    }

    /**
     * Computes recommended program IDs with aggregated boost scores
     * Returns map of programId -> total boost score, ordered by score DESC
     *
     * Algorithm:
     * 1. Get all matching rules
     * 2. For each rule, add boostScore to all programIds in that rule
     * 3. Aggregate scores for programs that appear in multiple rules
     * 4. Sort by score DESC
     *
     * Example:
     * - Rule 1 (priority 100, boost +50): ["prog_meditation_basics", "prog_stress_relief"]
     * - Rule 2 (priority 80, boost +30): ["prog_meditation_basics", "prog_sleep"]
     * Result: {
     *   "prog_meditation_basics": 80,  // 50 + 30
     *   "prog_stress_relief": 50,
     *   "prog_sleep": 30
     * }
     */
    override suspend fun computeRecommendedPrograms(userResponses: Map<String, String>): Result<Map<String, Int>> {
        return try {
            Timber.d("RecommendationRuleRepository: Computing recommended programs for user responses")

            // Get matching rules
            val matchingRulesResult = getMatchingRules(userResponses)
            if (matchingRulesResult.isFailure) {
                return Result.failure(matchingRulesResult.exceptionOrNull() ?: Exception("Failed to get matching rules"))
            }

            val matchingRules = matchingRulesResult.getOrNull() ?: emptyList()

            if (matchingRules.isEmpty()) {
                Timber.w("RecommendationRuleRepository: No matching rules, returning empty recommendations")
                return Result.success(emptyMap())
            }

            // Aggregate boost scores for each program
            val programScores = mutableMapOf<String, Int>()

            matchingRules.forEach { rule ->
                rule.programIds.forEach { programId ->
                    val currentScore = programScores[programId] ?: 0
                    programScores[programId] = currentScore + rule.boostScore
                    Timber.d("  - Program $programId: +${rule.boostScore} (from rule ${rule.name}) = ${programScores[programId]}")
                }
            }

            // Sort by score DESC
            val sortedPrograms = programScores.entries
                .sortedByDescending { it.value }
                .associate { it.key to it.value }

            Timber.d("RecommendationRuleRepository: Computed ${sortedPrograms.size} recommended programs")
            sortedPrograms.forEach { (programId, score) ->
                Timber.d("  - $programId: score $score")
            }

            Result.success(sortedPrograms)
        } catch (e: Exception) {
            Timber.e(e, "RecommendationRuleRepository: Failed to compute recommended programs")
            Result.failure(e)
        }
    }
}
