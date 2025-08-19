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
  Loader2,
  Palette
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'
import { supabase } from '@/lib/supabase-client'
import { generateLetterPdfWithTemplate, generateTextFile } from '@/lib/pdf'
import { type LetterData } from '@/lib/pdf-templates'
import TemplateSelector from '@/components/pdf/TemplateSelector'

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
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic')
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  // Convertir les données de la lettre vers le format LetterData
  const letterData: LetterData = {
    content: letter.content || 'Contenu de la lettre non disponible',
    jobTitle: letter.job_offers?.title || '',
    company: letter.job_offers?.company || '',
    candidateName: letter.candidates_profile?.title || 'Candidat', // Utilise le titre du profil candidat
    candidateEmail: '', // Ces infos ne sont pas directement disponibles dans la structure actuelle
    candidatePhone: '',
    candidateAddress: '',
    location: 'Paris', // Valeur par défaut
    date: new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const fileName = `lettre-motivation-${letter.job_offers?.company || 'entreprise'}-${letter.job_offers?.title || 'poste'}`

  const handleDownloadPdf = async () => {
    setIsDownloading(true)
    try {
      console.log('Starting PDF download with template:', selectedTemplateId)
      
      await generateLetterPdfWithTemplate(letterData, fileName, {
        templateId: selectedTemplateId,
        format: 'a4',
        quality: 0.98
      })
      
      console.log('PDF generation successful')
      toast.success('PDF téléchargé avec succès')
      
    } catch (error) {
      console.error('PDF download error:', error)
      toast.error(`Erreur lors du téléchargement PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadTxt = async () => {
    setIsDownloading(true)
    try {
      generateTextFile(letterData.content || '', fileName)
      toast.success('Fichier texte téléchargé')
    } catch (error) {
      console.error('TXT download error:', error)
      toast.error('Erreur lors du téléchargement TXT')
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

        {/* Actions principales */}
        <div className="flex gap-2 mb-3">
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
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            className="flex-1"
          >
            <Palette className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Options d'export avec modèles */}
        {showTemplateSelector && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            {/* Sélecteur de modèle */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Modèle PDF
              </label>
              <TemplateSelector
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={setSelectedTemplateId}
              />
            </div>

            {/* Boutons d'export */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTxt}
                disabled={isDownloading}
              >
                <FileText className="w-4 h-4 mr-2" />
                TXT
              </Button>
            </div>

            {/* Informations */}
            <div className="text-xs text-muted-foreground">
              <strong>Modèle:</strong> {selectedTemplateId} • <strong>Format:</strong> A4
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}