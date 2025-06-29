'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import OnboardingPopup from '@/components/OnboardingPopup'

export default function Dashboard() {
  const router = useRouter()
  const [showPopup, setShowPopup] = useState(false)

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
          setShowPopup(true)
        }
      }
    })
  }, [router])

  return (
    <>
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      {showPopup && <OnboardingPopup onClose={() => setShowPopup(false)} />}
    </>
  )
}
