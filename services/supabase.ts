import { supabase } from '@/lib/supabase-client'

export interface UploadDocumentArgs {
  userId: string
  file: File
  title: string
  language: string
  description?: string
}

export async function uploadDocument({
  userId,
  file,
  title,
  language,
  description,
}: UploadDocumentArgs): Promise<{ id: string; path: string }> {
  const extension = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('candidates_profile')
    .insert({
      user_id: userId,
      title,
      language,
      description,
      file_url: path,
      uploaded_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error

  return { id: data.id, path }
}
