#!/usr/bin/env node

/**
 * Test simple des policies RLS pour LetterCraft
 * Ce script teste les accès de base sans créer d'utilisateurs de test
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Charger les variables d'environnement
function loadEnvVars() {
  const envVars = {};
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, "utf8");

      envFile.split("\n").forEach((line) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length > 0) {
          let value = valueParts.join("=").trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          envVars[key.trim()] = value;
        }
      });
    }
  } catch (error) {
    console.warn("⚠️  Impossible de lire .env.local");
  }
  return envVars;
}

const envVars = loadEnvVars();
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error("❌ Variables d'environnement Supabase manquantes");
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
const TABLES = [
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
];

/**
 * Tester la restriction d'accès anonyme
 */
async function testAnonymousAccess() {
  console.log("🔍 Test des accès anonymes...\n");

  let blockedCount = 0;

  for (const table of TABLES) {
    try {
      const { data, error } = await anonClient
        .from(table)
        .select("count(*)", { count: "exact", head: true });

      if (error) {
        if (
          error.message.includes("RLS") ||
          error.message.includes("permission denied") ||
          error.message.includes("policies")
        ) {
          console.log(`✅ ${table.padEnd(30)} - Accès bloqué (RLS actif)`);
          blockedCount++;
        } else {
          console.log(`⚠️  ${table.padEnd(30)} - Erreur: ${error.message}`);
        }
      } else {
        console.log(
          `❌ ${table.padEnd(30)} - ACCÈS AUTORISÉ (Problème de sécurité!)`,
        );
      }
    } catch (error) {
      console.log(`✅ ${table.padEnd(30)} - Exception bloquante`);
      blockedCount++;
    }
  }

  return blockedCount === TABLES.length;
}

/**
 * Vérifier l'accès admin
 */
async function testAdminAccess() {
  console.log("\n🔑 Test des accès administrateur...\n");

  let accessibleCount = 0;

  for (const table of TABLES) {
    try {
      const { data, error } = await adminClient
        .from(table)
        .select("count(*)", { count: "exact", head: true });

      if (error) {
        console.log(`❌ ${table.padEnd(30)} - Erreur admin: ${error.message}`);
      } else {
        console.log(`✅ ${table.padEnd(30)} - Accès admin OK`);
        accessibleCount++;
      }
    } catch (error) {
      console.log(`❌ ${table.padEnd(30)} - Exception admin: ${error.message}`);
    }
  }

  return accessibleCount > 0;
}

/**
 * Vérifier que RLS est activé sur les tables
 */
async function checkRLSEnabled() {
  console.log("\n📋 Vérification activation RLS...\n");

  try {
    const { data, error } = await adminClient
      .from("pg_tables")
      .select("tablename, rowsecurity")
      .eq("schemaname", "public")
      .in("tablename", TABLES);

    if (error) {
      console.error("❌ Erreur vérification RLS:", error.message);
      return false;
    }

    let rlsEnabledCount = 0;

    data.forEach((table) => {
      const status = table.rowsecurity ? "✅" : "❌";
      console.log(
        `${status} ${table.tablename.padEnd(30)} - RLS: ${table.rowsecurity ? "ON" : "OFF"}`,
      );
      if (table.rowsecurity) rlsEnabledCount++;
    });

    return rlsEnabledCount === data.length;
  } catch (error) {
    console.error("❌ Exception vérification RLS:", error.message);
    return false;
  }
}

/**
 * Test principal
 */
async function main() {
  console.log("🔐 TEST SIMPLE DES POLICIES RLS - LETTERCRAFT");
  console.log("=".repeat(50));

  let allTestsPassed = true;

  // Test 1: Vérifier que RLS est activé
  const rlsEnabled = await checkRLSEnabled();
  if (!rlsEnabled) {
    console.log("\n❌ RLS non activé sur toutes les tables");
    allTestsPassed = false;
  }

  // Test 2: Accès anonyme doit être bloqué
  const anonymousBlocked = await testAnonymousAccess();
  if (!anonymousBlocked) {
    console.log("\n❌ Des accès anonymes non autorisés détectés");
    allTestsPassed = false;
  }

  // Test 3: Accès admin doit fonctionner
  const adminWorks = await testAdminAccess();
  if (!adminWorks) {
    console.log("\n❌ Problème avec les accès administrateur");
    allTestsPassed = false;
  }

  // Résumé
  console.log("\n" + "=".repeat(50));
  if (allTestsPassed) {
    console.log("✅ TOUS LES TESTS PASSÉS - RLS CORRECTEMENT CONFIGURÉ");
  } else {
    console.log("❌ CERTAINS TESTS ONT ÉCHOUÉ - VÉRIFIEZ LA CONFIGURATION");
  }
  console.log("=".repeat(50));

  return allTestsPassed;
}

// Exécuter le test
main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Erreur fatale:", error.message);
    process.exit(1);
  });
