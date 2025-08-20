import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    console.log("API Upload Avatar - Auth check:", {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPreview: token?.substring(0, 20) + "...",
    });

    if (!token) {
      console.error("No token provided");
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 },
      );
    }

    // Create Supabase client with the token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Set the auth token
    await supabaseClient.auth.setSession({
      access_token: token,
      refresh_token: "", // Not needed for this operation
    });

    // Get user info
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    console.log("User authentication result:", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError?.message,
    });

    if (userError || !user) {
      console.error("Auth error:", userError);
      return NextResponse.json(
        { error: "Utilisateur non authentifié" },
        { status: 401 },
      );
    }

    const form = await request.formData();
    const file = form.get("avatar") as File | null;

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Le fichier doit être une image" },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Le fichier est trop volumineux (max 5MB)" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;

    // Try to use service role for storage upload to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Upload to existing documents bucket (which already works)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Erreur lors de l'upload" },
        { status: 500 },
      );
    }

    // Get the public URL for the uploaded file using admin client
    const { data: urlData } = supabaseAdmin.storage
      .from("documents")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Don't update the profile here, let the client do it
    // This avoids RLS issues temporarily

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error("Detailed error:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'upload de l'avatar",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
