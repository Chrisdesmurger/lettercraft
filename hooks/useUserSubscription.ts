'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  user_id: string
  subscription_tier: 'free' | 'premium'
  // autres champs du profil si nécessaire
}

interface UseUserSubscriptionReturn {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

export function useUserSubscription(): UseUserSubscriptionReturn {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id, subscription_tier')
        .eq('user_id', userId)
        .single()

      if (profile) {
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id)
    }
  }

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error initializing user:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, userProfile, loading, refreshProfile }
}