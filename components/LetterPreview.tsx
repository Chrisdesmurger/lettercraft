/**
 * Letter preview and download component
 * Allows previewing, editing and exporting the letter
 */

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { 
  Download,
  Edit3,
  Copy,
  Check,
  FileText,
  Mail,
  Save
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase-client'
import { useUser } from '@/hooks/useUser'
import { useI18n } from '@/lib/i18n-context'
import { generatePdfFromElement, generateTextFile, generateLetterPdfWithTemplate } from '@/lib/pdf'
import { type LetterData } from '@/lib/pdf-templates'
import PdfExportControls from '@/components/pdf/PdfExportControls'

interface LetterPreviewProps {
  data?: any
  onUpdate?: (data: any) => void
  onNext?: () => void
}

export default function LetterPreview({ data, onUpdate, onNext }: LetterPreviewProps) {
  const { user } = useUser()
  const { t } = useI18n()
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editedLetter, setEditedLetter] = useState(data?.generatedLetter || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [useNewPdfSystem, setUseNewPdfSystem] = useState(true) // Toggle pour nouveau/ancien système
  const letterRef = useRef<HTMLDivElement>(null)

  // Convertir les données actuelles vers le format LetterData pour les modèles
  const letterData: LetterData = {
    content: editedLetter || data?.generatedLetter || '',
    jobTitle: data?.jobOffer?.title || '',
    company: data?.jobOffer?.company || '',
    candidateName: data?.profile?.first_name && data?.profile?.last_name 
      ? `${data.profile.first_name} ${data.profile.last_name}`
      : user?.user_metadata?.first_name && user?.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : '',
    candidateEmail: data?.profile?.email || user?.email || '',
    candidatePhone: data?.profile?.phone || user?.user_metadata?.phone || '',
    candidateAddress: data?.profile?.address || '',
    location: data?.profile?.city || 'Paris',
    date: new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const fileName = `lettre-motivation-${data?.jobOffer?.company || 'entreprise'}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedLetter)
      setCopied(true)
      toast.success(t('letter.copySuccess'))
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(t('letter.copyError'))
    }
  }

  const handleDownloadPDF = async () => {
    if (!letterRef.current) {
      console.error('PDF Error: letterRef.current is null')
      toast.error('Impossible de générer le PDF - élément non trouvé')
      return
    }

    const fileName = `lettre-motivation-${data?.jobOffer?.company || 'document'}`
    
    console.log('Starting PDF generation:', {
      fileName,
      elementExists: !!letterRef.current,
      elementContent: letterRef.current.innerHTML.substring(0, 100) + '...'
    })
    
    try {
      await generatePdfFromElement(letterRef.current, fileName)
      console.log('PDF generation successful')
      toast.success(t('letter.pdfDownloaded'))
    } catch (error) {
      console.error('PDF generation error in LetterPreview:', error)
      console.error('Error details:', {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Erreur PDF: ${errorMessage}`)
    }
  }

  const handleDownloadTXT = () => {
    const fileName = `lettre-motivation-${data?.jobOffer?.company || 'document'}`
    
    try {
      generateTextFile(editedLetter, fileName)
      toast.success(t('letter.txtDownloaded'))
    } catch (error) {
      console.error('TXT generation error:', error)
      toast.error(t('letter.txtError') || 'Erreur lors de la génération du fichier texte')
    }
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Save to Supabase
      const { error } = await supabase
        .from('saved_letters')
        .insert({
          user_id: user.id,
          job_title: data?.jobOffer?.title,
          company: data?.jobOffer?.company,
          content: editedLetter,
          language: data?.letterLanguage,
          metadata: {
            category: data?.category,
            tone: data?.letterTone,
            length: data?.letterLength
          }
        })

      if (error) throw error

      toast.success(t('letter.saveSuccess'))
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('letter.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const toggleEdit = () => {
    if (isEditing && editedLetter !== data?.generatedLetter) {
      if (onUpdate) {
        onUpdate({ generatedLetter: editedLetter })
      }
      toast.success(t('letter.changesSuccess'))
    }
    setIsEditing(!isEditing)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action bar */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={toggleEdit}
              variant={isEditing ? 'default' : 'outline'}
              size="sm"
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('letter.save')}
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  {t('letter.edit')}
                </>
              )}
            </Button>
            
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('letter.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('letter.copy')}
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSave}
              variant="outline"
              size="sm"
              disabled={saving}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('letter.save')}
                </>
              )}
            </Button>
          </div>
          
          {/* Export Actions - Choose between legacy and new template system */}
          <div className="flex gap-2">
            {useNewPdfSystem ? (
              /* Nouveau système avec modèles - Interface intégrée */
              <>
                <Button
                  onClick={handleDownloadTXT}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  TXT
                </Button>
                <Button
                  onClick={() => setUseNewPdfSystem(false)}
                  variant="outline"
                  size="sm"
                  title="Basculer vers l'ancien système PDF"
                >
                  📄 PDF (Simple)
                </Button>
              </>
            ) : (
              /* Ancien système PDF */
              <>
                <Button
                  onClick={handleDownloadTXT}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  TXT
                </Button>
                
                <Button
                  onClick={handleDownloadPDF}
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                
                <Button
                  onClick={() => setUseNewPdfSystem(true)}
                  variant="outline" 
                  size="sm"
                  title="Basculer vers les modèles PDF"
                >
                  🎨 Modèles
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Nouveau système PDF avec modèles */}
      {useNewPdfSystem && (
        <PdfExportControls 
          letterData={letterData}
          fileName={fileName}
          className="mb-6"
        />
      )}

      {/* Letter preview/edit */}
      <Card className="p-8">
        {isEditing ? (
          <Textarea
            value={editedLetter}
            onChange={(e) => setEditedLetter(e.target.value)}
            className="min-h-[600px] font-sans text-base leading-relaxed"
            placeholder={t('letter.placeholder')}
          />
        ) : (
          <div ref={letterRef} className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
              {editedLetter}
            </pre>
          </div>
        )}
      </Card>

      {/* Summary and final actions */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-green-100 rounded-full">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-2">
              {t('letter.ready')}
            </h3>
            <p className="text-green-800 text-sm mb-4">
              {t('letter.readyDesc', { 
                title: data?.jobOffer?.title, 
                company: data?.jobOffer?.company 
              })}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                size="sm"
              >
                {t('letter.backToDashboard')}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
              >
                {t('letter.createNew')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
