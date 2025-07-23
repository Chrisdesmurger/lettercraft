import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase-client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

interface SubscriptionUpdateData {
  subscription_tier: 'free' | 'premium'
  subscription_end_date?: string | null
  stripe_subscription_id?: string | null
}

async function updateUserSubscription(customerId: string, updateData: SubscriptionUpdateData) {
  try {
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (userError || !user) {
      console.error(`User not found for customer ID: ${customerId}`, userError)
      return false
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.user_id)

    if (updateError) {
      console.error(`Error updating user ${user.user_id}:`, updateError)
      return false
    }

    console.log(`Successfully updated user ${user.user_id} with:`, updateData)
    return true
  } catch (error) {
    console.error('Unexpected error in updateUserSubscription:', error)
    return false
  }
}

async function handleCustomerSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing subscription created:', subscription.id)
  
  const customerId = subscription.customer as string
  const endDate = new Date(subscription.current_period_end * 1000).toISOString()
  
  return await updateUserSubscription(customerId, {
    subscription_tier: 'premium',
    subscription_end_date: endDate,
    stripe_subscription_id: subscription.id,
  })
}

async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription updated:', subscription.id, 'Status:', subscription.status)
  
  const customerId = subscription.customer as string
  const isActive = subscription.status === 'active'
  const endDate = isActive ? new Date(subscription.current_period_end * 1000).toISOString() : null
  
  return await updateUserSubscription(customerId, {
    subscription_tier: isActive ? 'premium' : 'free',
    subscription_end_date: endDate,
    stripe_subscription_id: isActive ? subscription.id : null,
  })
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deleted:', subscription.id)
  
  const customerId = subscription.customer as string
  
  return await updateUserSubscription(customerId, {
    subscription_tier: 'free',
    subscription_end_date: null,
    stripe_subscription_id: null,
  })
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing successful payment for invoice:', invoice.id)
  
  if (!invoice.subscription) {
    console.log('Invoice not associated with subscription, skipping')
    return true
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    return await handleCustomerSubscriptionUpdated(subscription)
  } catch (error) {
    console.error('Error retrieving subscription for invoice:', error)
    return false
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing failed payment for invoice:', invoice.id)
  
  const customerId = invoice.customer as string
  
  // For failed payments, we might want to mark the subscription as past_due
  // but keep it premium for now (Stripe will handle retries)
  console.log(`Payment failed for customer ${customerId} - invoice ${invoice.id}`)
  
  // Log for monitoring but don't change subscription status immediately
  // Stripe will send subscription.updated events if the subscription changes status
  return true
}

async function handleCustomerSubscriptionTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Processing trial ending for subscription:', subscription.id)
  
  // Log for potential email notifications or other business logic
  const customerId = subscription.customer as string
  console.log(`Trial ending for customer ${customerId} on ${new Date(subscription.trial_end! * 1000)}`)
  
  // This is mainly for logging/notification purposes
  return true
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log('Processing customer updated:', customer.id)
  
  // Log customer updates - could be used for email updates, etc.
  console.log(`Customer ${customer.id} updated - email: ${customer.email}`)
  
  return true
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify content type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      console.error('Invalid content type:', contentType)
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }

    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type} (ID: ${event.id})`)

    // Process event with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Webhook processing timeout')), 25000) // 25s timeout
    })

    const processingPromise = (async () => {
      let success = false

      switch (event.type) {
        case 'customer.subscription.created':
          success = await handleCustomerSubscriptionCreated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.updated':
          success = await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          success = await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_succeeded':
          success = await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          success = await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.trial_will_end':
          success = await handleCustomerSubscriptionTrialWillEnd(event.data.object as Stripe.Subscription)
          break

        case 'customer.updated':
          success = await handleCustomerUpdated(event.data.object as Stripe.Customer)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
          success = true // Don't fail for unhandled events
      }

      return { success, eventType: event.type, eventId: event.id }
    })()

    const result = await Promise.race([processingPromise, timeoutPromise]) as { success: boolean, eventType: string, eventId: string }

    const processingTime = Date.now() - startTime
    console.log(`Event ${result.eventType} (${result.eventId}) processed in ${processingTime}ms - Success: ${result.success}`)

    if (!result.success) {
      console.error(`Failed to process event ${result.eventType} (${result.eventId})`)
      return NextResponse.json(
        { error: 'Event processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      received: true, 
      eventType: result.eventType,
      eventId: result.eventId,
      processingTimeMs: processingTime
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('Webhook processing error:', error)
    console.error(`Error occurred after ${processingTime}ms`)
    
    return NextResponse.json(
      { error: 'Internal webhook processing error' },
      { status: 500 }
    )
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}