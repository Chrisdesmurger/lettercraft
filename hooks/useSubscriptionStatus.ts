'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

interface SubscriptionStatus {
  subscription_id: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  is_canceled: boolean
  will_expire: boolean
  expiration_date: string | null
}

interface UseSubscriptionStatusReturn {
  subscriptionStatus: SubscriptionStatus | null
  loading: boolean
  error: string | null
  refreshStatus: () => Promise<void>
}

export function useSubscriptionStatus(user: User | null): UseSubscriptionStatusReturn {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscriptionStatus = async () => {
    if (!user) {
      setSubscriptionStatus(null)
      setLoading(false)
      return
    }

    try {
      setError(null)
      setLoading(true)

      // Récupérer le dernier abonnement actif ou annulé récemment
      const { data: subscription, error: subError } = await supabase
        .from('stripe_subscriptions')
        .select('stripe_subscription_id, status, current_period_end, cancel_at_period_end, canceled_at')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing', 'canceled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw subError
      }

      if (subscription) {
        const is_canceled = subscription.cancel_at_period_end || subscription.status === 'canceled'
        const will_expire = is_canceled && subscription.current_period_end 
          ? new Date(subscription.current_period_end) > new Date()
          : false

        setSubscriptionStatus({
          subscription_id: subscription.stripe_subscription_id,
          status: subscription.status,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at,
          is_canceled,
          will_expire,
          expiration_date: subscription.current_period_end
        })
      } else {
        setSubscriptionStatus(null)
      }
    } catch (err) {
      console.error('Error fetching subscription status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSubscriptionStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const refreshStatus = async () => {
    await fetchSubscriptionStatus()
  }

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [user])

  return { subscriptionStatus, loading, error, refreshStatus }
}