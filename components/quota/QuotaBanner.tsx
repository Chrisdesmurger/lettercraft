"use client"

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuota, quotaUtils } from '@/hooks/useQuota'
import { AlertTriangle, Crown, X, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface QuotaBannerProps {
  showOnlyWhenRelevant?: boolean
  dismissible?: boolean
  className?: string
}

/**
 * Bannière qui s'affiche contextuellement pour informer sur le statut des quotas
 */
export function QuotaBanner({ 
  showOnlyWhenRelevant = true, 
  dismissible = true, 
  className 
}: QuotaBannerProps) {
  const { quota, loading, error, refreshQuota, isNearLimit } = useQuota()
  const [dismissed, setDismissed] = useState(false)

  // Ne pas afficher si dismissed ou en cours de chargement
  if (dismissed || loading || !quota) {
    return null
  }

  const isPremium = quota.subscription_tier === 'premium'
  const isExceeded = !quota.can_generate && !isPremium
  const nearLimit = isNearLimit()

  // Si on doit afficher seulement quand pertinent, vérifier les conditions
  if (showOnlyWhenRelevant) {
    if (isPremium || (!isExceeded && !nearLimit)) {
      return null
    }
  }

  // Déterminer le type d'alerte et le contenu
  let variant: 'default' | 'destructive' = 'default'
  let icon = <AlertTriangle className="h-4 w-4" />
  let title = ''
  let description = ''
  let actionButton = null

  if (isExceeded) {
    variant = 'destructive'
    title = 'Quota mensuel dépassé'
    description = `Vous avez utilisé toutes vos ${quota.max_letters} générations ce mois. Votre quota sera remis à zéro ${quotaUtils.getTimeUntilReset(quota.reset_date)}.`
    actionButton = (
      <Button size="sm" className="ml-auto">
        <Crown className="h-4 w-4 mr-2" />
        Passer à Premium
      </Button>
    )
  } else if (nearLimit) {
    title = 'Attention - Quota bientôt épuisé'
    description = `Il vous reste ${quota.remaining_letters} génération${quota.remaining_letters > 1 ? 's' : ''} ce mois (${quota.letters_generated}/${quota.max_letters} utilisées).`
    actionButton = (
      <Button variant="outline" size="sm" className="ml-auto">
        <Crown className="h-4 w-4 mr-2" />
        Voir Premium
      </Button>
    )
  } else if (!isPremium) {
    title = 'Plan Gratuit'
    description = `Vous avez ${quota.remaining_letters} générations restantes ce mois.`
    actionButton = (
      <Button variant="ghost" size="sm" className="ml-auto">
        Découvrir Premium
      </Button>
    )
  }

  if (!title) return null

  return (
    <Alert variant={variant} className={className}>
      <div className="flex items-start justify-between w-full">
        <div className="flex items-start space-x-3 flex-1">
          {icon}
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm">{title}</h4>
              <Badge variant={isPremium ? 'default' : 'secondary'} className="text-xs">
                {isPremium ? 'Premium' : 'Gratuit'}
              </Badge>
            </div>
            <AlertDescription className="text-sm">
              {description}
            </AlertDescription>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {actionButton && (
            <div onClick={() => window.location.href = '/profile?tab=subscription'}>
              {actionButton}
            </div>
          )}

          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  )
}

/**
 * Bannière minimaliste pour affichage dans la navbar ou header
 */
export function QuotaHeaderBanner() {
  const { quota, loading } = useQuota()

  if (loading || !quota) return null

  const isPremium = quota.subscription_tier === 'premium'
  const isExceeded = !quota.can_generate && !isPremium

  if (isPremium) {
    return (
      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
        <Crown className="h-3 w-3 mr-1" />
        Premium
      </Badge>
    )
  }

  if (isExceeded) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Quota dépassé
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      {quota.remaining_letters} restantes
    </Badge>
  )
}

export default QuotaBanner