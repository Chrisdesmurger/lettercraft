package com.ora.wellbeing.data.model.onboarding

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit Tests for OnboardingConfig Model
 * Tests information screen filtering, position-based display, and condition evaluation
 *
 * Coverage:
 * - getInformationScreensForPosition() with position filtering
 * - Display condition filtering
 * - Multiple screens at same position
 * - Edge cases (empty screens, no conditions)
 */
class OnboardingConfigTest {

    // ========================================
    // getInformationScreensForPosition() Tests
    // ========================================

    @Test
    fun `getInformationScreensForPosition returns screens at correct position`() {
        // Given
        val screen1 = InformationScreen(
            id = "intro",
            position = 0,
            title = "Welcome",
            displayConditions = null
        )
        val screen2 = InformationScreen(
            id = "midpoint",
            position = 3,
            title = "You're doing great",
            displayConditions = null
        )
        val screen3 = InformationScreen(
            id = "ending",
            position = 5,
            title = "Almost done",
            displayConditions = null
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screen1, screen2, screen3),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When
        val screensAtPosition3 = config.getInformationScreensForPosition(3)

        // Then
        assertEquals(1, screensAtPosition3.size)
        assertEquals("midpoint", screensAtPosition3[0].id)
    }

    @Test
    fun `getInformationScreensForPosition returns empty list when no screens at position`() {
        // Given
        val screen1 = InformationScreen(
            id = "intro",
            position = 0,
            title = "Welcome",
            displayConditions = null
        )
        val screen2 = InformationScreen(
            id = "midpoint",
            position = 3,
            title = "You're doing great",
            displayConditions = null
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screen1, screen2),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When
        val screensAtPosition5 = config.getInformationScreensForPosition(5)

        // Then
        assertEquals(0, screensAtPosition5.size)
    }

    @Test
    fun `getInformationScreensForPosition filters by display conditions`() {
        // Given
        val conditionsMatch = DisplayConditions(
            showIfAnswer = "goals_question",
            showIfValue = "reduce_stress",
            showIfNotValue = null
        )
        val conditionsNoMatch = DisplayConditions(
            showIfAnswer = "goals_question",
            showIfValue = "improve_focus",
            showIfNotValue = null
        )

        val screenMatch = InformationScreen(
            id = "stress-info",
            position = 2,
            title = "Stress Reduction",
            displayConditions = conditionsMatch
        )
        val screenNoMatch = InformationScreen(
            id = "focus-info",
            position = 2,
            title = "Focus Tips",
            displayConditions = conditionsNoMatch
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screenMatch, screenNoMatch),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        val userResponses = mapOf("goals_question" to "reduce_stress")

        // When
        val screens = config.getInformationScreensForPosition(2, userResponses)

        // Then
        assertEquals(1, screens.size)
        assertEquals("stress-info", screens[0].id)
    }

    @Test
    fun `getInformationScreensForPosition shows screens without conditions regardless of user responses`() {
        // Given
        val screenWithoutConditions = InformationScreen(
            id = "always-show",
            position = 1,
            title = "Always Visible",
            displayConditions = null
        )
        val screenWithConditions = InformationScreen(
            id = "conditional",
            position = 1,
            title = "Conditional Screen",
            displayConditions = DisplayConditions(
                showIfAnswer = "goals_question",
                showIfValue = "reduce_stress",
                showIfNotValue = null
            )
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screenWithoutConditions, screenWithConditions),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        val userResponses = mapOf("goals_question" to "improve_focus") // Different answer

        // When
        val screens = config.getInformationScreensForPosition(1, userResponses)

        // Then
        assertEquals(1, screens.size)
        assertEquals("always-show", screens[0].id)
    }

    @Test
    fun `getInformationScreensForPosition handles multiple screens at same position`() {
        // Given
        val screen1 = InformationScreen(
            id = "screen1",
            position = 2,
            title = "Screen 1",
            displayConditions = null
        )
        val screen2 = InformationScreen(
            id = "screen2",
            position = 2,
            title = "Screen 2",
            displayConditions = null
        )
        val screen3 = InformationScreen(
            id = "screen3",
            position = 2,
            title = "Screen 3",
            displayConditions = null
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screen1, screen2, screen3),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When
        val screens = config.getInformationScreensForPosition(2)

        // Then
        assertEquals(3, screens.size)
        assertTrue(screens.any { it.id == "screen1" })
        assertTrue(screens.any { it.id == "screen2" })
        assertTrue(screens.any { it.id == "screen3" })
    }

