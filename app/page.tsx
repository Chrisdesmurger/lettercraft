'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModernWebApp from '@/components/modernwebapp'
import DynamicMetadata from '@/components/DynamicMetadata'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase-client'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        const { data: user } = await supabase
          .from('users')
          .select('onboarded')
          .eq('id', session.user.id)
          .single()
        if (user && !user.onboarded) {
          router.push('/')
        } else {
          setLoading(false)
        }
      }
    })
  }, [router])

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
    <main className="min-h-screen">
      <DynamicMetadata />
      <ModernWebApp />
    </main>
  )
}
