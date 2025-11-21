package com.ora.wellbeing.data.model.recommendation

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

/**
 * Recommendation Rule Model
 * Represents business logic for recommending programs based on user's onboarding responses
 * Configured by admins in the OraWebApp admin portal
 *
 * Example use case:
 * - If user answers "reduce stress" AND "beginner level"
 * - Recommend programs: ["mindfulness-basics", "stress-relief-7-days"]
 * - Boost score: +50 points
 *
 * Rules are evaluated in priority order (highest first)
 * Multiple matching rules can combine to create final recommendation score
 *
 * IMPORTANT: Firestore uses snake_case field names
 */

/**
 * Rule Condition Model
 * Represents a single matching condition for a recommendation rule
 * All conditions in a rule must match for the rule to apply (AND logic)
 */
@IgnoreExtraProperties
class RuleCondition {
    /**
     * ID of the onboarding question to evaluate
     * Example: "goals_question", "experience_level"
     */
    @get:PropertyName("question_id")
    @set:PropertyName("question_id")
    var questionId: String = ""

    /**
     * Comparison operator for matching
     * Supported values:
     * - "equals": Exact match (single-select questions)
     * - "contains": Partial match (multi-select questions, array contains)
     * - "not_equals": Exclusion match (user did NOT select this)
     */
    var operator: String = "equals"

    /**
     * Value to match against user's answer
     * This is typically the option ID from the AnswerOption
     * Example: "reduce_stress", "beginner", "morning"
     */
    var value: String = ""

    constructor()

    constructor(
        questionId: String,
        operator: String,
        value: String
    ) {
        this.questionId = questionId
        this.operator = operator
        this.value = value
    }

    /**
     * Evaluates if this condition matches the user's answer
     * @param userAnswer The user's response to the question (can be single value or list for multi-select)
     * @return true if condition matches, false otherwise
     */
    fun matches(userAnswer: Any?): Boolean {
        if (userAnswer == null) return false

        return when (operator) {
            "equals" -> {
                userAnswer.toString() == value
            }
            "contains" -> {
                when (userAnswer) {
                    is List<*> -> userAnswer.any { it.toString() == value }
                    is String -> userAnswer.contains(value, ignoreCase = true)
                    else -> userAnswer.toString() == value
                }
            }
            "not_equals" -> {
                when (userAnswer) {
                    is List<*> -> !userAnswer.any { it.toString() == value }
                    else -> userAnswer.toString() != value
                }
            }
            else -> false
        }
    }
}

@IgnoreExtraProperties
class RecommendationRule {
    /**
     * Unique identifier for this rule
     * Example: "stress-reduction-beginners"
     */
    var id: String = ""

    /**
     * Human-readable name for admin reference
     * Example: "Stress Reduction for Beginners"
     */
    var name: String = ""

    /**
     * Description explaining the rule's purpose and logic
     * Example: "Recommends stress relief programs for users new to meditation"
     */
    var description: String = ""

    /**
     * Priority for rule evaluation
     * Higher values = higher priority (evaluated first)
     * Range: 0-100 recommended
     * Default: 0
     *
     * Use cases:
     * - 80-100: Critical/override rules (safety, medical)
     * - 50-79: High priority (specific targeting)
     * - 20-49: Medium priority (general recommendations)
     * - 0-19: Low priority (fallback recommendations)
     */
    var priority: Int = 0

    /**
     * List of conditions that must ALL match for rule to apply
     * Empty list = no conditions (always applies)
     * All conditions use AND logic (every condition must be true)
     */
    var conditions: List<RuleCondition> = emptyList()

    /**
     * List of program IDs to recommend when rule matches
     * Example: ["mindfulness-7-days", "stress-relief-basics"]
     * Programs should exist in the programs collection
     */
    @get:PropertyName("program_ids")
    @set:PropertyName("program_ids")
    var programIds: List<String> = emptyList()

    /**
     * Score boost to apply to recommended programs
     * Higher boost = programs appear higher in recommendations
     * Default: 50
     * Range: 0-100 recommended
     *
     * Use cases:
     * - 80-100: Strong match, highly confident
     * - 50-79: Good match, recommended
     * - 20-49: Moderate match, consider
     * - 0-19: Weak match, fallback option
     */
    @get:PropertyName("boost_score")
    @set:PropertyName("boost_score")
    var boostScore: Int = 50

    /**
     * Whether this rule is active and should be evaluated
     * Default: true
     * Set to false to temporarily disable a rule without deleting it
     */
    @get:PropertyName("is_active")
    @set:PropertyName("is_active")
    var isActive: Boolean = true

    constructor()

    constructor(
        id: String,
        name: String,
        description: String,
        priority: Int,
        conditions: List<RuleCondition>,
        programIds: List<String>,
        boostScore: Int = 50,
        isActive: Boolean = true
    ) {
        this.id = id
        this.name = name
        this.description = description
        this.priority = priority
        this.conditions = conditions
        this.programIds = programIds
        this.boostScore = boostScore
        this.isActive = isActive
    }

    /**
     * Evaluates if this rule matches the user's onboarding responses
     * @param userResponses Map of question IDs to user's answers
     * @return true if ALL conditions match (AND logic), false otherwise
     */
    fun matches(userResponses: Map<String, Any?>): Boolean {
        // Inactive rules never match
        if (!isActive) return false

        // No conditions = always matches (default rule)
        if (conditions.isEmpty()) return true

        // All conditions must match (AND logic)
        return conditions.all { condition ->
            val userAnswer = userResponses[condition.questionId]
            condition.matches(userAnswer)
        }
    }

    /**
     * Get the priority category for display/sorting
     * @return String description of priority level
     */
    fun getPriorityCategory(): String {
        return when (priority) {
            in 80..100 -> "critical"
            in 50..79 -> "high"
            in 20..49 -> "medium"
            else -> "low"
        }
    }

    /**
     * Get the boost category for display
     * @return String description of boost strength
     */
    fun getBoostCategory(): String {
        return when (boostScore) {
            in 80..100 -> "strong"
            in 50..79 -> "good"
            in 20..49 -> "moderate"
            else -> "weak"
        }
    }
}
