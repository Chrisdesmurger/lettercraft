'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { useI18n } from '@/lib/i18n-context'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) {
      setError(error?.message || t('auth.unknownError'))
      return
    }

    await supabase.from('users').insert({ id: data.user.id, email, onboarded: false })

    // Assurer la connexion de l'utilisateur apres l'inscription
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) {
      setError(signInError.message)
      return
    }

    setSuccess(t('auth.registerSuccess'))
    router.push('/')
  }

  return (
    <div className="flex items-center justify-center min-h-screen relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md space-y-4 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold text-center">{t('auth.register')}</h1>
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white px-4 py-2 rounded"
        >
          {t('auth.signup')}
        </button>
        <div className="text-center mt-4">
          <p className="text-gray-600">
            {t('auth.haveAccount')}{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-orange-500 hover:text-orange-600 font-medium underline"
            >
              {t('auth.signin')}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}
