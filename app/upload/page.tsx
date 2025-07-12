'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { languages } from '@/lib/data/languages'
import { uploadDocument } from '@/services/supabase'
import { useUser } from '@/hooks/useUser'
import ProfileTable from '@/components/ProfileTable'
import { useExtractCVData } from '@/hooks/useExtractCVData'

export default function DocumentUploadPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)

  const { data: extracted } = useExtractCVData(profileId, filePath)

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [userLoading, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !file) return
    setUploading(true)
    try {
      const { id, path } = await uploadDocument({
        userId: user.id,
        file,
        title,
        language,
        description,
      })
      setProfileId(id)
      setFilePath(path)
    } catch (error) {
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <Header />
      <div className="container py-10">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Téléverser un document</CardTitle>
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
                placeholder="Titre du document"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                name="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Langue --</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
              <Textarea
                name="description"
                placeholder="Description (optionnel)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Envoi...' : 'Envoyer'}
              </Button>
            </form>
            {extracted && (
              <div className="mt-8">
                <ProfileTable data={extracted} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
