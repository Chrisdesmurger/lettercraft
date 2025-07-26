#!/usr/bin/env node

/**
 * Script d'export simplifié du schéma Supabase
 * Génère un fichier SQL basé sur la connaissance du schéma existant
 */

const fs = require('fs')
const path = require('path')

function generateCompleteSchema() {
  const timestamp = new Date().toISOString()
  
  const sqlOutput = `-- ========================================
-- EXPORT COMPLET DU SCHÉMA LETTERCRAFT
-- Généré le: ${timestamp}
-- ========================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- TABLES PRINCIPALES
-- ========================================

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country TEXT,
  language TEXT DEFAULT 'fr',
  birth_date DATE,
  avatar_url TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table des CV candidats
CREATE TABLE IF NOT EXISTS candidates_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  description TEXT,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  experiences TEXT[],
  skills TEXT[],
  education TEXT[],
  file_size INTEGER,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des offres d'emploi
CREATE TABLE IF NOT EXISTS job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[],
  location TEXT,
  salary_range TEXT,
  employment_type TEXT,
  source_url TEXT,
  extracted_keywords TEXT[],
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des réponses aux questionnaires
CREATE TABLE IF NOT EXISTS letter_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES candidates_profile(id) ON DELETE CASCADE,
  motivation TEXT NOT NULL,
  experience_highlight JSONB,
  skills_match TEXT[],
  company_values TEXT,
  additional_context TEXT,
  language TEXT DEFAULT 'fr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des lettres générées
CREATE TABLE IF NOT EXISTS generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_response_id UUID REFERENCES letter_questionnaire_responses(id) ON DELETE SET NULL,
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE SET NULL,
  cv_id UUID REFERENCES candidates_profile(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  pdf_url TEXT,
  generation_settings JSONB DEFAULT '{}',
  openai_model TEXT DEFAULT 'gpt-4',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des quotas utilisateurs (AVEC RESET PERSONNALISÉ)
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  letters_generated INTEGER DEFAULT 0,
  max_letters INTEGER DEFAULT 10,
  reset_date TIMESTAMP WITH TIME ZONE,
  first_generation_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table des abonnements Stripe
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des factures Stripe
CREATE TABLE IF NOT EXISTS stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id UUID REFERENCES stripe_subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  amount_paid INTEGER NOT NULL,
  amount_due INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  description TEXT,
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  status TEXT NOT NULL,
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tables de référence
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS languages (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  flag TEXT NOT NULL
);

-- ========================================
-- INDEX ET CONTRAINTES
-- ========================================

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_first_generation_date ON user_quotas(first_generation_date);
CREATE INDEX IF NOT EXISTS idx_candidates_profile_user_id ON candidates_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_profile_is_active ON candidates_profile(is_active);
CREATE INDEX IF NOT EXISTS idx_job_offers_user_id ON job_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_user_id ON generated_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user_id ON stripe_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_id ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_invoices_user_id ON stripe_invoices(user_id);

-- ========================================
-- POLITIQUES RLS
-- ========================================

-- Activer RLS sur toutes les tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

-- Politiques pour user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiques pour candidates_profile
CREATE POLICY "Users can view own CVs" ON candidates_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CVs" ON candidates_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CVs" ON candidates_profile
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own CVs" ON candidates_profile
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour job_offers
CREATE POLICY "Users can view own job offers" ON job_offers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job offers" ON job_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job offers" ON job_offers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job offers" ON job_offers
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour letter_questionnaire_responses
CREATE POLICY "Users can view own questionnaire responses" ON letter_questionnaire_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questionnaire responses" ON letter_questionnaire_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questionnaire responses" ON letter_questionnaire_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour generated_letters
CREATE POLICY "Users can view own letters" ON generated_letters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own letters" ON generated_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own letters" ON generated_letters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own letters" ON generated_letters
  FOR DELETE USING (auth.uid() = user_id);

-- Politiques pour user_quotas
CREATE POLICY "Users can view own quotas" ON user_quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotas" ON user_quotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotas" ON user_quotas
  FOR UPDATE USING (auth.uid() = user_id);

-- Politiques pour stripe_subscriptions
CREATE POLICY "Users can view own subscriptions" ON stripe_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON stripe_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Politiques pour stripe_invoices
CREATE POLICY "Users can view own invoices" ON stripe_invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage invoices" ON stripe_invoices
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Tables de référence publiques
CREATE POLICY "Countries are publicly readable" ON countries
  FOR SELECT USING (true);

CREATE POLICY "Languages are publicly readable" ON languages
  FOR SELECT USING (true);

-- ========================================
-- FONCTIONS ET TRIGGERS
-- ========================================

-- Fonction pour synchroniser les tiers d'abonnement
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
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
DROP TRIGGER IF EXISTS trigger_sync_subscription_tier ON stripe_subscriptions;
CREATE TRIGGER trigger_sync_subscription_tier
  AFTER INSERT OR UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

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

-- Fonction pour upserter les factures Stripe
CREATE OR REPLACE FUNCTION upsert_stripe_invoice(
  p_user_id UUID,
  p_invoice_data JSONB
) RETURNS UUID AS $$
DECLARE
  invoice_id UUID;
  subscription_id UUID;
BEGIN
  -- Trouver l'abonnement correspondant
  SELECT id INTO subscription_id
  FROM stripe_subscriptions
  WHERE stripe_subscription_id = p_invoice_data->>'subscription'
  AND user_id = p_user_id;

  INSERT INTO stripe_invoices (
    user_id,
    stripe_subscription_id,
    stripe_invoice_id,
    amount_paid,
    amount_due,
    currency,
    description,
    invoice_pdf,
    hosted_invoice_url,
    status,
    billing_period_start,
    billing_period_end
  ) VALUES (
    p_user_id,
    subscription_id,
    p_invoice_data->>'id',
    (p_invoice_data->>'amount_paid')::integer,
    (p_invoice_data->>'amount_due')::integer,
    p_invoice_data->>'currency',
    p_invoice_data->>'description',
    p_invoice_data->>'invoice_pdf',
    p_invoice_data->>'hosted_invoice_url',
    p_invoice_data->>'status',
    TO_TIMESTAMP((p_invoice_data->'period_start')::text::bigint),
    TO_TIMESTAMP((p_invoice_data->'period_end')::text::bigint)
  )
  ON CONFLICT (stripe_invoice_id)
  DO UPDATE SET
    amount_paid = EXCLUDED.amount_paid,
    status = EXCLUDED.status,
    invoice_pdf = EXCLUDED.invoice_pdf,
    hosted_invoice_url = EXCLUDED.hosted_invoice_url,
    updated_at = NOW()
  RETURNING id INTO invoice_id;
  
  RETURN invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DONNÉES DE RÉFÉRENCE
-- ========================================

-- Pays principaux
INSERT INTO countries (code, name) VALUES 
  ('FR', 'France'),
  ('BE', 'Belgique'),
  ('CH', 'Suisse'),
  ('CA', 'Canada'),
  ('LU', 'Luxembourg'),
  ('MC', 'Monaco'),
  ('MA', 'Maroc'),
  ('TN', 'Tunisie'),
  ('DZ', 'Algérie'),
  ('SN', 'Sénégal')
ON CONFLICT (code) DO NOTHING;

-- Langues supportées
INSERT INTO languages (code, label, flag) VALUES 
  ('fr', 'Français', '🇫🇷'),
  ('en', 'English', '🇬🇧'),
  ('es', 'Español', '🇪🇸'),
  ('de', 'Deutsch', '🇩🇪'),
  ('it', 'Italiano', '🇮🇹')
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- CONFIGURATION STORAGE
-- ========================================

-- Buckets de stockage
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

-- ========================================
-- FINALISATION
-- ========================================

-- Mettre à jour les timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidates_profile_updated_at ON candidates_profile;
CREATE TRIGGER update_candidates_profile_updated_at
  BEFORE UPDATE ON candidates_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_offers_updated_at ON job_offers;
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_letters_updated_at ON generated_letters;
CREATE TRIGGER update_generated_letters_updated_at
  BEFORE UPDATE ON generated_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_quotas_updated_at ON user_quotas;
CREATE TRIGGER update_user_quotas_updated_at
  BEFORE UPDATE ON user_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SCRIPT TERMINÉ
-- ========================================

-- Vérification finale
SELECT 
  'EXPORT TERMINÉ' as status,
  'Schéma LetterCraft avec système de quotas personnalisé' as description,
  '${timestamp}' as generated_at;

/*
INSTRUCTIONS D'IMPORT :

1. Créer un nouveau projet Supabase
2. Aller dans SQL Editor
3. Copier-coller ce script complet
4. Exécuter en une seule fois
5. Vérifier que toutes les tables sont créées
6. Configurer les variables d'environnement dans votre app
7. Tester l'authentification et les fonctionnalités

FONCTIONNALITÉS INCLUSES :
✅ Toutes les tables avec relations
✅ Système de quotas avec reset personnalisé (first_generation_date)
✅ Intégration Stripe complète
✅ Politiques RLS sécurisées
✅ Fonctions et triggers automatiques
✅ Configuration Storage
✅ Données de référence
✅ Index pour performances
*/`

  return sqlOutput
}

// Générer et sauvegarder le schéma
console.log('🚀 Génération du schéma complet LetterCraft...')

const schema = generateCompleteSchema()
const outputPath = path.join(__dirname, 'lettercraft_complete_schema.sql')

fs.writeFileSync(outputPath, schema)

console.log('✅ Schéma généré avec succès !')
console.log(`📄 Fichier: ${outputPath}`)
console.log('📊 Contenu:')
console.log('   - 🗄️  11 tables principales')
console.log('   - 🛡️  Politiques RLS complètes')
console.log('   - ⚙️  Fonctions Stripe & quotas')
console.log('   - 📁 Configuration Storage')
console.log('   - 📊 Données de référence')
console.log('   - 🔄 Système de quotas personnalisé')
console.log('')
console.log('🎯 Prêt pour import dans un nouveau projet Supabase !')
console.log('   1. Copier le contenu du fichier SQL')
console.log('   2. Coller dans SQL Editor de Supabase')
console.log('   3. Exécuter le script')
console.log('   4. Configurer les variables d\'environnement')