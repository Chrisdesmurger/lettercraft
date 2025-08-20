/**
 * Helper pour les appels API internes sécurisés
 * Permet aux composants de l'application d'appeler l'API Brevo sans authentification externe
 */

import { syncUserToBrevo } from "./brevo-contacts";

// Clé secrète pour les appels internes (devrait être en variable d'environnement)
const INTERNAL_API_SECRET =
  process.env.INTERNAL_API_SECRET || "lettercraft-internal-secret-2025";

/**
 * Appeler l'API de synchronisation en interne (sans HTTP)
 * Pour les synchronisations automatiques depuis l'application
 */
export async function internalSyncContact(
  action: string,
  data: any,
  source: string = "internal",
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log(`🔄 [INTERNAL] Sync ${action} depuis ${source}:`, data);

    switch (action) {
      case "sync":
        if (!data.userId) {
          return { success: false, error: "userId requis pour sync interne" };
        }

        const success = await syncUserToBrevo(data.userId);
        return {
          success,
          message: success
            ? "Synchronisation réussie"
            : "Échec synchronisation",
        };

      case "create":
        // Pour les créations rapides depuis l'inscription
        if (!data.email || !data.firstName || !data.lastName) {
          return {
            success: false,
            error: "email, firstName et lastName requis",
          };
        }

        // Appeler directement le service Brevo
        const { brevoContacts } = await import("./brevo-contacts");
        const result = await brevoContacts.createOrUpdateContact({
          email: data.email,
          attributes: {
            FIRSTNAME: data.firstName || "",
            LASTNAME: data.lastName || "",
            LANGUAGE: data.language || "fr",
            REGISTRATION_DATE: new Date().toISOString(),
            PROFILE_COMPLETE: !!(data.firstName && data.lastName),
          },
          updateEnabled: true,
        });

        return {
          success: !!result,
          message: result
            ? "Contact créé avec succès"
            : "Échec création contact",
        };

      default:
        return {
          success: false,
          error: `Action interne non supportée: ${action}`,
        };
    }
  } catch (error) {
    console.error(`❌ [INTERNAL] Erreur sync ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Faire un appel HTTP à l'API de sync avec authentification système
 * Pour les cas où on a besoin d'appeler l'API HTTP (webhooks, etc.)
 */
export async function internalApiCall(
  action: string,
  data: any,
  options: {
    baseUrl?: string;
    adminToken?: string;
    source?: string;
  } = {},
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const baseUrl =
      options.baseUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const source = options.source || "internal-api";

    console.log(`🌐 [INTERNAL-API] Appel ${action} depuis ${source}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Internal-Source": source,
      "X-Internal-Secret": INTERNAL_API_SECRET,
    };

    // Ajouter le token admin si fourni
    if (options.adminToken) {
      headers["Authorization"] = `Bearer ${options.adminToken}`;
    }

    const response = await fetch(`${baseUrl}/api/sync-contact`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action,
        ...data,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ [INTERNAL-API] Erreur ${action}:`, result.error);
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
      };
    }

    console.log(`✅ [INTERNAL-API] Succès ${action}:`, result.message);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`❌ [INTERNAL-API] Erreur réseau ${action}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur réseau",
    };
  }
}

/**
 * Helper pour les synchronisations automatiques depuis les composants
 * Utilise l'API interne directe (plus rapide et fiable)
 */
export async function autoSyncUser(
  userId: string,
  source: string = "component",
): Promise<boolean> {
  try {
    const result = await internalSyncContact("sync", { userId }, source);
    return result.success;
  } catch (error) {
    console.warn(`⚠️ Auto-sync échoué pour ${userId}:`, error);
    return false;
  }
}

/**
 * Helper pour créer un contact lors de l'inscription
 */
export async function autoCreateContact(
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    language?: string;
  },
  source: string = "registration",
): Promise<boolean> {
  try {
    const result = await internalSyncContact("create", userData, source);
    return result.success;
  } catch (error) {
    console.warn(`⚠️ Auto-create échoué pour ${userData.email}:`, error);
    return false;
  }
}
