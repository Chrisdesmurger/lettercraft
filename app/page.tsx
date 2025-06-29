'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ModernWebApp from '@/components/ModernWebApp'
import { supabase } from '@/lib/supabase-client'

export default function Home() {
  const router = useRouter()

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
          router.push('/onboarding')
        }
      }
    })
  }, [router])

  return (
    <main className="min-h-screen">
      <ModernWebApp />
    </main>
  )
}