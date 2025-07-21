import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase-client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (userId && session.subscription) {
          console.log('Processing successful checkout for user:', userId)
          
          // Try to update user subscription - handle missing columns gracefully
          try {
            const { error } = await supabase
              .from('user_profiles')
              .update({
                subscription_tier: 'premium',
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
              })
              .eq('user_id', userId)

            if (error) {
              console.error('Error updating user subscription (trying fallback):', error)
              
              // Fallback: try without Stripe columns if they don't exist
              const { error: fallbackError } = await supabase
                .from('user_profiles')
                .update({
                  subscription_tier: 'premium'
                })
                .eq('user_id', userId)
              
              if (fallbackError) {
                console.error('Fallback update also failed:', fallbackError)
              } else {
                console.log('Fallback update succeeded - user marked as premium')
              }
            } else {
              console.log('Full update succeeded - user marked as premium with Stripe IDs')
            }
          } catch (updateError) {
            console.error('Unexpected error during subscription update:', updateError)
          }
        }
        break

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID and update subscription status
        const { data: user } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (user) {
          const tier = subscription.status === 'active' ? 'premium' : 'free'
          
          await supabase
            .from('user_profiles')
            .update({ subscription_tier: tier })
            .eq('user_id', user.user_id)
        }
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription
        const deletedCustomerId = deletedSubscription.customer as string

        // Find user and downgrade to free tier
        const { data: userToDowngrade } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('stripe_customer_id', deletedCustomerId)
          .single()

        if (userToDowngrade) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_tier: 'free',
              stripe_subscription_id: null,
            })
            .eq('user_id', userToDowngrade.user_id)
        }
        break

      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}