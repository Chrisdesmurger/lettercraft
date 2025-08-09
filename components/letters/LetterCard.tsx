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
import { generateLetterPdf } from '@/lib/pdf'

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
      console.log('Starting PDF download for letter:', letter.id)
      
      // Create formatted HTML content for the letter
      const letterHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lettre de Motivation - ${letter.job_offers?.title || 'Poste'}</title>
          <style>
            @page { size: A4; margin: 2cm; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              font-size: 12pt; 
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 20px;
              background: white;
            }
            .header { text-align: right; margin-bottom: 2cm; }
            .sender-info { font-size: 11pt; line-height: 1.4; }
            .date-location { text-align: right; margin-bottom: 1.5cm; }
            .recipient-info { margin-bottom: 1.5cm; }
            .subject { font-weight: bold; margin-bottom: 1cm; text-decoration: underline; }
            .content { text-align: justify; margin-bottom: 1.5cm; white-space: pre-wrap; }
            .signature { text-align: right; margin-top: 2cm; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="sender-info">
              <!-- Nom candidat à récupérer depuis le profil -->
            </div>
          </div>
          
          <div class="date-location">
            ${new Date().toLocaleDateString('fr-FR', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </div>
          
          <div class="recipient-info">
            À l'attention du service recrutement<br>
            ${letter.job_offers?.company || 'Entreprise'}
          </div>
          
          <div class="subject">
            Objet : Candidature pour le poste de ${letter.job_offers?.title || 'Poste'}
          </div>
          
          <div class="content">${letter.content || 'Contenu de la lettre non disponible'}</div>
          
          <div class="signature">
            Cordialement,<br>
            <br>
            <!-- Signature candidat -->
          </div>
        </body>
        </html>
      `
      
      const fileName = `lettre-motivation-${letter.job_offers?.company || 'entreprise'}-${letter.job_offers?.title || 'poste'}`
      
      // Use our client-side PDF generation
      await generateLetterPdf(letterHtml, fileName)
      
      console.log('PDF generation successful')
      toast.success(t('letter.pdfDownloadSuccess') || 'PDF téléchargé avec succès')
      
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error(t('letter.pdfDownloadError') || 'Erreur lors du téléchargement PDF')
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