/**
 * Service Brevo pour l'envoi d'emails transactionnels
 * Configuration et client Brevo pour LetterCraft
 */

// Import simple avec require pour éviter les problèmes de typage
const brevo = require('@getbrevo/brevo')

// Configuration du client Brevo avec vérification d'environnement
let apiInstance: any = null

function initializeBrevoClient(): any {
  if (!apiInstance) {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY environment variable is not set')
    }

    // Configuration avec l'API Brevo
    const defaultClient = brevo.ApiClient.instance
    const apiKey = defaultClient.authentications['api-key']
    apiKey.apiKey = process.env.BREVO_API_KEY

    // Créer l'instance API
    apiInstance = new brevo.TransactionalEmailsApi()
  }
  
  return apiInstance
}

export interface EmailTemplate {
  templateId: number
  subject: string
  htmlContent: string
  textContent?: string
}

export interface EmailParams {
  [key: string]: string | number | boolean
}

export interface EmailRecipient {
  email: string
  name?: string
}

export interface SendEmailOptions {
  to: EmailRecipient[]
  templateId?: number
  subject?: string
  htmlContent?: string
  textContent?: string
  params?: EmailParams
  tags?: string[]
  sender?: EmailRecipient
}

class BrevoEmailService {
  private defaultSender: EmailRecipient = {
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@lettercraft.fr',
    name: process.env.BREVO_SENDER_NAME || 'LetterCraft'
  }

  /**
   * Envoie un email transactionnel via Brevo
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      // Initialiser le client Brevo
      const api = initializeBrevoClient()

      const sendSmtpEmail: any = {
        to: options.to,
        sender: options.sender || this.defaultSender,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
        params: options.params,
        tags: options.tags
      }

      // Si un templateId est fourni, utiliser le template
      if (options.templateId) {
        sendSmtpEmail.templateId = options.templateId
        // Avec un template, on n'a pas besoin de subject/htmlContent
        delete sendSmtpEmail.subject
        delete sendSmtpEmail.htmlContent
        delete sendSmtpEmail.textContent
      }

      console.log('📧 Envoi email Brevo:', {
        to: options.to.map(r => r.email),
        templateId: options.templateId,
        subject: options.subject,
        tags: options.tags
      })

      const result = await api.sendTransacEmail(sendSmtpEmail)
      
      console.log('✅ Email envoyé avec succès:', result.messageId || result.body?.messageId || 'ID non disponible')
      return true

    } catch (error) {
      console.error('❌ Erreur envoi email Brevo:', error)
      return false
    }
  }

  /**
   * Email de confirmation d'inscription
   */
  async sendWelcomeEmail(userEmail: string, userName: string, userLanguage: string = 'fr'): Promise<boolean> {
    const templates = {
      fr: {
        subject: 'Bienvenue sur LetterCraft ! 🎉',
        htmlContent: `
          <h1>Bienvenue ${userName} !</h1>
          <p>Votre compte LetterCraft a été créé avec succès.</p>
          <p>Vous pouvez maintenant :</p>
          <ul>
            <li>✨ Générer des lettres de motivation personnalisées</li>
            <li>📄 Télécharger vos CV et créer votre profil</li>
            <li>🎯 Analyser des offres d'emploi automatiquement</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Commencer maintenant</a></p>
          <p>L'équipe LetterCraft</p>
        `,
        textContent: `Bienvenue ${userName} ! Votre compte LetterCraft a été créé avec succès. Rendez-vous sur ${process.env.NEXT_PUBLIC_APP_URL} pour commencer.`
      },
      en: {
        subject: 'Welcome to LetterCraft! 🎉',
        htmlContent: `
          <h1>Welcome ${userName}!</h1>
          <p>Your LetterCraft account has been created successfully.</p>
          <p>You can now:</p>
          <ul>
            <li>✨ Generate personalized cover letters</li>
            <li>📄 Upload your CVs and create your profile</li>
            <li>🎯 Analyze job offers automatically</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Get Started</a></p>
          <p>The LetterCraft Team</p>
        `,
        textContent: `Welcome ${userName}! Your LetterCraft account has been created successfully. Visit ${process.env.NEXT_PUBLIC_APP_URL} to get started.`
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      tags: ['welcome', 'registration']
    })
  }

