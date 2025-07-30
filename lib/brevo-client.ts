/**
 * Service Brevo pour l'envoi d'emails transactionnels
 * Version utilisant l'API REST directe avec fetch
 */

export interface EmailRecipient {
  email: string
  name?: string
}

export interface SendEmailOptions {
  to: EmailRecipient[]
  subject: string
  htmlContent: string
  textContent?: string
  tags?: string[]
  sender?: EmailRecipient
}

/**
 * Service Brevo utilisant l'API REST directe
 */
class BrevoEmailService {
  private apiKey: string
  private baseUrl = 'https://api.brevo.com/v3'
  private defaultSender: EmailRecipient = {
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@lettercraft.fr',
    name: process.env.BREVO_SENDER_NAME || 'LetterCraft'
  }

  constructor() {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY environment variable is not set')
    }
    this.apiKey = process.env.BREVO_API_KEY
  }

  /**
   * Envoie un email transactionnel via l'API REST Brevo
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const emailData = {
        to: options.to,
        sender: options.sender || this.defaultSender,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent || this.htmlToText(options.htmlContent),
        tags: options.tags || []
      }

      console.log('📧 Envoi email Brevo:', {
        to: options.to.map(r => r.email),
        subject: options.subject,
        tags: options.tags
      })

      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Erreur API Brevo:', response.status, errorText)
        return false
      }

      const result = await response.json()
      console.log('✅ Email envoyé avec succès:', result.messageId)
      return true

    } catch (error) {
      console.error('❌ Erreur envoi email Brevo:', error)
      return false
    }
  }

  /**
   * Convertit HTML en texte simple (fallback basique)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Retire les tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Email de confirmation d'inscription
   */
  async sendWelcomeEmail(userEmail: string, userName: string, userLanguage: string = 'fr'): Promise<boolean> {
    const templates = {
      fr: {
        subject: 'Bienvenue sur LetterCraft ! 🎉',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Bienvenue ${userName} !</h1>
            <p>Votre compte LetterCraft a été créé avec succès.</p>
            <p>Vous pouvez maintenant :</p>
            <ul>
              <li>✨ Générer des lettres de motivation personnalisées</li>
              <li>📄 Télécharger vos CV et créer votre profil</li>
              <li>🎯 Analyser des offres d'emploi automatiquement</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Commencer maintenant
              </a>
            </div>
            <p>Bonne recherche d'emploi !<br><strong>L'équipe LetterCraft</strong></p>
          </div>
        `
      },
      en: {
        subject: 'Welcome to LetterCraft! 🎉',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Welcome ${userName}!</h1>
            <p>Your LetterCraft account has been created successfully.</p>
            <p>You can now:</p>
            <ul>
              <li>✨ Generate personalized cover letters</li>
              <li>📄 Upload your CVs and create your profile</li>
              <li>🎯 Analyze job offers automatically</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Get Started
              </a>
            </div>
            <p>Good luck with your job search!<br><strong>The LetterCraft Team</strong></p>
          </div>
        `
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Félicitations ${userName} !</h1>
            <p>Votre abonnement <strong>LetterCraft Premium</strong> est maintenant actif !</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">Vous bénéficiez maintenant de :</h3>
              <ul style="margin: 0;">
                <li>🚀 Générations de lettres illimitées</li>
                <li>⚡ Génération plus rapide</li>
                <li>🎯 Analyse avancée des offres d'emploi</li>
                <li>📈 Statistiques détaillées</li>
                <li>💬 Support prioritaire</li>
              </ul>
            </div>
            ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">📄 Télécharger votre facture</a></p>` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accéder au tableau de bord
              </a>
            </div>
            <p>Merci de votre confiance !<br><strong>L'équipe LetterCraft</strong></p>
          </div>
        `
      },
      en: {
        subject: 'Premium Subscription Activated! 👑',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Congratulations ${userName}!</h1>
            <p>Your <strong>LetterCraft Premium</strong> subscription is now active!</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">You now have access to:</h3>
              <ul style="margin: 0;">
                <li>🚀 Unlimited letter generation</li>
                <li>⚡ Faster generation</li>
                <li>🎯 Advanced job offer analysis</li>
                <li>📈 Detailed statistics</li>
                <li>💬 Priority support</li>
              </ul>
            </div>
            ${invoiceUrl ? `<p><a href="${invoiceUrl}" style="color: #2563eb;">📄 Download your invoice</a></p>` : ''}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Access Dashboard
              </a>
            </div>
            <p>Thank you for your trust!<br><strong>The LetterCraft Team</strong></p>
          </div>
        `
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Bonjour ${userName},</h1>
            <p>Nous n'avons pas pu traiter le paiement de votre abonnement LetterCraft Premium.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #991b1b; margin-top: 0;">Que faire ?</h3>
              <ul style="margin: 0;">
                <li>Vérifiez que votre carte bancaire est valide</li>
                <li>Assurez-vous d'avoir des fonds suffisants</li>
                <li>Contactez votre banque si nécessaire</li>
              </ul>
            </div>
            ${invoiceUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invoiceUrl}" 
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Réessayer le paiement
                </a>
              </div>
            ` : ''}
            <p><strong>Important :</strong> Votre accès Premium sera suspendu si le paiement n'est pas régularisé dans les 7 jours.</p>
            <p>Besoin d'aide ? Répondez à cet email.<br><strong>L'équipe LetterCraft</strong></p>
          </div>
        `
      },
      en: {
        subject: 'Payment Issue - Action Required ⚠️',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Hello ${userName},</h1>
            <p>We couldn't process the payment for your LetterCraft Premium subscription.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #991b1b; margin-top: 0;">What to do?</h3>
              <ul style="margin: 0;">
                <li>Check that your credit card is valid</li>
                <li>Ensure you have sufficient funds</li>
                <li>Contact your bank if necessary</li>
              </ul>
            </div>
            ${invoiceUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invoiceUrl}" 
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Retry Payment
                </a>
              </div>
            ` : ''}
            <p><strong>Important:</strong> Your Premium access will be suspended if payment is not resolved within 7 days.</p>
            <p>Need help? Reply to this email.<br><strong>The LetterCraft Team</strong></p>
          </div>
        `
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      tags: ['payment', 'failed', 'billing']
    })
  }

  /**
   * Email de limite de quota atteinte
   */
  async sendQuotaLimitReachedEmail(userEmail: string, userName: string, currentQuota: number, maxQuota: number, resetDate: string, userLanguage: string = 'fr'): Promise<boolean> {
    const resetDateFormatted = new Date(resetDate).toLocaleDateString(userLanguage === 'en' ? 'en-US' : 'fr-FR')
    
    const templates = {
      fr: {
        subject: 'Limite mensuelle atteinte - Passez à Premium ! 🚀',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Bonjour ${userName},</h1>
            <p>Vous avez utilisé toutes vos générations de lettres ce mois-ci (<strong>${currentQuota}/${maxQuota}</strong>).</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">Deux options s'offrent à vous :</h3>
              <ul style="margin: 0;">
                <li>⏳ Attendre la remise à zéro le <strong>${resetDateFormatted}</strong></li>
                <li>🚀 Passer à Premium pour des générations illimitées dès maintenant</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Passer à Premium
              </a>
            </div>
            <p>Avec Premium, plus de limites ! Générez autant de lettres que vous voulez.</p>
            <p><strong>L'équipe LetterCraft</strong></p>
          </div>
        `
      },
      en: {
        subject: 'Monthly Limit Reached - Upgrade to Premium! 🚀',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Hello ${userName},</h1>
            <p>You've used all your letter generations this month (<strong>${currentQuota}/${maxQuota}</strong>).</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin-top: 0;">You have two options:</h3>
              <ul style="margin: 0;">
                <li>⏳ Wait for the reset on <strong>${resetDateFormatted}</strong></li>
                <li>🚀 Upgrade to Premium for unlimited generations now</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Upgrade to Premium
              </a>
            </div>
            <p>With Premium, no more limits! Generate as many letters as you want.</p>
            <p><strong>The LetterCraft Team</strong></p>
          </div>
        `
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      tags: ['quota', 'limit', 'upgrade']
    })
  }

  /**
   * Email de confirmation d'annulation d'abonnement
   */
  async sendSubscriptionCancelledEmail(userEmail: string, userName: string, endDate: string, userLanguage: string = 'fr'): Promise<boolean> {
    const endDateFormatted = new Date(endDate).toLocaleDateString(userLanguage === 'en' ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const templates = {
      fr: {
        subject: 'Abonnement annulé - Accès maintenu jusqu\'à la fin de période 📅',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Bonjour ${userName},</h1>
            <p>Nous confirmons l'annulation de votre abonnement LetterCraft Premium.</p>
            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
              <h3 style="color: #c2410c; margin-top: 0;">Informations importantes :</h3>
              <ul style="margin: 0;">
                <li>✅ Votre abonnement reste <strong>actif jusqu'au ${endDateFormatted}</strong></li>
                <li>🚀 Vous conservez tous les avantages Premium jusqu'à cette date</li>
                <li>📅 Après cette date, votre compte passera automatiquement au plan gratuit</li>
                <li>💡 Vous pouvez vous réabonner à tout moment</li>
              </ul>
            </div>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">Que se passe-t-il ensuite ?</h3>
              <p style="margin: 0;">À partir du <strong>${endDateFormatted}</strong>, vous aurez accès au plan gratuit avec :</p>
              <ul style="margin: 10px 0 0 0;">
                <li>📝 10 générations de lettres par mois</li>
                <li>📄 1 CV sauvegardé</li>
                <li>✉️ Support par email</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Gérer mon compte
              </a>
            </div>
            <p>Nous espérons vous revoir bientôt ! N'hésitez pas à nous faire part de vos commentaires.</p>
            <p>Merci de votre confiance,<br><strong>L'équipe LetterCraft</strong></p>
          </div>
        `
      },
      en: {
        subject: 'Subscription Cancelled - Access Maintained Until End of Period 📅',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f97316;">Hello ${userName},</h1>
            <p>We confirm the cancellation of your LetterCraft Premium subscription.</p>
            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
              <h3 style="color: #c2410c; margin-top: 0;">Important information:</h3>
              <ul style="margin: 0;">
                <li>✅ Your subscription remains <strong>active until ${endDateFormatted}</strong></li>
                <li>🚀 You keep all Premium benefits until that date</li>
                <li>📅 After this date, your account will automatically switch to the free plan</li>
                <li>💡 You can resubscribe at any time</li>
              </ul>
            </div>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0369a1; margin-top: 0;">What happens next?</h3>
              <p style="margin: 0;">Starting <strong>${endDateFormatted}</strong>, you'll have access to the free plan with:</p>
              <ul style="margin: 10px 0 0 0;">
                <li>📝 10 letter generations per month</li>
                <li>📄 1 saved CV</li>
                <li>✉️ Email support</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Manage My Account
              </a>
            </div>
            <p>We hope to see you back soon! Feel free to share your feedback with us.</p>
            <p>Thank you for your trust,<br><strong>The LetterCraft Team</strong></p>
          </div>
        `
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      tags: ['subscription', 'cancelled', 'notification']
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Attention ${userName},</h1>
            <p>Il ne vous reste plus que <strong>${remainingQuota} génération${remainingQuota > 1 ? 's' : ''}</strong> ce mois-ci.</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Pour éviter toute interruption :</strong></p>
              <ul style="margin: 10px 0 0 0;">
                <li>🎯 Utilisez vos dernières générations avec soin</li>
                <li>🚀 Ou passez à Premium pour des générations illimitées</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Découvrir Premium
              </a>
            </div>
            <p><strong>L'équipe LetterCraft</strong></p>
          </div>
        `
      },
      en: {
        subject: `Only ${remainingQuota} generation${remainingQuota > 1 ? 's' : ''} left! ⚠️`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #f59e0b;">Attention ${userName},</h1>
            <p>You only have <strong>${remainingQuota} generation${remainingQuota > 1 ? 's' : ''}</strong> left this month.</p>
            <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>To avoid any interruption:</strong></p>
              <ul style="margin: 10px 0 0 0;">
                <li>🎯 Use your remaining generations carefully</li>
                <li>🚀 Or upgrade to Premium for unlimited generations</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" 
                 style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Discover Premium
              </a>
            </div>
            <p><strong>The LetterCraft Team</strong></p>
          </div>
        `
      }
    }

    const template = templates[userLanguage as keyof typeof templates] || templates.fr

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      tags: ['quota', 'warning']
    })
  }
}

// Instance singleton du service
export const brevoEmailService = new BrevoEmailService()