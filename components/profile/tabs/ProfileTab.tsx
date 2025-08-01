'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Camera, Mail, Award, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n-context'

export default function ProfileTab() {
  const { t } = useI18n()
  const router = useRouter()
  const [profile, setProfile] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    bio: '',
    avatar_url: '',
    created_at: '',
    generation_count: 0
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
    
    // Écouter l'événement de rafraîchissement
    const handleRefresh = () => {
      loadProfile()
    }
    
    window.addEventListener('letter-generated', handleRefresh)
    
    return () => {
      window.removeEventListener('letter-generated', handleRefresh)
    }
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Récupérer le nombre de lettres générées
        const { data: lettersData } = await supabase
          .from('generated_letters')
          .select('id')
          .eq('user_id', session.user.id)

        const letterCount = lettersData?.length || 0

        // Récupérer les données du profil depuis user_profiles
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        setProfile({
          email: session.user.email || '',
          firstName: profileData?.first_name || '',
          lastName: profileData?.last_name || '',
          phone: profileData?.phone || '',
          bio: profileData?.bio || '',
          avatar_url: profileData?.avatar_url || '',
          created_at: session.user.created_at || '',
          generation_count: letterCount
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifications côté client
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.selectImage'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'))
      return
    }

    setUploading(true)
    
    try {
      // Obtenir le token d'authentification
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('Session status:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
        hasAccessToken: !!session?.access_token,
        tokenPreview: session?.access_token?.substring(0, 20) + '...'
      })
      
      if (!session) {
        toast.error(t('profile.mustBeLoggedIn'))
        return
      }

      console.log('File to upload:', {
        name: file.name,
        size: file.size,
        type: file.type
      })

      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      })

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error Details:', errorData)
        throw new Error(errorData.error || t('profile.photoUpdateError'))
      }

      const { avatar_url } = await response.json()
      
      // Mettre à jour le profil dans user_profiles
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        toast.error(t('profile.photoUpdateError'))
        return
      }
      
      // Synchroniser les données mises à jour avec Brevo
      try {
        const { autoSyncUser } = await import('@/lib/internal-api')
        await autoSyncUser(session.user.id, 'avatar-update')
      } catch (syncError) {
        console.warn('Erreur synchronisation contact Brevo:', syncError)
        // Ne pas bloquer la mise à jour si la sync échoue
      }
      
      // Mettre à jour l'état local
      setProfile(prev => ({ ...prev, avatar_url }))
      
      toast.success(t('profile.photoUpdateSuccess'))
      
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error(error instanceof Error ? error.message : t('profile.photoUpdateError'))
    } finally {
      setUploading(false)
      // Reset input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error(t('auth.mustBeLoggedIn'))
        return
      }

      // Mettre à jour les données dans user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          bio: profile.bio,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error(t('profile.updateError'))
        return
      }

      // Synchroniser les données mises à jour avec Brevo
      try {
        const { autoSyncUser } = await import('@/lib/internal-api')
        await autoSyncUser(session.user.id, 'profile-update')
      } catch (syncError) {
        console.warn('Erreur synchronisation contact Brevo:', syncError)
        // Ne pas bloquer la mise à jour du profil si la sync échoue
      }

      toast.success(t('profile.updateSuccess'))
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error(t('profile.updateError'))
    }
  }

  if (loading) {
    return <div className="animate-pulse">
      <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="hidden"
      />
      
      {/* Profile Header */}
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-white text-3xl font-bold">
                {profile.firstName?.charAt(0) || profile.email?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <button 
            onClick={handleAvatarClick}
            disabled={uploading}
            title={uploading ? t('common.uploading') : t('profile.changePhoto')}
            className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Camera className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-gray-600">{profile.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => router.push('/dashboard/letters')}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('profile.lettersGenerated')}</p>
              <p className="text-xl font-semibold">{profile.generation_count || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-lg p-2">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('profile.emailVerified')}</p>
              <p className="text-xl font-semibold">{t('common.yes')}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('profile.memberSince')}</p>
              <p className="text-xl font-semibold">
                {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.firstName')}
            </label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('profile.lastName')}
            </label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.phone')}
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('profile.bio')}
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder={t('profile.bioPlaceholder')}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            {t('profile.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}
