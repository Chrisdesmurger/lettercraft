import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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

    // Check if user exists (bypass RLS)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, subscription_tier')
      .eq('user_id', userId)
      .single()
    
    console.log('User profile lookup result:', { authUser: !!authUser?.user, userProfile, userError })

    if (!authUser?.user || userError || !userProfile) {
      console.error('User not found:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Initialize user profile if needed
    if (!userProfile.subscription_tier) {
      console.log('Initializing user profile for subscription...')
      const { error: updateError } = await supabaseAdmin
        .rpc('update_user_profile', {
          p_user_id: userId,
          p_subscription_tier: 'free'
        })
      
      if (updateError) {
        console.error('Failed to initialize user profile:', updateError)
        // Continue anyway - we'll handle this in webhooks
      }
    }

    // Create or retrieve Stripe customer first
    let customer
    try {
      // Try to find existing customer by email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
        console.log('Found existing Stripe customer:', customer.id)
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            userId: userId,
          }
        })
        console.log('Created new Stripe customer:', customer.id)
      }

      // Link customer ID to user profile immediately
      await supabaseAdmin.rpc('update_user_profile', {
        p_user_id: userId,
        p_stripe_customer_id: customer.id
      })

    } catch (error) {
      console.error('Error managing Stripe customer:', error)
      // Continue with session creation even if customer linking fails
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
      customer: customer?.id, // Use the customer ID instead of email
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