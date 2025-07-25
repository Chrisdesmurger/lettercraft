"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePreGenerationQuotaCheck, useQuota } from '@/hooks/useQuota'
import { AlertTriangle, Crown, Lock } from 'lucide-react'
import QuotaStatus from './QuotaStatus'

interface QuotaGuardProps {
  children: React.ReactNode
  showQuotaStatus?: boolean
  customBlockedMessage?: string
  className?: string
}

/**
 * Composant qui protège l'accès aux fonctionnalités de génération basé sur les quotas
 */
export function QuotaGuard({ 
  children, 
  showQuotaStatus = true, 
  customBlockedMessage,
  className 
}: QuotaGuardProps) {
  const { quota, loading } = useQuota()
  const { checkAndShowQuotaStatus } = usePreGenerationQuotaCheck()

  // Pendant le chargement, afficher un état de chargement
  if (loading) {
    return (
      <div className={className}>
        {showQuotaStatus && <QuotaStatus compact />}
        <div className="mt-4 opacity-50 pointer-events-none">
          {children}
        </div>
      </div>
    )
  }

  // Si pas de quota disponible, bloquer l'accès
  if (!quota || !quota.can_generate) {
    const isPremium = quota?.subscription_tier === 'premium'
    
    return (
      <div className={className}>
        {showQuotaStatus && <QuotaStatus compact />}
        
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-red-100 rounded-full p-3">
                  <Lock className="h-6 w-6 text-red-600" />
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  {isPremium ? 'Quota temporairement dépassé' : 'Quota mensuel épuisé'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {customBlockedMessage || (
                    isPremium 
                      ? 'Votre quota a été temporairement dépassé. Contactez le support si cela persiste.'
                      : `Vous avez utilisé toutes vos ${quota?.max_letters || 10} générations gratuites ce mois.`
                  )}
                </p>
              </div>

              {!isPremium && (
                <Button 
                  className="w-full max-w-sm"
                  onClick={() => window.location.href = '/profile?tab=subscription'}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Passer à Premium pour des générations illimitées
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si tout va bien, afficher le contenu normalement
  return (
    <div className={className}>
      {showQuotaStatus && <QuotaStatus compact />}
      <div className="mt-4">
        {children}
      </div>
    </div>
  )
}

/**
 * Hook pour créer des handlers de génération protégés par quota
 */
export function useQuotaProtectedAction() {
  const { executeWithQuotaCheck } = usePreGenerationQuotaCheck()

  return { executeWithQuotaCheck }
}

/**
 * Bouton qui vérifie automatiquement les quotas avant d'exécuter une action
 */
interface QuotaProtectedButtonProps {
  onClick: () => Promise<void> | void
  children: React.ReactNode
  disabled?: boolean
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function QuotaProtectedButton({
  onClick,
  children,
  disabled,
  ...buttonProps
}: QuotaProtectedButtonProps) {
  const { executeWithQuotaCheck } = useQuotaProtectedAction()
  const { quota, loading } = useQuota()

  const handleClick = () => {
    executeWithQuotaCheck(onClick)
  }

  const isDisabled = disabled || loading || !quota?.can_generate

  return (
    <Button
      {...buttonProps}
      disabled={isDisabled}
      onClick={handleClick}
    >
      {children}
    </Button>
  )
}

export default QuotaGuard