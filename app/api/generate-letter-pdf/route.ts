import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vérifier l'authentification
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { letterId } = await request.json();

    if (!letterId) {
      return NextResponse.json(
        { error: "ID de lettre requis" },
        { status: 400 },
      );
    }

    // Récupérer la lettre depuis Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: letter, error } = await supabase
      .from("generated_letters")
      .select(
        `
        *,
        job_offers(title, company),
        candidates_profile(first_name, last_name)
      `,
      )
      .eq("id", letterId)
      .eq("user_id", user.id)
      .single();

    if (error || !letter) {
      return NextResponse.json(
        { error: "Lettre non trouvée" },
        { status: 404 },
      );
    }

    // Pour l'instant, retourner le contenu HTML pour téléchargement
    // TODO: Implémenter la génération PDF avec une alternative à Puppeteer
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lettre de Motivation - ${letter.job_offers?.title || "Poste"}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .header { text-align: right; margin-bottom: 2cm; }
        .sender-info { font-size: 11pt; line-height: 1.4; }
        .recipient-info { margin-bottom: 1.5cm; }
        .subject { font-weight: bold; margin-bottom: 1cm; text-decoration: underline; }
        .content { text-align: justify; margin-bottom: 1.5cm; }
        .content p { margin-bottom: 1em; text-indent: 1.5em; }
        .content p:first-child { text-indent: 0; }
        .signature { text-align: right; margin-top: 2cm; }
        .date-location { text-align: right; margin-bottom: 1.5cm; }
    </style>
</head>
<body>
    <div class="header">
        <div class="sender-info">
            ${letter.candidates_profile?.first_name || ""} ${letter.candidates_profile?.last_name || ""}
        </div>
    </div>
    
    <div class="date-location">
        ${new Date().toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
    </div>
    
    <div class="recipient-info">
        À l'attention du service recrutement<br>
        ${letter.job_offers?.company || "Entreprise"}
    </div>
    
    <div class="subject">
        Objet : Candidature pour le poste de ${letter.job_offers?.title || "Poste"}
    </div>
    
    <div class="content">
        ${letter.html_content || letter.content.replace(/\n/g, "</p><p>")}
    </div>
    
    <div class="signature">
        Cordialement,<br>
        <br>
        ${letter.candidates_profile?.first_name || ""} ${letter.candidates_profile?.last_name || ""}
    </div>
</body>
</html>
    `;

    // Retourner le HTML pour impression
    return new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="lettre-motivation-${letter.job_offers?.company || "entreprise"}.html"`,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la génération du PDF",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}

// Méthode GET pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({
    message: "API de génération PDF fonctionnelle",
    version: "1.0.0",
  });
}
