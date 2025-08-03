'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Clock, XCircle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface DeletionRequest {
  id: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  deletion_type: string
  scheduled_deletion_at: string
  confirmed_at: string | null
  created_at: string
  reason: string | null
}

export default function AccountDeletionStatus() {
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    loadDeletionRequest()
  }, [])

  const loadDeletionRequest = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading deletion request:', error)
        return
      }

      setDeletionRequest(data)
    } catch (error) {
      console.error('Error loading deletion request:', error)
    } finally {
      setLoading(false)
    }
  }

  const cancelDeletion = async () => {
    if (!deletionRequest) return

    setCancelling(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expirée. Veuillez vous reconnecter.')
        return
      }

      const response = await fetch('/api/account/delete?action=cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          confirmationToken: null // Will use user ID to find active requests
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Erreur lors de l\'annulation')
        return
      }

      toast.success('Demande de suppression annulée avec succès')
      setDeletionRequest(null)

    } catch (error) {
      console.error('Error cancelling deletion:', error)
      toast.error('Erreur lors de l\'annulation')
    } finally {
      setCancelling(false)
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
    
    if (diffMs <= 0) {
      return { text: 'Imminent', urgent: true }
    }
    
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 24) {
      return { 
        text: `${diffHours} heure${diffHours > 1 ? 's' : ''}`, 
        urgent: diffHours <= 6 
      }
    } else {
      const diffDays = Math.ceil(diffHours / 24)
      return { 
        text: `${diffDays} jour${diffDays > 1 ? 's' : ''}`, 
        urgent: false 
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse flex items-center space-x-3">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!deletionRequest) {
    return null
  }

  const timeRemaining = getTimeRemaining(deletionRequest.scheduled_deletion_at)
  const isConfirmed = deletionRequest.status === 'confirmed'

  return (
    <div className={`border rounded-lg p-6 ${
      timeRemaining.urgent 
        ? 'bg-red-50 border-red-200' 
        : isConfirmed 
          ? 'bg-orange-50 border-orange-200'
          : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          timeRemaining.urgent 
            ? 'bg-red-100' 
            : isConfirmed 
              ? 'bg-orange-100'
              : 'bg-yellow-100'
        }`}>
          {timeRemaining.urgent ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : isConfirmed ? (
            <CheckCircle className="w-5 h-5 text-orange-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
        </div>

        <div className="flex-1">
          <h3 className={`font-semibold ${
            timeRemaining.urgent 
              ? 'text-red-800' 
              : isConfirmed 
                ? 'text-orange-800'
                : 'text-yellow-800'
          }`}>
            {isConfirmed ? 'Suppression confirmée' : 'Demande de suppression en attente'}
          </h3>
          
          <div className={`text-sm mt-1 ${
            timeRemaining.urgent 
              ? 'text-red-700' 
              : isConfirmed 
                ? 'text-orange-700'
                : 'text-yellow-700'
          }`}>
            <p className="mb-2">
              Votre compte sera {deletionRequest.deletion_type === 'hard' ? 'définitivement supprimé' : 'anonymisé'} 
              {' '}le <strong>{formatDate(deletionRequest.scheduled_deletion_at)}</strong>
            </p>
            
            <p className="font-medium">
              {timeRemaining.urgent ? (
                <span className="text-red-800">⚠️ Suppression imminente !</span>
              ) : (
                <>Suppression dans {timeRemaining.text}</>
              )}
            </p>

            {!isConfirmed && (
              <p className="mt-2 text-xs">
                <strong>Action requise :</strong> Consultez votre email pour confirmer la suppression
              </p>
            )}
          </div>

          {deletionRequest.reason && (
            <div className="mt-3 p-3 bg-white bg-opacity-50 rounded border">
              <div className="text-xs font-medium text-gray-600 mb-1">Raison donnée :</div>
              <div className="text-sm text-gray-700">{deletionRequest.reason}</div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={cancelDeletion}
            disabled={cancelling}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              timeRemaining.urgent
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cancelling ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Annulation...</span>
              </div>
            ) : (
              <>
                <XCircle className="w-4 h-4 inline mr-1" />
                Annuler la suppression
              </>
            )}
          </button>
        </div>
      </div>

      {timeRemaining.urgent && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded">
          <div className="flex items-center text-red-800 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
            <div>
              <strong>Dernière chance !</strong> Votre compte sera supprimé très bientôt. 
              Cliquez sur "Annuler la suppression" si vous changez d'avis.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}