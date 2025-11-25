package com.ora.wellbeing.presentation.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.ora.wellbeing.presentation.screens.auth.AuthScreen
import com.ora.wellbeing.presentation.screens.auth.registration.*
import timber.log.Timber

/**
 * Navigation graph pour l'onboarding d'inscription (6 écrans)
 * Appelé quand l'utilisateur n'est PAS authentifié
 */
@Composable
fun AuthNavGraph(
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
    onAuthComplete: () -> Unit
) {
    Timber.d("AuthNavGraph: Initializing")

    NavHost(
        navController = navController,
        startDestination = AuthDestinations.Splash.route,
        modifier = modifier.fillMaxSize()
    ) {
        // Écran 1: Splash avec logo ORA
        composable(AuthDestinations.Splash.route) {
            SplashScreen(
                onNavigateToWelcome = {
                    navController.navigate(AuthDestinations.Welcome.route) {
                        popUpTo(AuthDestinations.Splash.route) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            )
        }

        // Écran 2: Bienvenue
        composable(AuthDestinations.Welcome.route) {
            WelcomeScreen(
                onNavigateToEmailCollection = {
                    navController.navigate(AuthDestinations.EmailCollection.route) {
                        launchSingleTop = true
                    }
                },
                onNavigateToLogin = {
                    // Pour le MVP, on réutilise l'écran AuthScreen existant
                    // qui gère déjà le login email/password + Google
                    navController.navigate(OraDestinations.Auth.route) {
                        launchSingleTop = true
                    }
                }
            )
        }

        // Écran AuthScreen existant (login pour utilisateurs existants)
        composable(OraDestinations.Auth.route) {
            AuthScreen(
                onAuthSuccess = {
                    Timber.d("AuthNavGraph: Existing user logged in")
                    onAuthComplete()
                }
            )
        }

        // Écran 3: Collecte Email + Création compte
        composable(AuthDestinations.EmailCollection.route) {
            EmailCollectionScreen(
                onNavigateToTransition = {
                    navController.navigate(AuthDestinations.Transition.route) {
                        // Empêcher retour arrière vers EmailCollection
                        popUpTo(AuthDestinations.Welcome.route) {
                            inclusive = false
                        }
                        launchSingleTop = true
                    }
                }
            )
        }

        // Écran 5: Transition vers personnalisation
        composable(AuthDestinations.Transition.route) {
            TransitionScreen(
                onNavigateToQuestionnaireIntro = {
                    navController.navigate(AuthDestinations.QuestionnaireIntro.route) {
                        launchSingleTop = true
                    }
                }
            )
        }

        // Écran 6: Intro questionnaire
        composable(AuthDestinations.QuestionnaireIntro.route) {
            QuestionnaireIntroScreen(
                onNavigateToPersonalizationQuestionnaire = {
                    Timber.d("AuthNavGraph: Registration onboarding complete, navigating to personalization")
                    // Marquer l'onboarding d'inscription comme complété
                    // La navigation vers OnboardingScreen (personnalisation) sera gérée par MainActivity
                    onAuthComplete()
                }
            )
        }
    }
}
