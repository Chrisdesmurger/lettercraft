package com.ora.wellbeing.data.model.recommendation

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit Tests for RecommendationRule Model
 * Tests rule matching logic, condition evaluation, and utility methods
 *
 * Coverage:
 * - RuleCondition.matches() with different operators (equals, contains, not_equals)
 * - RecommendationRule.matches() with AND logic
 * - Priority and boost category getters
 * - Edge cases (null values, empty conditions, inactive rules)
 */
class RecommendationRuleTest {

    // ========================================
    // RuleCondition.matches() Tests - equals operator
    // ========================================

    @Test
    fun `RuleCondition matches with equals operator when values match`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "equals",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches("reduce_stress")

        // Then
        assertTrue(result)
    }

    @Test
    fun `RuleCondition does not match with equals operator when values differ`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "equals",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches("improve_sleep")

        // Then
        assertFalse(result)
    }

    @Test
    fun `RuleCondition returns false with equals operator when userAnswer is null`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "equals",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches(null)

        // Then
        assertFalse(result)
    }

    // ========================================
    // RuleCondition.matches() Tests - contains operator
    // ========================================

    @Test
    fun `RuleCondition matches with contains operator when list contains value`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "contains",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches(listOf("reduce_stress", "improve_sleep"))

        // Then
        assertTrue(result)
    }

    @Test
    fun `RuleCondition does not match with contains operator when list does not contain value`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "contains",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches(listOf("improve_sleep", "better_focus"))

        // Then
        assertFalse(result)
    }

    @Test
    fun `RuleCondition matches with contains operator when string contains value`() {
        // Given
        val condition = RuleCondition(
            questionId = "description",
            operator = "contains",
            value = "stress"
        )

        // When
        val result = condition.matches("I want to reduce stress in my life")

        // Then
        assertTrue(result)
    }

    @Test
    fun `RuleCondition contains operator is case-insensitive for string matching`() {
        // Given
        val condition = RuleCondition(
            questionId = "description",
            operator = "contains",
            value = "STRESS"
        )

        // When
        val result = condition.matches("I want to reduce stress in my life")

        // Then
        assertTrue(result)
    }

    @Test
    fun `RuleCondition matches with contains operator when single value equals`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "contains",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches("reduce_stress")

        // Then
        assertTrue(result)
    }

    // ========================================
    // RuleCondition.matches() Tests - not_equals operator
    // ========================================

    @Test
    fun `RuleCondition matches with not_equals operator when values differ`() {
        // Given
        val condition = RuleCondition(
            questionId = "experience_level",
            operator = "not_equals",
            value = "expert"
        )

        // When
        val result = condition.matches("beginner")

        // Then
        assertTrue(result)
    }

    @Test
    fun `RuleCondition does not match with not_equals operator when values match`() {
        // Given
        val condition = RuleCondition(
            questionId = "experience_level",
            operator = "not_equals",
            value = "expert"
        )

        // When
        val result = condition.matches("expert")

        // Then
        assertFalse(result)
    }

    @Test
    fun `RuleCondition matches with not_equals operator when list does not contain value`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "not_equals",
            value = "expert_practice"
        )

        // When
        val result = condition.matches(listOf("reduce_stress", "improve_sleep"))

        // Then
        assertTrue(result)
    }

    @Test
    fun `RuleCondition does not match with not_equals operator when list contains value`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "not_equals",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches(listOf("reduce_stress", "improve_sleep"))

        // Then
        assertFalse(result)
    }

    // ========================================
    // RuleCondition.matches() Tests - invalid operator
    // ========================================

    @Test
    fun `RuleCondition returns false with invalid operator`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "invalid_operator",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches("reduce_stress")

        // Then
        assertFalse(result)
    }

    // ========================================
    // RecommendationRule.matches() Tests
    // ========================================

    @Test
    fun `RecommendationRule matches when all conditions are true`() {
        // Given
        val rule = RecommendationRule(
            id = "stress-beginners",
            name = "Stress Reduction for Beginners",
            description = "Test rule",
            priority = 50,
            conditions = listOf(
                RuleCondition("goals_question", "equals", "reduce_stress"),
                RuleCondition("experience_level", "equals", "beginner")
            ),
            programIds = listOf("mindfulness-basics"),
            boostScore = 70,
            isActive = true
        )

        val userResponses = mapOf(
            "goals_question" to "reduce_stress",
            "experience_level" to "beginner"
        )

        // When
        val result = rule.matches(userResponses)

        // Then
        assertTrue(result)
    }

    @Test
    fun `RecommendationRule does not match when one condition is false`() {
        // Given
        val rule = RecommendationRule(
            id = "stress-beginners",
            name = "Stress Reduction for Beginners",
            description = "Test rule",
            priority = 50,
            conditions = listOf(
                RuleCondition("goals_question", "equals", "reduce_stress"),
                RuleCondition("experience_level", "equals", "beginner")
            ),
            programIds = listOf("mindfulness-basics"),
            boostScore = 70,
            isActive = true
        )

        val userResponses = mapOf(
            "goals_question" to "reduce_stress",
            "experience_level" to "expert" // Does not match
        )

        // When
        val result = rule.matches(userResponses)

        // Then
        assertFalse(result)
    }

    @Test
    fun `RecommendationRule matches when no conditions are defined`() {
        // Given
        val rule = RecommendationRule(
            id = "default-rule",
            name = "Default Recommendations",
            description = "Always applies",
            priority = 10,
            conditions = emptyList(),
            programIds = listOf("general-wellness"),
            boostScore = 30,
            isActive = true
        )

        val userResponses = mapOf(
            "goals_question" to "anything"
        )

        // When
        val result = rule.matches(userResponses)

        // Then
        assertTrue(result)
    }

    @Test
    fun `RecommendationRule does not match when question is missing from user responses`() {
        // Given
        val rule = RecommendationRule(
            id = "stress-beginners",
            name = "Stress Reduction for Beginners",
            description = "Test rule",
            priority = 50,
            conditions = listOf(
                RuleCondition("goals_question", "equals", "reduce_stress"),
                RuleCondition("missing_question", "equals", "some_value") // Missing
            ),
            programIds = listOf("mindfulness-basics"),
            boostScore = 70,
            isActive = true
        )

        val userResponses = mapOf(
            "goals_question" to "reduce_stress"
        )

        // When
        val result = rule.matches(userResponses)

        // Then
        assertFalse(result)
    }

    @Test
    fun `RecommendationRule does not match when rule is inactive`() {
        // Given
        val rule = RecommendationRule(
            id = "inactive-rule",
            name = "Inactive Rule",
            description = "Should not match",
            priority = 50,
            conditions = listOf(
                RuleCondition("goals_question", "equals", "reduce_stress")
            ),
            programIds = listOf("mindfulness-basics"),
            boostScore = 70,
            isActive = false // Inactive
        )

        val userResponses = mapOf(
            "goals_question" to "reduce_stress"
        )

        // When
        val result = rule.matches(userResponses)

        // Then
        assertFalse(result)
    }

    @Test
    fun `RecommendationRule handles mixed condition operators correctly`() {
        // Given
        val rule = RecommendationRule(
            id = "complex-rule",
            name = "Complex Matching Rule",
            description = "Uses multiple operators",
            priority = 60,
            conditions = listOf(
                RuleCondition("goals_question", "contains", "reduce_stress"),
                RuleCondition("experience_level", "not_equals", "expert"),
                RuleCondition("time_preference", "equals", "morning")
            ),
            programIds = listOf("morning-mindfulness"),
            boostScore = 80,
            isActive = true
        )

        val userResponses = mapOf(
            "goals_question" to listOf("reduce_stress", "improve_sleep"),
            "experience_level" to "beginner",
            "time_preference" to "morning"
        )

        // When
        val result = rule.matches(userResponses)

        // Then
        assertTrue(result)
    }

    // ========================================
    // getPriorityCategory() Tests
    // ========================================

    @Test
    fun `getPriorityCategory returns critical for priority 80-100`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.priority = 80
        assertEquals("critical", rule.getPriorityCategory())

        rule.priority = 100
        assertEquals("critical", rule.getPriorityCategory())

        rule.priority = 95
        assertEquals("critical", rule.getPriorityCategory())
    }

    @Test
    fun `getPriorityCategory returns high for priority 50-79`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.priority = 50
        assertEquals("high", rule.getPriorityCategory())

        rule.priority = 79
        assertEquals("high", rule.getPriorityCategory())

        rule.priority = 65
        assertEquals("high", rule.getPriorityCategory())
    }

    @Test
    fun `getPriorityCategory returns medium for priority 20-49`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.priority = 20
        assertEquals("medium", rule.getPriorityCategory())

        rule.priority = 49
        assertEquals("medium", rule.getPriorityCategory())

        rule.priority = 35
        assertEquals("medium", rule.getPriorityCategory())
    }

    @Test
    fun `getPriorityCategory returns low for priority below 20`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.priority = 0
        assertEquals("low", rule.getPriorityCategory())

        rule.priority = 19
        assertEquals("low", rule.getPriorityCategory())

        rule.priority = 10
        assertEquals("low", rule.getPriorityCategory())
    }

    // ========================================
    // getBoostCategory() Tests
    // ========================================

    @Test
    fun `getBoostCategory returns strong for boost 80-100`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.boostScore = 80
        assertEquals("strong", rule.getBoostCategory())

        rule.boostScore = 100
        assertEquals("strong", rule.getBoostCategory())

        rule.boostScore = 90
        assertEquals("strong", rule.getBoostCategory())
    }

    @Test
    fun `getBoostCategory returns good for boost 50-79`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.boostScore = 50
        assertEquals("good", rule.getBoostCategory())

        rule.boostScore = 79
        assertEquals("good", rule.getBoostCategory())

        rule.boostScore = 65
        assertEquals("good", rule.getBoostCategory())
    }

    @Test
    fun `getBoostCategory returns moderate for boost 20-49`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.boostScore = 20
        assertEquals("moderate", rule.getBoostCategory())

        rule.boostScore = 49
        assertEquals("moderate", rule.getBoostCategory())

        rule.boostScore = 35
        assertEquals("moderate", rule.getBoostCategory())
    }

    @Test
    fun `getBoostCategory returns weak for boost below 20`() {
        // Given
        val rule = RecommendationRule()

        // When/Then
        rule.boostScore = 0
        assertEquals("weak", rule.getBoostCategory())

        rule.boostScore = 19
        assertEquals("weak", rule.getBoostCategory())

        rule.boostScore = 10
        assertEquals("weak", rule.getBoostCategory())
    }

    // ========================================
    // Edge Cases and Integration Tests
    // ========================================

    @Test
    fun `RuleCondition handles empty list correctly`() {
        // Given
        val condition = RuleCondition(
            questionId = "goals_question",
            operator = "contains",
            value = "reduce_stress"
        )

        // When
        val result = condition.matches(emptyList<String>())

        // Then
        assertFalse(result)
    }

    @Test
    fun `RecommendationRule with empty conditions matches any response`() {
        // Given
        val rule = RecommendationRule(
            id = "catch-all",
            name = "Catch All Rule",
            description = "Matches everyone",
            priority = 5,
            conditions = emptyList(),
            programIds = listOf("general-program"),
            boostScore = 20,
            isActive = true
        )

        // When
        val result1 = rule.matches(emptyMap())
        val result2 = rule.matches(mapOf("any" to "value"))

        // Then
        assertTrue(result1)
        assertTrue(result2)
    }
}
