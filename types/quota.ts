/**
 * TypeScript types for quota system
 */

// Core quota status interface - matches database structure
export interface QuotaStatus {
  letters_generated: number
  max_letters: number
  remaining_letters: number
  reset_date: string
  can_generate: boolean
  subscription_tier: 'free' | 'premium'
}

// Quota check result from middleware
export interface QuotaCheckResult {
  allowed: boolean
  quotaStatus: QuotaStatus | null
  error?: string
}

// API response types
export interface QuotaApiResponse {
  success: boolean
  quota: QuotaStatus
}

export interface QuotaErrorResponse {
  error: string
  code: 'UNAUTHORIZED' | 'QUOTA_EXCEEDED' | 'QUOTA_SYSTEM_ERROR' | 'INTERNAL_ERROR'
  quota?: QuotaStatus
  message?: string
  details?: string
}

// User quota database record
export interface UserQuotaRecord {
  id: string
  user_id: string
  letters_generated: number
  max_letters: number
  reset_date: string
  created_at: string
  updated_at: string
}

// Quota configuration by subscription tier
export interface QuotaConfig {
  free: {
    max_letters: number
    reset_period: 'monthly'
  }
  premium: {
    max_letters: number
    reset_period: 'monthly'
  }
}

// Constants for quota management
export const QUOTA_LIMITS: QuotaConfig = {
  free: {
    max_letters: 10,
    reset_period: 'monthly'
  },
  premium: {
    max_letters: 1000, // Virtually unlimited
    reset_period: 'monthly' // Premium users still have a reset period, but with high limit
  }
}

// Error classes
export class QuotaExceededError extends Error {
  constructor(public quotaStatus: QuotaStatus) {
    super(`Quota dépassé: ${quotaStatus.letters_generated}/${quotaStatus.max_letters} lettres générées`)
    this.name = 'QuotaExceededError'
  }
}

export class QuotaAuthError extends Error {
  constructor(message: string = 'Utilisateur non authentifié') {
    super(message)
    this.name = 'QuotaAuthError'
  }
}

export class QuotaSystemError extends Error {
  constructor(message: string = 'Erreur système des quotas') {
    super(message)
    this.name = 'QuotaSystemError'
  }
}

// Utility types for components
export type QuotaColor = 'green' | 'orange' | 'red' | 'gray'
export type QuotaIcon = '📊' | '👑' | '📝' | '⚠️' | '🚨'

// Hook return types
export interface UseQuotaResult {
  quota: QuotaStatus | null
  loading: boolean
  error: string | null
  refreshQuota: () => Promise<void>
  checkCanGenerate: () => boolean
  getUpgradeMessage: () => string
  isNearLimit: () => boolean
  getProgressPercentage: () => number
}

export interface UsePreGenerationQuotaCheckResult {
  checkAndShowQuotaStatus: () => Promise<boolean>
  quota: QuotaStatus | null
}

// Component prop types
export interface QuotaStatusProps {
  showUpgrade?: boolean
  compact?: boolean
  className?: string
}

export interface QuotaBannerProps {
  showOnlyWhenRelevant?: boolean
  dismissible?: boolean
  className?: string
}

export interface QuotaGuardProps {
  children: React.ReactNode
  showQuotaStatus?: boolean
  customBlockedMessage?: string
  className?: string
}

export interface QuotaProtectedButtonProps {
  onClick: () => Promise<void> | void
  children: React.ReactNode
  disabled?: boolean
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}