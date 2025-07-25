/**
 * useQuota Hook - React hook for quota management
 * Provides quota status, checking, and management functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export interface QuotaStatus {
  letters_generated: number
  max_letters: number
  remaining_letters: number
  reset_date: string
  can_generate: boolean
  subscription_tier: 'free' | 'premium'
  first_generation_date?: string
}

export interface UseQuotaResult {
  quota: QuotaStatus | null
  loading: boolean
  error: string | null
  refreshQuota: () => Promise<void>
  checkCanGenerate: () => boolean
  getUpgradeMessage: () => string
  isNearLimit: () => boolean
  getProgressPercentage: () => number
  incrementLetterCount: () => Promise<boolean>
}

/**
 * Hook principal pour la gestion des quotas
 */
export function useQuota(): UseQuotaResult {
  const [quota, setQuota] = useState<QuotaStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fonction pour récupérer le statut des quotas directement depuis Supabase
  const refreshQuota = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setQuota(null)
        setError('Utilisateur non connecté')
        return
      }

      // Récupérer les données directement depuis Supabase
      const { data: quotaData, error: quotaError } = await supabase
        .from('user_quotas')
        .select('*, first_generation_date')
        .eq('user_id', user.id)
        .single()

      // Récupérer le tier d'abonnement
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single()

      const subscriptionTier = profileData?.subscription_tier || 'free'

      // Si pas de quota, créer un enregistrement par défaut
      if (quotaError && quotaError.code === 'PGRST116') {
        const maxLetters = subscriptionTier === 'premium' ? 1000 : 10
        
        // Pour un nouvel utilisateur, pas de reset_date ni first_generation_date 
        // Ces champs seront définis lors de la première génération
        const { data: newQuota, error: createError } = await supabase
          .from('user_quotas')
          .insert({
            user_id: user.id,
            letters_generated: 0,
            max_letters: maxLetters,
            reset_date: null, // Sera défini lors de la première génération
            first_generation_date: null // Sera défini lors de la première génération
          })
          .select()
          .single()

        if (createError) {
          throw new Error('Impossible de créer le quota utilisateur')
        }

        setQuota({
          letters_generated: 0,
          max_letters: maxLetters,
          remaining_letters: maxLetters,
          reset_date: '', // Pas de reset défini tant qu'il n'y a pas eu de première génération
          can_generate: true,
          subscription_tier: subscriptionTier,
          first_generation_date: undefined
        })
        return
      }

      if (quotaError) {
        throw new Error('Erreur lors de la récupération des quotas')
      }

      // Calculer la date de reset personnalisée basée sur first_generation_date
      const now = new Date()
      let currentQuota = quotaData
      let nextResetDate = null

      // Si l'utilisateur a déjà généré au moins une lettre
      if (quotaData.first_generation_date) {
        const firstGenDate = new Date(quotaData.first_generation_date)
        
        // Calculer 30 jours après la première génération
        const baseResetDate = new Date(firstGenDate)
        baseResetDate.setDate(baseResetDate.getDate() + 30)
        
        // Si la date de reset de base est passée, calculer le prochain cycle mensuel
        if (now >= baseResetDate) {
          // Calculer combien de mois se sont écoulés depuis la date de reset de base
          const monthsElapsed = Math.floor((now.getTime() - baseResetDate.getTime()) / (30 * 24 * 60 * 60 * 1000))
          nextResetDate = new Date(baseResetDate)
          nextResetDate.setMonth(nextResetDate.getMonth() + monthsElapsed + 1)
          
          // Si nous devons effectuer un reset
          if (quotaData.reset_date && now >= new Date(quotaData.reset_date)) {
            const { data: resetQuota, error: resetError } = await supabase
              .from('user_quotas')
              .update({
                letters_generated: 0,
                reset_date: nextResetDate.toISOString(),
                updated_at: now.toISOString()
              })
              .eq('user_id', user.id)
              .select()
              .single()

            if (resetError) {
              console.warn('Erreur lors du reset des quotas:', resetError)
            } else {
              currentQuota = resetQuota
            }
          }
        } else {
          // La première période de 30 jours n'est pas encore écoulée
          nextResetDate = baseResetDate
        }
      }
      
      // Si pas de first_generation_date, pas de reset défini
      if (!nextResetDate && !quotaData.first_generation_date) {
        nextResetDate = null
      }

      // Mettre à jour max_letters si nécessaire
      const expectedMaxLetters = subscriptionTier === 'premium' ? 1000 : 10
      if (currentQuota.max_letters !== expectedMaxLetters) {
        const { data: updatedQuota, error: updateError } = await supabase
          .from('user_quotas')
          .update({
            max_letters: expectedMaxLetters,
            updated_at: now.toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single()

        if (!updateError) {
          currentQuota = updatedQuota
        }
      }

      setQuota({
        letters_generated: currentQuota.letters_generated,
        max_letters: currentQuota.max_letters,
        remaining_letters: currentQuota.max_letters - currentQuota.letters_generated,
        reset_date: nextResetDate ? nextResetDate.toISOString() : (currentQuota.reset_date || ''),
        can_generate: currentQuota.letters_generated < currentQuota.max_letters,
        subscription_tier: subscriptionTier,
        first_generation_date: currentQuota.first_generation_date
      })

    } catch (err) {
      console.error('Erreur useQuota:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      toast.error('Impossible de charger les informations de quota')
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger les quotas au montage du composant
  useEffect(() => {
    refreshQuota()
  }, [refreshQuota])

  // Rafraîchir les quotas quand une lettre est générée
  useEffect(() => {
    const handleLetterGenerated = () => {
      setTimeout(() => {
        refreshQuota()
      }, 1000) // Petit délai pour permettre à la base de données d'être mise à jour
    }

    window.addEventListener('letter-generated', handleLetterGenerated)
    return () => {
      window.removeEventListener('letter-generated', handleLetterGenerated)
    }
  }, [refreshQuota])

  // Vérifier si l'utilisateur peut générer une lettre
  const checkCanGenerate = useCallback((): boolean => {
    if (!quota) return false
    return quota.can_generate
  }, [quota])

  // Obtenir le message d'upgrade approprié
  const getUpgradeMessage = useCallback((): string => {
    if (!quota) return 'Chargement...'
    
    if (quota.subscription_tier === 'free') {
      return `${quota.remaining_letters} générations restantes ce mois. Passez à Premium pour des générations illimitées !`
    }
    
    return 'Générations illimitées avec votre abonnement Premium'
  }, [quota])

  // Vérifier si l'utilisateur approche de sa limite
  const isNearLimit = useCallback((): boolean => {
    if (!quota) return false
    if (quota.subscription_tier === 'premium') return false
    
    const usagePercentage = (quota.letters_generated / quota.max_letters) * 100
    return usagePercentage >= 80 // Considéré comme proche de la limite à 80%
  }, [quota])

  // Obtenir le pourcentage d'utilisation
  const getProgressPercentage = useCallback((): number => {
    if (!quota) return 0
    if (quota.subscription_tier === 'premium') return 0 // Pas de limite pour premium
    
    return Math.min((quota.letters_generated / quota.max_letters) * 100, 100)
  }, [quota])

  // Fonction pour incrémenter le compteur de lettres
  const incrementLetterCount = useCallback(async (): Promise<boolean> => {
    if (!quota || !quota.can_generate) {
      return false
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const now = new Date()
      const isFirstGeneration = quota.letters_generated === 0

      // Préparer les données de mise à jour
      const updateData: any = {
        letters_generated: quota.letters_generated + 1,
        updated_at: now.toISOString()
      }

      // Si c'est la première génération, définir first_generation_date et reset_date
      if (isFirstGeneration) {
        updateData.first_generation_date = now.toISOString()
        
        // Calculer la date de reset (30 jours après la première génération)
        const resetDate = new Date(now)
        resetDate.setDate(resetDate.getDate() + 30)
        updateData.reset_date = resetDate.toISOString()
      }

      const { data, error } = await supabase
        .from('user_quotas')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Erreur lors de l\'incrémentation:', error)
        return false
      }

      // Mettre à jour l'état local
      setQuota(prev => prev ? {
        ...prev,
        letters_generated: data.letters_generated,
        remaining_letters: prev.max_letters - data.letters_generated,
        can_generate: data.letters_generated < prev.max_letters,
        first_generation_date: data.first_generation_date,
        reset_date: data.reset_date || prev.reset_date
      } : null)

      return true
    } catch (error) {
      console.error('Erreur inattendue lors de l\'incrémentation:', error)
      return false
    }
  }, [quota])

  return {
    quota,
    loading,
    error,
    refreshQuota,
    checkCanGenerate,
    getUpgradeMessage,
    isNearLimit,
    getProgressPercentage,
    incrementLetterCount,
  }
}

