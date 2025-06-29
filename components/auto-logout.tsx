'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes

export default function AutoLogout() {
  const router = useRouter()
  const timer = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }, INACTIVITY_LIMIT)
  }

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return null
}
