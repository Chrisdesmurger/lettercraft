-- ====================================================
-- MIGRATION 0044: Activation RLS sur TOUTES les tables - LetterCraft
-- Date: 2025-01-19
-- Description: Activation complète de RLS sur toutes les tables existantes avec policies appropriées
-- ====================================================

-- 1. ACTIVATION RLS SUR TOUTES LES TABLES
-- ========================================

-- Tables principales utilisateur
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.candidates_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.letter_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.generated_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_letters ENABLE ROW LEVEL SECURITY;

-- Tables Stripe et quotas
ALTER TABLE IF EXISTS public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stripe_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_quotas ENABLE ROW LEVEL SECURITY;

-- Tables d'audit et suppression
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Tables de revues et feedback
ALTER TABLE IF EXISTS public.letter_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback_categories ENABLE ROW LEVEL SECURITY;

-- Tables de référence
ALTER TABLE IF EXISTS public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.languages ENABLE ROW LEVEL SECURITY;

-- Tables de debug et audit
ALTER TABLE IF EXISTS public.debug_subscription_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_tier_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_sync_locks ENABLE ROW LEVEL SECURITY;

-- 2. POLICIES POUR TABLES AVEC USER_ID
-- =====================================

-- COUNTRIES (Table de référence - lecture publique)
DROP POLICY IF EXISTS "Countries are readable by everyone" ON public.countries;
CREATE POLICY "Countries are readable by everyone" ON public.countries
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role full access to countries" ON public.countries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- LANGUAGES (Table de référence - lecture publique)
DROP POLICY IF EXISTS "Languages are readable by everyone" ON public.languages;
CREATE POLICY "Languages are readable by everyone" ON public.languages
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role full access to languages" ON public.languages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- FEEDBACK_CATEGORIES (Table de référence - lecture publique)
DROP POLICY IF EXISTS "Feedback categories are readable by everyone" ON public.feedback_categories;
CREATE POLICY "Feedback categories are readable by everyone" ON public.feedback_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role full access to feedback_categories" ON public.feedback_categories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- LETTER_REVIEWS (Reviews des lettres)
DROP POLICY IF EXISTS "Users can view their own letter reviews" ON public.letter_reviews;
DROP POLICY IF EXISTS "Users can create their own letter reviews" ON public.letter_reviews;
DROP POLICY IF EXISTS "Users can update their own letter reviews" ON public.letter_reviews;
DROP POLICY IF EXISTS "Users can delete their own letter reviews" ON public.letter_reviews;

CREATE POLICY "Users can view their own letter reviews" ON public.letter_reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own letter reviews" ON public.letter_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own letter reviews" ON public.letter_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own letter reviews" ON public.letter_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to letter_reviews" ON public.letter_reviews
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- DEBUG_SUBSCRIPTION_CHANGES (Table de debug - admin seulement)
DROP POLICY IF EXISTS "Only service role can access debug_subscription_changes" ON public.debug_subscription_changes;
CREATE POLICY "Only service role can access debug_subscription_changes" ON public.debug_subscription_changes
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Pas d'accès utilisateur authentifié pour les tables de debug

-- SUBSCRIPTION_TIER_AUDIT (Audit des changements de tier - admin seulement)
DROP POLICY IF EXISTS "Only service role can access subscription_tier_audit" ON public.subscription_tier_audit;
CREATE POLICY "Only service role can access subscription_tier_audit" ON public.subscription_tier_audit
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- SUBSCRIPTION_SYNC_LOCKS (Verrous de synchronisation - système seulement)
DROP POLICY IF EXISTS "Only service role can access subscription_sync_locks" ON public.subscription_sync_locks;
CREATE POLICY "Only service role can access subscription_sync_locks" ON public.subscription_sync_locks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. VÉRIFICATION DES POLICIES EXISTANTES (pour s'assurer qu'elles sont bien en place)
-- ===================================================================================

-- Réaffirmer les policies pour les tables principales si elles n'existent pas

