package com.ora.wellbeing.data.model.onboarding

import org.junit.Test
import org.junit.Assert.*
import java.util.Locale

/**
 * Unit Tests for InformationScreen Model
 * Tests localization logic, display conditions, and fallback behavior
 *
 * Coverage:
 * - Localized getters (title, subtitle, bulletPoints, ctaText)
 * - Display condition logic (shouldDisplay)
 * - Fallback behavior (FR → default, EN → default)
 * - Edge cases (null values, missing responses)
 */
class InformationScreenTest {

    // ========================================
    // Localized Title Tests
    // ========================================

    @Test
    fun `getLocalizedTitle returns French title when locale is fr`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Welcome",
            titleFr = "Bienvenue",
            titleEn = "Welcome EN"
        )

        // When
        val result = screen.getLocalizedTitle("fr")

        // Then
        assertEquals("Bienvenue", result)
    }

    @Test
    fun `getLocalizedTitle returns English title when locale is en`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Welcome",
            titleFr = "Bienvenue",
            titleEn = "Welcome EN"
        )

        // When
        val result = screen.getLocalizedTitle("en")

        // Then
        assertEquals("Welcome EN", result)
    }

    @Test
    fun `getLocalizedTitle returns default title when locale is unsupported`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Welcome",
            titleFr = "Bienvenue",
            titleEn = "Welcome EN"
        )

        // When
        val result = screen.getLocalizedTitle("es")

        // Then
        assertEquals("Welcome", result)
    }

    @Test
    fun `getLocalizedTitle falls back to default when French title is null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Welcome",
            titleFr = null,
            titleEn = "Welcome EN"
        )

        // When
        val result = screen.getLocalizedTitle("fr")

        // Then
        assertEquals("Welcome", result)
    }

    @Test
    fun `getLocalizedTitle falls back to default when English title is null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Welcome",
            titleFr = "Bienvenue",
            titleEn = null
        )

        // When
        val result = screen.getLocalizedTitle("en")

        // Then
        assertEquals("Welcome", result)
    }

    @Test
    fun `getLocalizedTitle is case-insensitive for locale`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Welcome",
            titleFr = "Bienvenue",
            titleEn = "Welcome EN"
        )

        // When
        val resultFr = screen.getLocalizedTitle("FR")
        val resultEn = screen.getLocalizedTitle("EN")

        // Then
        assertEquals("Bienvenue", resultFr)
        assertEquals("Welcome EN", resultEn)
    }

    // ========================================
    // Localized Subtitle Tests
    // ========================================

    @Test
    fun `getLocalizedSubtitle returns French subtitle when locale is fr`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            subtitle = "Default subtitle",
            subtitleFr = "Sous-titre français",
            subtitleEn = "English subtitle"
        )

        // When
        val result = screen.getLocalizedSubtitle("fr")

        // Then
        assertEquals("Sous-titre français", result)
    }

    @Test
    fun `getLocalizedSubtitle returns English subtitle when locale is en`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            subtitle = "Default subtitle",
            subtitleFr = "Sous-titre français",
            subtitleEn = "English subtitle"
        )

        // When
        val result = screen.getLocalizedSubtitle("en")

        // Then
        assertEquals("English subtitle", result)
    }

    @Test
    fun `getLocalizedSubtitle returns null when all subtitles are null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            subtitle = null,
            subtitleFr = null,
            subtitleEn = null
        )

        // When
        val result = screen.getLocalizedSubtitle("fr")

        // Then
        assertNull(result)
    }

    @Test
    fun `getLocalizedSubtitle falls back to default when French subtitle is null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            subtitle = "Default subtitle",
            subtitleFr = null
        )

        // When
        val result = screen.getLocalizedSubtitle("fr")

        // Then
        assertEquals("Default subtitle", result)
    }

    // ========================================
    // Localized Bullet Points Tests
    // ========================================

    @Test
    fun `getLocalizedBulletPoints returns French bullets when locale is fr`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            bulletPoints = listOf("Point 1", "Point 2"),
            bulletPointsFr = listOf("Point 1 FR", "Point 2 FR"),
            bulletPointsEn = listOf("Point 1 EN", "Point 2 EN")
        )

        // When
        val result = screen.getLocalizedBulletPoints("fr")

        // Then
        assertEquals(listOf("Point 1 FR", "Point 2 FR"), result)
    }

    @Test
    fun `getLocalizedBulletPoints returns English bullets when locale is en`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            bulletPoints = listOf("Point 1", "Point 2"),
            bulletPointsFr = listOf("Point 1 FR", "Point 2 FR"),
            bulletPointsEn = listOf("Point 1 EN", "Point 2 EN")
        )

        // When
        val result = screen.getLocalizedBulletPoints("en")

        // Then
        assertEquals(listOf("Point 1 EN", "Point 2 EN"), result)
    }

    @Test
    fun `getLocalizedBulletPoints returns null when all bullets are null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            bulletPoints = null,
            bulletPointsFr = null,
            bulletPointsEn = null
        )

        // When
        val result = screen.getLocalizedBulletPoints("fr")

        // Then
        assertNull(result)
    }

    @Test
    fun `getLocalizedBulletPoints falls back to default when French bullets are null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            bulletPoints = listOf("Default 1", "Default 2"),
            bulletPointsFr = null
        )

        // When
        val result = screen.getLocalizedBulletPoints("fr")

        // Then
        assertEquals(listOf("Default 1", "Default 2"), result)
    }

    // ========================================
    // Localized CTA Text Tests
    // ========================================

    @Test
    fun `getLocalizedCtaText returns French CTA when locale is fr`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            ctaText = "Continue",
            ctaTextFr = "Continuer",
            ctaTextEn = "Next"
        )

        // When
        val result = screen.getLocalizedCtaText("fr")

        // Then
        assertEquals("Continuer", result)
    }

    @Test
    fun `getLocalizedCtaText returns English CTA when locale is en`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            ctaText = "Continue",
            ctaTextFr = "Continuer",
            ctaTextEn = "Next"
        )

        // When
        val result = screen.getLocalizedCtaText("en")

        // Then
        assertEquals("Next", result)
    }

    @Test
    fun `getLocalizedCtaText falls back to default when French CTA is null`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            ctaText = "Continue",
            ctaTextFr = null
        )

        // When
        val result = screen.getLocalizedCtaText("fr")

        // Then
        assertEquals("Continue", result)
    }

    @Test
    fun `getLocalizedCtaText uses default Continuer when all CTA texts are default`() {
        // Given
        val screen = InformationScreen()
        screen.id = "test"
        screen.position = 1
        screen.title = "Test"

        // When
        val result = screen.getLocalizedCtaText("fr")

        // Then
        assertEquals("Continuer", result)
    }

    // ========================================
    // Display Condition Tests
    // ========================================

    @Test
    fun `shouldDisplay returns true when no display conditions are set`() {
        // Given
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = null
        )

        // When
        val result = screen.shouldDisplay("any_question", "any_value")

        // Then
        assertTrue(result)
    }

    @Test
    fun `shouldDisplay returns true when show_if_value matches user response`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = "goals_question",
            showIfValue = "reduce_stress",
            showIfNotValue = null
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When
        val result = screen.shouldDisplay("goals_question", "reduce_stress")

        // Then
        assertTrue(result)
    }

    @Test
    fun `shouldDisplay returns false when show_if_value does not match user response`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = "goals_question",
            showIfValue = "reduce_stress",
            showIfNotValue = null
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When
        val result = screen.shouldDisplay("goals_question", "improve_sleep")

        // Then
        assertFalse(result)
    }

    @Test
    fun `shouldDisplay returns true when show_if_not_value does not match user response`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = "experience_level",
            showIfValue = null,
            showIfNotValue = "expert"
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When
        val result = screen.shouldDisplay("experience_level", "beginner")

        // Then
        assertTrue(result)
    }

    @Test
    fun `shouldDisplay returns false when show_if_not_value matches user response`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = "experience_level",
            showIfValue = null,
            showIfNotValue = "expert"
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When
        val result = screen.shouldDisplay("experience_level", "expert")

        // Then
        assertFalse(result)
    }

    @Test
    fun `shouldDisplay returns true when conditions are for a different question`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = "goals_question",
            showIfValue = "reduce_stress",
            showIfNotValue = null
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When
        val result = screen.shouldDisplay("other_question", "any_value")

        // Then
        assertTrue(result)
    }

    @Test
    fun `shouldDisplay returns true when DisplayConditions has no showIfAnswer set`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = null,
            showIfValue = "reduce_stress",
            showIfNotValue = null
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When
        val result = screen.shouldDisplay("any_question", "any_value")

        // Then
        assertTrue(result)
    }

    @Test
    fun `shouldDisplay handles both show_if_value and show_if_not_value correctly`() {
        // Given
        val conditions = DisplayConditions(
            showIfAnswer = "goals_question",
            showIfValue = "reduce_stress",
            showIfNotValue = "improve_focus"
        )
        val screen = InformationScreen(
            id = "test",
            position = 1,
            title = "Test",
            displayConditions = conditions
        )

        // When - matches show_if_value and doesn't match show_if_not_value
        val result1 = screen.shouldDisplay("goals_question", "reduce_stress")

        // Then
        assertTrue(result1)

        // When - matches show_if_not_value (should be hidden)
        val result2 = screen.shouldDisplay("goals_question", "improve_focus")

        // Then
        assertFalse(result2)
    }
}
