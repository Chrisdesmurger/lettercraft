'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ModernWebApp from '@/components/modernwebapp'
import { supabase } from '@/lib/supabase-client'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      }
    })
  }, [router])

  return (
    <main className="min-h-screen">
      <ModernWebApp />
    </main>
  )
}
