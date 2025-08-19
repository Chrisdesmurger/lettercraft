-- ====================================================
-- MIGRATION 0046: Correction RLS pour users_with_profiles
-- Date: 2025-01-19
-- Description: Fix de la vue users_with_profiles qui bloque l'app
-- ====================================================

-- 1. VÉRIFIER SI LA VUE EXISTE ET LA RECRÉER AVEC RLS
-- ===================================================

-- Supprimer l'ancienne vue si elle existe
DROP VIEW IF EXISTS public.users_with_profiles;

-- Recréer la vue avec security_barrier et RLS appropriés
CREATE VIEW public.users_with_profiles
WITH (security_barrier = true) AS
SELECT 
  up.user_id as id,
  up.subscription_tier,
  up.stripe_customer_id,
  up.stripe_subscription_id,
  up.subscription_end_date,
  up.first_name,
  up.last_name,
  up.phone,
  up.country,
  up.language,
  up.avatar_url,
  up.created_at,
  up.updated_at
FROM public.user_profiles up
WHERE up.user_id = auth.uid() OR auth.role() = 'service_role';

-- 2. ACTIVER RLS SUR LA VUE
-- =========================

ALTER VIEW public.users_with_profiles SET (security_barrier = true);

-- 3. PERMISSIONS SUR LA VUE
-- =========================

-- Permettre l'accès aux utilisateurs authentifiés
GRANT SELECT ON public.users_with_profiles TO authenticated;

-- Permettre l'accès complet au service role
GRANT ALL ON public.users_with_profiles TO service_role;

-- 4. ALTERNATIVE: FONCTION SÉCURISÉE
-- ==================================

-- Créer une fonction pour récupérer le profil utilisateur de manière sécurisée
CREATE OR REPLACE FUNCTION public.get_user_profile(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  subscription_tier TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_end_date TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country TEXT,
  language TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requesting_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur qui fait la requête
  requesting_user_id := COALESCE(target_user_id, auth.uid());
  
  -- Vérifier que l'utilisateur demande son propre profil ou qu'il s'agit du service role
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Si un target_user_id est fourni, vérifier que c'est le même que l'utilisateur connecté
  -- (sauf pour service_role)
  IF target_user_id IS NOT NULL AND target_user_id != auth.uid() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: cannot access other users profile';
  END IF;
  
  -- Retourner le profil utilisateur
  RETURN QUERY
  SELECT 
    up.user_id as id,
    up.subscription_tier,
    up.stripe_customer_id,
    up.stripe_subscription_id,
    up.subscription_end_date,
    up.first_name,
    up.last_name,
    up.phone,
    up.country,
    up.language,
    up.avatar_url,
    up.created_at,
    up.updated_at
  FROM public.user_profiles up
  WHERE up.user_id = requesting_user_id;
END;
$$;

-- 5. PERMISSIONS SUR LA FONCTION
-- ==============================

GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO service_role;

-- 6. COMMENTAIRES
-- ===============

COMMENT ON VIEW public.users_with_profiles IS 'Vue sécurisée pour accès aux profils utilisateur avec RLS';
COMMENT ON FUNCTION public.get_user_profile(UUID) IS 'Fonction sécurisée pour récupérer le profil utilisateur avec contrôle d''accès';

-- 7. LOG DE LA MIGRATION
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
      'users_with_profiles_rls_fix',
      jsonb_build_object(
        'migration', '0046_fix_users_with_profiles_rls',
        'description', 'Correction RLS pour la vue users_with_profiles',
        'changes', ARRAY[
          'Recréation de users_with_profiles avec security_barrier',
          'Ajout de get_user_profile() function sécurisée',
          'Amélioration des contrôles d''accès profil utilisateur'
        ]
      ),
      jsonb_build_object(
        'execution_time', NOW(),
        'migration_file', '0046_fix_users_with_profiles_rls.sql'
      ),
      NULL
    );
  END IF;
END $$;

-- ====================================================
-- FIN DE LA MIGRATION 0046
-- ====================================================

-- Instructions post-migration :
-- 1. Tester l'accès au profil utilisateur
-- 2. Vérifier que la vue users_with_profiles fonctionne
-- 3. Optionnellement, modifier l'app pour utiliser get_user_profile()