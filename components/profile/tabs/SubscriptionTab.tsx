'use client'

import { useState, useEffect } from 'react'
import { Check, X, Zap, CreditCard, Download, ExternalLink, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { toast } from 'react-hot-toast'
import type { User } from '@supabase/supabase-js'
import { useUserInvoices, formatAmount, formatInvoiceDate, getInvoiceStatusLabel, getInvoiceStatusColor } from '@/hooks/useUserInvoices'
import { useQuota } from '@/hooks/useQuota'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import QuotaStatus from '@/components/quota/QuotaStatus'
import CancelSubscriptionModal from '@/components/subscription/CancelSubscriptionModal'
import { supabase } from '@/lib/supabase-client'

interface UserProfile {
  id: string
  subscription_tier: 'free' | 'premium'
  subscription_end_date?: string | null
}

interface SubscriptionTabProps {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

export default function SubscriptionTab({ user, userProfile, loading: profileLoading, refreshProfile }: SubscriptionTabProps) {
  const { t, locale } = useI18n()
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  
  // Derive current plan from props instead of local state
  const currentPlan = userProfile?.subscription_tier || 'free'

  // Fetch user quotas, invoices, and subscription status
  const { quota, loading: quotaLoading } = useQuota()
  const { invoices, loading: invoicesLoading, error: invoicesError, refreshInvoices } = useUserInvoices(user)
  const { subscriptionStatus, loading: statusLoading, refreshStatus } = useSubscriptionStatus(user)

  // Handle invoice download
  const handleDownloadInvoice = (invoicePdfUrl: string | null, hostedUrl: string | null, invoiceNumber: string | null) => {
    if (invoicePdfUrl) {
      // Ouvrir le PDF directement
      window.open(invoicePdfUrl, '_blank')
    } else if (hostedUrl) {
      // Fallback sur l'URL hébergée Stripe
      window.open(hostedUrl, '_blank')
    } else {
      toast.error(t('subscription.invoice.notAvailable'))
    }
  }

  const handleUpgrade = async () => {
    if (!user) {
      toast.error(t('auth.pleaseLogin'))
      return
    }

    setPaymentLoading(true)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        toast.error(t('subscription.paymentError'))
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error(t('subscription.paymentError'))
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleCancelSubscription = async (reason: string) => {
    if (!user) {
      toast.error(t('auth.pleaseLogin'))
      return
    }

    setCancelLoading(true)
    try {
      // Obtenir la session actuelle pour récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error(t('auth.pleaseLogin'))
        setCancelLoading(false)
        return
      }

      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          cancellationReason: reason,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'annulation')
      }

      if (result.success) {
        toast.success('Votre abonnement sera annulé à la fin de la période actuelle')
        // Refresh user profile to get updated subscription status
        await refreshProfile()
        // Refresh invoices to get updated data
        await refreshInvoices()
        // Refresh subscription status to show cancellation state
        await refreshStatus()
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'annulation')
    } finally {
      setCancelLoading(false)
    }
  }

  const plans = [
    {
      id: 'free',
      name: t('subscription.free'),
      price: '0€',
      period: t('subscription.perMonth'),
      features: [
        { name: t('subscription.features.monthlyLetters'), included: true },
        { name: t('subscription.features.basicTemplates'), included: true },
        { name: t('subscription.features.multilingualGeneration'), included: false },
        { name: t('subscription.features.emailSupport'), included: false },
        { name: t('subscription.features.customizableTone'), included: false },
      ]
    },
    {
      id: 'premium',
      name: t('subscription.premium'),
      price: '9,99€',
      period: t('subscription.perMonth'),
      popular: true,
      features: [
        { name: t('subscription.features.unlimitedLetters'), included: true },
        { name: t('subscription.features.emailSupport'), included: true },
        { name: t('subscription.features.multilingualGeneration'), included: true },
        { name: t('subscription.features.customizableTone'), included: true },
        { name: t('subscription.features.advancedExport'), included: true },
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('subscription.title')}</h3>
        <p className="text-gray-600">{t('subscription.subtitle')}</p>
      </div>

      {/* Quota Status Card */}
      <QuotaStatus showUpgrade={true} />

      {/* Current Plan Status - Simplified for Free users */}
      {currentPlan === 'free' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">{t('subscription.freePlan')}</p>
              <p className="text-sm text-blue-700">
                {quota && !quotaLoading ? (
                  t('subscription.remainingLetters', { count: quota.remaining_letters.toString() })
                ) : (
                  t('common.loading')
                )}
              </p>
            </div>
            <button 
              onClick={handleUpgrade}
              disabled={paymentLoading || profileLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(paymentLoading || profileLoading) ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {(paymentLoading || profileLoading) ? t('common.loading') : t('subscription.upgradeToPremium')}
            </button>
          </div>
        </div>
      )}

      {/* Premium Plan Status with Cancellation Info */}
      {currentPlan === 'premium' && subscriptionStatus && (
        <div className={`border rounded-lg p-4 ${subscriptionStatus.is_canceled ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`font-medium ${subscriptionStatus.is_canceled ? 'text-orange-900' : 'text-green-900'}`}>
                {subscriptionStatus.is_canceled ? t('subscription.canceledPremium') : t('subscription.activePremium')}
              </p>
              <p className={`text-sm ${subscriptionStatus.is_canceled ? 'text-orange-700' : 'text-green-700'}`}>
                {subscriptionStatus.is_canceled ? (
                  subscriptionStatus.will_expire ? (
                    <>
                      {t('subscription.expiresOn')} {subscriptionStatus.expiration_date ? new Date(subscriptionStatus.expiration_date).toLocaleDateString(locale) : 'unknown'}
                    </>
                  ) : (
                    t('subscription.alreadyExpired')
                  )
                ) : (
                  t('subscription.activeUntil', { 
                    date: subscriptionStatus.expiration_date ? new Date(subscriptionStatus.expiration_date).toLocaleDateString(locale) : 'unknown' 
                  })
                )}
              </p>
              {subscriptionStatus.is_canceled && subscriptionStatus.will_expire && (
                <p className="text-xs text-orange-600 mt-1">
                  {t('subscription.noAutoRenewal')}
                </p>
              )}
            </div>
            {subscriptionStatus.is_canceled ? (
              <div className="text-orange-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="text-green-600">
                <Check className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative border rounded-xl p-6 ${plan.popular ? 'border-orange-400 shadow-lg' : 'border-gray-200'
              } ${currentPlan === plan.id ? 'bg-gray-50' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 text-white text-sm px-3 py-1 rounded-full">
                  {t('subscription.popular')}
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h4 className="text-xl font-semibold mb-2">{plan.name}</h4>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-gray-600 ml-1">{plan.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  {feature.included ? (
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300 mr-2 flex-shrink-0" />
                  )}
                  <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            {currentPlan === plan.id ? (
              <button disabled className="w-full py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed">
                {t('subscription.currentPlan')}
              </button>
            ) : plan.id === 'premium' ? (
              <button 
                onClick={handleUpgrade}
                disabled={paymentLoading || profileLoading}
                className="w-full py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(paymentLoading || profileLoading) ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {(paymentLoading || profileLoading) ? t('common.loading') : t('subscription.payWithStripe')}
              </button>
            ) : (
              <button className="w-full py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed" disabled>
                {t('subscription.downgrade')}
              </button>
            )}
            
            {/* Cancel Subscription Button for Premium Users */}
            {currentPlan === 'premium' && plan.id === 'premium' && (
              subscriptionStatus?.is_canceled ? (
                <div className="w-full mt-2 py-2 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center border border-orange-200">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {t('subscription.alreadyCanceled')}
                </div>
              ) : (
                <button 
                  onClick={() => setCancelModalOpen(true)}
                  disabled={cancelLoading || profileLoading || statusLoading}
                  className="w-full mt-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  {cancelLoading ? t('common.processing') : t('subscription.cancelSubscription')}
                </button>
              )
            )}
          </div>
        ))}
      </div>

      {/* Billing History */}
      {currentPlan === 'premium' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">{t('subscription.billingHistory')}</h4>
            {invoicesLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                {t('common.loading')}
              </div>
            )}
          </div>

          {invoicesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">
                {t('subscription.invoice.loadError')}: {invoicesError}
              </p>
              <button 
                onClick={refreshInvoices}
                className="text-red-600 hover:text-red-800 text-sm underline mt-1"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.date')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.description')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.status')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.amount')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.invoice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!invoicesLoading && invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <div className="text-gray-500 mb-2">
                        {t('subscription.invoice.noInvoices')}
                      </div>
                      <div className="text-xs text-gray-400">
                        Debug: {JSON.stringify({ 
                          invoicesCount: invoices.length, 
                          loading: invoicesLoading, 
                          error: invoicesError,
                          hasUser: !!user,
                          userId: user?.id?.substring(0, 8) + '...'
                        })}
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {formatInvoiceDate(invoice.invoice_date, locale)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">
                            {invoice.description || t('subscription.premium')}
                          </div>
                          {invoice.invoice_number && (
                            <div className="text-xs text-gray-500">
                              {t('subscription.invoice.number')} {invoice.invoice_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${getInvoiceStatusColor(invoice.status)}`}>
                          {getInvoiceStatusLabel(invoice.status, t)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatAmount(invoice.amount_due, invoice.currency, locale)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          {(invoice.invoice_pdf || invoice.hosted_invoice_url) ? (
                            <button
                              onClick={() => handleDownloadInvoice(
                                invoice.invoice_pdf,
                                invoice.hosted_invoice_url,
                                invoice.invoice_number
                              )}
                              className="inline-flex items-center text-orange-600 hover:text-orange-700 transition-colors"
                              title={t('subscription.invoice.downloadTitle')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              {t('common.download')}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">{t('subscription.invoice.notAvailable')}</span>
                          )}
                          
                          {invoice.hosted_invoice_url && (
                            <button
                              onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}
                              className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                              title={t('subscription.invoice.viewOnStripe')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {invoices.length > 0 && (
            <div className="mt-4 text-center">
              <button
                onClick={refreshInvoices}
                disabled={invoicesLoading}
                className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                {invoicesLoading ? t('common.refreshing') : t('subscription.invoice.refresh')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelSubscription}
        currentPeriodEnd={userProfile?.subscription_end_date}
        loading={cancelLoading}
      />
    </div>
  )
}
