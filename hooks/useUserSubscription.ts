'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  subscription_tier: 'free' | 'premium'
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_end_date?: string | null
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

  const fetchUserProfile = async (user: User) => {
    try {
      // Utiliser la vue users_with_profiles
      const { data: profile } = await supabase
        .from('users_with_profiles')
        .select('id, subscription_tier, stripe_customer_id, stripe_subscription_id, subscription_end_date')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile({
          id: profile.id,
          subscription_tier: profile.subscription_tier,
          stripe_customer_id: profile.stripe_customer_id,
          stripe_subscription_id: profile.stripe_subscription_id,
          subscription_end_date: profile.subscription_end_date
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      // Refresh user data to get latest metadata
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchUserProfile(session.user)
      }
    }
  }

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user)
        }
      } catch (error) {
        console.error('Error initializing user:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeUser()

    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      refreshProfile()
    }
    
    window.addEventListener('subscription-updated', handleSubscriptionUpdate)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate)
    }
  }, [])

  return { user, userProfile, loading, refreshProfile }
}