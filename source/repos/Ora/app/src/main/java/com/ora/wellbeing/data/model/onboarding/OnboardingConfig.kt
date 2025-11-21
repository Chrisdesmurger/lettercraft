package com.ora.wellbeing.data.model.onboarding

import com.google.firebase.Timestamp
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

/**
 * Onboarding Configuration Model
 * Represents a complete onboarding questionnaire
 * Fetched from Firebase onboarding_configs collection
 * IMPORTANT: Firestore uses snake_case field names
 */

enum class OnboardingStatus {
    DRAFT,
    ACTIVE,
    ARCHIVED
}

@IgnoreExtraProperties
class OnboardingConfig {
    var id: String = ""
    var title: String = ""
    var description: String = ""
    var status: String = "draft"
    var version: String = "1.0"
    var questions: List<OnboardingQuestion> = emptyList()

    /**
     * Information screens to display between questions
     * Provides contextual education and engagement during onboarding
     * Screens are sorted by position and conditionally rendered
     */
    @get:PropertyName("information_screens")
    @set:PropertyName("information_screens")
    var informationScreens: List<InformationScreen> = emptyList()

    @get:PropertyName("created_at")
    @set:PropertyName("created_at")
    var createdAt: Timestamp? = null

    @get:PropertyName("updated_at")
    @set:PropertyName("updated_at")
    var updatedAt: Timestamp? = null

    @get:PropertyName("created_by")
    @set:PropertyName("created_by")
    var createdBy: String = ""

    @get:PropertyName("published_at")
    @set:PropertyName("published_at")
    var publishedAt: Timestamp? = null

    @get:PropertyName("published_by")
    @set:PropertyName("published_by")
    var publishedBy: String? = null

    constructor()

    constructor(
        id: String,
        title: String,
        description: String,
        status: String,
        version: String,
        questions: List<OnboardingQuestion>,
        informationScreens: List<InformationScreen> = emptyList(),
        createdAt: Timestamp?,
        updatedAt: Timestamp?,
        createdBy: String,
        publishedAt: Timestamp? = null,
        publishedBy: String? = null
    ) {
        this.id = id
        this.title = title
        this.description = description
        this.status = status
        this.version = version
        this.questions = questions
        this.informationScreens = informationScreens
        this.createdAt = createdAt
        this.updatedAt = updatedAt
        this.createdBy = createdBy
        this.publishedAt = publishedAt
        this.publishedBy = publishedBy
    }

    fun getStatusEnum(): OnboardingStatus {
        return when (status.lowercase()) {
            "active" -> OnboardingStatus.ACTIVE
            "draft" -> OnboardingStatus.DRAFT
            "archived" -> OnboardingStatus.ARCHIVED
            else -> OnboardingStatus.DRAFT
        }
    }

    fun isActive(): Boolean = getStatusEnum() == OnboardingStatus.ACTIVE

    /**
     * Get information screens that should be displayed for a given position
     * Filters screens based on their position and display conditions
     * @param position The current position in the onboarding flow
     * @param userResponses User's answers so far (for conditional screens)
     * @return List of screens to display at this position
     */
    fun getInformationScreensForPosition(
        position: Int,
        userResponses: Map<String, String> = emptyMap()
    ): List<InformationScreen> {
        return informationScreens
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
                true
            }
    }
}
