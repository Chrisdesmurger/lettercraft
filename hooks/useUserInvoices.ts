'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'
import { useI18n } from '@/lib/i18n-context'

interface UserInvoice {
  id: string
  stripe_invoice_id: string
  stripe_customer_id: string
  invoice_number: string | null
  description: string | null
  amount_due: number
  amount_paid: number
  amount_remaining: number
  currency: string
  invoice_date: string | null
  due_date: string | null
  paid_at: string | null
  status: string
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  period_start: string | null
  period_end: string | null
  attempt_count: number
  created_at: string
  updated_at: string
  // Champs de la vue avec détails de l'abonnement
  subscription_stripe_id?: string | null
  subscription_status?: string | null
  stripe_price_id?: string | null
  user_email?: string | null
  user_first_name?: string | null
  user_last_name?: string | null
}

interface UseUserInvoicesReturn {
  invoices: UserInvoice[]
  loading: boolean
  error: string | null
  refreshInvoices: () => Promise<void>
}

export function useUserInvoices(user: User | null): UseUserInvoicesReturn {
  const [invoices, setInvoices] = useState<UserInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const fetchInvoices = async () => {
    if (!user) {
      setInvoices([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🧾 [useUserInvoices] Fetching invoices for user:', user.id)

      // Essayer plusieurs méthodes pour récupérer les factures
      let data, fetchError;

      // Méthode 1: Essayer la fonction sécurisée si elle existe
      try {
        console.log('🧾 [useUserInvoices] Trying secure function get_user_invoices...')
        const result = await supabase.rpc('get_user_invoices', { 
          target_user_id: user.id 
        });
        
        if (!result.error) {
          data = result.data;
          fetchError = null;
          console.log('🧾 [useUserInvoices] Success with secure function:', data?.length, 'invoices')
        } else {
          throw result.error;
        }
      } catch (funcError) {
        console.log('🧾 [useUserInvoices] Secure function failed:', funcError)
        
        // Méthode 2: Essayer la vue corrigée
        try {
          console.log('🧾 [useUserInvoices] Trying corrected view...')
          const result = await supabase
            .from('invoices_with_subscription_details')
            .select('*')
            .eq('user_id', user.id)
            .order('invoice_date', { ascending: false })
          
          if (!result.error) {
            data = result.data;
            fetchError = null;
            console.log('🧾 [useUserInvoices] Success with view:', data?.length, 'invoices')
          } else {
            throw result.error;
          }
        } catch (viewError) {
          console.log('🧾 [useUserInvoices] View failed:', viewError)
          
          // Méthode 3: Fallback sur la table directe
          console.log('🧾 [useUserInvoices] Fallback to direct table...')
          const result = await supabase
            .from('stripe_invoices')
            .select('*')
            .eq('user_id', user.id)
            .order('invoice_date', { ascending: false })
          
          data = result.data;
          fetchError = result.error;
          console.log('🧾 [useUserInvoices] Direct table result:', data?.length, 'invoices', fetchError)
        }
      }

      if (fetchError) {
        throw fetchError
      }

      console.log('🧾 [useUserInvoices] Successfully loaded', data?.length || 0, 'invoices')
      setInvoices(data || [])
    } catch (err) {
      console.error('🧾 [useUserInvoices] Error fetching invoices:', err)
      setError(err instanceof Error ? err.message : t('subscription.invoice.error'))
    } finally {
      setLoading(false)
    }
  }

  const refreshInvoices = async () => {
    await fetchInvoices()
  }

  useEffect(() => {
    fetchInvoices()
  }, [user?.id])

  return {
    invoices,
    loading,
    error,
    refreshInvoices
  }
}

// Fonctions utilitaires qui prennent la locale et les traductions en paramètre
export function formatAmount(amountInCents: number, currency: string = 'eur', locale: string = 'fr-FR'): string {
  const amount = amountInCents / 100
  
  // Map des locales pour correspondre aux locales supportées par Intl
  const localeMap: Record<string, string> = {
    'fr': 'fr-FR',
    'en': 'en-US',
    'es': 'es-ES',
    'de': 'de-DE',
    'it': 'it-IT'
  }
  
  const intlLocale = localeMap[locale] || locale
  
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(amount)
}

// Fonction utilitaire pour formater les dates
export function formatInvoiceDate(dateString: string | null, locale: string = 'fr-FR'): string {
  if (!dateString) return '-'
  
  // Map des locales pour correspondre aux locales supportées par Intl
  const localeMap: Record<string, string> = {
    'fr': 'fr-FR',
    'en': 'en-US',
    'es': 'es-ES',
    'de': 'de-DE',
    'it': 'it-IT'
  }
  
  const intlLocale = localeMap[locale] || locale
  
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(dateString))
}

// Fonction utilitaire pour traduire les statuts
export function getInvoiceStatusLabel(status: string, t: (key: string) => string): string {
  const statusKey = `subscription.invoice.status.${status}`
  const translated = t(statusKey)
  
  // Si la traduction n'existe pas, retourner le statut original
  return translated !== statusKey ? translated : status
}

// Fonction utilitaire pour obtenir la couleur du statut
export function getInvoiceStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'draft': 'text-gray-600',
    'open': 'text-orange-600',
    'paid': 'text-green-600',
    'void': 'text-gray-400',
    'uncollectible': 'text-red-600'
  }
  
  return statusColors[status] || 'text-gray-600'
}