'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  FileText,
  Settings,
  Loader2,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import TemplateSelector from './TemplateSelector'
import { generateLetterPdfWithTemplate, generateTextFile, type PdfOptions } from '@/lib/pdf'
import { type LetterData } from '@/lib/pdf-templates'
import { useI18n } from '@/lib/i18n-context'
import { useUserProfile } from '@/hooks/useUserProfile'

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
  const { profile } = useUserProfile()
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isGeneratingTxt, setIsGeneratingTxt] = useState(false)
  
  const isPremium = profile?.subscription_tier === 'premium'
  const premiumTemplates = ['modern', 'elegant', 'creative']
  
  // S'assurer que l'utilisateur free ne peut pas sélectionner un template premium
  const handleTemplateSelect = (templateId: string) => {
    if (!isPremium && premiumTemplates.includes(templateId)) {
      // Si l'utilisateur n'est pas premium et essaie de sélectionner un template premium,
      // revenir au template classic
      setSelectedTemplateId('classic')
      toast.error(t('pdfTemplates.upgradeMessage'))
    } else {
      setSelectedTemplateId(templateId)
    }
  }

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
      toast.success(t('letter.pdfDownloaded'))
      
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error(`${t('letter.generateError')}: ${error instanceof Error ? error.message : t('auth.unknownError')}`)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleDownloadTXT = () => {
    setIsGeneratingTxt(true)
    try {
      generateTextFile(letterData.content, fileName)
      toast.success(t('letter.txtDownloaded'))
    } catch (error) {
      console.error('TXT generation error:', error)
      toast.error(t('letter.generateError'))
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
              <h3 className="font-semibold">{t('letter.exportOptions')}</h3>
            </div>
            <Badge variant="outline" className="text-xs">
              {t('pdfTemplates.templatesAvailable')}: 4
            </Badge>
          </div>

          {/* Sélecteur de modèle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('pdfTemplates.titleFull')}
            </label>
            <TemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={handleTemplateSelect}
            />
            {!isPremium && (
              <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 p-3 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-700">{t('pdfTemplates.upgradeRequired')}</p>
                      <p className="text-blue-600">{t('pdfTemplates.upgradeMessage')}</p>
                    </div>
                  </div>
                  <Link href="/profile?tab=subscription">
                    <Button size="sm" className="ml-3 h-7 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t('subscription.upgradeToPremium')}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
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
                  {t('common.generating')}
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
                  {t('common.downloading')}
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
            <strong>{t('letter.fileName')}:</strong> {fileName}.pdf<br />
            <strong>{t('letter.format')}:</strong> A4, {t('letter.highQuality')}<br />
            <strong>{t('pdfTemplates.title')}:</strong> {t(`pdfTemplates.templates.${selectedTemplateId}.name`)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}