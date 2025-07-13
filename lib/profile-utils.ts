
import { supabase } from './supabase-client'

// Met à jour ou crée le profil utilisateur dans la table `user_profiles`
export async function updateUserProfile(
  userId: string,
  updates: Record<string, any>
) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id', returning: 'representation' })
    .select()
    .single()

  return { data, error }
}

export async function uploadCV(userId: string, file: File) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(fileName, file)

  if (uploadError) return { error: uploadError }

  const { data, error } = await supabase
    .from('cvs')
    .insert({
      user_id: userId,
      name: file.name,
      file_url: uploadData.path,
      size: file.size
    })
    .select()
    .single()

  return { data, error }
}

export async function deleteCV(cvId: string) {
  const { data: cv } = await supabase
    .from('cvs')
    .select('file_url')
    .eq('id', cvId)
    .single()

  if (cv?.file_url) {
    await supabase.storage
      .from('cvs')
      .remove([cv.file_url])
  }

  const { error } = await supabase
    .from('cvs')
    .delete()
    .eq('id', cvId)

  return { error }
}

export async function setActiveCV(userId: string, cvId: string) {
  // Désactiver tous les CV
  await supabase
    .from('cvs')
    .update({ is_active: false })
    .eq('user_id', userId)

  // Activer le CV sélectionné
  const { data, error } = await supabase
    .from('cvs')
    .update({ is_active: true })
    .eq('id', cvId)
    .eq('user_id', userId)

  return { data, error }
}

// Recadre l'image au centre et la redimensionne en carré
export async function cropImageToSquare(
  file: File,
  size = 256
): Promise<Blob> {
  const imageBitmap = await createImageBitmap(file)
  const side = Math.min(imageBitmap.width, imageBitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(
    imageBitmap,
    (imageBitmap.width - side) / 2,
    (imageBitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to crop image'))
    }, 'image/png')
  })
}

// Upload de la photo de profil dans le bucket `avatars`
export async function uploadAvatar(userId: string, file: File) {
  const cropped = await cropImageToSquare(file)
  const fileName = `${userId}/${Date.now()}.png`
  const { data: uploadData, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, cropped, { contentType: 'image/png' })
  if (error) return { error }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(uploadData.path)

  return { url: publicUrl, path: uploadData.path }
}

