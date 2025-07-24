import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    console.log('Handling payment success for user:', userId)

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Check if user exists using the view
    const { data: userProfile, error: getUserError } = await supabaseAdmin
      .from('users_with_profiles')
      .select('id, subscription_tier')
      .eq('id', userId)
      .single()
    
    console.log('User profile lookup result:', { userProfile, getUserError })

    if (getUserError || !userProfile) {
      console.error('User not found:', getUserError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update subscription_tier immediately for better UX
    // Webhooks will later add the complete Stripe details (customer_id, subscription_id, exact dates)
    console.log('Updating user subscription to premium for immediate UI feedback...')
    const { error: updateError } = await supabaseAdmin
      .rpc('update_user_profile', {
        p_user_id: userId,
        p_subscription_tier: 'premium',
        p_subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now (temp)
      })

    console.log('Subscription update result:', { updateError })

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription updated to premium' 
    })

  } catch (error) {
    console.error('Error in payment success handler:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}