-- USER_PROFILES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON public.user_profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile" ON public.user_profiles
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON public.user_profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can delete their own profile'
  ) THEN
    CREATE POLICY "Users can delete their own profile" ON public.user_profiles
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Service role full access to user_profiles'
  ) THEN
    CREATE POLICY "Service role full access to user_profiles" ON public.user_profiles
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- CANDIDATES_PROFILE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'candidates_profile' 
    AND policyname = 'Users can view their own CV profiles'
  ) THEN
    CREATE POLICY "Users can view their own CV profiles" ON public.candidates_profile
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'candidates_profile' 
    AND policyname = 'Users can create their own CV profiles'
  ) THEN
    CREATE POLICY "Users can create their own CV profiles" ON public.candidates_profile
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'candidates_profile' 
    AND policyname = 'Users can update their own CV profiles'
  ) THEN
    CREATE POLICY "Users can update their own CV profiles" ON public.candidates_profile
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'candidates_profile' 
    AND policyname = 'Users can delete their own CV profiles'
  ) THEN
    CREATE POLICY "Users can delete their own CV profiles" ON public.candidates_profile
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'candidates_profile' 
    AND policyname = 'Service role full access to candidates_profile'
  ) THEN
    CREATE POLICY "Service role full access to candidates_profile" ON public.candidates_profile
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- SAVED_LETTERS (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_letters') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'saved_letters' 
      AND policyname = 'Users can view their own saved letters'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can view their own saved letters" ON public.saved_letters
        FOR SELECT TO authenticated
        USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'saved_letters' 
      AND policyname = 'Users can create their own saved letters'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can create their own saved letters" ON public.saved_letters
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'saved_letters' 
      AND policyname = 'Users can update their own saved letters'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can update their own saved letters" ON public.saved_letters
        FOR UPDATE TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'saved_letters' 
      AND policyname = 'Users can delete their own saved letters'
    ) THEN
      EXECUTE 'CREATE POLICY "Users can delete their own saved letters" ON public.saved_letters
        FOR DELETE TO authenticated
        USING (auth.uid() = user_id)';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'saved_letters' 
      AND policyname = 'Service role full access to saved_letters'
    ) THEN
      EXECUTE 'CREATE POLICY "Service role full access to saved_letters" ON public.saved_letters
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)';
    END IF;
  END IF;
END $$;

-- 4. FONCTION UTILITAIRE POUR VÉRIFIER LE STATUT RLS
-- ==================================================

CREATE OR REPLACE FUNCTION public.check_all_tables_rls()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT as table_name,
    t.rowsecurity as rls_enabled,
    COALESCE(p.policy_count, 0) as policy_count,
    CASE 
      WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 'SECURED'
      WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS ON, NO POLICIES'
      ELSE 'NOT SECURED'
    END as status
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      tablename,
      COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant pour les utilisateurs authentifiés et service role
GRANT EXECUTE ON FUNCTION public.check_all_tables_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_all_tables_rls() TO service_role;

-- 5. LOG DE LA MIGRATION
-- ======================

-- Créer un log dans audit_logs si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      new_data,
      metadata,
      performed_by
    ) VALUES (
      NULL,
      'data_export',
      'data',
      'all_tables_rls',
      jsonb_build_object(
        'migration', '0044_enable_rls_all_tables',
        'description', 'Activation RLS complète sur toutes les tables',
        'tables_processed', ARRAY[
          'user_profiles', 'candidates_profile', 'job_offers',
          'letter_questionnaire_responses', 'generated_letters', 'saved_letters',
          'stripe_subscriptions', 'stripe_invoices', 'user_quotas',
          'audit_logs', 'account_deletion_requests', 'user_feedback',
          'letter_reviews', 'feedback_categories', 'countries', 'languages',
          'debug_subscription_changes', 'subscription_tier_audit', 'subscription_sync_locks'
        ]
      ),
      jsonb_build_object(
        'execution_time', NOW(),
        'migration_file', '0044_enable_rls_all_tables.sql',
        'full_rls_activation', true
      ),
      NULL
    );
  END IF;
END $$;

-- 6. COMMENTAIRES ET DOCUMENTATION
-- ================================

COMMENT ON FUNCTION public.check_all_tables_rls() IS 'Fonction pour vérifier le statut RLS de toutes les tables publiques';

-- ====================================================
-- FIN DE LA MIGRATION 0044
-- ====================================================

-- Instructions post-migration :
-- 1. Exécuter : SELECT * FROM public.check_all_tables_rls(); pour vérifier
-- 2. Toutes les tables doivent avoir RLS activé et des policies appropriées
-- 3. Tables de référence (countries, languages) : lecture publique pour utilisateurs authentifiés
-- 4. Tables de debug : accès service_role uniquement
-- 5. Tables utilisateur : isolation complète par user_id