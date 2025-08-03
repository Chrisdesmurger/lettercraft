'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Shield, Clock, CheckCircle, XCircle, Mail, Eye, EyeOff } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

type DeletionStep = 'warning' | 'password' | 'confirmation' | 'processing' | 'success'

interface DeletionRequest {
  requestId: string
  scheduledDeletionAt: string
  confirmationRequired: boolean
  cooldownHours: number
  deletionType: string
}

export default function AccountDeletePage() {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState<DeletionStep>('warning')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form data
  const [password, setPassword] = useState('')
  const [deletionType, setDeletionType] = useState<'soft' | 'hard'>('hard')
  const [reason, setReason] = useState('')
  const [confirmationEmail, setConfirmationEmail] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  
  // Result data
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password.trim()) {
      toast.error('Veuillez saisir votre mot de passe')
      return
    }

    if (!acknowledged) {
      toast.error('Veuillez confirmer que vous comprenez les conséquences')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        router.push('/login')
        return
      }

      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          password,
          deletionType,
          reason: reason.trim() || undefined,
          confirmationEmail
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Erreur lors de la demande de suppression')
        return
      }

      setDeletionRequest({
        requestId: result.requestId,
        scheduledDeletionAt: result.scheduledDeletionAt,
        confirmationRequired: result.confirmationRequired,
        cooldownHours: result.cooldownHours,
        deletionType: result.deletionType
      })

      setStep('success')
      toast.success('Demande de suppression créée avec succès')

    } catch (error) {
      console.error('Error creating deletion request:', error)
      toast.error('Erreur lors de la demande de suppression')
    } finally {
      setLoading(false)
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Suppression de compte
            </h1>
            <p className="text-gray-600">
              Cette action est irréversible. Toutes vos données seront supprimées.
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'warning' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'password' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className="w-8 h-0.5 bg-gray-200"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'success' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Warning Step */}
          {step === 'warning' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Attention : Suppression définitive
                </h3>
                <div className="space-y-3 text-red-700">
                  <p>La suppression de votre compte entraînera :</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Suppression de votre profil et informations personnelles</li>
                    <li>Suppression de tous vos CV téléchargés</li>
                    <li>Suppression de toutes vos lettres générées et sauvegardées</li>
                    <li>Suppression de votre historique d'utilisation</li>
                    <li>Annulation immédiate de votre abonnement (avec remboursement pro rata si applicable)</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Conformité RGPD
                </h3>
                <div className="space-y-2 text-blue-700">
                  <p>Nous respectons votre droit à l'effacement selon l'Article 17 du RGPD.</p>
                  <p>Seules vos factures seront conservées de manière anonymisée pendant 7 ans pour les obligations légales comptables.</p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Période de grâce de 48 heures
                </h3>
                <div className="space-y-2 text-yellow-700">
                  <p>Après confirmation par email, vous disposez de 48 heures pour annuler la suppression.</p>
                  <p>Passé ce délai, la suppression sera définitive et irréversible.</p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => router.push('/profile')}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => setStep('password')}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de suppression
                </label>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="deletionType"
                      value="hard"
                      checked={deletionType === 'hard'}
                      onChange={() => setDeletionType('hard')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Suppression complète (recommandé)</div>
                      <div className="text-sm text-gray-600">Toutes vos données sont définitivement supprimées</div>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="deletionType"
                      value="soft"
                      checked={deletionType === 'soft'}
                      onChange={() => setDeletionType('soft')}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Anonymisation</div>
                      <div className="text-sm text-gray-600">Vos données sont anonymisées mais conservées pour les statistiques</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison de la suppression (optionnel)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Aidez-nous à améliorer notre service en nous expliquant pourquoi vous nous quittez..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                  maxLength={1000}
                />
                <div className="text-xs text-gray-500 mt-1">{reason.length}/1000 caractères</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmez votre mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Votre mot de passe actuel"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationEmail}
                    onChange={(e) => setConfirmationEmail(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Recevoir un email de confirmation</div>
                    <div className="text-gray-600">Un lien de confirmation sera envoyé à votre adresse email</div>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-1"
                    required
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Je comprends les conséquences *</div>
                    <div className="text-gray-600">
                      Je comprends que cette action est irréversible et que toutes mes données seront supprimées
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep('warning')}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={loading}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={loading || !acknowledged}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{loading ? 'Traitement...' : 'Confirmer la suppression'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Success Step */}
          {step === 'success' && deletionRequest && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Demande de suppression créée
                </h2>
                <p className="text-gray-600">
                  Votre demande de suppression de compte a été enregistrée avec succès.
                </p>
              </div>

              {deletionRequest.confirmationRequired && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center justify-center mb-3">
                    <Mail className="w-6 h-6 text-blue-600 mr-2" />
                    <h3 className="font-semibold text-blue-800">Email de confirmation envoyé</h3>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Consultez votre boîte email et cliquez sur le lien de confirmation pour valider la suppression.
                  </p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-yellow-600 mr-2" />
                  <h3 className="font-semibold text-yellow-800">Suppression programmée</h3>
                </div>
                <p className="text-yellow-700 text-sm mb-2">
                  Votre compte sera supprimé le <strong>{formatDate(deletionRequest.scheduledDeletionAt)}</strong>
                </p>
                <p className="text-yellow-700 text-sm">
                  Vous pouvez annuler cette demande à tout moment avant cette date depuis votre profil.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/profile')}
                  className="w-full px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Retourner au profil
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Retourner à l'accueil
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}