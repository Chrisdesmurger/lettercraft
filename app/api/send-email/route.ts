/**
 * API Route pour l'envoi d'emails via Brevo
 * Gère tous les types d'emails transactionnels de l'application
 */

import { NextRequest, NextResponse } from 'next/server'
import { brevoEmailService } from '@/lib/brevo-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface SendEmailRequest {
  type: 'welcome' | 'subscription_confirmed' | 'payment_failed' | 'quota_limit' | 'quota_warning'
  userEmail: string
  userName: string
  userLanguage?: string
  // Paramètres spécifiques selon le type
  invoiceUrl?: string
  currentQuota?: number
  maxQuota?: number
  remainingQuota?: number
  resetDate?: string
}

/**
 * POST /api/send-email
 * Envoie un email transactionnel via Brevo
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'API key Brevo est configurée
    if (!process.env.BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY manquante')
      return NextResponse.json(
        { error: 'Service email non configuré' },
        { status: 500 }
      )
    }

    const body: SendEmailRequest = await request.json()
    
    // Validation des champs requis
    if (!body.type || !body.userEmail || !body.userName) {
      return NextResponse.json(
        { error: 'Champs requis manquants: type, userEmail, userName' },
        { status: 400 }
      )
    }

    console.log(`📧 Préparation envoi email type: ${body.type} vers: ${body.userEmail}`)

    let success = false

    // Envoyer l'email selon le type
    switch (body.type) {
      case 'welcome':
        success = await brevoEmailService.sendWelcomeEmail(
          body.userEmail,
          body.userName,
          body.userLanguage || 'fr'
        )
        break

      case 'subscription_confirmed':
        success = await brevoEmailService.sendSubscriptionConfirmationEmail(
          body.userEmail,
          body.userName,
          body.invoiceUrl,
          body.userLanguage || 'fr'
        )
        break

      case 'payment_failed':
        success = await brevoEmailService.sendPaymentFailedEmail(
          body.userEmail,
          body.userName,
          body.invoiceUrl,
          body.userLanguage || 'fr'
        )
        break

      case 'quota_limit':
        if (!body.currentQuota || !body.maxQuota || !body.resetDate) {
          return NextResponse.json(
            { error: 'Paramètres quota manquants pour quota_limit' },
            { status: 400 }
          )
        }
        success = await brevoEmailService.sendQuotaLimitReachedEmail(
          body.userEmail,
          body.userName,
          body.currentQuota,
          body.maxQuota,
          body.resetDate,
          body.userLanguage || 'fr'
        )
        break

      case 'quota_warning':
        if (!body.remainingQuota) {
          return NextResponse.json(
            { error: 'remainingQuota manquant pour quota_warning' },
            { status: 400 }
          )
        }
        success = await brevoEmailService.sendQuotaWarningEmail(
          body.userEmail,
          body.userName,
          body.remainingQuota,
          body.userLanguage || 'fr'
        )
        break

      default:
        return NextResponse.json(
          { error: `Type d'email non supporté: ${body.type}` },
          { status: 400 }
        )
    }

    if (success) {
      console.log(`✅ Email ${body.type} envoyé avec succès à ${body.userEmail}`)
      return NextResponse.json({ 
        success: true, 
        message: `Email ${body.type} envoyé avec succès` 
      })
    } else {
      console.error(`❌ Échec envoi email ${body.type} à ${body.userEmail}`)
      return NextResponse.json(
        { error: `Échec de l'envoi de l'email ${body.type}` },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Erreur API send-email:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * Fonction utilitaire pour envoyer un email depuis l'application
 * Note: Cette fonction ne peut pas être exportée depuis une API route
 * Utilisez plutôt le client email dans lib/email-client.ts
 */
async function sendEmailHelper(emailData: SendEmailRequest): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    })

    const result = await response.json()
    return response.ok && result.success
  } catch (error) {
    console.error('Erreur sendEmailHelper:', error)
    return false
  }
}

// Méthodes HTTP non supportées
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}