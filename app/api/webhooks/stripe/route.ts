import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

interface StripeSubscriptionData {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_price_id?: string | null
  status: string
  current_period_start?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
  canceled_at?: string | null
  trial_start?: string | null
  trial_end?: string | null
  metadata?: Record<string, any>
}

interface StripeInvoiceData {
  stripe_subscription_id?: string | null
  stripe_invoice_id: string
  stripe_customer_id: string
  stripe_charge_id?: string | null
  stripe_payment_intent_id?: string | null
  invoice_number?: string | null
  description?: string | null
  amount_due: number
  amount_paid: number
  amount_remaining: number
  currency: string
  invoice_date?: string | null
  due_date?: string | null
  paid_at?: string | null
  status: string
  hosted_invoice_url?: string | null
  invoice_pdf?: string | null
  period_start?: string | null
  period_end?: string | null
  auto_advance?: boolean
  collection_method?: string
  attempt_count?: number
  metadata?: Record<string, any>
}

async function upsertStripeSubscription(customerId: string, subscriptionData: StripeSubscriptionData) {
  try {
    console.log(`🔍 [upsertStripeSubscription] Starting upsert for customer ${customerId}`)
    console.log(`📊 [upsertStripeSubscription] Subscription data:`, subscriptionData)
    
    // Find user by customer ID or email
    let foundUser = null
    
    // First, try by customer ID
    const { data: userByCustomerId, error: customerError } = await supabaseAdmin
      .from('users_with_profiles')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single()

    console.log(`🔍 [upsertStripeSubscription] User by customer ID:`, { userByCustomerId, customerError })
    foundUser = userByCustomerId

    // If not found, try by email
    if (!foundUser) {
      console.log(`🔍 User not found by customer ID ${customerId}, trying by email...`)
      
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        
        if (customer.email) {
          console.log(`📧 Looking for user with email: ${customer.email}`)

          const { data: userByEmail, error: emailError } = await supabaseAdmin
            .from('users_with_profiles')
            .select('*')
            .eq('email', customer.email)
            .single()
          
          console.log(`📧 [upsertStripeSubscription] User by email:`, { userByEmail, emailError })
          
          if (userByEmail) {
            foundUser = userByEmail
            
            // Link customer ID to user
            await supabaseAdmin.rpc('update_user_profile', {
              p_user_id: foundUser.id,
              p_stripe_customer_id: customerId
            })
            
            console.log(`🔗 Linked customer ${customerId} to user ${foundUser.id}`)
          }
        }
      } catch (stripeError) {
        console.error('Error retrieving customer from Stripe:', stripeError)
        return true
      }
    }

    if (!foundUser) {
      console.warn(`⚠️ No user found for customer ${customerId}`)
      return true
    }

    // Upsert the subscription using the new dedicated function
    console.log(`💾 [upsertStripeSubscription] Upserting subscription for user ${foundUser.id}`)
    
    const { error: upsertError } = await supabaseAdmin
      .rpc('upsert_stripe_subscription', {
        p_user_id: foundUser.id,
        p_stripe_customer_id: subscriptionData.stripe_customer_id,
        p_stripe_subscription_id: subscriptionData.stripe_subscription_id,
        p_stripe_price_id: subscriptionData.stripe_price_id,
        p_status: subscriptionData.status,
        p_current_period_start: subscriptionData.current_period_start,
        p_current_period_end: subscriptionData.current_period_end,
        p_cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
        p_canceled_at: subscriptionData.canceled_at,
        p_trial_start: subscriptionData.trial_start,
        p_trial_end: subscriptionData.trial_end,
        p_metadata: subscriptionData.metadata || {}
      })

    console.log(`💾 [upsertStripeSubscription] Upsert result:`, { upsertError })

    if (upsertError) {
      console.error(`❌ Error upserting subscription for user ${foundUser.id}:`, upsertError)
      return false
    }

    console.log(`✅ Successfully upserted subscription for user ${foundUser.id} (${foundUser.first_name} ${foundUser.last_name})`)
    console.log(`🎯 Subscription ${subscriptionData.stripe_subscription_id} status: ${subscriptionData.status}`)
    
    return true
  } catch (error) {
    console.error('Unexpected error in upsertStripeSubscription:', error)
    return false
  }
}

