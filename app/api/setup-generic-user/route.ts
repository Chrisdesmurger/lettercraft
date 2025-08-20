import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// API endpoint pour créer l'utilisateur générique pour les suppressions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminSecret } = body;

    // Vérifier le secret admin
    const expectedSecret =
      process.env.ADMIN_SECRET || "lettercraft-admin-secret-2025";
    if (adminSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("🔧 Setting up generic user for deleted accounts...");

    const genericUserId = "00000000-0000-0000-0000-000000000001";
    const genericEmail = "deleted-user@system.local";

    // 1. Vérifier si l'utilisateur générique existe déjà
    const { data: existingUser } =
      await supabaseAdmin.auth.admin.getUserById(genericUserId);

    if (existingUser?.user) {
      console.log("✅ Generic user already exists");
      return NextResponse.json({
        success: true,
        message: "Generic user already exists",
        userId: genericUserId,
        existing: true,
      });
    }

    // 2. Créer l'utilisateur générique via Auth Admin API
    console.log("🆕 Creating generic user...");
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: genericEmail,
        password:
          "system-user-no-login-" + Math.random().toString(36).substring(7),
        email_confirm: true,
        user_metadata: {
          system_user: true,
          purpose: "deleted_accounts_placeholder",
          created_by: "account_deletion_system",
        },
      });

    if (createError) {
      console.error("❌ Error creating generic user:", createError);
      return NextResponse.json(
        {
          error: "Failed to create generic user",
          details: createError.message,
        },
        { status: 500 },
      );
    }

    console.log("✅ Generic user created:", newUser?.user?.id);

    // 3. Créer le profil utilisateur générique avec l'ID réel de l'utilisateur créé
    const actualUserId = newUser?.user?.id || genericUserId;
    console.log("📝 Creating profile for user ID:", actualUserId);

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        user_id: actualUserId,
        first_name: "Utilisateur",
        last_name: "Supprimé",
        subscription_tier: "free",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.warn(
        "⚠️ Warning: Could not create user profile:",
        profileError.message,
      );
      // Ne pas faire échouer l'opération si le profil ne peut pas être créé
    } else {
      console.log("✅ Generic user profile created");
    }

    // 4. Créer un log d'audit
    try {
      await supabaseAdmin.rpc("create_audit_log", {
        p_user_id: null,
        p_action_type: "maintenance_setup",
        p_entity_type: "user_account",
        p_entity_id: genericUserId,
        p_metadata: {
          action: "create_generic_user",
          purpose: "account_deletion_system",
        },
      });
    } catch (auditError) {
      console.warn("⚠️ Could not create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Generic user created successfully",
      userId: actualUserId,
      requestedUserId: genericUserId,
      email: genericEmail,
      existing: false,
      profileCreated: !profileError,
    });
  } catch (error) {
    console.error("❌ Error in generic user setup:", error);
    return NextResponse.json(
      {
        error: "Setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Endpoint GET pour vérifier le statut
export async function GET() {
  try {
    const genericUserId = "00000000-0000-0000-0000-000000000001";

    // Vérifier si l'utilisateur générique existe
    const { data: user } =
      await supabaseAdmin.auth.admin.getUserById(genericUserId);

    // Vérifier si le profil existe
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", genericUserId)
      .single();

    return NextResponse.json({
      genericUserExists: !!user?.user,
      genericProfileExists: !!profile,
      userId: genericUserId,
      email: user?.user?.email || null,
      ready: !!(user?.user && profile),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
