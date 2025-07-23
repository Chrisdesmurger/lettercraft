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

    // First check if user profile exists using admin client
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, subscription_tier')
      .eq('user_id', userId)
      .single()

    console.log('Existing profile check result:', existingProfile)

    if (!existingProfile) {
      // Create profile first using admin client
      console.log('Profile not found, creating with admin client...')
      const { error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: userId,
          subscription_tier: 'premium'
        })

      if (createError) {
        console.error('Error creating profile:', createError)
        // If profile already exists (race condition), just update it
        if (createError.code === '23505') {
          console.log('Profile already exists, proceeding to update...')
        } else {
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          )
        }
      } else {
        console.log('Profile created successfully with premium subscription')
        return NextResponse.json({ 
          success: true, 
          message: 'Profile created and subscription set to premium' 
        })
      }
    }

    // Update existing profile to premium
    console.log('Updating existing profile to premium...')
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        subscription_tier: 'premium'
      })
      .eq('user_id', userId)
      .select()

    console.log('Subscription update result:', { data, error })

    if (error) {
      console.error('Error updating subscription:', error)
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