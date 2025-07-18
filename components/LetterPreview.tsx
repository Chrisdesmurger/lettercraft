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
import html2pdf from 'html2pdf.js'
import { useUser } from '@/hooks/useUser'
import { useI18n } from '@/lib/i18n-context'

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
  const letterRef = useRef<HTMLDivElement>(null)

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

  const handleDownloadPDF = () => {
    if (!letterRef.current) return

    const opt = {
      margin: 1,
      filename: `lettre-motivation-${data?.jobOffer?.company || 'document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }

    html2pdf().set(opt).from(letterRef.current).save()
    toast.success(t('letter.pdfDownloaded'))
  }

  const handleDownloadTXT = () => {
    const element = document.createElement('a')
    const file = new Blob([editedLetter], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `lettre-motivation-${data?.jobOffer?.company || 'document'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success(t('letter.txtDownloaded'))
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
          
          <div className="flex gap-2">
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
          </div>
        </div>
      </Card>

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
