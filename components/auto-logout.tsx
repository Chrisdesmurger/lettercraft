'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'


const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes

export default function AutoLogout() {
  const router = useRouter()
  const timer = useRef<NodeJS.Timeout | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const resetTimer = () => {
    if (!isMounted) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await supabase.auth.signOut()
      router.push('/login')
    }, INACTIVITY_LIMIT)
  }

  useEffect(() => {
    // Wait for component to be mounted before initializing timer
    setIsMounted(true)
    
    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer))
    resetTimer()
    
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isMounted])

  return null
}
