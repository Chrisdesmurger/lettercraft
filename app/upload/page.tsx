'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { languages } from '@/lib/data/languages'
import { uploadDocument } from '@/services/supabase'
import { supabase } from '@/lib/supabase-client'
import ProfileTable from '@/components/ProfileTable'
import { extractResumeDataFromFile, ExtractedProfile } from '@/services/resumeExtractor'
import { useI18n } from '@/lib/i18n-context'

export default function DocumentUploadPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedProfile | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        setLoading(false)
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !file) return
    setUploading(true)
    try {
      const userId = user.id
      
      // Désactiver tous les autres CV de l'utilisateur
      await supabase
        .from('candidates_profile')
        .update({ is_active: false })
        .eq('user_id', userId)

      const { id } = await uploadDocument({
        userId,
        file,
        title,
        language,
        description,
      })
      
      const data = await extractResumeDataFromFile(file)
      
      // Générer un titre automatique si l'utilisateur n'en a pas fourni
      let finalTitle = title.trim()
      if (!finalTitle) {
        const firstName = data.first_name?.trim() || ''
        const lastName = data.last_name?.trim() || ''
        
        if (firstName && lastName) {
          finalTitle = `${t('upload.cvPrefix')} ${firstName} ${lastName}`
        } else if (firstName || lastName) {
          finalTitle = `${t('upload.cvPrefix')} ${firstName || lastName}`
        } else {
          // Fallback sur le nom de fichier nettoyé
          const cleanFileName = file.name
            .replace(/\.[^/.]+$/, '') // Supprimer l'extension
            .replace(/[_-]/g, ' ') // Remplacer _ et - par des espaces
            .replace(/\s+/g, ' ') // Normaliser les espaces multiples
            .trim()
          
          finalTitle = cleanFileName || `${t('upload.cvPrefix')} ${new Date().toLocaleDateString()}`
        }
        
        console.log('🔍 [UPLOAD] Generated automatic title:', finalTitle)
      }
      
      // Mettre à jour le CV avec les données extraites, le titre généré ET l'activer
      await supabase
        .from('candidates_profile')
        .update({ 
          ...data, 
          title: finalTitle, // Assurer que le titre est défini
          is_active: true 
        })
        .eq('id', id)
      
      setExtracted(data)

      toast.success(t('upload.uploadSuccess'))
    } catch (error) {
      console.error(error)
      toast.error(t('upload.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <Header />
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header />
      <div className="container py-10">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>{t('upload.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.txt,.pdf"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              />
              <Input
                type="text"
                name="title"
                placeholder={t('upload.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                name="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('upload.languageSelect')}</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
              <Textarea
                name="description"
                placeholder={t('upload.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="submit" disabled={uploading}>
                {uploading ? t('upload.uploading') : t('upload.uploadButton')}
              </Button>
            </form>
            {extracted && (
              <div className="mt-8 space-y-6">
                <ProfileTable data={extracted} />
                <div className="flex justify-center pt-4">
                  <Button 
                    onClick={() => router.push('/generate-letter')}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-3 text-lg font-semibold"
                  >
                    {t('upload.generateLetter')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
