import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { securityMiddleware } from '@/lib/api-security'
import { brevoEmailService } from '@/lib/brevo-client'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

// Schéma de validation pour la suppression de compte
const deleteAccountSchema = {
  password: {
    required: true,
    type: 'string',
    minLength: 8,
    maxLength: 100
  },
  deletionType: {
    required: false,
    type: 'string',
    enum: ['soft', 'hard'],
    default: 'hard'
  },
  reason: {
    required: false,
    type: 'string',
    maxLength: 1000
  },
  confirmationEmail: {
    required: false,
    type: 'boolean',
    default: true
  }
}

// Schéma pour la confirmation par token
const confirmDeleteSchema = {
  confirmationToken: {
    required: true,
    type: 'string',
    minLength: 10,
    maxLength: 100
  }
}

// Schéma pour l'annulation
const cancelDeleteSchema = {
  confirmationToken: {
    required: false,
    type: 'string',
    maxLength: 100
  }
}

interface StripeRefundResult {
  refunded: boolean
  refundId?: string
  amount?: number
  reason?: string
  error?: string
}

async function cancelStripeSubscriptionWithRefund(customerId: string, subscriptionId: string): Promise<StripeRefundResult> {
  try {
    console.log(`💳 Processing Stripe cancellation for customer ${customerId}`)
    
    // 1. Récupérer l'abonnement
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    
    if (subscription.status !== 'active') {
      console.log(`⚠️ Subscription ${subscriptionId} is not active (status: ${subscription.status})`)
      return { refunded: false, reason: 'Subscription not active' }
    }
    
    // 2. Annuler immédiatement l'abonnement
    await stripe.subscriptions.cancel(subscriptionId, {
      prorate: false // Créer un crédit pro rata
    })
    
    console.log(`✅ Subscription ${subscriptionId} cancelled successfully`)
    
    // 3. Chercher les factures récentes non remboursées
    const invoices = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      status: 'paid',
      limit: 5
    })
    
    if (invoices.data.length === 0) {
      console.log(`ℹ️ No paid invoices found for subscription ${subscriptionId}`)
      return { refunded: false, reason: 'No paid invoices to refund' }
    }
    
    // 4. Rembourser la dernière facture si elle est récente (moins de 30 jours)
    const latestInvoice = invoices.data[0]
    const invoiceAge = Date.now() - (latestInvoice.created * 1000)
    const maxRefundAge = 30 * 24 * 60 * 60 * 1000 // 30 jours
    
    if (invoiceAge > maxRefundAge) {
      console.log(`⏰ Latest invoice is too old for refund (${Math.floor(invoiceAge / (24 * 60 * 60 * 1000))} days)`)
      return { refunded: false, reason: 'Invoice too old for refund' }
    }
    
    // 5. Effectuer le remboursement partiel (pro rata)
    const chargeId = (latestInvoice as any).charge
    if (chargeId) {
      // Calculer le montant pro rata
      const periodStart = (subscription as any).current_period_start * 1000
      const periodEnd = (subscription as any).current_period_end * 1000
      const now = Date.now()
      const totalTime = periodEnd - periodStart
      const unusedRatio = Math.max(0, (periodEnd - now) / totalTime)
      const refundAmount = Math.floor(latestInvoice.amount_paid * unusedRatio)
      
      if (refundAmount > 0) {
        const refund = await stripe.refunds.create({
          charge: chargeId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            reason: 'account_deletion',
            user_deletion: 'true',
            unused_ratio: unusedRatio.toString(),
            original_amount: latestInvoice.amount_paid.toString()
          }
        })
        
        console.log(`💰 Refund processed: ${refundAmount / 100} ${latestInvoice.currency} (${Math.round(unusedRatio * 100)}% unused)`)
        
        return {
          refunded: true,
          refundId: refund.id,
          amount: refundAmount,
          reason: `Pro rata refund for unused subscription period (${Math.round(unusedRatio * 100)}%)`
        }
      }
    }
    
    return { refunded: false, reason: 'No refund needed (period mostly used)' }
    
  } catch (error) {
    console.error('❌ Error processing Stripe cancellation:', error)
    return {
      refunded: false,
      error: error instanceof Error ? error.message : 'Unknown Stripe error'
    }
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Déterminer le type d'action selon les paramètres
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'request'
    
    if (action === 'confirm') {
      return await handleConfirmDeletion(request)
    } else if (action === 'cancel') {
      return await handleCancelDeletion(request)
    } else {
      return await handleRequestDeletion(request)
    }
    
  } catch (error) {
    console.error('🚨 [SECURITY] Error in account deletion API:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })
    
    return NextResponse.json(
      { error: 'Une erreur interne s\'est produite. Veuillez contacter le support.' },
      { status: 500 }
    )
  }
}

