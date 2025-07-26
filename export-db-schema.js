#!/usr/bin/env node

/**
 * Script d'export des tables et politiques Supabase
 * Génère un fichier SQL complet pour reproduire le schéma dans un autre projet
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/"/g, '').trim()
        if (value) {
          process.env[key.trim()] = value
        }
      }
    })
  } catch (error) {
    console.warn('⚠️  Impossible de charger .env.local:', error.message)
  }
}

// Charger les variables d'environnement
loadEnvFile()

// Configuration Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Tables à exporter
const TABLES_TO_EXPORT = [
  'user_profiles',
  'candidates_profile', 
  'job_offers',
  'letter_questionnaire_responses',
  'generated_letters',
  'user_quotas',
  'countries',
  'languages',
  'stripe_subscriptions',
  'stripe_invoices'
]

async function exportSchema() {
  console.log('🚀 Démarrage de l\'export du schéma Supabase...')
  
  let sqlOutput = `-- ========================================
-- EXPORT AUTOMATIQUE DU SCHÉMA SUPABASE
-- Généré le: ${new Date().toISOString()}
-- Projet: ${SUPABASE_URL}
-- ========================================

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`

  try {
    // 1. Exporter la structure des tables
    console.log('📋 Export des structures de tables...')
    
    for (const tableName of TABLES_TO_EXPORT) {
      console.log(`   → ${tableName}`)
      
      // Récupérer la structure de la table
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position')

      if (columnsError) {
        console.warn(`⚠️  Erreur lors de l'export de ${tableName}:`, columnsError)
        continue
      }

      if (!columns || columns.length === 0) {
        console.warn(`⚠️  Table ${tableName} non trouvée`)
        continue
      }

      // Générer le CREATE TABLE
      sqlOutput += `\n-- Table: ${tableName}\n`
      sqlOutput += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`
      
      const columnDefinitions = columns.map(col => {
        let def = `  ${col.column_name} ${col.data_type.toUpperCase()}`
        
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL'
        }
        
        if (col.column_default) {
          let defaultValue = col.column_default
          // Nettoyer les valeurs par défaut communes
          if (defaultValue.includes('gen_random_uuid()')) {
            def += ' DEFAULT gen_random_uuid()'
          } else if (defaultValue.includes('now()')) {
            def += ' DEFAULT NOW()'
          } else if (!defaultValue.includes('nextval')) {
            def += ` DEFAULT ${defaultValue}`
          }
        }
        
        return def
      })
      
      sqlOutput += columnDefinitions.join(',\n')
      sqlOutput += '\n);\n\n'
    }

    // 2. Exporter les contraintes et index
    console.log('🔗 Export des contraintes et index...')
    
    const { data: constraints } = await supabase.rpc('get_table_constraints', {
      schema_name: 'public'
    }).catch(() => ({ data: null }))

    if (constraints) {
      sqlOutput += '-- Contraintes et Index\n'
      constraints.forEach(constraint => {
        if (TABLES_TO_EXPORT.includes(constraint.table_name)) {
          sqlOutput += `${constraint.constraint_definition};\n`
        }
      })
      sqlOutput += '\n'
    }

    // 3. Exporter les politiques RLS
    console.log('🛡️  Export des politiques RLS...')
    
    for (const tableName of TABLES_TO_EXPORT) {
      // Activer RLS
      sqlOutput += `-- RLS pour ${tableName}\n`
      sqlOutput += `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n\n`
      
      // Récupérer les politiques existantes
      const { data: policies } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', tableName)
        .catch(() => ({ data: [] }))

      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          sqlOutput += `-- Politique: ${policy.policyname}\n`
          sqlOutput += `CREATE POLICY "${policy.policyname}" ON ${tableName}\n`
          sqlOutput += `  FOR ${policy.cmd || 'ALL'}\n`
          
          if (policy.roles && policy.roles.length > 0) {
            sqlOutput += `  TO ${policy.roles.join(', ')}\n`
          }
          
          if (policy.qual) {
            sqlOutput += `  USING (${policy.qual})\n`
          }
          
          if (policy.with_check) {
            sqlOutput += `  WITH CHECK (${policy.with_check})\n`
          }
          
          sqlOutput += ';\n\n'
        })
      } else {
        // Politiques par défaut
        sqlOutput += `-- Politiques par défaut pour ${tableName}\n`
        sqlOutput += `CREATE POLICY "Users can view own data" ON ${tableName}\n`
        sqlOutput += `  FOR SELECT USING (auth.uid() = user_id);\n\n`
        sqlOutput += `CREATE POLICY "Users can update own data" ON ${tableName}\n`
        sqlOutput += `  FOR UPDATE USING (auth.uid() = user_id);\n\n`
      }
    }

    // 4. Exporter les fonctions spécifiques
    console.log('⚙️  Export des fonctions...')
    
    sqlOutput += `-- Fonctions personnalisées\n`
    
    // Fonction de synchronisation des quotas
    sqlOutput += `
-- Fonction pour synchroniser les tiers d'abonnement
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le tier d'abonnement basé sur les abonnements actifs
  UPDATE user_profiles 
  SET 
    subscription_tier = CASE 
      WHEN EXISTS (
        SELECT 1 FROM stripe_subscriptions 
        WHERE user_id = NEW.user_id 
        AND status IN ('active', 'trialing')
        AND (canceled_at IS NULL OR canceled_at > NOW())
      ) THEN 'premium'
      ELSE 'free'
    END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchronisation automatique
CREATE TRIGGER trigger_sync_subscription_tier
  AFTER INSERT OR UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

`

    // Fonction de gestion des quotas
    sqlOutput += `
-- Fonction pour upserter les abonnements Stripe
CREATE OR REPLACE FUNCTION upsert_stripe_subscription(
  p_user_id UUID,
  p_subscription_data JSONB
) RETURNS UUID AS $$
DECLARE
  subscription_id UUID;
BEGIN
  INSERT INTO stripe_subscriptions (
    user_id,
    stripe_subscription_id,
    stripe_customer_id,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    trial_start,
    trial_end,
    metadata
  ) VALUES (
    p_user_id,
    p_subscription_data->>'id',
    p_subscription_data->>'customer',
    p_subscription_data->>'status',
    TO_TIMESTAMP((p_subscription_data->>'current_period_start')::bigint),
    TO_TIMESTAMP((p_subscription_data->>'current_period_end')::bigint),
    (p_subscription_data->>'cancel_at_period_end')::boolean,
    CASE WHEN p_subscription_data->>'canceled_at' IS NOT NULL 
         THEN TO_TIMESTAMP((p_subscription_data->>'canceled_at')::bigint) 
         ELSE NULL END,
    CASE WHEN p_subscription_data->>'trial_start' IS NOT NULL 
         THEN TO_TIMESTAMP((p_subscription_data->>'trial_start')::bigint) 
         ELSE NULL END,
    CASE WHEN p_subscription_data->>'trial_end' IS NOT NULL 
         THEN TO_TIMESTAMP((p_subscription_data->>'trial_end')::bigint) 
         ELSE NULL END,
    p_subscription_data->'metadata'
  )
  ON CONFLICT (stripe_subscription_id) 
  DO UPDATE SET
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    canceled_at = EXCLUDED.canceled_at,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO subscription_id;
  
  RETURN subscription_id;
END;
$$ LANGUAGE plpgsql;

`

    // 5. Données de référence
    console.log('📦 Export des données de référence...')
    
    // Countries
    const { data: countries } = await supabase
      .from('countries')
      .select('*')
      .limit(300)

    if (countries && countries.length > 0) {
      sqlOutput += `-- Données de référence: countries\n`
      countries.forEach(country => {
        sqlOutput += `INSERT INTO countries (code, name) VALUES ('${country.code}', '${country.name.replace(/'/g, "''")}') ON CONFLICT (code) DO NOTHING;\n`
      })
      sqlOutput += '\n'
    }

    // Languages
    const { data: languages } = await supabase
      .from('languages')
      .select('*')

    if (languages && languages.length > 0) {
      sqlOutput += `-- Données de référence: languages\n`
      languages.forEach(lang => {
        sqlOutput += `INSERT INTO languages (code, label, flag) VALUES ('${lang.code}', '${lang.label.replace(/'/g, "''")}', '${lang.flag}') ON CONFLICT (code) DO NOTHING;\n`
      })
      sqlOutput += '\n'
    }

    // 6. Storage Buckets
    sqlOutput += `
-- Configuration Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, '{"image/*"}'),
  ('documents', 'documents', false, 52428800, '{"application/pdf","image/*","text/*"}')
ON CONFLICT (id) DO NOTHING;

-- Politiques Storage
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

`

    // Écrire le fichier
    const outputPath = path.join(__dirname, 'supabase_schema_export.sql')
    fs.writeFileSync(outputPath, sqlOutput)
    
    console.log('✅ Export terminé avec succès !')
    console.log(`📄 Fichier généré: ${outputPath}`)
    console.log(`📊 ${TABLES_TO_EXPORT.length} tables exportées`)
    console.log('\n🚀 Pour importer dans un autre projet:')
    console.log('   1. Créer un nouveau projet Supabase')
    console.log('   2. Aller dans SQL Editor')
    console.log('   3. Copier-coller le contenu du fichier généré')
    console.log('   4. Exécuter le script')

  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error)
    process.exit(1)
  }
}

// Exécuter le script
if (require.main === module) {
  exportSchema()
}

module.exports = { exportSchema }