    @Test
    fun `getInformationScreensForPosition returns empty when config has no information screens`() {
        // Given
        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = emptyList(),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When
        val screens = config.getInformationScreensForPosition(0)

        // Then
        assertEquals(0, screens.size)
    }

    @Test
    fun `getInformationScreensForPosition filters out screens with unmatched conditions`() {
        // Given
        val conditionsNotMet = DisplayConditions(
            showIfAnswer = "experience_level",
            showIfValue = "expert",
            showIfNotValue = null
        )

        val screen = InformationScreen(
            id = "expert-tips",
            position = 3,
            title = "Expert Tips",
            displayConditions = conditionsNotMet
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screen),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        val userResponses = mapOf("experience_level" to "beginner") // Doesn't match

        // When
        val screens = config.getInformationScreensForPosition(3, userResponses)

        // Then
        assertEquals(0, screens.size)
    }

    @Test
    fun `getInformationScreensForPosition works with empty user responses map`() {
        // Given
        val screenNoConditions = InformationScreen(
            id = "always-show",
            position = 0,
            title = "Welcome",
            displayConditions = null
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screenNoConditions),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When
        val screens = config.getInformationScreensForPosition(0, emptyMap())

        // Then
        assertEquals(1, screens.size)
        assertEquals("always-show", screens[0].id)
    }

    @Test
    fun `getInformationScreensForPosition handles show_if_not_value conditions correctly`() {
        // Given
        val conditionsExclude = DisplayConditions(
            showIfAnswer = "experience_level",
            showIfValue = null,
            showIfNotValue = "expert"
        )

        val screenForBeginners = InformationScreen(
            id = "beginner-guide",
            position = 1,
            title = "Beginner's Guide",
            displayConditions = conditionsExclude
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screenForBeginners),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When - user is beginner (not expert, should show)
        val screensForBeginner = config.getInformationScreensForPosition(
            1,
            mapOf("experience_level" to "beginner")
        )

        // Then
        assertEquals(1, screensForBeginner.size)

        // When - user is expert (should hide)
        val screensForExpert = config.getInformationScreensForPosition(
            1,
            mapOf("experience_level" to "expert")
        )

        // Then
        assertEquals(0, screensForExpert.size)
    }

    @Test
    fun `getInformationScreensForPosition defaults to empty map for user responses parameter`() {
        // Given
        val screen = InformationScreen(
            id = "intro",
            position = 0,
            title = "Welcome",
            displayConditions = null
        )

        val config = OnboardingConfig(
            id = "test-config",
            title = "Test Onboarding",
            description = "Test",
            status = "active",
            version = "1.0",
            questions = emptyList(),
            informationScreens = listOf(screen),
            createdAt = null,
            updatedAt = null,
            createdBy = "test"
        )

        // When - not providing userResponses parameter (uses default empty map)
        val screens = config.getInformationScreensForPosition(0)

        // Then
        assertEquals(1, screens.size)
        assertEquals("intro", screens[0].id)
    }

    // ========================================
    // OnboardingStatus and Helper Method Tests
    // ========================================

    @Test
    fun `getStatusEnum returns correct enum for status string`() {
        // Given
        val config = OnboardingConfig()

        // When/Then
        config.status = "active"
        assertEquals(OnboardingStatus.ACTIVE, config.getStatusEnum())

        config.status = "draft"
        assertEquals(OnboardingStatus.DRAFT, config.getStatusEnum())

        config.status = "archived"
        assertEquals(OnboardingStatus.ARCHIVED, config.getStatusEnum())
    }

    @Test
    fun `getStatusEnum is case-insensitive`() {
        // Given
        val config = OnboardingConfig()

        // When/Then
        config.status = "ACTIVE"
        assertEquals(OnboardingStatus.ACTIVE, config.getStatusEnum())

        config.status = "Draft"
        assertEquals(OnboardingStatus.DRAFT, config.getStatusEnum())
    }

    @Test
    fun `getStatusEnum returns DRAFT for unknown status`() {
        // Given
        val config = OnboardingConfig()
        config.status = "unknown_status"

        // When
        val result = config.getStatusEnum()

        // Then
        assertEquals(OnboardingStatus.DRAFT, result)
    }

    @Test
    fun `isActive returns true only when status is ACTIVE`() {
        // Given
        val config = OnboardingConfig()

        // When/Then
        config.status = "active"
        assertTrue(config.isActive())

        config.status = "draft"
        assertFalse(config.isActive())

        config.status = "archived"
        assertFalse(config.isActive())
    }
}
