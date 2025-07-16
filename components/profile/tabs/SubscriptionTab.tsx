'use client'

import { useState } from 'react'
import { Check, X, Zap } from 'lucide-react'

export default function SubscriptionTab() {
  const [currentPlan] = useState<'free' | 'premium'>('free') // ou 'premium'

  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0€',
      period: '/mois',
      features: [
        { name: '10 lettres de motivation par mois', included: true },
        { name: 'Templates de base', included: true },
        { name: 'Support par email', included: true },
        { name: 'Génération multilingue', included: false },
        { name: 'Templates premium', included: false },
        { name: 'Support prioritaire', included: false },
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '9,99€',
      period: '/mois',
      popular: true,
      features: [
        { name: 'Lettres illimitées', included: true },
        { name: 'Tous les templates', included: true },
        { name: 'Support prioritaire 24/7', included: true },
        { name: 'Génération multilingue', included: true },
        { name: 'Templates premium', included: true },
        { name: 'Exportation avancée', included: true },
      ]
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Mon abonnement</h3>
        <p className="text-gray-600">Gérez votre abonnement et découvrez nos offres</p>
      </div>

      {/* Current Plan Status */}
      {currentPlan === 'free' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">Plan Gratuit</p>
              <p className="text-sm text-blue-700">Il vous reste 7 lettres ce mois-ci</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Passer à Premium
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
                  Populaire
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
                Plan actuel
              </button>
            ) : (
              <button className="w-full py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-lg hover:shadow-lg transition-shadow">
                {plan.id === 'premium' ? 'Passer à Premium' : 'Rétrograder'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Billing History */}
      {currentPlan === 'premium' && (
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Historique de facturation</h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Montant</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Facture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm">01/03/2024</td>
                <td className="px-4 py-3 text-sm">Abonnement Premium</td>
                <td className="px-4 py-3 text-sm">9,99€</td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-orange-600 hover:text-orange-700">Télécharger</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm">01/02/2024</td>
                <td className="px-4 py-3 text-sm">Abonnement Premium</td>
                <td className="px-4 py-3 text-sm">9,99€</td>
                <td className="px-4 py-3 text-sm">
                  <button className="text-orange-600 hover:text-orange-700">Télécharger</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
  )
}
    </div >
  )
}
