/**
 * Quota System Components
 * Export des composants pour la gestion des quotas
 */

export { default as QuotaStatus } from './QuotaStatus'
export { QuotaBanner, QuotaHeaderBanner } from './QuotaBanner'
export { QuotaGuard, QuotaProtectedButton, useQuotaProtectedAction } from './QuotaGuard'

// Re-export des hooks pour faciliter l'importation
export { 
  useQuota, 
  usePreGenerationQuotaCheck, 
  useQuotaNotifications,
  quotaUtils,
  type QuotaStatus as QuotaStatusType,
  type UseQuotaResult
} from '@/hooks/useQuota'