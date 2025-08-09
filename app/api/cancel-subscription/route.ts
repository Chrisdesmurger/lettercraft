import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { securityMiddleware, validateInput } from '@/lib/api-security'
import { brevoEmailService } from '@/lib/brevo-client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Schéma de validation pour l'annulation d'abonnement
const cancelSubscriptionSchema = {
  userId: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100
  },
  cancellationReason: {
    required: false,
    type: 'string',
    maxLength: 500
  }
}

export async function POST(request: NextRequest) {
  try {
    // Appliquer la sécurité middleware
    const security = await securityMiddleware(request, {
      requireAuth: true,
      rateLimit: { maxRequests: 5, windowMs: 60000 }, // 5 requêtes par minute max
      validationSchema: cancelSubscriptionSchema
    })

    if (!security.allowed) {
      const headers = security.error?.headers || {}
      return NextResponse.json(
        { error: security.error?.message || 'Accès refusé' },
        { status: security.error?.status || 403, headers }
      )
    }

    const { userId, cancellationReason } = security.validatedData!
    const context = security.context!

    // Vérifier que l'utilisateur authentifié correspond à l'userId demandé
    if (context.userId !== userId) {
      console.warn(`🚨 Tentative d'annulation non autorisée: utilisateur ${context.userId} essaie d'annuler l'abonnement de ${userId}`)
      return NextResponse.json(
        { error: 'Vous ne pouvez annuler que votre propre abonnement' },
        { status: 403 }
      )
    }

    // Get user's subscription info
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users_with_profiles')
      .select('stripe_customer_id, stripe_subscription_id, email, first_name, last_name, language')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!userProfile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Get current subscription from Stripe to get period end date
    const subscription = await stripe.subscriptions.retrieve(userProfile.stripe_subscription_id)

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active' },
        { status: 400 }
      )
    }

    // Vérifier que l'abonnement n'est pas déjà marqué pour annulation
    if (subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'L\'abonnement est déjà programmé pour annulation' },
        { status: 400 }
      )
    }

    // Vérifier que l'abonnement appartient bien à l'utilisateur
    if (subscription.customer !== userProfile.stripe_customer_id) {
      console.error(`🚨 SÉCURITÉ: Tentative d'annulation d'abonnement non autorisée. User: ${userId}, Customer: ${userProfile.stripe_customer_id}, Subscription Customer: ${subscription.customer}`)
      return NextResponse.json(
        { error: 'Abonnement non trouvé' },
        { status: 404 }
      )
    }

    // Nettoyer et valider la raison d'annulation
    const sanitizedReason = cancellationReason 
      ? cancellationReason.trim().substring(0, 500)
      : 'Aucune raison fournie'

    // Cancel subscription at period end
    const updatedSubscription = await stripe.subscriptions.update(
      userProfile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
        metadata: {
          ...subscription.metadata,
          cancellation_reason: sanitizedReason,
          cancelled_by_user: 'true',
          cancelled_at: new Date().toISOString(),
          cancelled_by_user_id: userId,
          cancelled_from_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      }
    )

    // Update local subscription record immediately for better UX
    try {
      await supabaseAdmin
        .from('stripe_subscriptions')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
          metadata: {
            cancellation_reason: sanitizedReason,
            cancelled_by_user: 'true',
            cancelled_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', userProfile.stripe_subscription_id)
        
      console.log('✅ Local subscription updated with cancellation flag')
    } catch (localUpdateError) {
      console.warn('Warning: Could not update local subscription record:', localUpdateError)
      // Don't fail the cancellation if local update fails
    }

    // Log de sécurité pour l'annulation
    console.log(`🚫 [SECURITY] Subscription cancellation:`)
    console.log(`   - Subscription ID: ${userProfile.stripe_subscription_id}`)
    console.log(`   - User ID: ${userId}`)
    console.log(`   - Email: ${userProfile.email}`)
    console.log(`   - End date: ${(updatedSubscription as any).current_period_end ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString() : 'unknown'}`)
    console.log(`   - Reason: ${sanitizedReason}`)
    console.log(`   - IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`)

    // Store cancellation feedback (optional)
    if (sanitizedReason && sanitizedReason !== 'Aucune raison fournie') {
      try {
        await supabaseAdmin
          .from('user_feedback')
          .insert({
            user_id: userId,
            feedback_type: 'subscription_cancellation',
            feedback_text: sanitizedReason,
            metadata: {
              subscription_id: userProfile.stripe_subscription_id,
              cancelled_at: new Date().toISOString(),
              end_date: (updatedSubscription as any).current_period_end 
                ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
                : null
            },
            created_at: new Date().toISOString()
          })
      } catch (feedbackError) {
        console.warn('Could not store cancellation feedback:', feedbackError)
        // Don't fail the cancellation if feedback storage fails
      }
    }

    // Ne pas exposer d'informations sensibles dans la réponse
    const cancellationDate = (updatedSubscription as any).current_period_end 
      ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
      : null

    // Envoyer l'email de confirmation d'annulation
    if (cancellationDate) {
      try {
        const userName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'utilisateur'
        const userLanguage = userProfile.language || 'fr'
        
        await brevoEmailService.sendSubscriptionCancelledEmail(
          userProfile.email,
          userName,
          cancellationDate,
          userLanguage
        )
        
        console.log(`📧 Email d'annulation envoyé à ${userProfile.email}`)
      } catch (emailError) {
        // Ne pas faire échouer l'annulation si l'email échoue
        console.warn('Erreur lors de l\'envoi de l\'email d\'annulation:', emailError)
      }
      
      // Synchroniser le contact Brevo pour mettre à jour le statut d'abonnement
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync-contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'lettercraft-internal-secret-2025',
            'X-Internal-Source': 'cancel-subscription'
          },
          body: JSON.stringify({
            userId: userId,
            action: 'sync'
          })
        })
        console.log(`🔄 Contact Brevo synchronisé après annulation pour l'utilisateur ${userId}`)
      } catch (syncError) {
        console.warn('Erreur synchronisation contact Brevo après annulation:', syncError)
        // Ne pas faire échouer l'annulation si la sync échoue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Votre abonnement sera annulé à la fin de la période de facturation actuelle',
      cancellationDate,
      subscription: {
        cancel_at_period_end: true,
        current_period_end: (updatedSubscription as any).current_period_end
      }
    })

  } catch (error) {
    // Log détaillé pour le debug mais réponse générique pour la sécurité
    console.error('🚨 [SECURITY] Error in cancel-subscription API:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: request.headers.get('x-user-id') || 'unknown',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })
    
    if (error instanceof Stripe.errors.StripeError) {
      // Log l'erreur Stripe mais ne pas exposer les détails
      console.error('🚨 Stripe error details:', error.code, error.type, error.message)
      
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation de l\'abonnement. Veuillez réessayer.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Une erreur interne s\'est produite. Veuillez contacter le support.' },
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