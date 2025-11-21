package com.ora.wellbeing.data.model.onboarding

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

/**
 * Information Screen Model
 * Represents a dynamic informational screen displayed between onboarding questions
 * Inspired by Minday's onboarding flow to provide contextual information and education
 *
 * These screens can be:
 * - Static (always shown at a specific position)
 * - Conditional (shown based on user answers)
 *
 * IMPORTANT: Firestore uses snake_case field names
 */

/**
 * Display conditions for showing/hiding information screens
 * Allows dynamic screen insertion based on user responses
 */
@IgnoreExtraProperties
class DisplayConditions {
    /**
     * Question ID to evaluate for display logic
     * Example: "goals_question"
     */
    @get:PropertyName("show_if_answer")
    @set:PropertyName("show_if_answer")
    var showIfAnswer: String? = null

    /**
     * Option ID value that triggers display
     * Screen shows if user selected this option
     * Example: "reduce_stress"
     */
    @get:PropertyName("show_if_value")
    @set:PropertyName("show_if_value")
    var showIfValue: String? = null

    /**
     * Option ID value that prevents display
     * Screen is hidden if user selected this option
     * Example: "experienced_user"
     */
    @get:PropertyName("show_if_not_value")
    @set:PropertyName("show_if_not_value")
    var showIfNotValue: String? = null

    constructor()

    constructor(
        showIfAnswer: String?,
        showIfValue: String?,
        showIfNotValue: String?
    ) {
        this.showIfAnswer = showIfAnswer
        this.showIfValue = showIfValue
        this.showIfNotValue = showIfNotValue
    }

    /**
     * Evaluates if this screen should be displayed based on user's answer
     * @param questionId The ID of the answered question
     * @param selectedValue The value/option ID the user selected
     * @return true if screen should be shown, false otherwise
     */
    fun shouldDisplay(questionId: String, selectedValue: String): Boolean {
        // No conditions = always show
        if (showIfAnswer == null) return true

        // Check if this is the relevant question
        if (showIfAnswer != questionId) return true

        // Check exclusion condition first
        if (showIfNotValue != null && selectedValue == showIfNotValue) {
            return false
        }

        // Check inclusion condition
        if (showIfValue != null && selectedValue != showIfValue) {
            return false
        }

        return true
    }
}

@IgnoreExtraProperties
class InformationScreen {
    /**
     * Unique identifier for this information screen
     * Example: "stress_reduction_intro"
     */
    var id: String = ""

    /**
     * Position in the onboarding flow
     * 0 = before first question
     * 1 = after question 0, before question 1
     * 5 = after question 4, before question 5
     */
    var position: Int = 0

    /**
     * Main title of the information screen
     * Default/fallback language version
     */
    var title: String = ""

    /**
     * French localized title
     * Overrides 'title' when locale is FR
     */
    @get:PropertyName("title_fr")
    @set:PropertyName("title_fr")
    var titleFr: String? = null

    /**
     * English localized title
     * Overrides 'title' when locale is EN
     */
    @get:PropertyName("title_en")
    @set:PropertyName("title_en")
    var titleEn: String? = null

    /**
     * Optional subtitle for additional context
     */
    var subtitle: String? = null

    /**
     * French localized subtitle
     */
    @get:PropertyName("subtitle_fr")
    @set:PropertyName("subtitle_fr")
    var subtitleFr: String? = null

    /**
     * English localized subtitle
     */
    @get:PropertyName("subtitle_en")
    @set:PropertyName("subtitle_en")
    var subtitleEn: String? = null

    /**
     * Rich text content (supports Markdown)
     * Can include formatted text, links, etc.
     */
    var content: String? = null

    /**
     * URL to hero/banner image
     * Displayed at top of information screen
     */
    @get:PropertyName("image_url")
    @set:PropertyName("image_url")
    var imageUrl: String? = null

    /**
     * List of bullet points for key information
     * Default/fallback language version
     */
    @get:PropertyName("bullet_points")
    @set:PropertyName("bullet_points")
    var bulletPoints: List<String>? = null

    /**
     * French localized bullet points
     */
    @get:PropertyName("bullet_points_fr")
    @set:PropertyName("bullet_points_fr")
    var bulletPointsFr: List<String>? = null

    /**
     * English localized bullet points
     */
    @get:PropertyName("bullet_points_en")
    @set:PropertyName("bullet_points_en")
    var bulletPointsEn: List<String>? = null