/**
 * Hook spécialisé pour vérifier avant génération
 */
export function usePreGenerationQuotaCheck() {
  const { quota, checkCanGenerate, refreshQuota, incrementLetterCount } = useQuota()

  const checkAndShowQuotaStatus = useCallback(async (): Promise<boolean> => {
    // Rafraîchir les quotas avant la vérification
    await refreshQuota()

    if (!checkCanGenerate()) {
      if (quota?.subscription_tier === 'free') {
        toast.error(
          `Quota dépassé ! Vous avez utilisé ${quota.letters_generated}/${quota.max_letters} générations ce mois. Passez à Premium pour des générations illimitées.`,
          { duration: 6000 }
        )
      } else {
        toast.error('Quota de génération dépassé')
      }
      return false
    }

    return true
  }, [quota, checkCanGenerate, refreshQuota])

  const executeWithQuotaCheck = useCallback(async (action: () => Promise<void> | void): Promise<boolean> => {
    const canProceed = await checkAndShowQuotaStatus()
    if (!canProceed) {
      return false
    }

    try {
      await action()
      // Incrémenter le compteur après succès
      const incrementSuccess = await incrementLetterCount()
      if (!incrementSuccess) {
        console.warn('Échec de l\'incrémentation du compteur de lettres')
      }
      return true
    } catch (error) {
      console.error('Erreur lors de l\'exécution avec vérification de quota:', error)
      return false
    }
  }, [checkAndShowQuotaStatus, incrementLetterCount])

  return {
    checkAndShowQuotaStatus,
    executeWithQuotaCheck,
    quota,
  }
}

