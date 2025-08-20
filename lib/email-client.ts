/**
 * Client email côté frontend pour faciliter l'envoi d'emails
 * Wrapper pour l'API /api/send-email
 */

export interface EmailRequest {
  type:
    | "welcome"
    | "subscription_confirmed"
    | "payment_failed"
    | "quota_limit"
    | "quota_warning";
  userEmail: string;
  userName: string;
  userLanguage?: string;
  // Paramètres optionnels selon le type
  invoiceUrl?: string;
  currentQuota?: number;
  maxQuota?: number;
  remainingQuota?: number;
  resetDate?: string;
}

export interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Classe principale pour l'envoi d'emails côté client
 */
export class EmailClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  }

  /**
   * Envoie un email via l'API
   */
  async sendEmail(emailData: EmailRequest): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      const result: EmailResponse = await response.json();

      if (!response.ok) {
        console.error("Erreur envoi email:", result.error || "Erreur inconnue");
        return false;
      }

      return result.success;
    } catch (error) {
      console.error("Erreur sendEmail:", error);
      return false;
    }
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    userLanguage: string = "fr",
  ): Promise<boolean> {
    return this.sendEmail({
      type: "welcome",
      userEmail,
      userName,
      userLanguage,
    });
  }

  /**
   * Envoie un email de confirmation d'abonnement
   */
  async sendSubscriptionConfirmationEmail(
    userEmail: string,
    userName: string,
    invoiceUrl?: string,
    userLanguage: string = "fr",
  ): Promise<boolean> {
    return this.sendEmail({
      type: "subscription_confirmed",
      userEmail,
      userName,
      userLanguage,
      invoiceUrl,
    });
  }

  /**
   * Envoie un email d'échec de paiement
   */
  async sendPaymentFailedEmail(
    userEmail: string,
    userName: string,
    invoiceUrl?: string,
    userLanguage: string = "fr",
  ): Promise<boolean> {
    return this.sendEmail({
      type: "payment_failed",
      userEmail,
      userName,
      userLanguage,
      invoiceUrl,
    });
  }

  /**
   * Envoie un email de limite de quota atteinte
   */
  async sendQuotaLimitReachedEmail(
    userEmail: string,
    userName: string,
    currentQuota: number,
    maxQuota: number,
    resetDate: string,
    userLanguage: string = "fr",
  ): Promise<boolean> {
    return this.sendEmail({
      type: "quota_limit",
      userEmail,
      userName,
      userLanguage,
      currentQuota,
      maxQuota,
      resetDate,
    });
  }

  /**
   * Envoie un email d'avertissement de quota
   */
  async sendQuotaWarningEmail(
    userEmail: string,
    userName: string,
    remainingQuota: number,
    userLanguage: string = "fr",
  ): Promise<boolean> {
    return this.sendEmail({
      type: "quota_warning",
      userEmail,
      userName,
      userLanguage,
      remainingQuota,
    });
  }
}

// Instance singleton du client email
export const emailClient = new EmailClient();

/**
 * Hook React pour utiliser le client email
 */
export function useEmailClient() {
  return emailClient;
}
