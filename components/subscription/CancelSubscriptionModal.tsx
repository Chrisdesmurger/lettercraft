'use client'

import { useState } from 'react'
import { X, AlertTriangle, Calendar } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'
import { toast } from 'react-hot-toast'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  currentPeriodEnd?: string
  loading?: boolean
}

const cancellationReasons = [
  'too_expensive',
  'not_using_enough',
  'found_alternative',
  'technical_issues',
  'temporary_pause',
  'other'
]

export default function CancelSubscriptionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  currentPeriodEnd,
  loading = false 
}: CancelSubscriptionModalProps) {
  const { t, locale } = useI18n()
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatEndDate = (dateString?: string) => {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error(t('subscription.cancel.selectReason'))
      return
    }

    const reason = selectedReason === 'other' ? customReason : t(`subscription.cancel.reasons.${selectedReason}`)
    
    if (selectedReason === 'other' && !customReason.trim()) {
      toast.error(t('subscription.cancel.provideCustomReason'))
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(reason)
      onClose()
      // Reset form
      setSelectedReason('')
      setCustomReason('')
    } catch (error) {
      console.error('Error cancelling subscription:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    setSelectedReason('')
    setCustomReason('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              {t('subscription.cancel.title')}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-medium mb-1">
                  {t('subscription.cancel.warning.title')}
                </p>
                <p className="text-amber-700 text-sm">
                  {t('subscription.cancel.warning.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation Date */}
          {currentPeriodEnd && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <p className="text-blue-800 font-medium">
                    {t('subscription.cancel.effectiveDate')}
                  </p>
                  <p className="text-blue-700 text-sm">
                    {formatEndDate(currentPeriodEnd)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Consequences */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              {t('subscription.cancel.consequences.title')}
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                {t('subscription.cancel.consequences.accessUntil')}
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                {t('subscription.cancel.consequences.revertToFree')}
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                {t('subscription.cancel.consequences.canResubscribe')}
              </li>
            </ul>
          </div>

          {/* Cancellation Reason */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              {t('subscription.cancel.reasonTitle')} *
            </h3>
            <div className="space-y-2">
              {cancellationReasons.map((reason) => (
                <label key={reason} className="flex items-center">
                  <input
                    type="radio"
                    name="cancellation-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500 disabled:opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {t(`subscription.cancel.reasons.${reason}`)}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom reason input */}
            {selectedReason === 'other' && (
              <div className="mt-3">
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={t('subscription.cancel.customReasonPlaceholder')}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-50"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customReason.length}/500
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : null}
            {isSubmitting ? t('common.processing') : t('subscription.cancel.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}