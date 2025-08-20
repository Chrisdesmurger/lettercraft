/**
 * Quota Middleware for LetterCraft
 * Provides quota checking and management for letter generation APIs
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Types for quota system
export interface QuotaStatus {
  letters_generated: number;
  max_letters: number;
  remaining_letters: number;
  reset_date: string;
  can_generate: boolean;
  subscription_tier: "free" | "premium";
}

export interface QuotaCheckResult {
  allowed: boolean;
  quotaStatus: QuotaStatus | null;
  error?: string;
}

// Error types
export class QuotaExceededError extends Error {
  constructor(public quotaStatus: QuotaStatus) {
    super(
      `Quota dépassé: ${quotaStatus.letters_generated}/${quotaStatus.max_letters} lettres générées`,
    );
    this.name = "QuotaExceededError";
  }
}

export class QuotaAuthError extends Error {
  constructor(message: string = "Utilisateur non authentifié") {
    super(message);
    this.name = "QuotaAuthError";
  }
}

export class QuotaSystemError extends Error {
  constructor(message: string = "Erreur système des quotas") {
    super(message);
    this.name = "QuotaSystemError";
  }
}

/**
 * Initialize Supabase client for server-side operations
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new QuotaSystemError(
      "Configuration Supabase manquante pour le middleware des quotas",
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Extract user from request authorization header
 */
async function getUserFromRequest(
  request: NextRequest,
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  try {
    const supabase = createSupabaseClient();
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error("Erreur lors de l'extraction de l'utilisateur:", error);
    return null;
  }
}

/**
 * Get quota status for a user
 */
export async function getQuotaStatus(userId: string): Promise<QuotaStatus> {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .rpc("get_quota_status", { p_user_id: userId })
      .single();

    if (error) {
      console.error(
        "Erreur lors de la récupération du statut des quotas:",
        error,
      );
      throw new QuotaSystemError(
        "Impossible de récupérer le statut des quotas",
      );
    }

    return {
      letters_generated: (data as any).letters_generated || 0,
      max_letters: (data as any).max_letters || 10,
      remaining_letters: (data as any).remaining_letters || 10,
      reset_date: (data as any).reset_date,
      can_generate: (data as any).can_generate || false,
      subscription_tier: (data as any).subscription_tier || "free",
    };
  } catch (error) {
    if (error instanceof QuotaSystemError) {
      throw error;
    }
    console.error(
      "Erreur inattendue lors de la récupération des quotas:",
      error,
    );
    throw new QuotaSystemError(
      "Erreur système lors de la vérification des quotas",
    );
  }
}

/**
 * Check if user can generate a letter
 */
export async function checkQuota(userId: string): Promise<QuotaCheckResult> {
  try {
    const quotaStatus = await getQuotaStatus(userId);

    return {
      allowed: quotaStatus.can_generate,
      quotaStatus,
    };
  } catch (error) {
    console.error("Erreur lors de la vérification des quotas:", error);
    return {
      allowed: false,
      quotaStatus: null,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

/**
 * Increment letter count after successful generation
 */
export async function incrementLetterCount(userId: string): Promise<boolean> {
  try {
    const supabase = createSupabaseClient();

    const { error } = await supabase.rpc("increment_letter_count", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Erreur lors de l'incrémentation du compteur:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur inattendue lors de l'incrémentation:", error);
    return false;
  }
}

/**
 * Simplified middleware function for basic user authentication
 * Note: Quota checking is now handled on the client side for better UX
 */
export async function withQuotaCheck(
  request: NextRequest,
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    // Extract user from request
    const userId = await getUserFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        {
          error: "Non autorisé",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    // Execute the handler (quota checking is done client-side)
    const response = await handler(request, userId);

    return response;
  } catch (error) {
    console.error("Erreur dans le middleware des quotas:", error);

    if (error instanceof QuotaAuthError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

/**
 * Legacy functions - kept for backwards compatibility
 * Note: These are no longer used since we moved to client-side quota management
 */

/**
 * Utility function for cookie-based authentication (alternative method)
 */
export async function getUserFromCookies(
  request: NextRequest,
): Promise<string | null> {
  try {
    const supabase = createSupabaseClient();

    // This would need to be adapted based on how cookies are handled
    // For now, we'll focus on the Authorization header method
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get user quota without checking - for display purposes
 */
export async function getUserQuota(
  userId: string,
): Promise<QuotaStatus | null> {
  try {
    return await getQuotaStatus(userId);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des quotas utilisateur:",
      error,
    );
    return null;
  }
}