  /**
   * Email de confirmation d'abonnement premium
   */
  async sendSubscriptionConfirmationEmail(userEmail: string, userName: string, invoiceUrl?: string, userLanguage: string = 'fr'): Promise<boolean> {
    const templates = {
      fr: {
        subject: 'Abonnement Premium activé ! 👑',
        htmlContent: `
          <h1>Félicitations ${userName} !</h1>
          <p>Votre abonnement <strong>LetterCraft Premium</strong> est maintenant actif !</p>
          <p>Vous bénéficiez maintenant de :</p>
          <ul>
            <li>🚀 Générations de lettres illimitées</li>
            <li>⚡ Génération plus rapide</li>
            <li>🎯 Analyse avancée des offres d'emploi</li>
            <li>📈 Statistiques détaillées</li>
            <li>💬 Support prioritaire</li>
          </ul>
          ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">Télécharger votre facture</a></p>` : ''}
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accéder au tableau de bord</a></p>
          <p>Merci de votre confiance !<br>L'équipe LetterCraft</p>
        `,
        textContent: `Félicitations ${userName} ! Votre abonnement LetterCraft Premium est maintenant actif. Profitez de toutes les fonctionnalités premium sur ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      },
      en: {
        subject: 'Premium Subscription Activated! 👑',
        htmlContent: `
          <h1>Congratulations ${userName}!</h1>
          <p>Your <strong>LetterCraft Premium</strong> subscription is now active!</p>
          <p>You now have access to:</p>
          <ul>
            <li>🚀 Unlimited letter generation</li>
            <li>⚡ Faster generation</li>
            <li>🎯 Advanced job offer analysis</li>
            <li>📈 Detailed statistics</li>
            <li>💬 Priority support</li>
          </ul>
          ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">Download your invoice</a></p>` : ''}
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access Dashboard</a></p>
          <p>Thank you for your trust!<br>The LetterCraft Team</p>
        `,
        textContent: `Congratulations ${userName}! Your LetterCraft Premium subscription is now active. Enjoy all premium features at ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      tags: ['subscription', 'premium', 'confirmation']
    })
  }

  /**
   * Email d'échec de paiement
   */
  async sendPaymentFailedEmail(userEmail: string, userName: string, invoiceUrl?: string, userLanguage: string = 'fr'): Promise<boolean> {
    const templates = {
      fr: {
        subject: 'Problème de paiement - Action requise ⚠️',
        htmlContent: `
          <h1>Bonjour ${userName},</h1>
          <p>Nous n'avons pas pu traiter le paiement de votre abonnement LetterCraft Premium.</p>
          <p><strong>Que faire ?</strong></p>
          <ul>
            <li>Vérifiez que votre carte bancaire est valide</li>
            <li>Assurez-vous d'avoir des fonds suffisants</li>
            <li>Contactez votre banque si nécessaire</li>
          </ul>
          ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Réessayer le paiement</a></p>` : ''}
          <p>Votre accès Premium sera suspendu si le paiement n'est pas régularisé dans les 7 jours.</p>
          <p>Besoin d'aide ? Répondez à cet email.</p>
          <p>L'équipe LetterCraft</p>
        `,
        textContent: `Bonjour ${userName}, nous n'avons pas pu traiter le paiement de votre abonnement. Veuillez vérifier votre méthode de paiement.`
      },
      en: {
        subject: 'Payment Issue - Action Required ⚠️',
        htmlContent: `
          <h1>Hello ${userName},</h1>
          <p>We couldn't process the payment for your LetterCraft Premium subscription.</p>
          <p><strong>What to do?</strong></p>
          <ul>
            <li>Check that your credit card is valid</li>
            <li>Ensure you have sufficient funds</li>
            <li>Contact your bank if necessary</li>
          </ul>
          ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Retry Payment</a></p>` : ''}
          <p>Your Premium access will be suspended if payment is not resolved within 7 days.</p>
          <p>Need help? Reply to this email.</p>
          <p>The LetterCraft Team</p>
        `,
        textContent: `Hello ${userName}, we couldn't process the payment for your subscription. Please check your payment method.`
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      tags: ['payment', 'failed', 'billing']
    })
  }

  /**
   * Email de limite de quota atteinte
   */
  async sendQuotaLimitReachedEmail(userEmail: string, userName: string, currentQuota: number, maxQuota: number, resetDate: string, userLanguage: string = 'fr'): Promise<boolean> {
    const templates = {
      fr: {
        subject: 'Limite mensuelle atteinte - Passez à Premium ! 🚀',
        htmlContent: `
          <h1>Bonjour ${userName},</h1>
          <p>Vous avez utilisé toutes vos générations de lettres ce mois-ci (${currentQuota}/${maxQuota}).</p>
          <p><strong>Deux options s'offrent à vous :</strong></p>
          <ul>
            <li>⏳ Attendre la remise à zéro le ${new Date(resetDate).toLocaleDateString('fr-FR')}</li>
            <li>🚀 Passer à Premium pour des générations illimitées dès maintenant</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Passer à Premium</a></p>
          <p>Avec Premium, plus de limites ! Générez autant de lettres que vous voulez.</p>
          <p>L'équipe LetterCraft</p>
        `,
        textContent: `Bonjour ${userName}, vous avez atteint votre limite mensuelle (${currentQuota}/${maxQuota}). Passez à Premium pour des générations illimitées !`
      },
      en: {
        subject: 'Monthly Limit Reached - Upgrade to Premium! 🚀',
        htmlContent: `
          <h1>Hello ${userName},</h1>
          <p>You've used all your letter generations this month (${currentQuota}/${maxQuota}).</p>
          <p><strong>You have two options:</strong></p>
          <ul>
            <li>⏳ Wait for the reset on ${new Date(resetDate).toLocaleDateString('en-US')}</li>
            <li>🚀 Upgrade to Premium for unlimited generations now</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Upgrade to Premium</a></p>
          <p>With Premium, no more limits! Generate as many letters as you want.</p>
          <p>The LetterCraft Team</p>
        `,
        textContent: `Hello ${userName}, you've reached your monthly limit (${currentQuota}/${maxQuota}). Upgrade to Premium for unlimited generations!`
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      tags: ['quota', 'limit', 'upgrade']
    })
  }

  /**
   * Email d'approche de la limite de quota
   */
  async sendQuotaWarningEmail(userEmail: string, userName: string, remainingQuota: number, userLanguage: string = 'fr'): Promise<boolean> {
    const templates = {
      fr: {
        subject: `Plus que ${remainingQuota} génération${remainingQuota > 1 ? 's' : ''} restante${remainingQuota > 1 ? 's' : ''} ! ⚠️`,
        htmlContent: `
          <h1>Attention ${userName},</h1>
          <p>Il ne vous reste plus que <strong>${remainingQuota} génération${remainingQuota > 1 ? 's' : ''}</strong> ce mois-ci.</p>
          <p>Pour éviter toute interruption :</p>
          <ul>
            <li>🎯 Utilisez vos dernières générations avec soin</li>
            <li>🚀 Ou passez à Premium pour des générations illimitées</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Découvrir Premium</a></p>
          <p>L'équipe LetterCraft</p>
        `,
        textContent: `Attention ${userName}, il ne vous reste que ${remainingQuota} génération(s) ce mois-ci. Considérez l'upgrade Premium !`
      },
      en: {
        subject: `Only ${remainingQuota} generation${remainingQuota > 1 ? 's' : ''} left! ⚠️`,
        htmlContent: `
          <h1>Attention ${userName},</h1>
          <p>You only have <strong>${remainingQuota} generation${remainingQuota > 1 ? 's' : ''}</strong> left this month.</p>
          <p>To avoid any interruption:</p>
          <ul>
            <li>🎯 Use your remaining generations carefully</li>
            <li>🚀 Or upgrade to Premium for unlimited generations</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Discover Premium</a></p>
          <p>The LetterCraft Team</p>
        `,
        textContent: `Attention ${userName}, you only have ${remainingQuota} generation(s) left this month. Consider upgrading to Premium!`
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      tags: ['quota', 'warning']
    })
  }
}

// Instance singleton du service
export const brevoEmailService = new BrevoEmailService()