async function handleRequestDeletion(request: NextRequest) {
  // Appliquer la sécurité middleware
  const security = await securityMiddleware(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 3, windowMs: 3600000 }, // 3 tentatives par heure
    validationSchema: deleteAccountSchema
  })

  if (!security.allowed) {
    const headers = security.error?.headers || {}
    return NextResponse.json(
      { error: security.error?.message || 'Accès refusé' },
      { status: security.error?.status || 403, headers }
    )
  }

  const context = security.context!
  const userId = context.userId!

  // Use validated data from security middleware
  const { password, deletionType = 'hard', reason, confirmationEmail = true } = security.validatedData || {}

  // Vérifier le mot de passe de l'utilisateur
  const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: context.email!,
    password: password
  })

  if (signInError) {
    console.warn(`🚨 Invalid password attempt for user ${userId}`)
    
    // Log de sécurité
    await supabaseAdmin.rpc('create_audit_log', {
      p_user_id: userId,
      p_action_type: 'account_deletion_failed',
      p_entity_type: 'user_account',
      p_entity_id: userId,
      p_metadata: { error: 'invalid_password' },
      p_ip_address: request.headers.get('x-forwarded-for') || null,
      p_user_agent: request.headers.get('user-agent') || null
    })
    
    return NextResponse.json(
      { error: 'Mot de passe incorrect' },
      { status: 401 }
    )
  }

  // Récupérer les informations utilisateur
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users_with_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !userProfile) {
    return NextResponse.json(
      { error: 'Utilisateur non trouvé' },
      { status: 404 }
    )
  }

  // Créer la demande de suppression avec cooldown de 48h
  const { data: deletionRequest, error: requestError } = await supabaseAdmin
    .rpc('create_account_deletion_request', {
      p_user_id: userId,
      p_deletion_type: deletionType,
      p_reason: reason,
      p_cooldown_hours: 48,
      p_ip_address: request.headers.get('x-forwarded-for') || null,
      p_user_agent: request.headers.get('user-agent') || null
    })

  if (requestError || !deletionRequest?.[0]) {
    console.error('Error creating deletion request:', requestError)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande. Veuillez réessayer.' },
      { status: 500 }
    )
  }

  const request_id = deletionRequest[0].request_id
  const confirmation_token = deletionRequest[0].confirmation_token
  const scheduled_deletion_at = deletionRequest[0].scheduled_deletion_at

  // Envoyer l'email de confirmation si demandé
  if (confirmationEmail) {
    try {
      const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'utilisateur'
      const userLanguage = userProfile.language || 'fr'
      const confirmationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/account/delete/confirm?token=${confirmation_token}`

      await brevoEmailService.sendAccountDeletionConfirmationEmail(
        userProfile.email,
        userName,
        confirmationUrl,
        scheduled_deletion_at,
        userLanguage
      )

      // Log de l'envoi d'email
      await supabaseAdmin.rpc('create_audit_log', {
        p_user_id: userId,
        p_action_type: 'email_confirmation_sent',
        p_entity_type: 'user_account',
        p_entity_id: userId,
        p_metadata: {
          email_type: 'account_deletion_confirmation',
          scheduled_deletion_at
        }
      })

      console.log(`📧 Email de confirmation de suppression envoyé à ${userProfile.email}`)
    } catch (emailError) {
      console.warn('Erreur lors de l\'envoi de l\'email de confirmation:', emailError)
      // Ne pas faire échouer la demande si l'email échoue
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Demande de suppression créée avec succès',
    requestId: request_id,
    scheduledDeletionAt: scheduled_deletion_at,
    confirmationRequired: confirmationEmail,
    cooldownHours: 48,
    deletionType
  })
}

async function handleConfirmDeletion(request: NextRequest) {
  const security = await securityMiddleware(request, {
    requireAuth: false, // Token peut être utilisé sans auth
    rateLimit: { maxRequests: 5, windowMs: 3600000 },
    validationSchema: confirmDeleteSchema
  })

  if (!security.allowed) {
    return NextResponse.json(
      { error: security.error?.message || 'Accès refusé' },
      { status: security.error?.status || 403 }
    )
  }

  const { confirmationToken } = security.validatedData!

  // Confirmer la suppression
  const { data: confirmResult, error: confirmError } = await supabaseAdmin
    .rpc('confirm_account_deletion', {
      p_confirmation_token: confirmationToken,
      p_ip_address: request.headers.get('x-forwarded-for') || null,
      p_user_agent: request.headers.get('user-agent') || null
    })

  if (confirmError || !confirmResult?.[0]?.success) {
    return NextResponse.json(
      { error: confirmResult?.[0]?.message || 'Token invalide ou expiré' },
      { status: 400 }
    )
  }

  const result = confirmResult[0]
  const userId = result.user_id
  const scheduledDeletionAt = result.scheduled_deletion_at

  // 🔥 NOUVELLE FONCTIONNALITÉ: Annulation immédiate de l'abonnement Stripe
  console.log(`🎯 Confirmation de suppression reçue - annulation immédiate de l'abonnement pour l'utilisateur ${userId}`)
  
  try {
    // Récupérer les informations utilisateur pour Stripe
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_with_profiles')
      .select('email, first_name, last_name, stripe_customer_id, stripe_subscription_id, subscription_tier, language')
      .eq('id', userId)
      .single()

    if (!profileError && userProfile) {
      console.log(`🔍 Utilisateur trouvé: ${userProfile.email}, Stripe Customer ID: ${userProfile.stripe_customer_id}, Subscription ID: ${userProfile.stripe_subscription_id}`)

      // Si l'utilisateur a un abonnement Stripe actif, l'annuler immédiatement
      if (userProfile.stripe_customer_id && userProfile.stripe_subscription_id) {
        console.log(`💳 Annulation immédiate de l'abonnement Stripe pour l'utilisateur ${userId}`)
        
        try {
          // Récupérer l'abonnement actuel
          const subscription = await stripe.subscriptions.retrieve(userProfile.stripe_subscription_id)
          
          if (subscription.status === 'active' && !subscription.cancel_at_period_end) {
            // Annuler immédiatement l'abonnement
            const cancelledSubscription = await stripe.subscriptions.cancel(userProfile.stripe_subscription_id, {
              prorate: false // Ne pas créer de crédit pro rata
            })
            
            console.log(`✅ Abonnement Stripe ${userProfile.stripe_subscription_id} annulé avec succès`)
            console.log(`📅 Date d'annulation: ${new Date(cancelledSubscription.canceled_at! * 1000).toISOString()}`)
            
            // Mettre à jour l'abonnement dans notre base de données immédiatement
            await supabaseAdmin
              .from('stripe_subscriptions')
              .update({
                status: 'canceled',
                cancel_at_period_end: true,
                canceled_at: new Date().toISOString(),
                metadata: {
                  ...subscription.metadata,
                  cancellation_reason: 'Suppression de compte utilisateur',
                  cancelled_by_user: 'true',
                  cancelled_at: new Date().toISOString(),
                  cancelled_via: 'account_deletion_confirmation'
                },
                updated_at: new Date().toISOString()
              })
              .eq('stripe_subscription_id', userProfile.stripe_subscription_id)

            // Mettre à jour le tier de l'utilisateur immédiatement
            await supabaseAdmin
              .rpc('update_user_profile', {
                p_user_id: userId,
                p_subscription_tier: 'free',
                p_subscription_end_date: null
              })

            // Envoyer l'email d'annulation d'abonnement
            try {
              const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'utilisateur'
              const userLanguage = userProfile.language || 'fr'
              
              await brevoEmailService.sendSubscriptionCancelledEmail(
                userProfile.email,
                userName,
                new Date().toISOString(), // Annulé immédiatement
                userLanguage
              )
              
              console.log(`📧 Email d'annulation d'abonnement envoyé à ${userProfile.email}`)
            } catch (emailError) {
              console.warn('Erreur lors de l\'envoi de l\'email d\'annulation d\'abonnement:', emailError)
            }

            // Synchroniser avec Brevo pour mettre à jour le statut d'abonnement
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync-contact`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'lettercraft-internal-secret-2025',
                  'X-Internal-Source': 'account-deletion-confirmation'
                },
                body: JSON.stringify({
                  userId: userId,
                  action: 'sync'
                })
              })
              console.log(`🔄 Contact Brevo synchronisé après annulation d'abonnement pour l'utilisateur ${userId}`)
            } catch (syncError) {
              console.warn('Erreur synchronisation contact Brevo après annulation abonnement:', syncError)
            }
            
          } else {
            console.log(`ℹ️ L'abonnement ${userProfile.stripe_subscription_id} n'est pas actif ou déjà annulé (status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end})`)
          }
        } catch (stripeError) {
          console.error(`❌ Erreur lors de l'annulation de l'abonnement Stripe pour l'utilisateur ${userId}:`, stripeError)
          // Ne pas faire échouer la confirmation de suppression si l'annulation Stripe échoue
        }
      } else {
        console.log(`ℹ️ Aucun abonnement Stripe actif trouvé pour l'utilisateur ${userId}`)
      }
    } else {
      console.warn(`⚠️ Impossible de récupérer le profil utilisateur ${userId}:`, profileError)
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de l'annulation d'abonnement pour l'utilisateur ${userId}:`, error)
    // Ne pas faire échouer la confirmation de suppression
  }

  return NextResponse.json({
    success: true,
    message: 'Suppression confirmée avec succès. Votre abonnement a été annulé immédiatement.',
    userId,
    scheduledDeletionAt,
    subscriptionCancelled: true,
    note: 'Vous recevrez un email de confirmation. Vous pouvez encore annuler la suppression de compte avant la date programmée.'
  })
}

