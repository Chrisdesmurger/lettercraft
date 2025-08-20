#!/usr/bin/env node

/**
 * Script de test pour vérifier la sécurité RLS de LetterCraft
 *
 * Ce script teste :
 * 1. L'activation RLS sur toutes les tables
 * 2. L'isolation des données entre utilisateurs
 * 3. Les permissions correctes pour chaque table
 * 4. Les accès service_role vs utilisateur authentifié
 *
 * Usage: node scripts/test-rls-security.js
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Charger les variables d'environnement depuis .env.local
let supabaseUrl, supabaseServiceKey, supabaseAnonKey;

try {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    const envVars = {};

    envFile.split("\n").forEach((line) => {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length > 0) {
        let value = valueParts.join("=").trim();
        // Supprimer les guillemets si présents
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value;
      }
    });

    supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
    supabaseServiceKey =
      envVars.SUPABASE_SERVICE_ROLE_KEY ||
      envVars.SUPABASE_SERVICE_KEY ||
      envVars.SUPABASE_SECRET_KEY;
    supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }
} catch (error) {
  console.warn(
    "⚠️  Impossible de lire .env.local, utilisation des variables système",
  );
}

// Fallback sur les variables d'environnement système
supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
supabaseServiceKey =
  supabaseServiceKey ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
supabaseAnonKey = supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error("❌ Variables d'environnement Supabase manquantes");
  console.error(
    "Requis: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  process.exit(1);
}

// Clients Supabase
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Tables à tester
const TABLES_TO_TEST = [
  "user_profiles",
  "candidates_profile",
  "job_offers",
  "letter_questionnaire_responses",
  "generated_letters",
  "stripe_subscriptions",
  "stripe_invoices",
  "user_quotas",
  "audit_logs",
  "account_deletion_requests",
  "user_feedback",
];

/**
 * Vérifier le statut RLS de toutes les tables
 */
async function checkRLSStatus() {
  console.log("\n🔍 Vérification du statut RLS...\n");

  try {
    const { data, error } = await adminClient.rpc("audit_rls_status");

    if (error) {
      console.error("❌ Erreur lors de la vérification RLS:", error.message);
      return false;
    }

    let allSecure = true;

    data.forEach((table) => {
      const status = table.rls_enabled ? "✅" : "❌";
      const policyCount = table.policy_count || 0;
      const policyStatus =
        policyCount > 0 ? `${policyCount} policies` : "⚠️  Aucune policy";

      console.log(
        `${status} ${table.table_name.padEnd(30)} RLS: ${table.rls_enabled ? "ON" : "OFF"} | ${policyStatus}`,
      );

      if (!table.rls_enabled || policyCount === 0) {
        allSecure = false;
      }
    });

    return allSecure;
  } catch (error) {
    console.error("❌ Erreur:", error.message);
    return false;
  }
}

/**
 * Créer des utilisateurs de test
 */
async function createTestUsers() {
  console.log("\n👥 Création des utilisateurs de test...\n");

  const testUsers = [
    { email: "test1@lettercraft-test.com", password: "testpassword123!" },
    { email: "test2@lettercraft-test.com", password: "testpassword123!" },
  ];

  const createdUsers = [];

  for (const user of testUsers) {
    try {
      // Supprimer l'utilisateur s'il existe déjà
      await adminClient.auth.admin.deleteUser(user.email);

      // Créer le nouvel utilisateur
      const { data, error } = await adminClient.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (error) {
        console.error(
          `❌ Erreur création utilisateur ${user.email}:`,
          error.message,
        );
        continue;
      }

      console.log(`✅ Utilisateur créé: ${user.email} (ID: ${data.user.id})`);
      createdUsers.push({
        ...user,
        id: data.user.id,
      });
    } catch (error) {
      console.error(`❌ Erreur pour ${user.email}:`, error.message);
    }
  }

  return createdUsers;
}

/**
 * Tester l'isolation des données entre utilisateurs
 */
