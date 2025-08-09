'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  FileText,
  Settings,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import TemplateSelector from './TemplateSelector'
import { generateLetterPdfWithTemplate, generateTextFile, type PdfOptions } from '@/lib/pdf'
import { type LetterData } from '@/lib/pdf-templates'
import { useI18n } from '@/lib/i18n-context'

interface PdfExportControlsProps {
  letterData: LetterData
  fileName?: string
  className?: string
}

export default function PdfExportControls({ 
  letterData, 
  fileName = 'lettre-motivation',
  className = '' 
}: PdfExportControlsProps) {
  const { t } = useI18n()
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isGeneratingTxt, setIsGeneratingTxt] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true)
    try {
      console.log('Starting PDF generation with template:', selectedTemplateId)
      
      const options: PdfOptions = {
        templateId: selectedTemplateId,
        format: 'a4',
        margin: 1,
        quality: 0.98
      }

      await generateLetterPdfWithTemplate(letterData, fileName, options)
      
      console.log('PDF generation successful')
      toast.success('PDF téléchargé avec succès')
      
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadTXT = () => {
    setIsGeneratingTxt(true)
    try {
      generateTextFile(letterData.content, fileName)
      toast.success('Fichier texte téléchargé')
    } catch (error) {
      console.error('TXT generation error:', error)
      toast.error('Erreur lors de la génération du fichier texte')
    } finally {
      setIsGeneratingTxt(false)
    }
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Options d'export</h3>
            </div>
            <Badge variant="outline" className="text-xs">
              Modèles disponibles: 4
            </Badge>
          </div>

          {/* Sélecteur de modèle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Modèle de lettre
            </label>
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={setSelectedTemplateId}
            />
          </div>

          {/* Boutons d'export */}
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf || isGeneratingTxt}
              className="flex-1"
              size="sm"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </>
              )}
            </Button>
            
            <Button
              onClick={handleDownloadTXT}
              variant="outline"
              disabled={isGeneratingPdf || isGeneratingTxt}
              size="sm"
            >
              {isGeneratingTxt ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  TXT
                </>
              )}
            </Button>
          </div>

          {/* Informations sur le fichier */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Nom du fichier:</strong> {fileName}.pdf<br />
            <strong>Format:</strong> A4, haute qualité<br />
            <strong>Modèle:</strong> {selectedTemplateId}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}