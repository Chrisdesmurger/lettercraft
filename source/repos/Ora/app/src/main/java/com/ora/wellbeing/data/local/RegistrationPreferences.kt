package com.ora.wellbeing.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * DataStore pour gérer les préférences liées à l'onboarding d'inscription
 * Stocke uniquement le flag de complétion (local, reset après désinstallation)
 */
@Singleton
class RegistrationPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
        name = "registration_preferences"
    )

    companion object {
        val HAS_COMPLETED_REGISTRATION_KEY = booleanPreferencesKey("has_completed_registration_onboarding")
    }

    /**
     * Vérifie si l'onboarding d'inscription a été complété
     * Utilisé pour optimisations UI (ex: skip splash screen)
     */
    suspend fun hasCompletedRegistrationOnboarding(): Boolean {
        return context.dataStore.data.map { preferences ->
            preferences[HAS_COMPLETED_REGISTRATION_KEY] ?: false
        }.first()
    }

    /**
     * Marque l'onboarding d'inscription comme complété
     * Appelé après l'écran 6 (QuestionnaireIntroScreen)
     */
    suspend fun setRegistrationOnboardingCompleted() {
        context.dataStore.edit { preferences ->
            preferences[HAS_COMPLETED_REGISTRATION_KEY] = true
        }
        Timber.d("RegistrationPreferences: Onboarding d'inscription marqué comme complété")
    }

    /**
     * Réinitialise le flag (pour tests ou debug)
     */
    suspend fun resetRegistrationOnboarding() {
        context.dataStore.edit { preferences ->
            preferences[HAS_COMPLETED_REGISTRATION_KEY] = false
        }
        Timber.d("RegistrationPreferences: Flag de complétion réinitialisé")
    }
}
