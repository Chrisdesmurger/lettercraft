-- ====================================================
-- MIGRATION 0043: Audit complet de sécurité RLS - LetterCraft
-- Date: 2025-01-19
-- Description: Mise à jour complète de toutes les policies RLS pour sécuriser la base de données
-- ====================================================

-- 1. ACTIVATION RLS SUR TOUTES LES TABLES (si pas déjà fait)
-- ============================================================

-- Vérifier et activer RLS sur user_profiles
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Vérifier et activer RLS sur candidates_profile  
ALTER TABLE IF EXISTS candidates_profile ENABLE ROW LEVEL SECURITY;

-- Vérifier et activer RLS sur saved_letters (si la table existe)
ALTER TABLE IF EXISTS saved_letters ENABLE ROW LEVEL SECURITY;

-- Vérifier et activer RLS sur onboarding_responses (si la table existe)
ALTER TABLE IF EXISTS onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Les tables principales sont déjà sécurisées via les migrations précédentes :
-- job_offers, letter_questionnaire_responses, generated_letters (migration 0009)
-- stripe_subscriptions (migration 0016)
-- stripe_invoices (migration 0017)  
-- user_quotas (migration 0018)
-- audit_logs, account_deletion_requests, user_feedback (migration 0035)

-- 2. NETTOYAGE DES POLICIES EXISTANTES ET CRÉATION DES NOUVELLES
-- ============================================================

-- USER_PROFILES - Nettoyage et recréation
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- Nouvelles policies user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT TO authenticated  
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role accès complet user_profiles
CREATE POLICY "Service role full access to user_profiles" ON user_profiles
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- CANDIDATES_PROFILE - Nettoyage et recréation
DROP POLICY IF EXISTS "Allow individual user access" ON candidates_profile;
DROP POLICY IF EXISTS "Users can view their own CV profiles" ON candidates_profile;
DROP POLICY IF EXISTS "Users can create their own CV profiles" ON candidates_profile;
DROP POLICY IF EXISTS "Users can update their own CV profiles" ON candidates_profile;
DROP POLICY IF EXISTS "Users can delete their own CV profiles" ON candidates_profile;

-- Nouvelles policies candidates_profile
CREATE POLICY "Users can view their own CV profiles" ON candidates_profile
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own CV profiles" ON candidates_profile
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own CV profiles" ON candidates_profile  
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own CV profiles" ON candidates_profile
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Service role accès complet candidates_profile
CREATE POLICY "Service role full access to candidates_profile" ON candidates_profile
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. TABLES COMPLÉMENTAIRES (si elles existent)
-- =============================================

-- SAVED_LETTERS (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_letters') THEN
    -- Nettoyage des policies existantes
    DROP POLICY IF EXISTS "Users can view their own saved letters" ON saved_letters;
    DROP POLICY IF EXISTS "Users can create their own saved letters" ON saved_letters;
    DROP POLICY IF EXISTS "Users can update their own saved letters" ON saved_letters;
    DROP POLICY IF EXISTS "Users can delete their own saved letters" ON saved_letters;
    
    -- Nouvelles policies saved_letters
    EXECUTE 'CREATE POLICY "Users can view their own saved letters" ON saved_letters
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can create their own saved letters" ON saved_letters
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can update their own saved letters" ON saved_letters
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can delete their own saved letters" ON saved_letters
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id)';
      
    -- Service role accès complet saved_letters
    EXECUTE 'CREATE POLICY "Service role full access to saved_letters" ON saved_letters
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- ONBOARDING_RESPONSES (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'onboarding_responses') THEN
    -- Nettoyage des policies existantes
    DROP POLICY IF EXISTS "Users can view their own onboarding responses" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can create their own onboarding responses" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can update their own onboarding responses" ON onboarding_responses;
    DROP POLICY IF EXISTS "Users can delete their own onboarding responses" ON onboarding_responses;
    
    -- Nouvelles policies onboarding_responses
    EXECUTE 'CREATE POLICY "Users can view their own onboarding responses" ON onboarding_responses
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can create their own onboarding responses" ON onboarding_responses
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can update their own onboarding responses" ON onboarding_responses
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id)';
      
    EXECUTE 'CREATE POLICY "Users can delete their own onboarding responses" ON onboarding_responses
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id)';
      
    -- Service role accès complet onboarding_responses
    EXECUTE 'CREATE POLICY "Service role full access to onboarding_responses" ON onboarding_responses
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true)';
  END IF;
END $$;

-- 4. VÉRIFICATION DES POLICIES STORAGE (Supabase Storage)
-- ======================================================

-- Note: Les policies storage sont gérées séparément mais vérifions les principales

-- Avatars bucket policies (déjà dans migration 0005 mais on vérifie)
DO $$
BEGIN
  -- Vérifier que les policies avatars existent, sinon les créer
  
  -- Policy pour lecture publique des avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  
  -- Policy pour upload d'avatars par l'utilisateur
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload their own avatar'
  ) THEN
    CREATE POLICY "Users can upload their own avatar" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
  
  -- Policy pour mise à jour d'avatars par l'utilisateur  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own avatar'
  ) THEN
    CREATE POLICY "Users can update their own avatar" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
  
  -- Policy pour suppression d'avatars par l'utilisateur
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own avatar'
  ) THEN
    CREATE POLICY "Users can delete their own avatar" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND 
        (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- 5. VÉRIFICATION ET AUDIT DES PERMISSIONS
-- ========================================

-- Fonction utilitaire pour auditer les permissions RLS
CREATE OR REPLACE FUNCTION audit_rls_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity AS rls_enabled,
    COALESCE(p.policy_count, 0) AS policy_count
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      schemaname,
      tablename,
      COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'user_profiles', 'candidates_profile', 'job_offers', 
    'letter_questionnaire_responses', 'generated_letters',
    'stripe_subscriptions', 'stripe_invoices', 'user_quotas',
    'audit_logs', 'account_deletion_requests', 'user_feedback',
    'saved_letters', 'onboarding_responses'
  )
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. COMMENTAIRES ET DOCUMENTATION
-- ================================

COMMENT ON FUNCTION audit_rls_status() IS 'Fonction d''audit pour vérifier le statut RLS de toutes les tables importantes';

-- Log de la migration dans audit_logs si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      new_data,
      metadata,
      performed_by
    ) VALUES (
      NULL, -- Aucun utilisateur spécifique
      'system_security_update',
      'database',
      'rls_policies',
      jsonb_build_object(
        'migration', '0043_complete_rls_security_audit',
        'description', 'Audit complet et mise à jour des policies RLS',
        'affected_tables', ARRAY[
          'user_profiles', 'candidates_profile', 'saved_letters', 'onboarding_responses'
        ]
      ),
      jsonb_build_object(
        'execution_time', NOW(),
        'migration_file', '0043_complete_rls_security_audit.sql'
      ),
      NULL -- Système
    );
  END IF;
END $$;

-- ====================================================
-- FIN DE LA MIGRATION 0043
-- ====================================================

-- Instructions post-migration :
-- 1. Exécuter : SELECT * FROM audit_rls_status(); pour vérifier le statut
-- 2. Tester les accès utilisateurs avec différents comptes
-- 3. Vérifier que l'application fonctionne correctement
-- 4. Surveiller les logs d'erreurs RLS dans Supabase Dashboard