'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import toast from 'react-hot-toast'

type ConfirmationState = 'loading' | 'success' | 'error' | 'expired'

function ConfirmDeletionContent() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<ConfirmationState>('loading')
  const [error, setError] = useState<string>('')
  const [deletionInfo, setDeletionInfo] = useState<{
    userId: string
    scheduledDeletionAt: string
  } | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setState('error')
      setError('Token de confirmation manquant')
      return
    }

    confirmDeletion(token)
  }, [searchParams])

  const confirmDeletion = async (token: string) => {
    try {
      const response = await fetch(`/api/account/delete?action=confirm`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmationToken: token
        })
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 400 && result.error.includes('expiré')) {
          setState('expired')
        } else {
          setState('error')
          setError(result.error || 'Erreur lors de la confirmation')
        }
        return
      }

      setDeletionInfo({
        userId: result.userId,
        scheduledDeletionAt: result.scheduledDeletionAt
      })
      setState('success')
      toast.success('Suppression confirmée avec succès')

    } catch (error) {
      console.error('Error confirming deletion:', error)
      setState('error')
      setError('Erreur lors de la confirmation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = (dateString: string) => {
    const now = new Date()
    const scheduledDate = new Date(dateString)
    const diffMs = scheduledDate.getTime() - now.getTime()
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    
    if (diffHours <= 0) {
      return 'Imminent'
    } else if (diffHours < 24) {
      return `dans ${diffHours} heure${diffHours > 1 ? 's' : ''}`
    } else {
      const diffDays = Math.ceil(diffHours / 24)
      return `dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          
          {/* Loading State */}
          {state === 'loading' && (
            <div className="text-center space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Confirmation en cours...
                </h2>
                <p className="text-gray-600">
                  Vérification de votre demande de suppression de compte.
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && deletionInfo && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Suppression confirmée
                </h2>
                <p className="text-gray-600">
                  Votre demande de suppression de compte a été confirmée avec succès.
                </p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-red-600 mr-2" />
                  <h3 className="font-semibold text-red-800">Suppression programmée</h3>
                </div>
                <p className="text-red-700 text-sm mb-2">
                  Votre compte sera définitivement supprimé le <strong>{formatDate(deletionInfo.scheduledDeletionAt)}</strong>
                </p>
                <p className="text-red-700 text-sm">
                  Suppression prévue <strong>{getTimeRemaining(deletionInfo.scheduledDeletionAt)}</strong>
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
                  <h3 className="font-semibold text-yellow-800">Vous pouvez encore annuler</h3>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  Vous disposez encore de temps pour changer d'avis et annuler la suppression.
                </p>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Accéder à mon profil pour annuler
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-800 mb-3">Ce qui sera supprimé :</h3>
                <ul className="text-blue-700 text-sm space-y-1 text-left">
                  <li>• Votre profil et informations personnelles</li>
                  <li>• Tous vos CV téléchargés</li>
                  <li>• Toutes vos lettres générées et sauvegardées</li>
                  <li>• Votre historique d'utilisation</li>
                  <li>• Votre abonnement (avec remboursement pro rata si applicable)</li>
                </ul>
                <p className="text-blue-700 text-sm mt-3 font-medium">
                  Seules vos factures seront conservées de manière anonymisée (obligation légale).
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Retourner à l'accueil
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Erreur de confirmation
                </h2>
                <p className="text-gray-600 mb-4">
                  {error || 'Une erreur est survenue lors de la confirmation de votre demande.'}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-3">Que faire ?</h3>
                <ul className="text-gray-700 text-sm space-y-2 text-left">
                  <li>• Vérifiez que le lien n'est pas tronqué dans votre email</li>
                  <li>• Copiez-collez l'URL complète dans votre navigateur</li>
                  <li>• Vérifiez que vous utilisez le bon navigateur/appareil</li>
                  <li>• Contactez le support si le problème persiste</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/account/delete')}
                  className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Faire une nouvelle demande
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Retourner au profil
                </button>
              </div>
            </div>
          )}

          {/* Expired State */}
          {state === 'expired' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Lien de confirmation expiré
                </h2>
                <p className="text-gray-600 mb-4">
                  Ce lien de confirmation a expiré. Les liens de confirmation sont valides pendant 7 jours.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-800 mb-3">Pour continuer :</h3>
                <p className="text-blue-700 text-sm">
                  Vous devez refaire une nouvelle demande de suppression de compte pour obtenir un nouveau lien de confirmation.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/account/delete')}
                  className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Faire une nouvelle demande
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Retourner au profil
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default function ConfirmDeletionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Chargement...
                </h2>
                <p className="text-gray-600">
                  Vérification de votre demande de suppression de compte.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <ConfirmDeletionContent />
    </Suspense>
  )
}