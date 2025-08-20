import { NextRequest, NextResponse } from "next/server";
import {
  brevoContacts,
  syncUserToBrevo,
  bulkSyncUsersToBrevo,
  updateContactLists,
  syncAllContactLists,
  createMissingContacts,
} from "@/lib/brevo-contacts";
import { securityMiddleware, checkPermissions } from "@/lib/api-security";

interface SyncContactRequest {
  userId?: string;
  userIds?: string[];
  email?: string;
  firstName?: string;
  lastName?: string;
  language?: string;
  listIds?: number[];
  action:
    | "create"
    | "update"
    | "delete"
    | "bulk"
    | "sync"
    | "update-lists"
    | "sync-all-lists"
    | "create-missing";
}

// Schémas de validation pour chaque action
const validationSchemas = {
  create: {
    action: { required: true, type: "string", enum: ["create"] },
    email: { required: true, type: "string", format: "email" },
    firstName: { required: true, type: "string", minLength: 1, maxLength: 100 },
    lastName: { required: true, type: "string", minLength: 1, maxLength: 100 },
    language: { type: "string", enum: ["fr", "en", "es", "it"] },
  },
  update: {
    action: { required: true, type: "string", enum: ["update"] },
    userId: { type: "string", minLength: 36, maxLength: 36 }, // UUID
    email: { type: "string", format: "email" },
    firstName: { type: "string", minLength: 1, maxLength: 100 },
    lastName: { type: "string", minLength: 1, maxLength: 100 },
    language: { type: "string", enum: ["fr", "en", "es", "it"] },
  },
  delete: {
    action: { required: true, type: "string", enum: ["delete"] },
    email: { required: true, type: "string", format: "email" },
  },
  bulk: {
    action: { required: true, type: "string", enum: ["bulk"] },
    userIds: {
      required: true,
      type: "array",
      minItems: 1,
      maxItems: 50,
      itemType: "string",
    },
  },
  sync: {
    action: { required: true, type: "string", enum: ["sync"] },
    userId: { required: true, type: "string", minLength: 36, maxLength: 36 },
  },
  "update-lists": {
    action: { required: true, type: "string", enum: ["update-lists"] },
    email: { required: true, type: "string", format: "email" },
    listIds: {
      required: true,
      type: "array",
      minItems: 1,
      maxItems: 10,
      itemType: "number",
    },
  },
  "sync-all-lists": {
    action: { required: true, type: "string", enum: ["sync-all-lists"] },
  },
  "create-missing": {
    action: { required: true, type: "string", enum: ["create-missing"] },
  },
};