async function testDataIsolation(users) {
  console.log("\n🔒 Test d'isolation des données...\n");

  if (users.length < 2) {
    console.error("❌ Pas assez d'utilisateurs de test pour l'isolation");
    return false;
  }

  const [user1, user2] = users;
  let allTestsPassed = true;

  // Créer des clients authentifiés pour chaque utilisateur
  const client1 = createClient(supabaseUrl, supabaseAnonKey);
  const client2 = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Authentifier les utilisateurs
    await client1.auth.signInWithPassword({
      email: user1.email,
      password: user1.password,
    });
    await client2.auth.signInWithPassword({
      email: user2.email,
      password: user2.password,
    });

    console.log("✅ Utilisateurs authentifiés");

    // Test 1: user_profiles - Créer un profil pour user1
    console.log("🧪 Test: user_profiles isolation...");

    const { error: insertError } = await client1.from("user_profiles").insert({
      user_id: user1.id,
      first_name: "Test",
      last_name: "User1",
      subscription_tier: "free",
    });

    if (insertError) {
      console.error("❌ Erreur insertion profil user1:", insertError.message);
      allTestsPassed = false;
    } else {
      console.log("✅ Profil user1 créé");
    }

    // Test 2: Vérifier que user2 ne peut pas voir le profil de user1
    const { data: user2Profiles, error: selectError } = await client2
      .from("user_profiles")
      .select("*");

    if (selectError) {
      console.error("❌ Erreur lecture profils user2:", selectError.message);
      allTestsPassed = false;
    } else if (user2Profiles.length > 0) {
      console.error(
        "❌ SÉCURITÉ COMPROMISE: user2 peut voir des profils non autorisés",
      );
      allTestsPassed = false;
    } else {
      console.log("✅ Isolation user_profiles confirmée");
    }

    // Test 3: candidates_profile
    console.log("🧪 Test: candidates_profile isolation...");

    const { error: cvError } = await client1.from("candidates_profile").insert({
      user_id: user1.id,
      title: "CV Test",
      language: "fr",
      file_url: "https://example.com/cv.pdf",
    });

    if (cvError) {
      console.error("❌ Erreur insertion CV user1:", cvError.message);
      allTestsPassed = false;
    } else {
      console.log("✅ CV user1 créé");
    }

    // Vérifier isolation CV
    const { data: user2CVs } = await client2
      .from("candidates_profile")
      .select("*");

    if (user2CVs && user2CVs.length > 0) {
      console.error(
        "❌ SÉCURITÉ COMPROMISE: user2 peut voir des CVs non autorisés",
      );
      allTestsPassed = false;
    } else {
      console.log("✅ Isolation candidates_profile confirmée");
    }
  } catch (error) {
    console.error("❌ Erreur durant les tests d'isolation:", error.message);
    allTestsPassed = false;
  } finally {
    // Nettoyer les sessions
    await client1.auth.signOut();
    await client2.auth.signOut();
  }

  return allTestsPassed;
}

/**
 * Tester les accès non autorisés (utilisateur anonyme)
 */
async function testUnauthorizedAccess() {
  console.log("\n🚫 Test d'accès non autorisés...\n");

  let allTestsPassed = true;

  for (const table of TABLES_TO_TEST) {
    try {
      const { data, error } = await anonClient.from(table).select("*").limit(1);

      if (error) {
        if (
          error.message.includes("RLS") ||
          error.message.includes("permission denied")
        ) {
          console.log(`✅ ${table}: Accès anonyme correctement bloqué`);
        } else {
          console.log(`⚠️  ${table}: Erreur inattendue: ${error.message}`);
        }
      } else if (data && data.length > 0) {
        console.error(
          `❌ ${table}: SÉCURITÉ COMPROMISE - Accès anonyme autorisé!`,
        );
        allTestsPassed = false;
      } else {
        console.log(`✅ ${table}: Aucune donnée accessible en anonyme`);
      }
    } catch (error) {
      console.log(`✅ ${table}: Exception attendue - ${error.message}`);
    }
  }

  return allTestsPassed;
}

/**
 * Nettoyer les utilisateurs de test
 */
async function cleanupTestUsers(users) {
  console.log("\n🧹 Nettoyage des utilisateurs de test...\n");

  for (const user of users) {
    try {
      await adminClient.auth.admin.deleteUser(user.id);
      console.log(`✅ Utilisateur supprimé: ${user.email}`);
    } catch (error) {
      console.error(`❌ Erreur suppression ${user.email}:`, error.message);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log("🔐 AUDIT DE SÉCURITÉ RLS - LETTERCRAFT");
  console.log("======================================");

  let allTestsPassed = true;
  let testUsers = [];

  try {
    // 1. Vérifier le statut RLS
    const rlsStatus = await checkRLSStatus();
    if (!rlsStatus) {
      console.error("\n❌ PROBLÈME CRITIQUE: RLS non configuré correctement!");
      allTestsPassed = false;
    }

    // 2. Créer des utilisateurs de test
    testUsers = await createTestUsers();

    // 3. Tester l'isolation des données
    if (testUsers.length >= 2) {
      const isolationStatus = await testDataIsolation(testUsers);
      if (!isolationStatus) {
        allTestsPassed = false;
      }
    }

    // 4. Tester les accès non autorisés
    const unauthorizedStatus = await testUnauthorizedAccess();
    if (!unauthorizedStatus) {
      allTestsPassed = false;
    }
  } finally {
    // Nettoyer les utilisateurs de test
    if (testUsers.length > 0) {
      await cleanupTestUsers(testUsers);
    }
  }

  // Résumé final
  console.log("\n" + "=".repeat(50));
  if (allTestsPassed) {
    console.log("✅ TOUS LES TESTS PASSÉS - SÉCURITÉ RLS CONFIRMÉE");
  } else {
    console.log("❌ ÉCHEC DE CERTAINS TESTS - VÉRIFIEZ LA SÉCURITÉ");
    process.exit(1);
  }
  console.log("=".repeat(50));
}

// Exécuter le script
main().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});