    /**
     * Call-to-action button text
     * Default: "Continuer"
     */
    @get:PropertyName("cta_text")
    @set:PropertyName("cta_text")
    var ctaText: String = "Continuer"

    /**
     * French localized CTA text
     */
    @get:PropertyName("cta_text_fr")
    @set:PropertyName("cta_text_fr")
    var ctaTextFr: String? = null

    /**
     * English localized CTA text
     */
    @get:PropertyName("cta_text_en")
    @set:PropertyName("cta_text_en")
    var ctaTextEn: String? = null

    /**
     * Optional background color (hex format)
     * Example: "#F5EFE6" (warm beige from Ora theme)
     */
    @get:PropertyName("background_color")
    @set:PropertyName("background_color")
    var backgroundColor: String? = null

    /**
     * Display conditions for conditional rendering
     * Null = always display at specified position
     */
    @get:PropertyName("display_conditions")
    @set:PropertyName("display_conditions")
    var displayConditions: DisplayConditions? = null

    constructor()

    constructor(
        id: String,
        position: Int,
        title: String,
        titleFr: String? = null,
        titleEn: String? = null,
        subtitle: String? = null,
        subtitleFr: String? = null,
        subtitleEn: String? = null,
        content: String? = null,
        imageUrl: String? = null,
        bulletPoints: List<String>? = null,
        bulletPointsFr: List<String>? = null,
        bulletPointsEn: List<String>? = null,
        ctaText: String = "Continuer",
        ctaTextFr: String? = null,
        ctaTextEn: String? = null,
        backgroundColor: String? = null,
        displayConditions: DisplayConditions? = null
    ) {
        this.id = id
        this.position = position
        this.title = title
        this.titleFr = titleFr
        this.titleEn = titleEn
        this.subtitle = subtitle
        this.subtitleFr = subtitleFr
        this.subtitleEn = subtitleEn
        this.content = content
        this.imageUrl = imageUrl
        this.bulletPoints = bulletPoints
        this.bulletPointsFr = bulletPointsFr
        this.bulletPointsEn = bulletPointsEn
        this.ctaText = ctaText
        this.ctaTextFr = ctaTextFr
        this.ctaTextEn = ctaTextEn
        this.backgroundColor = backgroundColor
        this.displayConditions = displayConditions
    }

    /**
     * Get localized title based on user's locale
     * @param locale User's locale ("fr" or "en")
     * @return Localized title, fallback to default if not available
     */
    fun getLocalizedTitle(locale: String = "fr"): String {
        return when (locale.lowercase()) {
            "fr" -> titleFr ?: title
            "en" -> titleEn ?: title
            else -> title
        }
    }

    /**
     * Get localized subtitle based on user's locale
     * @param locale User's locale ("fr" or "en")
     * @return Localized subtitle, null if not set
     */
    fun getLocalizedSubtitle(locale: String = "fr"): String? {
        return when (locale.lowercase()) {
            "fr" -> subtitleFr ?: subtitle
            "en" -> subtitleEn ?: subtitle
            else -> subtitle
        }
    }

    /**
     * Get localized bullet points based on user's locale
     * @param locale User's locale ("fr" or "en")
     * @return Localized bullet points, fallback to default if not available
     */
    fun getLocalizedBulletPoints(locale: String = "fr"): List<String>? {
        return when (locale.lowercase()) {
            "fr" -> bulletPointsFr ?: bulletPoints
            "en" -> bulletPointsEn ?: bulletPoints
            else -> bulletPoints
        }
    }

    /**
     * Get localized CTA text based on user's locale
     * @param locale User's locale ("fr" or "en")
     * @return Localized CTA text, fallback to default if not available
     */
    fun getLocalizedCtaText(locale: String = "fr"): String {
        return when (locale.lowercase()) {
            "fr" -> ctaTextFr ?: ctaText
            "en" -> ctaTextEn ?: ctaText
            else -> ctaText
        }
    }

    /**
     * Check if this screen should be displayed given user's answer
     * @param questionId ID of the question being evaluated
     * @param selectedValue Value/option ID the user selected
     * @return true if screen should be shown
     */
    fun shouldDisplay(questionId: String, selectedValue: String): Boolean {
        return displayConditions?.shouldDisplay(questionId, selectedValue) ?: true
    }
}
