import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    console.log('Received payment request:', { userId, email })

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Check if user exists using admin client to bypass RLS
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, subscription_tier')
      .eq('user_id', userId)
      .single()

    console.log('Database lookup result:', { userProfile, userError })

    if (userError || !userProfile) {
      // Try to create basic user profile using admin client to bypass RLS
      console.log('User profile not found, creating basic profile with admin client...')
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: userId,
          subscription_tier: 'free'
        })
        .select()
        .single()

      console.log('Basic profile creation result:', { newProfile, createError })

      if (createError) {
        console.error('Failed to create basic user profile:', createError)
        // Continue anyway - we'll handle this in webhooks
        console.log('Continuing with Stripe checkout despite profile creation failure')
      } else {
        console.log('Successfully created user profile with admin client')
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'LetterCraft Premium',
              description: 'Abonnement mensuel Premium - Lettres de motivation illimitées',
            },
            unit_amount: 999, // 9.99 EUR en centimes
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/profile?payment=success`,
      cancel_url: `${request.nextUrl.origin}/profile?payment=cancelled`,
      customer_email: email,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}