/**
 * Hook pour afficher des notifications de quota
 */
export function useQuotaNotifications() {
  const { quota, isNearLimit } = useQuota()

  useEffect(() => {
    if (!quota) return

    // Notification quand proche de la limite
    if (isNearLimit() && quota.subscription_tier === 'free') {
      const remaining = quota.remaining_letters
      if (remaining <= 2 && remaining > 0) {
        toast(
          `⚠️ Plus que ${remaining} génération${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''} ce mois !`,
          {
            duration: 4000,
            icon: '⚠️',
          }
        )
      }
    }

    // Notification quand limite atteinte
    if (!quota.can_generate && quota.subscription_tier === 'free') {
      toast.error(
        'Limite mensuelle atteinte ! Revenez le mois prochain ou passez à Premium.',
        { duration: 5000 }
      )
    }
  }, [quota, isNearLimit])
}

/**
 * Utilitaires pour formatage des dates et textes
 */
export const quotaUtils = {
  formatResetDate: (resetDate: string): string => {
    const date = new Date(resetDate)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  },

  getTimeUntilReset: (resetDate: string, firstGenerationDate?: string): string => {
    if (!resetDate) {
      if (!firstGenerationDate) {
        return 'Après la première génération'
      }
      // Calculer 30 jours après la première génération
      const firstGen = new Date(firstGenerationDate)
      const reset = new Date(firstGen)
      reset.setDate(reset.getDate() + 30)
      resetDate = reset.toISOString()
    }
    
    const now = new Date()
    const reset = new Date(resetDate)
    const diffTime = reset.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) {
      return 'Bientôt'
    } else if (diffDays === 1) {
      return 'Demain'
    } else if (diffDays <= 7) {
      return `Dans ${diffDays} jours`
    } else {
      return quotaUtils.formatResetDate(resetDate)
    }
  },

  getQuotaColor: (quota: QuotaStatus | null): string => {
    if (!quota) return 'gray'
    if (quota.subscription_tier === 'premium') return 'green'
    
    const percentage = (quota.letters_generated / quota.max_letters) * 100
    if (percentage >= 90) return 'red'
    if (percentage >= 70) return 'orange'
    return 'green'
  },

  getQuotaIcon: (quota: QuotaStatus | null): string => {
    if (!quota) return '📊'
    if (quota.subscription_tier === 'premium') return '👑'
    
    const percentage = (quota.letters_generated / quota.max_letters) * 100
    if (percentage >= 90) return '🚨'
    if (percentage >= 70) return '⚠️'
    return '📝'
  }
}