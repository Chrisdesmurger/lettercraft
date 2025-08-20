/**
 * Middleware de sécurité pour les APIs sensibles
 */

import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabase-admin";

export interface SecurityContext {
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  rateLimitKey: string;
}

// Rate limiting en mémoire (pour un vrai environnement de production, utiliser Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Vérifier l'authentification de l'utilisateur
 * Approche simplifiée pour debug
 */
export async function verifyAuthentication(
  request: NextRequest,
): Promise<SecurityContext> {
  const userAgent = request.headers.get("user-agent") || "unknown";
  const clientIP =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const context: SecurityContext = {
    isAuthenticated: false,
    rateLimitKey: `${clientIP}:${userAgent.substring(0, 50)}`,
  };

  console.log("🔍 [AUTH DEBUG] Vérification authentification...");
  console.log(
    "🔍 [AUTH DEBUG] Headers cookies:",
    request.headers.get("cookie") ? "présents" : "absents",
  );
  console.log(
    "🔍 [AUTH DEBUG] Authorization header:",
    request.headers.get("authorization") ? "présent" : "absent",
  );

  try {
    // Pour le debug, désactiver temporairement l'authentification stricte
    // et permettre d'identifier le problème
    const cookies = request.headers.get("cookie") || "";

    // Essayer différents patterns de cookies Supabase (2024-2025)
    const patterns = [
      /sb-access-token=([^;]+)/, // Pattern actuel Supabase 2024-2025
      /sb-refresh-token=([^;]+)/, // Pattern de refresh token
      /sb-[^-]+-auth-token=([^;]+)/, // Pattern legacy avec project ID
      /supabase\.auth\.token=([^;]+)/, // Pattern très ancien
      /sb-auth-token=([^;]+)/, // Pattern générique
    ];

    for (const pattern of patterns) {
      const match = cookies.match(pattern);
      if (match) {
        console.log(
          "🔍 [AUTH DEBUG] Cookie trouvé avec pattern:",
          pattern.source,
        );
        try {
          const tokenData = JSON.parse(decodeURIComponent(match[1]));
          console.log(
            "🔍 [AUTH DEBUG] Token data keys:",
            Object.keys(tokenData),
          );

          const accessToken = tokenData.access_token;
          if (accessToken) {
            console.log(
              "🔍 [AUTH DEBUG] Access token trouvé, longueur:",
              accessToken.length,
            );

            const {
              data: { user },
              error,
            } = await supabaseAdmin.auth.getUser(accessToken);

            if (!error && user) {
              context.isAuthenticated = true;
              context.userId = user.id;
              context.email = user.email;
              context.isAdmin = false; // Simplifier pour le debug

              console.log(
                `✅ [AUTH DEBUG] Utilisateur authentifié: ${user.email}`,
              );
              return context;
            } else {
              console.log(
                "❌ [AUTH DEBUG] Erreur auth.getUser:",
                error?.message,
              );
            }
          }
        } catch (tokenError) {
          console.log(
            "❌ [AUTH DEBUG] Erreur parsing token:",
            tokenError instanceof Error
              ? tokenError.message
              : String(tokenError),
          );
        }
      }
    }

    // Fallback Authorization header
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      console.log(
        "🔍 [AUTH DEBUG] Bearer token trouvé, longueur:",
        token.length,
      );

      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
        context.isAuthenticated = true;
        context.userId = user.id;
        context.email = user.email;
        context.isAdmin = false;

        console.log(
          `✅ [AUTH DEBUG] Utilisateur authentifié via Bearer: ${user.email}`,
        );
        return context;
      } else {
        console.log("❌ [AUTH DEBUG] Erreur Bearer auth:", error?.message);
      }
    }

    console.log("❌ [AUTH DEBUG] Aucune authentification trouvée");
  } catch (error) {
    console.error("❌ [AUTH DEBUG] Erreur générale:", error);
  }

  return context;
}

/**
 * Rate limiting - limiter les requêtes par IP/User-Agent
 */
export function checkRateLimit(
  rateLimitKey: string,
  maxRequests: number = 100,
  windowMs: number = 60000, // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = rateLimitMap.get(rateLimitKey);

  // Nettoyer ou créer le bucket
  if (!bucket || bucket.resetTime < windowStart) {
    bucket = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(rateLimitKey, bucket);
  }

  bucket.count++;

  const allowed = bucket.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - bucket.count);

  if (!allowed) {
    console.warn(
      `⚠️ Rate limit dépassé pour ${rateLimitKey}: ${bucket.count}/${maxRequests}`,
    );
  }

  return {
    allowed,
    remaining,
    resetTime: bucket.resetTime,
  };
}

/**
 * Validation des données d'entrée
 */
