LetterPreview.tsx/**
 * Composant d'aper�u et de t�l�chargement de la lettre
 * Permet de pr�visualiser, �diter et exporter la lettre
 */

import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
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
import { useUser } from '@/hooks/useUser'
import { supabase } from '@/lib/supabaseClient'
import html2pdf from 'html2pdf.js'
import { useUser } from '@/hooks/useUser'

interface LetterPreviewProps {
  data?: any
  onUpdate?: (data: any) => void
  onNext?: () => void
}

export default function LetterPreview({ data, onUpdate, onNext }: LetterPreviewProps) {
  const { user } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [editedLetter, setEditedLetter] = useState(data?.generatedLetter || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const letterRef = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedLetter)
      setCopied(true)
      toast.success('Lettre copi�e dans le presse-papier!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Erreur lors de la copie')
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
    toast.success('PDF t�l�charg�!')
  }

  const handleDownloadTXT = () => {
    const element = document.createElement('a')
    const file = new Blob([editedLetter], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `lettre-motivation-${data?.jobOffer?.company || 'document'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Fichier texte t�l�charg�!')
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Sauvegarder dans Supabase
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

      toast.success('Lettre sauvegard�e dans votre espace!')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const toggleEdit = () => {
    if (isEditing && editedLetter !== data?.generatedLetter) {
      if (onUpdate) {
        onUpdate({ generatedLetter: editedLetter })
      }
      toast.success('Modifications enregistr�es')
    }
    setIsEditing(!isEditing)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Barre d'actions */}
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
                  Enregistrer
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Modifier
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
                  Copi�!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier
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
                  Sauvegarder
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

      {/* Aper�u/�dition de la lettre */}
      <Card className="p-8">
        {isEditing ? (
          <Textarea
            value={editedLetter}
            onChange={(e) => setEditedLetter(e.target.value)}
            className="min-h-[600px] font-sans text-base leading-relaxed"
            placeholder="Votre lettre de motivation..."
          />
        ) : (
          <div ref={letterRef} className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
              {editedLetter}
            </pre>
          </div>
        )}
      </Card>

      {/* R�sum� et actions finales */}
      <Card className="p-6 bg-green-50 border-green-200">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-green-100 rounded-full">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-2">
              Votre lettre est pr�te!
            </h3>
            <p className="text-green-800 text-sm mb-4">
              Vous avez cr�� une lettre personnalis�e pour le poste de{' '}
              <strong>{data?.jobOffer?.title}</strong> chez{' '}
              <strong>{data?.jobOffer?.company}</strong>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                size="sm"
              >
                Retour au tableau de bord
              </Button>
              <Button
                onClick={() => window.location.reload()}
                size="sm"
              >
                Cr�er une nouvelle lettre
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}