import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [TEST-CV-INSERT] Testing CV insertion...");

    // Get user session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    console.log("✅ [TEST-CV-INSERT] User authenticated:", session.user.email);

    // Test 1: Insertion minimale avec champs requis seulement
    console.log("🔍 [TEST-CV-INSERT] Test 1: Insertion minimale...");
    const { data: test1, error: error1 } = await supabase
      .from("candidates_profile")
      .insert({
        user_id: session.user.id,
        title: "Test CV",
        language: "fr",
        file_url: "https://test.com/cv.pdf",
      })
      .select();

    if (error1) {
      console.error("❌ [TEST-CV-INSERT] Test 1 failed:", error1);
      return NextResponse.json(
        {
          error: "Test 1 failed",
          details: error1.message,
          code: error1.code,
        },
        { status: 500 },
      );
    }

    console.log("✅ [TEST-CV-INSERT] Test 1 success:", test1);

    // Test 2: Avec données extraites réelles
    console.log("🔍 [TEST-CV-INSERT] Test 2: Avec données réelles...");
    const { data: test2, error: error2 } = await supabase
      .from("candidates_profile")
      .insert({
        user_id: session.user.id,
        title: "CV Christophe Desmurger",
        language: "fr",
        description:
          "Self-taught, adaptable, good interpersonal skills, attentive.",
        file_url: "https://test.com/cv2.pdf",
        file_size: 160444,
        first_name: "Christophe",
        last_name: "Desmurger",
        skills: ["Windows", "Linux", "Azure", "VMware"],
        experiences: ["Systems and Network Administrator chez PSS IT"],
        education: ["Diploma en Computer Technician à LEM SA"],
        is_active: true,
      })
      .select();

    if (error2) {
      console.error("❌ [TEST-CV-INSERT] Test 2 failed:", error2);
      return NextResponse.json(
        {
          error: "Test 2 failed",
          details: error2.message,
          code: error2.code,
          hint: error2.hint,
        },
        { status: 500 },
      );
    }

    console.log("✅ [TEST-CV-INSERT] Test 2 success:", test2);

    return NextResponse.json({
      success: true,
      test1: test1?.[0],
      test2: test2?.[0],
    });
  } catch (error) {
    console.error("❌ [TEST-CV-INSERT] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Récupérer la structure de la table
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer un CV existant pour voir la structure
    const { data: existingCVs, error } = await supabase
      .from("candidates_profile")
      .select("*")
      .eq("user_id", session.user.id)
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          error: "Erreur lors de la récupération",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      existing_cvs: existingCVs,
      structure_info: "Use POST to test insertion",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
