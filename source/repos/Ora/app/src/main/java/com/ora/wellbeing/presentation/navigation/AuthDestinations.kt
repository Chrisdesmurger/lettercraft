package com.ora.wellbeing.presentation.navigation

/**
 * Destinations pour l'onboarding d'inscription (6 écrans)
 * Séparé de OraDestinations car utilisé avant authentification
 */
sealed class AuthDestinations(val route: String) {
    // Écran 1: Splash avec logo ORA
    object Splash : AuthDestinations("auth/splash")

    // Écran 2: Bienvenue avec CTA "Créer mon espace ORA"
    object Welcome : AuthDestinations("auth/welcome")

    // Écran 3: Collecte email + création compte Firebase
    object EmailCollection : AuthDestinations("auth/email_collection")

    // Écran 4: Vérification email (OPTIONNEL - skip pour MVP)
    // object EmailVerification : AuthDestinations("auth/email_verification")

    // Écran 5: Transition vers personnalisation
    object Transition : AuthDestinations("auth/transition")

    // Écran 6: Intro questionnaire personnalisation
    object QuestionnaireIntro : AuthDestinations("auth/questionnaire_intro")
}
