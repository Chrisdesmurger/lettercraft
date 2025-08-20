/**
 * Test direct du service Brevo (sans Next.js)
 * Usage: node scripts/test-brevo-service.js
 */

const path = require("path");
const fs = require("fs");

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const lines = envContent.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          process.env[key.trim()] = value.trim();
        }
      }
    }
    console.log("✅ Variables d'environnement chargées depuis .env.local");
  } else {
    console.log("⚠️  Fichier .env.local non trouvé");
  }
}

// Polyfill fetch pour Node.js
if (!global.fetch) {
  global.fetch = require("node-fetch");
}

loadEnvFile();

/**
 * Service Brevo simplifié pour les tests
 */
class TestBrevoService {
  constructor() {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY environment variable is not set");
    }
    this.apiKey = process.env.BREVO_API_KEY;
    this.baseUrl = "https://api.brevo.com/v3";
    this.defaultSender = {
      email: process.env.BREVO_SENDER_EMAIL || "noreply@lettercraft.fr",
      name: process.env.BREVO_SENDER_NAME || "LetterCraft",
    };
  }

  async sendEmail(options) {
    try {
      const emailData = {
        to: options.to,
        sender: options.sender || this.defaultSender,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent:
          options.textContent || this.htmlToText(options.htmlContent),
        tags: options.tags || [],
      };

      console.log("📧 Envoi email Brevo:", {
        to: options.to.map((r) => r.email),
        subject: options.subject,
        tags: options.tags,
      });

      const response = await fetch(`${this.baseUrl}/smtp/email`, {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erreur API Brevo:", response.status, errorText);
        return false;
      }

      const result = await response.json();
      console.log("✅ Email envoyé avec succès:", result.messageId);
      return true;
    } catch (error) {
      console.error("❌ Erreur envoi email Brevo:", error);
      return false;
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  async sendWelcomeEmail(userEmail, userName, userLanguage = "fr") {
    const template = {
      subject: "Bienvenue sur LetterCraft ! 🎉",
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
      `,
    };

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      tags: ["welcome", "registration", "test"],
    });
  }

  async sendQuotaWarningEmail(
    userEmail,
    userName,
    remainingQuota,
    userLanguage = "fr",
  ) {
    const template = {
      subject: `Plus que ${remainingQuota} génération${remainingQuota > 1 ? "s" : ""} restante${remainingQuota > 1 ? "s" : ""} ! ⚠️`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #f59e0b;">Attention ${userName},</h1>
          <p>Il ne vous reste plus que <strong>${remainingQuota} génération${remainingQuota > 1 ? "s" : ""}</strong> ce mois-ci.</p>
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
      `,
    };

    return this.sendEmail({
      to: [{ email: userEmail, name: userName }],
      subject: template.subject,
      htmlContent: template.htmlContent,
      tags: ["quota", "warning", "test"],
    });
  }
}

async function testBrevoService() {
  try {
    console.log("🧪 Test direct du service Brevo...");

    // Configuration
    const TEST_EMAIL = process.env.TEST_EMAIL || "contact@lettercraft.app";

    console.log("🔧 Configuration:");
    console.log("  TEST_EMAIL:", TEST_EMAIL);
    console.log(
      "  BREVO_API_KEY:",
      process.env.BREVO_API_KEY ? "Définie" : "NON DÉFINIE",
    );
    console.log(
      "  BREVO_SENDER_EMAIL:",
      process.env.BREVO_SENDER_EMAIL || "Par défaut",
    );

    // Créer le service
    const brevoService = new TestBrevoService();

    // Test 1: Email de bienvenue
    console.log("\n📧 Test 1: Email de bienvenue...");
    const welcomeResult = await brevoService.sendWelcomeEmail(
      TEST_EMAIL,
      "Utilisateur Test",
      "fr",
    );

    if (welcomeResult) {
      console.log("✅ Email de bienvenue envoyé avec succès");
    } else {
      console.log("❌ Échec envoi email de bienvenue");
    }

    // Attendre un peu entre les envois
    console.log("⏳ Attente de 2 secondes...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Email d'avertissement quota
    console.log("\n⚠️  Test 2: Email d'avertissement quota...");
    const quotaResult = await brevoService.sendQuotaWarningEmail(
      TEST_EMAIL,
      "Utilisateur Test",
      2,
      "fr",
    );

    if (quotaResult) {
      console.log("✅ Email d'avertissement quota envoyé avec succès");
    } else {
      console.log("❌ Échec envoi email quota");
    }

    console.log("\n🎉 Tests terminés!");
    console.log("💡 Vérifiez votre boîte email:", TEST_EMAIL);
  } catch (error) {
    console.error("❌ Erreur lors du test:", error.message);
  }
}

// Installer node-fetch si nécessaire
async function ensureNodeFetch() {
  try {
    require("node-fetch");
  } catch (e) {
    console.log("📦 Installation de node-fetch...");
    const { execSync } = require("child_process");
    execSync("npm install node-fetch@2", { stdio: "inherit" });
    console.log("✅ node-fetch installé");
  }
}

// Exécuter le test
async function main() {
  await ensureNodeFetch();
  await testBrevoService();
}

main();
