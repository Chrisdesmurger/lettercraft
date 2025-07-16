'use client'

import { useEffect, useState } from 'react'
import AutoLogout from '@/components/auto-logout'
import ToastProvider from '@/components/toaster'

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <>
        <ToastProvider />
        {children}
      </>
    )
  }

  return (
    <>
      <AutoLogout />
      <ToastProvider />
      {children}
    </>
  )
}