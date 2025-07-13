'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { Camera, Mail, Award, Calendar } from 'lucide-react'

export default function ProfileTab() {
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

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (data) {
          setProfile({
            ...data,
            email: session.user.email || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Logique de mise à jour du profil
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
          <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow">
            <Camera className="w-4 h-4 text-gray-600" />
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
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Lettres générées</p>
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
              <p className="text-sm text-gray-600">Email vérifié</p>
              <p className="text-xl font-semibold">Oui</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Membre depuis</p>
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
              Prénom
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
              Nom
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
            Téléphone
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
            Bio
          </label>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Parlez-nous un peu de vous..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  )
}
