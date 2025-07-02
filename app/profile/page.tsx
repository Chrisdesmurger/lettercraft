'use client'

import { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'

interface Profile {
  first_name: string
  last_name: string
  phoneCode: string
  phoneNumber: string
  country: string
  language: string
  birth_date: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    phoneCode: '+33',
    phoneNumber: '',
    country: '',
    language: '',
    birth_date: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)

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
        const match = data.phone?.match(/^(\+\d{1,3})(.*)$/)
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phoneCode: match ? match[1] : '+33',
          phoneNumber: match ? match[2] : data.phone || '',
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
    if (name === 'phoneNumber') {
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
    if (!profile.phoneNumber.match(/^\d{4,}$/)) {
      setPhoneError('Numéro de téléphone invalide')
      return
    }
    setPhoneError(null)
    const phone = `${profile.phoneCode}${profile.phoneNumber}`
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
              <Label htmlFor="phoneNumber">Téléphone</Label>
              <div className="flex space-x-2">
                <select
                  id="phoneCode"
                  name="phoneCode"
                  value={profile.phoneCode}
                  onChange={handleChange}
                  className="border rounded-md px-2 py-2 text-sm bg-white"
                >
                  <option value="+33">France (+33)</option>
                  <option value="+32">Belgique (+32)</option>
                  <option value="+41">Suisse (+41)</option>
                  <option value="+1">États-Unis (+1)</option>
                  <option value="+44">Royaume-Uni (+44)</option>
                </select>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={profile.phoneNumber}
                  onChange={handleChange}
                  className="flex-1"
                />
              </div>
              {phoneError && <p className="text-red-500 text-sm">{phoneError}</p>}
            </div>
            <div>
              <Label htmlFor="country">Pays</Label>
              <Input id="country" name="country" value={profile.country} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="language">Langue</Label>
              <Input id="language" name="language" value={profile.language} onChange={handleChange} />
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
  )
}
