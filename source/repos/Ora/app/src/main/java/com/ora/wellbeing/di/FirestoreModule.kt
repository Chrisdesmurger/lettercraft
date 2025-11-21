package com.ora.wellbeing.di

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.ktx.storage
import com.ora.wellbeing.data.local.dao.ContentDao
import com.ora.wellbeing.data.local.dao.ProgramDao
import com.ora.wellbeing.data.repository.impl.ContentRepositoryImpl
import com.ora.wellbeing.data.repository.impl.DailyJournalRepositoryImpl
import com.ora.wellbeing.data.repository.impl.FirestoreUserProfileRepositoryImpl
import com.ora.wellbeing.data.repository.impl.FirestoreUserStatsRepositoryImpl
import com.ora.wellbeing.data.repository.impl.GratitudeRepositoryImpl
import com.ora.wellbeing.data.repository.impl.InformationScreenRepositoryImpl
import com.ora.wellbeing.data.repository.impl.ProgramRepositoryImpl
import com.ora.wellbeing.data.repository.impl.RecommendationRuleRepositoryImpl
import com.ora.wellbeing.data.repository.impl.UserProgramRepositoryImpl
import com.ora.wellbeing.domain.repository.ContentRepository
import com.ora.wellbeing.domain.repository.DailyJournalRepository
import com.ora.wellbeing.domain.repository.FirestoreUserProfileRepository
import com.ora.wellbeing.domain.repository.FirestoreUserStatsRepository
import com.ora.wellbeing.domain.repository.GratitudeRepository
import com.ora.wellbeing.domain.repository.InformationScreenRepository
import com.ora.wellbeing.domain.repository.ProgramRepository
import com.ora.wellbeing.domain.repository.RecommendationRuleRepository
import com.ora.wellbeing.domain.repository.UserProgramRepository
import com.ora.wellbeing.data.repository.UserStatsRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import timber.log.Timber
import javax.inject.Singleton

// FIX(user-dynamic): Module Hilt pour Firestore et repositories utilisateur
// Fournit instances Firestore avec cache offline activé

@Module
@InstallIn(SingletonComponent::class)
object FirestoreModule {

    /**
     * Fournit l'instance Firebase Firestore avec configuration offline-first
     * - Cache persistant activé (10MB)
     * - Synchronisation automatique en arrière-plan
     * - Gestion des write pending
     */
    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore {
        Timber.d("provideFirebaseFirestore: Initializing Firestore with offline persistence")

        val firestore = Firebase.firestore

        // FIX(user-dynamic): Configuration offline selon user_data_contract.yaml
        val settings = FirebaseFirestoreSettings.Builder()
            .setPersistenceEnabled(true) // Active le cache offline
            .setCacheSizeBytes(10 * 1024 * 1024L) // 10MB de cache (selon contrat)
            .build()

        firestore.firestoreSettings = settings

        Timber.i("provideFirebaseFirestore: Firestore configuré avec cache offline 10MB")
        return firestore
    }

    /**
     * Fournit le repository Firestore pour les profils utilisateur
     */
    @Provides
    @Singleton
    fun provideFirestoreUserProfileRepository(
        firestore: FirebaseFirestore
    ): FirestoreUserProfileRepository {
        Timber.d("provideFirestoreUserProfileRepository: Creating repository")
        return FirestoreUserProfileRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository Firestore pour les statistiques utilisateur
     */
    @Provides
    @Singleton
    fun provideFirestoreUserStatsRepository(
        firestore: FirebaseFirestore
    ): FirestoreUserStatsRepository {
        Timber.d("provideFirestoreUserStatsRepository: Creating repository")
        return FirestoreUserStatsRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository pour les entrées de gratitude
     */
    @Provides
    @Singleton
    fun provideGratitudeRepository(
        firestore: FirebaseFirestore
    ): GratitudeRepository {
        Timber.d("provideGratitudeRepository: Creating repository")
        return GratitudeRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository pour les entrées de journal quotidien (NEW)
     */
    @Provides
    @Singleton
    fun provideDailyJournalRepository(
        firestore: FirebaseFirestore
    ): DailyJournalRepository {
        Timber.d("provideDailyJournalRepository: Creating repository")
        return DailyJournalRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository pour les écrans d'information dynamiques (Phase 1)
     * Read-only: configurés par les admins via OraWebApp
     */
    @Provides
    @Singleton
    fun provideInformationScreenRepository(
        firestore: FirebaseFirestore
    ): InformationScreenRepository {
        Timber.d("provideInformationScreenRepository: Creating repository")
        return InformationScreenRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository pour les règles de recommandation (Phase 1)
     * Read-only: configurés par les admins via OraWebApp
     * Utilisé par le moteur de recommandation pour personnaliser les suggestions de programmes
     */
    @Provides
    @Singleton
    fun provideRecommendationRuleRepository(
        firestore: FirebaseFirestore
    ): RecommendationRuleRepository {
        Timber.d("provideRecommendationRuleRepository: Creating repository")
        return RecommendationRuleRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository pour le catalogue de programmes
     * UPDATED: Now uses offline-first pattern with Room cache + Firestore sync
     */
    @Provides
    @Singleton
    fun provideProgramRepository(
        firestore: FirebaseFirestore,
        programDao: ProgramDao
    ): ProgramRepository {
        Timber.d("provideProgramRepository: Creating offline-first repository")
        return ProgramRepositoryImpl(firestore, programDao)
    }

    /**
     * Fournit le repository pour les inscriptions utilisateur aux programmes
     */
    @Provides
    @Singleton
    fun provideUserProgramRepository(
        firestore: FirebaseFirestore
    ): UserProgramRepository {
        Timber.d("provideUserProgramRepository: Creating repository")
        return UserProgramRepositoryImpl(firestore)
    }

    /**
     * Fournit le repository pour le catalogue de contenu (méditations, vidéos yoga)
     * UPDATED: Now uses offline-first pattern with Room cache + Firestore sync
     */
    @Provides
    @Singleton
    fun provideContentRepository(
        firestore: FirebaseFirestore,
        contentDao: ContentDao
    ): ContentRepository {
        Timber.d("provideContentRepository: Creating offline-first repository")
        return ContentRepositoryImpl(firestore, contentDao)
    }

    /**
     * Fournit l'instance Firebase Storage pour l'upload de photos de profil
     */
    @Provides
    @Singleton
    fun provideFirebaseStorage(): FirebaseStorage {
        Timber.d("provideFirebaseStorage: Initializing Firebase Storage")
        return Firebase.storage
    }

    /**
     * Fournit le repository pour les statistiques de pratique détaillées
     */
    @Provides
    @Singleton
    fun providePracticeStatsRepository(
        firestore: FirebaseFirestore,
        auth: FirebaseAuth,
        userStatsRepository: UserStatsRepository
    ): com.ora.wellbeing.data.repository.PracticeStatsRepository {
        Timber.d("providePracticeStatsRepository: Creating repository")
        return com.ora.wellbeing.data.repository.PracticeStatsRepository(
            firestore,
            auth,
            userStatsRepository
        )
    }
}