export function validateInput(
  data: any,
  schema: Record<string, any>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Vérifier si le champ est requis
    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`Le champ '${field}' est requis`);
      continue;
    }

    // Si pas de valeur et pas requis, passer
    if (value === undefined || value === null) continue;

    // Vérification du type
    if (rules.type && typeof value !== rules.type) {
      errors.push(`Le champ '${field}' doit être de type ${rules.type}`);
    }

    // Vérification de la longueur pour les strings
    if (
      rules.minLength &&
      typeof value === "string" &&
      value.length < rules.minLength
    ) {
      errors.push(
        `Le champ '${field}' doit contenir au moins ${rules.minLength} caractères`,
      );
    }

    if (
      rules.maxLength &&
      typeof value === "string" &&
      value.length > rules.maxLength
    ) {
      errors.push(
        `Le champ '${field}' ne peut pas dépasser ${rules.maxLength} caractères`,
      );
    }

    // Vérification du format email
    if (rules.format === "email" && typeof value === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`Le champ '${field}' doit être un email valide`);
      }
    }

    // Vérification des valeurs autorisées
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(
        `Le champ '${field}' doit être l'une des valeurs: ${rules.enum.join(", ")}`,
      );
    }

    // Vérification des arrays
    if (rules.type === "array" && Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(
          `Le champ '${field}' doit contenir au moins ${rules.minItems} éléments`,
        );
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(
          `Le champ '${field}' ne peut pas contenir plus de ${rules.maxItems} éléments`,
        );
      }

      // Vérification du type des éléments de l'array
      if (rules.itemType) {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== rules.itemType) {
            errors.push(
              `L'élément ${i} du champ '${field}' doit être de type ${rules.itemType}`,
            );
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Nettoyer les anciens buckets de rate limiting (à appeler périodiquement)
 */
export function cleanupRateLimitBuckets() {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, bucket] of rateLimitMap.entries()) {
    if (bucket.resetTime < now) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => rateLimitMap.delete(key));

  if (keysToDelete.length > 0) {
    console.log(
      `🧹 Nettoyage rate limiting: ${keysToDelete.length} buckets supprimés`,
    );
  }
}

/**
 * Vérifier les permissions pour une action spécifique
 */
export function checkPermissions(
  action: string,
  context: SecurityContext,
  targetUserId?: string,
): { allowed: boolean; reason?: string } {
  // Actions publiques (avec authentification basique)
  const publicActions = ["create", "update", "sync"];

  // Actions admin uniquement
  const adminActions = ["bulk", "create-missing", "sync-all-lists", "delete"];

  // Actions dangereuses nécessitant des permissions spéciales
  const dangerousActions = ["delete", "create-missing"];

  // Vérifier l'authentification basique
  if (!context.isAuthenticated) {
    return { allowed: false, reason: "Authentification requise" };
  }

  // Vérifier les actions admin
  if (adminActions.includes(action) && !context.isAdmin) {
    return { allowed: false, reason: "Permissions administrateur requises" };
  }

  // Vérifier que l'utilisateur peut seulement modifier ses propres données
  if (
    publicActions.includes(action) &&
    targetUserId &&
    targetUserId !== context.userId
  ) {
    if (!context.isAdmin) {
      return {
        allowed: false,
        reason: "Vous ne pouvez modifier que vos propres données",
      };
    }
  }

  // Vérifications supplémentaires pour les actions dangereuses
  if (dangerousActions.includes(action)) {
    if (!context.isAdmin) {
      return { allowed: false, reason: "Action non autorisée" };
    }

    // Log des actions sensibles
    console.warn(
      `⚠️ Action sensible '${action}' effectuée par ${context.email} (${context.userId})`,
    );
  }

  return { allowed: true };
}

/**
 * Middleware de sécurité principal
 */
export async function securityMiddleware(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
    rateLimit?: { maxRequests: number; windowMs: number };
    validationSchema?: Record<string, any>;
  } = {},
): Promise<{
  allowed: boolean;
  context?: SecurityContext;
  error?: { message: string; status: number; headers?: Record<string, string> };
  validatedData?: any;
}> {
  try {
    // 1. Vérification de l'authentification
    const context = await verifyAuthentication(request);

    if (options.requireAuth && !context.isAuthenticated) {
      return {
        allowed: false,
        error: { message: "Authentification requise", status: 401 },
      };
    }

    if (options.requireAdmin && !context.isAdmin) {
      return {
        allowed: false,
        error: { message: "Permissions administrateur requises", status: 403 },
      };
    }

    // 2. Rate limiting
    if (options.rateLimit) {
      const { allowed, remaining, resetTime } = checkRateLimit(
        context.rateLimitKey,
        options.rateLimit.maxRequests,
        options.rateLimit.windowMs,
      );

      if (!allowed) {
        return {
          allowed: false,
          error: {
            message: "Trop de requêtes. Veuillez réessayer plus tard.",
            status: 429,
            headers: {
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": new Date(resetTime).toISOString(),
            },
          },
        };
      }
    }

    // 3. Validation des données
    let validatedData;
    if (
      options.validationSchema &&
      (request.method === "POST" || request.method === "DELETE")
    ) {
      try {
        const data = await request.json();
        const validation = validateInput(data, options.validationSchema);

        if (!validation.valid) {
          return {
            allowed: false,
            error: {
              message: `Données invalides: ${validation.errors.join(", ")}`,
              status: 400,
            },
          };
        }

        validatedData = data;
      } catch (error) {
        return {
          allowed: false,
          error: { message: "Corps de requête JSON invalide", status: 400 },
        };
      }
    }

    return {
      allowed: true,
      context,
      validatedData,
    };
  } catch (error) {
    console.error("❌ Erreur dans le middleware de sécurité:", error);
    return {
      allowed: false,
      error: { message: "Erreur interne de sécurité", status: 500 },
    };
  }
}

// Nettoyer les buckets de rate limiting toutes les 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitBuckets, 5 * 60 * 1000);
}