async function upsertStripeInvoice(customerId: string, invoiceData: StripeInvoiceData) {
  try {
    console.log(`💰 [upsertStripeInvoice] Starting upsert for customer ${customerId}`)
    console.log(`📊 [upsertStripeInvoice] Invoice data:`, invoiceData)
    
    // Find user by customer ID or email (same logic as subscription)
    let foundUser = null
    
    const { data: userByCustomerId, error: customerError } = await supabaseAdmin
      .from('users_with_profiles')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single()

    console.log(`💰 [upsertStripeInvoice] User by customer ID:`, { userByCustomerId, customerError })
    foundUser = userByCustomerId

    if (!foundUser) {
      console.log(`💰 User not found by customer ID ${customerId}, trying by email...`)
      
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
        
        if (customer.email) {
          console.log(`📧 Looking for user with email: ${customer.email}`)

          const { data: userByEmail, error: emailError } = await supabaseAdmin
            .from('users_with_profiles')
            .select('*')
            .eq('email', customer.email)
            .single()
          
          console.log(`💰 [upsertStripeInvoice] User by email:`, { userByEmail, emailError })
          
          if (userByEmail) {
            foundUser = userByEmail
            
            // Link customer ID to user if not already linked
            await supabaseAdmin.rpc('update_user_profile', {
              p_user_id: foundUser.id,
              p_stripe_customer_id: customerId
            })
            
            console.log(`🔗 Linked customer ${customerId} to user ${foundUser.id}`)
          }
        }
      } catch (stripeError) {
        console.error('Error retrieving customer from Stripe:', stripeError)
        return true
      }
    }

    if (!foundUser) {
      console.warn(`⚠️ No user found for customer ${customerId}`)
      return true
    }

    // Upsert the invoice using the dedicated function
    console.log(`💾 [upsertStripeInvoice] Upserting invoice for user ${foundUser.id}`)
    
    const { error: upsertError } = await supabaseAdmin
      .rpc('upsert_stripe_invoice', {
        p_user_id: foundUser.id,
        p_stripe_subscription_id: invoiceData.stripe_subscription_id,
        p_stripe_invoice_id: invoiceData.stripe_invoice_id,
        p_stripe_customer_id: invoiceData.stripe_customer_id,
        p_stripe_charge_id: invoiceData.stripe_charge_id,
        p_stripe_payment_intent_id: invoiceData.stripe_payment_intent_id,
        p_invoice_number: invoiceData.invoice_number,
        p_description: invoiceData.description,
        p_amount_due: invoiceData.amount_due,
        p_amount_paid: invoiceData.amount_paid,
        p_amount_remaining: invoiceData.amount_remaining,
        p_currency: invoiceData.currency,
        p_invoice_date: invoiceData.invoice_date,
        p_due_date: invoiceData.due_date,
        p_paid_at: invoiceData.paid_at,
        p_status: invoiceData.status,
        p_hosted_invoice_url: invoiceData.hosted_invoice_url,
        p_invoice_pdf: invoiceData.invoice_pdf,
        p_period_start: invoiceData.period_start,
        p_period_end: invoiceData.period_end,
        p_auto_advance: invoiceData.auto_advance || true,
        p_collection_method: invoiceData.collection_method || 'charge_automatically',
        p_attempt_count: invoiceData.attempt_count || 0,
        p_metadata: invoiceData.metadata || {}
      })

    console.log(`💾 [upsertStripeInvoice] Upsert result:`, { upsertError })

    if (upsertError) {
      console.error(`❌ Error upserting invoice for user ${foundUser.id}:`, upsertError)
      return false
    }

    console.log(`✅ Successfully upserted invoice ${invoiceData.stripe_invoice_id} for user ${foundUser.id}`)
    console.log(`💰 Invoice amount: ${invoiceData.amount_due / 100} ${invoiceData.currency.toUpperCase()}`)
    
    return true
  } catch (error) {
    console.error('Unexpected error in upsertStripeInvoice:', error)
    return false
  }
}

async function handleCustomerSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🎯 [WEBHOOK] Processing subscription created:', subscription.id)
  
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id || null
  
  const subscriptionData: StripeSubscriptionData = {
    user_id: '', // Will be set by upsertStripeSubscription
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start: (subscription as any).current_period_start 
      ? new Date((subscription as any).current_period_start * 1000).toISOString() 
      : null,
    current_period_end: (subscription as any).current_period_end 
      ? new Date((subscription as any).current_period_end * 1000).toISOString() 
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString() 
      : null,
    trial_start: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null,
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    metadata: subscription.metadata || {}
  }
  
  return await upsertStripeSubscription(customerId, subscriptionData)
}

async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🎯 [WEBHOOK] Processing subscription updated:', subscription.id, 'Status:', subscription.status)
  
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id || null
  
  const subscriptionData: StripeSubscriptionData = {
    user_id: '', // Will be set by upsertStripeSubscription
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start: (subscription as any).current_period_start 
      ? new Date((subscription as any).current_period_start * 1000).toISOString() 
      : null,
    current_period_end: (subscription as any).current_period_end 
      ? new Date((subscription as any).current_period_end * 1000).toISOString() 
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString() 
      : null,
    trial_start: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null,
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    metadata: subscription.metadata || {}
  }
  
  return await upsertStripeSubscription(customerId, subscriptionData)
}

