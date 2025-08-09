'use client'

import { useState } from 'react'
import { Tables } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Building, 
  MapPin,
  Loader2 
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'
import { supabase } from '@/lib/supabase-client'

type GeneratedLetter = Tables<'generated_letters'> & {
  job_offers: Tables<'job_offers'> | null
  candidates_profile: { title: string } | null
}

interface LetterCardProps {
  letter: GeneratedLetter
  onView: () => void
}

export default function LetterCard({ letter, onView }: LetterCardProps) {
  const { t } = useI18n()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Non authentifié')
      }

      const response = await fetch('/api/generate-letter-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          letterId: letter.id
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('PDF API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`${t('letter.pdfGenerationError')} (${response.status})`)
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

      toast.success(t('letter.pdfDownloadSuccess'))
    } catch (error) {
      console.error('Download error:', error)
      toast.error(t('letter.pdfDownloadError'))
    } finally {
      setIsDownloading(false)
    }
  }

  const createdDate = new Date(letter.created_at)
  const jobOffer = letter.job_offers

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-orange-400">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {jobOffer?.title || t('job.unspecifiedTitle')}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Building className="w-4 h-4" />
              <span className="font-medium">{jobOffer?.company || t('job.unspecifiedCompany')}</span>
            </div>
            {jobOffer?.location && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{jobOffer.location}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-orange-500" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {format(createdDate, 'dd MMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            {t('letter.view')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isDownloading ? t('letter.downloading') : 'PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}