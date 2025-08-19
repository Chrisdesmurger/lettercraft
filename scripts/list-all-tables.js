#!/usr/bin/env node

/**
 * Script pour lister toutes les tables de la base de données et vérifier RLS
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement
function loadEnvVars() {
  const envVars = {};
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      
      envFile.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
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
    console.warn('⚠️  Impossible de lire .env.local');
  }
  return envVars;
}

const envVars = loadEnvVars();
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Lister toutes les tables dans le schéma public
 */
async function listAllTables() {
  console.log('📋 INVENTAIRE COMPLET DES TABLES - LETTERCRAFT');
  console.log('=' .repeat(60));
  
  try {
    // D'abord, lister les tables depuis information_schema
    const { data: tablesInfo, error: tablesError } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des tables:', error.message);
      return [];
    }
    
    console.log('\n📊 STATUT DES TABLES:\n');
    console.log('Table Name'.padEnd(35) + 'RLS'.padEnd(8) + 'Policies'.padEnd(12) + 'Status');
    console.log('-'.repeat(60));
    
    const tableList = [];
    
    if (data && data.length > 0) {
      data.forEach(table => {
        const rlsStatus = table.rls_enabled ? '✅ ON' : '❌ OFF';
        const policyCount = table.policy_count || 0;
        const policyStatus = policyCount > 0 ? `${policyCount} policies` : '⚠️  None';
        
        let status = '';
        if (table.rls_enabled && policyCount > 0) {
          status = '🔒 SECURED';
        } else if (table.rls_enabled && policyCount === 0) {
          status = '⚠️  RLS ON, NO POLICIES';
        } else {
          status = '❌ NOT SECURED';
        }
        
        console.log(
          table.table_name.padEnd(35) + 
          rlsStatus.padEnd(8) + 
          policyStatus.padEnd(12) + 
          status
        );
        
        tableList.push({
          name: table.table_name,
          rls_enabled: table.rls_enabled,
          policy_count: policyCount,
          secured: table.rls_enabled && policyCount > 0
        });
      });
    }
    
    // Statistiques
    const totalTables = tableList.length;
    const securedTables = tableList.filter(t => t.secured).length;
    const rlsEnabled = tableList.filter(t => t.rls_enabled).length;
    const withPolicies = tableList.filter(t => t.policy_count > 0).length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 STATISTIQUES:');
    console.log(`Total tables: ${totalTables}`);
    console.log(`Tables avec RLS: ${rlsEnabled}/${totalTables}`);
    console.log(`Tables avec policies: ${withPolicies}/${totalTables}`);
    console.log(`Tables sécurisées: ${securedTables}/${totalTables}`);
    
    if (securedTables === totalTables) {
      console.log('\n✅ TOUTES LES TABLES SONT SÉCURISÉES!');
    } else {
      console.log('\n❌ CERTAINES TABLES NE SONT PAS SÉCURISÉES!');
      
      // Lister les tables non sécurisées
      const unsecured = tableList.filter(t => !t.secured);
      console.log('\n🚨 Tables non sécurisées:');
      unsecured.forEach(table => {
        console.log(`  - ${table.name} (RLS: ${table.rls_enabled ? 'ON' : 'OFF'}, Policies: ${table.policy_count})`);
      });
    }
    
    return tableList;
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return [];
  }
}

/**
 * Fonction principale
 */
async function main() {
  const tables = await listAllTables();
  
  // Retourner la liste des tables non sécurisées pour utilisation par d'autres scripts
  const unsecured = tables.filter(t => !t.secured);
  
  if (unsecured.length > 0) {
    console.log('\n📝 TABLES À SÉCURISER:');
    unsecured.forEach(table => {
      console.log(`  ${table.name}`);
    });
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Exporter pour utilisation par d'autres scripts si nécessaire
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  });
}

module.exports = { listAllTables, loadEnvVars };