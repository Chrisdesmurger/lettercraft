'use client'

import { useState } from 'react'
import { Check, X, Zap } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

export default function SubscriptionTab() {
  const { t } = useI18n()
  const [currentPlan] = useState<'free' | 'premium'>('free') // ou 'premium'

  const plans = [
    {
      id: 'free',
      name: t('subscription.free'),
      price: '0€',
      period: t('subscription.perMonth'),
      features: [
        { name: t('subscription.features.monthlyLetters'), included: true },
        { name: t('subscription.features.basicTemplates'), included: true },
        { name: t('subscription.features.emailSupport'), included: true },
        { name: t('subscription.features.multilingualGeneration'), included: false },
        { name: t('subscription.features.premiumTemplates'), included: false },
        { name: t('subscription.features.prioritySupport'), included: false },
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
        { name: t('subscription.features.allTemplates'), included: true },
        { name: t('subscription.features.prioritySupport247'), included: true },
        { name: t('subscription.features.multilingualGeneration'), included: true },
        { name: t('subscription.features.premiumTemplates'), included: true },
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

      {/* Current Plan Status */}
      {currentPlan === 'free' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">{t('subscription.freePlan')}</p>
              <p className="text-sm text-blue-700">{t('subscription.remainingLetters', { count: '7' })}</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              {t('subscription.upgradeToPremium')}
            </button>
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
            ) : (
              <button className="w-full py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-lg hover:shadow-lg transition-shadow">
                {plan.id === 'premium' ? t('subscription.upgradeToPremium') : t('subscription.downgrade')}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Billing History */}
      {currentPlan === 'premium' && (
        <div>
          <h4 className="font-medium text-gray-900 mb-4">{t('subscription.billingHistory')}</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.date')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.description')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.amount')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">{t('subscription.table.invoice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm">01/03/2024</td>
                <td className="px-4 py-3 text-sm">{t('subscription.premiumSubscription')}</td>
                <td className="px-4 py-3 text-sm">9,99€</td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-orange-600 hover:text-orange-700">{t('common.download')}</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">01/02/2024</td>
                <td className="px-4 py-3 text-sm">{t('subscription.premiumSubscription')}</td>
                <td className="px-4 py-3 text-sm">9,99€</td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-orange-600 hover:text-orange-700">{t('common.download')}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      )}
    </div>
  )
}