export async function POST(request: NextRequest) {
  try {
    console.log("📧 [API] Synchronisation contact Brevo demandée");

    // 1. Vérifier si c'est un appel interne sécurisé
    const internalSecret = request.headers.get("X-Internal-Secret");
    const internalSource = request.headers.get("X-Internal-Source");
    const isInternalCall =
      internalSecret ===
      (process.env.INTERNAL_API_SECRET || "lettercraft-internal-secret-2025");

    if (isInternalCall) {
      console.log(`🔐 [API] Appel interne détecté depuis: ${internalSource}`);
    }

    // 2. Pré-validation de l'action pour déterminer le schéma
    let tempBody: any;
    try {
      const bodyText = await request.text();
      tempBody = JSON.parse(bodyText);

      // Recréer la requête avec le body lu
      request = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: bodyText,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Corps de requête JSON invalide" },
        { status: 400 },
      );
    }

    const action = tempBody.action;
    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "Action requise et doit être une chaîne" },
        { status: 400 },
      );
    }

    // 3. Configuration de sécurité selon l'action (bypass pour appels internes)
    const isAdminAction = [
      "bulk",
      "create-missing",
      "sync-all-lists",
      "delete",
    ].includes(action);
    const isDangerousAction = ["delete", "create-missing"].includes(action);

    let security: any;

    if (isInternalCall) {
      // Appel interne : validation minimale + rate limiting réduit
      const securityConfig = {
        requireAuth: false, // Pas d'auth pour les appels internes
        requireAdmin: false,
        rateLimit: {
          maxRequests: 1000, // Rate limit élevé pour les appels internes
          windowMs: 60000,
        },
        validationSchema:
          validationSchemas[action as keyof typeof validationSchemas],
      };
      security = await securityMiddleware(request, securityConfig);
    } else {
      // Appel externe : sécurité complète
      const securityConfig = {
        requireAuth: true,
        requireAdmin: isAdminAction,
        rateLimit: {
          maxRequests: isDangerousAction ? 10 : isAdminAction ? 50 : 100,
          windowMs: 60000, // 1 minute
        },
        validationSchema:
          validationSchemas[action as keyof typeof validationSchemas],
      };
      security = await securityMiddleware(request, securityConfig);
    }

    // 4. Vérification de sécurité
    if (!security.allowed) {
      console.warn(
        `🚫 Accès refusé pour l'action '${action}':`,
        security.error?.message,
      );

      const response = NextResponse.json(
        { error: security.error?.message || "Accès refusé" },
        { status: security.error?.status || 403 },
      );

      // Ajouter les headers de rate limiting si disponibles
      if (security.error?.headers) {
        Object.entries(security.error.headers).forEach(([key, value]) => {
          response.headers.set(key, String(value));
        });
      }

      return response;
    }

    const { context, validatedData } = security;
    const { userId, userIds, email, firstName, lastName, language, listIds } =
      validatedData;

    // 5. Vérification des permissions spécifiques (skip pour appels internes)
    if (!isInternalCall) {
      const permissionCheck = checkPermissions(action, context!, userId);
      if (!permissionCheck.allowed) {
        console.warn(
          `🚫 Permission refusée pour '${action}':`,
          permissionCheck.reason,
        );
        return NextResponse.json(
          { error: permissionCheck.reason },
          { status: 403 },
        );
      }
    }

    // 6. Log de sécurité pour les actions sensibles
    if (isDangerousAction || isAdminAction) {
      const source = isInternalCall ? internalSource : context?.email;
      console.warn(
        `⚠️ Action '${action}' exécutée par ${source} (${context?.userId || "internal"})`,
      );
    }

    switch (action) {
      case "create":
      case "update":
        if (!userId && !email) {
          return NextResponse.json(
            { error: "userId ou email requis pour create/update" },
            { status: 400 },
          );
        }

        if (userId) {
          // Synchronisation complète depuis la base de données
          console.log(`🔄 Synchronisation utilisateur ${userId}`);
          const success = await syncUserToBrevo(userId);

          return NextResponse.json({
            success,
            message: success
              ? "Contact synchronisé avec succès"
              : "Échec de la synchronisation",
          });
        } else if (email) {
          // Synchronisation rapide avec les données fournies
          console.log(`🔄 Synchronisation contact ${email}`);

          const contactData = {
            email,
            attributes: {
              FIRSTNAME: firstName || "",
              LASTNAME: lastName || "",
              LANGUAGE: language || "fr",
              REGISTRATION_DATE: new Date().toISOString(),
              PROFILE_COMPLETE: !!(firstName && lastName),
            },
            updateEnabled: true,
          };

          const result = await brevoContacts.createOrUpdateContact(contactData);

          return NextResponse.json({
            success: !!result,
            contactId: result?.id,
            message: result
              ? "Contact créé/mis à jour avec succès"
              : "Échec de la création/mise à jour",
          });
        }
        break;

      case "delete":
        if (!email) {
          return NextResponse.json(
            { error: "Email requis pour delete" },
            { status: 400 },
          );
        }

        console.log(`🗑️ Suppression contact ${email}`);
        const deleteSuccess = await brevoContacts.deleteContact(email);

        return NextResponse.json({
          success: deleteSuccess,
          message: deleteSuccess
            ? "Contact supprimé avec succès"
            : "Échec de la suppression",
        });

      case "bulk":
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
          return NextResponse.json(
            { error: "userIds requis pour bulk (array)" },
            { status: 400 },
          );
        }

        console.log(
          `🔄 Synchronisation en lot de ${userIds.length} utilisateurs`,
        );
        const bulkResult = await bulkSyncUsersToBrevo(userIds);

        return NextResponse.json({
          success: bulkResult.success > 0,
          successCount: bulkResult.success,
          failed: bulkResult.failed,
          message: `${bulkResult.success} contacts synchronisés, ${bulkResult.failed} échecs`,
        });

      case "sync":
        if (userId) {
          // Synchronisation d'un utilisateur spécifique
          const syncSuccess = await syncUserToBrevo(userId);
          return NextResponse.json({
            success: syncSuccess,
            message: syncSuccess
              ? "Utilisateur synchronisé avec succès"
              : "Échec de la synchronisation",
          });
        } else {
          return NextResponse.json(
            { error: "userId requis pour sync" },
            { status: 400 },
          );
        }

      case "update-lists":
        if (!email || !listIds || !Array.isArray(listIds)) {
          return NextResponse.json(
            { error: "email et listIds (array) requis pour update-lists" },
            { status: 400 },
          );
        }

        console.log(`📋 Mise à jour des listes pour le contact ${email}`);
        const updateListsSuccess = await updateContactLists(email, listIds);

        return NextResponse.json({
          success: updateListsSuccess,
          message: updateListsSuccess
            ? `Listes mises à jour pour ${email}`
            : "Échec de la mise à jour des listes",
        });

      case "sync-all-lists":
        console.log(`🔄 Synchronisation de toutes les listes de contacts`);
        const syncAllResult = await syncAllContactLists();

        return NextResponse.json({
          success: syncAllResult.updated > 0,
          ...syncAllResult,
          message: `${syncAllResult.updated} contacts mis à jour, ${syncAllResult.failed} échecs`,
        });

      case "create-missing":
        console.log(`➕ Création de tous les contacts manquants dans Brevo`);
        const createMissingResult = await createMissingContacts();

        return NextResponse.json({
          success:
            createMissingResult.created > 0 ||
            createMissingResult.already_exists > 0,
          ...createMissingResult,
          message: `${createMissingResult.created} contacts créés, ${createMissingResult.already_exists} existants, ${createMissingResult.failed} échecs`,
        });

      default:
        return NextResponse.json(
          { error: `Action non supportée: ${action}` },
          { status: 400 },
        );
    }

    return NextResponse.json(
      { error: "Paramètres invalides" },
      { status: 400 },
    );
  } catch (error) {
    console.error("❌ [API] Erreur synchronisation contact:", error);

    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Sécurité pour l'endpoint GET
    const security = await securityMiddleware(request, {
      requireAuth: true,
      rateLimit: {
        maxRequests: 50,
        windowMs: 60000,
      },
    });

    if (!security.allowed) {
      console.warn(`🚫 Accès GET refusé:`, security.error?.message);
      return NextResponse.json(
        { error: security.error?.message || "Accès refusé" },
        { status: security.error?.status || 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format email invalide" },
        { status: 400 },
      );
    }

    // Vérifier que l'utilisateur peut seulement consulter ses propres données ou est admin
    const { context } = security;
    if (!context?.isAdmin) {
      // Pour un utilisateur normal, vérifier qu'il consulte son propre email
      if (context?.email !== email) {
        return NextResponse.json(
          { error: "Vous ne pouvez consulter que vos propres données" },
          { status: 403 },
        );
      }
    }

    console.log(
      `🔍 Récupération contact Brevo: ${email} (par ${context?.email})`,
    );
    const contact = await brevoContacts.getContact(email);

    if (!contact) {
      return NextResponse.json(
        { error: "Contact non trouvé" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error("❌ [API] Erreur récupération contact:", error);

    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
