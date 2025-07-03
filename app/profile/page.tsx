'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import intlTelInput from 'intl-tel-input'
import 'intl-tel-input/build/css/intlTelInput.css'
import { countries, codeToFlagEmoji } from '@/lib/data/countries'
import { languages } from '@/lib/data/languages'
import { Button } from '@/components/ui/button'
import Header from '@/components/Header'

interface Profile {
  first_name: string
  last_name: string
  phone: string
  country: string
  language: string
  birth_date: string
}

export default function ProfilePage() {
  const router = useRouter()
  const phoneRef = useRef<HTMLInputElement>(null)
  const [iti, setIti] = useState<any>(null)
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    phone: '',
    country: '',
    language: '',
    birth_date: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // Init phone input on mount
  useEffect(() => {
    if (phoneRef.current) {
      const instance = intlTelInput(phoneRef.current, {
        initialCountry: 'fr',
        loadUtils: () => import('intl-tel-input/build/js/utils.js'),
      })
      setIti(instance)
      return () => {
        instance.destroy()
      }
    }
  }, [])

  // Update phone number when profile data is loaded
  useEffect(() => {
    if (iti && profile.phone) {
      iti.setNumber(profile.phone)
    }
  }, [iti, profile.phone])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()
      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          country: data.country || '',
          language: data.language || '',
          birth_date: data.birth_date || '',
        })
      }
      setLoading(false)
    })
  }, [router])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    if (name === 'phone') {
      setPhoneError(null)
    }
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    const phone = iti ? iti.getNumber() : profile.phone
    if (!iti || !iti.isValidNumber()) {
      setPhoneError('Numéro de téléphone invalide')
      return
    }
    setPhoneError(null)
    const updates = {
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone,
      country: profile.country,
      language: profile.language,
      birth_date: profile.birth_date,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: session.user.id, ...updates })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Profil mis à jour')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <Header />
    {/* Main Content */ }
    <div className="flex items-center justify-center py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Mon Profil</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                name="first_name"
                value={profile.first_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                name="last_name"
                value={profile.last_name}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                ref={phoneRef}
                defaultValue={profile.phone}
                onChange={handleChange}
              />
              {phoneError && <p className="text-red-500 text-sm">{phoneError}</p>}
            </div>
            <div>
              <Label htmlFor="country">Pays</Label>
              <select
                id="country"
                name="country"
                value={profile.country}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {codeToFlagEmoji(c.code)} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="language">Langue</Label>
              <select
                id="language"
                name="language"
                value={profile.language}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="birth_date">Date de naissance</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                value={profile.birth_date}
                onChange={handleChange}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="ml-auto">
              Enregistrer
            </Button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </div>
  )
}
