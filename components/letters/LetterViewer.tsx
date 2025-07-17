'use client'

import { useEffect, useState } from 'react'
import { Tables } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Download, 
  Copy, 
  FileText, 
  Building, 
  MapPin, 
  Calendar,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'

type GeneratedLetter = Tables<'generated_letters'> & {
  job_offers: Tables<'job_offers'> | null
  candidates_profile: { title: string } | null
}

interface LetterViewerProps {
  letter: GeneratedLetter
  isOpen: boolean
  onClose: () => void
}

export default function LetterViewer({ letter, isOpen, onClose }: LetterViewerProps) {
  const { t } = useI18n()
  const [isDownloading, setIsDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch('/api/generate-letter-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          letterId: letter.id
        })
      })

      if (!response.ok) {
        throw new Error(t('error.pdfGeneration'))
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `lettre-motivation-${letter.job_offers?.company || 'entreprise'}-${letter.job_offers?.title || 'poste'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(t('success.pdfDownloaded'))
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      toast.error(t('error.pdfDownload'))
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter.content)
      setCopied(true)
      toast.success(t('success.letterCopied'))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(t('error.copyFailed'))
    }
  }

  if (!isOpen) return null

  const jobOffer = letter.job_offers
  const createdDate = new Date(letter.created_at)

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {jobOffer?.title || t('letter.defaultTitle')}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                {jobOffer?.company && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Building className="w-4 h-4" />
                    <span>{jobOffer.company}</span>
                  </div>
                )}
                {jobOffer?.location && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{jobOffer.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{format(createdDate, 'dd MMM yyyy', { locale: fr })}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content - Zone scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
              {letter.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {t('letter.generatedOn', { date: format(createdDate, 'dd MMMM yyyy à HH:mm', { locale: fr }) })}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? t('common.copied') : t('common.copy')}
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isDownloading ? t('common.downloading') : t('common.downloadPdf')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}