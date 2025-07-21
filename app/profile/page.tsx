'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import ProfileLayout from '@/components/profile/ProfileLayout'
import Header from '@/components/Header'
import { toast } from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handlePaymentSuccess = async (userId: string) => {
      try {
        const response = await fetch('/api/handle-payment-success', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        })

        const result = await response.json()
        
        console.log('Payment success API response:', { 
          status: response.status, 
          result 
        })
        
        if (result.success) {
          toast.success('Abonnement Premium activé ! 🎉')
          // Refresh the page to update subscription status
          window.location.reload()
        } else {
          console.error('Failed to update subscription:', result.error)
          toast.error('Erreur lors de la mise à jour de l\'abonnement')
        }
      } catch (error) {
        console.error('Error handling payment success:', error)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        // Check for payment success
        const paymentStatus = searchParams.get('payment')
        if (paymentStatus === 'success' && session.user) {
          console.log('Payment success detected, updating subscription...')
          handlePaymentSuccess(session.user.id)
          
          // Clean up URL
          router.replace('/profile', { scroll: false })
        }
        
        setLoading(false)
      }
    })
  }, [router, searchParams])

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
    <>
      <Header />
      <ProfileLayout />
    </>
  )
}