async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🎯 [WEBHOOK] Processing subscription deleted:', subscription.id)
  
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id || null
  
  const subscriptionData: StripeSubscriptionData = {
    user_id: '', // Will be set by upsertStripeSubscription
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: 'canceled', // Mark as canceled when deleted
    current_period_start: (subscription as any).current_period_start 
      ? new Date((subscription as any).current_period_start * 1000).toISOString() 
      : null,
    current_period_end: (subscription as any).current_period_end 
      ? new Date((subscription as any).current_period_end * 1000).toISOString() 
      : null,
    cancel_at_period_end: true,
    canceled_at: new Date().toISOString(), // Set canceled_at to now
    trial_start: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null,
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    metadata: subscription.metadata || {}
  }
  
  return await upsertStripeSubscription(customerId, subscriptionData)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('🎯 [WEBHOOK] Processing successful payment for invoice:', invoice.id)
  
  const customerId = (typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id) as string
  
  if (!customerId) {
    console.error('No customer ID found in invoice')
    return false
  }
  
  if (!invoice.id) {
    console.error('No invoice ID found')
    return false
  }
  const subscriptionId = (invoice as any).subscription as string | null
  
  // Extraire les données de la facture
  const invoiceData: StripeInvoiceData = {
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id!,
    stripe_customer_id: customerId,
    stripe_charge_id: (invoice as any).charge || null,
    stripe_payment_intent_id: (invoice as any).payment_intent || null,
    invoice_number: invoice.number || null,
    description: invoice.description || `Abonnement LetterCraft Premium`,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    currency: invoice.currency,
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: invoice.status_transitions?.paid_at 
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
      : new Date().toISOString(),
    status: invoice.status || 'paid',
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    auto_advance: invoice.auto_advance,
    collection_method: invoice.collection_method,
    attempt_count: invoice.attempt_count || 0,
    metadata: invoice.metadata || {}
  }
  
  console.log('💰 [WEBHOOK] Invoice data extracted:', {
    invoice_id: invoiceData.stripe_invoice_id,
    amount: `${invoiceData.amount_due / 100} ${invoiceData.currency.toUpperCase()}`,
    status: invoiceData.status,
    hosted_url: invoiceData.hosted_invoice_url
  })

  // Sauvegarder la facture
  const invoiceResult = await upsertStripeInvoice(customerId, invoiceData)
  
  // Si il y a un abonnement associé, mettre à jour aussi l'abonnement
  if (subscriptionId && invoiceResult) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await handleCustomerSubscriptionUpdated(subscription)
    } catch (error) {
      console.error('Error retrieving subscription for invoice:', error)
      // Continue même si la mise à jour de l'abonnement échoue
    }
  }
  
  return invoiceResult
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('🎯 [WEBHOOK] Processing failed payment for invoice:', invoice.id)
  
  const customerId = (typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id) as string
  
  if (!customerId) {
    console.error('No customer ID found in invoice')
    return false
  }
  
  if (!invoice.id) {
    console.error('No invoice ID found')
    return false
  }
  const subscriptionId = (invoice as any).subscription as string | null
  
  // Extraire les données de la facture (même si le paiement a échoué)
  const invoiceData: StripeInvoiceData = {
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id!,
    stripe_customer_id: customerId,
    stripe_charge_id: (invoice as any).charge || null,
    stripe_payment_intent_id: (invoice as any).payment_intent || null,
    invoice_number: invoice.number || null,
    description: invoice.description || `Abonnement LetterCraft Premium`,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    currency: invoice.currency,
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: null, // Pas payé
    status: invoice.status || 'open',
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    auto_advance: invoice.auto_advance,
    collection_method: invoice.collection_method,
    attempt_count: invoice.attempt_count || 0,
    metadata: invoice.metadata || {}
  }
  
  console.log('💰 [WEBHOOK] Failed invoice data:', {
    invoice_id: invoiceData.stripe_invoice_id,
    amount: `${invoiceData.amount_due / 100} ${invoiceData.currency.toUpperCase()}`,
    status: invoiceData.status,
    attempt_count: invoiceData.attempt_count
  })

  // Sauvegarder la facture (même si le paiement a échoué)
  const invoiceResult = await upsertStripeInvoice(customerId, invoiceData)
  
  // Log for monitoring but don't change subscription status immediately
  // Stripe will send subscription.updated events if the subscription changes status
  console.log(`⚠️ Payment failed for customer ${customerId} - invoice ${invoice.id}`)
  
  return invoiceResult
}

async function handleCustomerSubscriptionTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Processing trial ending for subscription:', subscription.id)
  
  // Log for potential email notifications or other business logic
  const customerId = subscription.customer as string
  const trialEnd = (subscription as any).trial_end
  const trialEndDate = trialEnd 
    ? new Date(trialEnd * 1000) 
    : 'unknown'
  console.log(`Trial ending for customer ${customerId} on ${trialEndDate}`)
  
  // This is mainly for logging/notification purposes
  return true
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log('Processing customer updated:', customer.id)
  
  // Log customer updates - could be used for email updates, etc.
  console.log(`Customer ${customer.id} updated - email: ${customer.email}`)
  
  return true
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  console.log('🎯 [WEBHOOK] Processing invoice created:', invoice.id)
  
  const customerId = (typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id) as string
  
  if (!customerId) {
    console.error('No customer ID found in invoice')
    return false
  }
  
  if (!invoice.id) {
    console.error('No invoice ID found')
    return false
  }
  const subscriptionId = (invoice as any).subscription as string | null
  
  const invoiceData: StripeInvoiceData = {
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id!,
    stripe_customer_id: customerId,
    stripe_charge_id: null, // Pas encore de charge à ce stade
    stripe_payment_intent_id: (invoice as any).payment_intent || null,
    invoice_number: invoice.number || null,
    description: invoice.description || `Abonnement LetterCraft Premium`,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    currency: invoice.currency,
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: null,
    status: invoice.status || 'draft',
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    auto_advance: invoice.auto_advance,
    collection_method: invoice.collection_method,
    attempt_count: invoice.attempt_count || 0,
    metadata: invoice.metadata || {}
  }
  
  console.log('💰 [WEBHOOK] New invoice created:', {
    invoice_id: invoiceData.stripe_invoice_id,
    amount: `${invoiceData.amount_due / 100} ${invoiceData.currency.toUpperCase()}`,
    status: invoiceData.status,
    hosted_url: invoiceData.hosted_invoice_url
  })

  return await upsertStripeInvoice(customerId, invoiceData)
}

async function handleInvoiceUpdated(invoice: Stripe.Invoice) {
  console.log('🎯 [WEBHOOK] Processing invoice updated:', invoice.id)
  
  const customerId = (typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id) as string
  
  if (!customerId) {
    console.error('No customer ID found in invoice')
    return false
  }
  
  if (!invoice.id) {
    console.error('No invoice ID found')
    return false
  }
  const subscriptionId = (invoice as any).subscription as string | null
  
  const invoiceData: StripeInvoiceData = {
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id!,
    stripe_customer_id: customerId,
    stripe_charge_id: (invoice as any).charge || null,
    stripe_payment_intent_id: (invoice as any).payment_intent || null,
    invoice_number: invoice.number || null,
    description: invoice.description || `Abonnement LetterCraft Premium`,
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
    amount_remaining: invoice.amount_remaining,
    currency: invoice.currency,
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: invoice.status_transitions?.paid_at 
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
      : null,
    status: invoice.status || 'draft',
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    auto_advance: invoice.auto_advance,
    collection_method: invoice.collection_method,
    attempt_count: invoice.attempt_count || 0,
    metadata: invoice.metadata || {}
  }
  
  console.log('💰 [WEBHOOK] Invoice updated:', {
    invoice_id: invoiceData.stripe_invoice_id,
    amount: `${invoiceData.amount_due / 100} ${invoiceData.currency.toUpperCase()}`,
    status: invoiceData.status,
    hosted_url: invoiceData.hosted_invoice_url
  })

  return await upsertStripeInvoice(customerId, invoiceData)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🔥 [WEBHOOK] Webhook received at:', new Date().toISOString())
  console.log('🔥 [WEBHOOK] Request headers:', Object.fromEntries(request.headers.entries()))
  
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

    console.log(`🎯 [WEBHOOK] Processing webhook event: ${event.type} (ID: ${event.id})`)
    console.log(`📦 [WEBHOOK] Event data object:`, JSON.stringify(event.data.object, null, 2))

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

        case 'invoice.created':
          success = await handleInvoiceCreated(event.data.object as Stripe.Invoice)
          break

        case 'invoice.updated':
          success = await handleInvoiceUpdated(event.data.object as Stripe.Invoice)
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
    console.error('🚨 WEBHOOK ERROR:', error)
    console.error(`💥 Error occurred after ${processingTime}ms`)
    console.error('📍 Error stack:', (error as Error).stack)
    
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