async function handleCancelDeletion(request: NextRequest) {
  const security = await securityMiddleware(request, {
    requireAuth: true,
    rateLimit: { maxRequests: 10, windowMs: 3600000 },
    validationSchema: cancelDeleteSchema
  })

  if (!security.allowed) {
    return NextResponse.json(
      { error: security.error?.message || 'Accès refusé' },
      { status: security.error?.status || 403 }
    )
  }

  const { confirmationToken } = security.validatedData!
  const context = security.context!
  const userId = context.userId!

  // Annuler la demande
  const { data: cancelled } = await supabaseAdmin
    .rpc('cancel_account_deletion', {
      p_user_id: userId,
      p_confirmation_token: confirmationToken,
      p_ip_address: request.headers.get('x-forwarded-for') || null,
      p_user_agent: request.headers.get('user-agent') || null
    })

  if (!cancelled) {
    return NextResponse.json(
      { error: 'Aucune demande de suppression active trouvée ou délai expiré' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Demande de suppression annulée avec succès'
  })
}

// Endpoint POST pour l'exécution finale (batch job ou admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, adminSecret } = body

    // Vérifier le secret admin pour les opérations d'exécution
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (action === 'execute_pending_deletions') {
      return await executeScheduledDeletions()
    } else if (action === 'execute_user_deletion' && userId) {
      return await executeUserDeletion(userId)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in deletion execution:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function executeScheduledDeletions() {
  console.log('🗂️ Executing scheduled account deletions...')

  // Trouver les demandes confirmées prêtes pour suppression
  const { data: pendingDeletions, error } = await supabaseAdmin
    .from('account_deletion_requests')
    .select(`
      id, user_id, deletion_type, reason, scheduled_deletion_at,
      users_with_profiles!inner(email, first_name, last_name, stripe_customer_id, stripe_subscription_id)
    `)
    .eq('status', 'confirmed')
    .lte('scheduled_deletion_at', new Date().toISOString())

  if (error) {
    console.error('Error fetching pending deletions:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!pendingDeletions || pendingDeletions.length === 0) {
    console.log('ℹ️ No pending deletions found')
    return NextResponse.json({ executed: 0, message: 'No pending deletions' })
  }

  console.log(`📋 Found ${pendingDeletions.length} pending deletions`)

  let executed = 0
  let failed = 0

  for (const deletion of pendingDeletions) {
    try {
      const success = await executeUserDeletionInternal(
        deletion.user_id,
        deletion.deletion_type,
        deletion
      )
      if (success) {
        executed++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`Error executing deletion for user ${deletion.user_id}:`, error)
      failed++
    }
  }

  console.log(`✅ Deletion batch completed: ${executed} executed, ${failed} failed`)

  return NextResponse.json({
    executed,
    failed,
    total: pendingDeletions.length,
    message: `Processed ${pendingDeletions.length} deletions`
  })
}

async function executeUserDeletion(userId: string) {
  // Récupérer la demande de suppression
  const { data: deletion, error } = await supabaseAdmin
    .from('account_deletion_requests')
    .select(`
      *,
      users_with_profiles!inner(email, first_name, last_name, stripe_customer_id, stripe_subscription_id)
    `)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .single()

  if (error || !deletion) {
    return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 })
  }

  const success = await executeUserDeletionInternal(userId, deletion.deletion_type, deletion)

  return NextResponse.json({
    success,
    message: success ? 'User deleted successfully' : 'Deletion failed'
  })
}

async function executeUserDeletionInternal(
  userId: string,
  deletionType: string,
  deletionData: any
): Promise<boolean> {
  const userProfile = deletionData.users_with_profiles

  console.log(`🗑️ Executing ${deletionType} deletion for user ${userId} (${userProfile.email})`)

  try {
    // 1. Gérer l'annulation Stripe si nécessaire
    let stripeResult: StripeRefundResult | null = null
    if (userProfile.stripe_customer_id && userProfile.stripe_subscription_id) {
      stripeResult = await cancelStripeSubscriptionWithRefund(
        userProfile.stripe_customer_id,
        userProfile.stripe_subscription_id
      )
      console.log(`💳 Stripe processing result:`, stripeResult)
    }

    // 2. Exécuter la suppression selon le type
    let deletionResult: boolean
    if (deletionType === 'soft') {
      const { data: result } = await supabaseAdmin
        .rpc('execute_soft_delete_user', { p_user_id: userId })
      deletionResult = result
    } else {
      const { data: result } = await supabaseAdmin
        .rpc('execute_hard_delete_user', { p_user_id: userId })
      deletionResult = result
    }

    if (!deletionResult) {
      console.error(`❌ Failed to delete user ${userId}`)
      return false
    }

    // 3. Envoyer email de confirmation de suppression
    try {
      const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'utilisateur'
      const userLanguage = userProfile.language || 'fr'

      await brevoEmailService.sendAccountDeletedEmail(
        userProfile.email,
        userName,
        deletionType,
        stripeResult?.refunded || false,
        stripeResult?.amount ? stripeResult.amount / 100 : 0,
        userLanguage
      )

      console.log(`📧 Deletion confirmation email sent to ${userProfile.email}`)
    } catch (emailError) {
      console.warn('Failed to send deletion confirmation email:', emailError)
      // Ne pas faire échouer la suppression si l'email échoue
    }

    console.log(`✅ Successfully deleted user ${userId} (${deletionType})`)
    return true

  } catch (error) {
    console.error(`❌ Error during user deletion ${userId}:`, error)
    return false
  }
}

// Méthodes non supportées
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}