import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { Tables } from '@/lib/supabase-client'

export type UserProfile = Tables<'user_profiles'>

export interface UseUserProfileReturn {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setError('Utilisateur non authentifié')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile
  }
}

// Helper function to get CV limits based on subscription
export function getCVLimitsBySubscription(subscriptionTier: 'free' | 'premium' = 'free'): number {
  return subscriptionTier === 'premium' ? 3 : 1
}