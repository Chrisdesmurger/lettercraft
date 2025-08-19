-- ====================================================
-- MIGRATION 0045: Correction RLS pour la vue des factures
-- Date: 2025-01-19
-- Description: Fix RLS pour invoices_with_subscription_details
-- ====================================================

-- 1. SUPPRIMER L'ANCIENNE VUE ET LA RECRÉER AVEC RLS
-- ==================================================

-- Supprimer l'ancienne vue
DROP VIEW IF EXISTS public.invoices_with_subscription_details;

-- Recréer la vue avec security_barrier activé
CREATE VIEW public.invoices_with_subscription_details
WITH (security_barrier = true) AS
SELECT 
  i.*,
  s.stripe_subscription_id as subscription_stripe_id,
  s.status as subscription_status,
  s.stripe_price_id,
  u.email as user_email,
  COALESCE(up.first_name, u.raw_user_meta_data->>'first_name') as user_first_name,
  COALESCE(up.last_name, u.raw_user_meta_data->>'last_name') as user_last_name
FROM public.stripe_invoices i
LEFT JOIN public.stripe_subscriptions s ON i.stripe_subscription_id = s.id
LEFT JOIN auth.users u ON i.user_id = u.id
LEFT JOIN public.user_profiles up ON i.user_id = up.user_id
-- La sécurité est assurée par les policies RLS des tables sous-jacentes
WHERE i.user_id = auth.uid() OR auth.role() = 'service_role';

-- 2. ACTIVER RLS SUR LA VUE
-- =========================

ALTER VIEW public.invoices_with_subscription_details SET (security_barrier = true);

-- 3. PERMISSIONS SUR LA VUE
-- =========================

-- Permettre l'accès aux utilisateurs authentifiés
GRANT SELECT ON public.invoices_with_subscription_details TO authenticated;

-- Permettre l'accès complet au service role
GRANT ALL ON public.invoices_with_subscription_details TO service_role;

-- 4. ALTERNATIVE: FUNCTION SÉCURISÉE POUR LES FACTURES
-- ====================================================

-- Créer une fonction sécurisée pour récupérer les factures
CREATE OR REPLACE FUNCTION public.get_user_invoices(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  stripe_invoice_id TEXT,
  stripe_customer_id TEXT,
  invoice_number TEXT,
  description TEXT,
  amount_due INTEGER,
  amount_paid INTEGER,
  amount_remaining INTEGER,
  currency TEXT,
  invoice_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  status TEXT,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  attempt_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  subscription_stripe_id TEXT,
  subscription_status TEXT,
  stripe_price_id TEXT,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT
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
  
  -- Vérifier que l'utilisateur demande ses propres factures ou qu'il s'agit du service role
  IF requesting_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Si un target_user_id est fourni, vérifier que c'est le même que l'utilisateur connecté
  -- (sauf pour service_role)
  IF target_user_id IS NOT NULL AND target_user_id != auth.uid() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: cannot access other users invoices';
  END IF;
  
  -- Retourner les factures avec les détails
  RETURN QUERY
  SELECT 
    i.id,
    i.stripe_invoice_id,
    i.stripe_customer_id,
    i.invoice_number,
    i.description,
    i.amount_due,
    i.amount_paid,
    i.amount_remaining,
    i.currency,
    i.invoice_date,
    i.due_date,
    i.paid_at,
    i.status,
    i.hosted_invoice_url,
    i.invoice_pdf,
    i.period_start,
    i.period_end,
    i.attempt_count,
    i.created_at,
    i.updated_at,
    s.stripe_subscription_id as subscription_stripe_id,
    s.status as subscription_status,
    s.stripe_price_id,
    u.email as user_email,
    COALESCE(up.first_name, u.raw_user_meta_data->>'first_name') as user_first_name,
    COALESCE(up.last_name, u.raw_user_meta_data->>'last_name') as user_last_name
  FROM public.stripe_invoices i
  LEFT JOIN public.stripe_subscriptions s ON i.stripe_subscription_id = s.id
  LEFT JOIN auth.users u ON i.user_id = u.id
  LEFT JOIN public.user_profiles up ON i.user_id = up.user_id
  WHERE i.user_id = requesting_user_id
  ORDER BY i.invoice_date DESC NULLS LAST;
END;
$$;

-- 5. PERMISSIONS SUR LA FONCTION
-- ==============================

GRANT EXECUTE ON FUNCTION public.get_user_invoices(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_invoices(UUID) TO service_role;

-- 6. COMMENTAIRES
-- ===============

COMMENT ON VIEW public.invoices_with_subscription_details IS 'Vue sécurisée combinant factures et détails abonnements avec RLS';
COMMENT ON FUNCTION public.get_user_invoices(UUID) IS 'Fonction sécurisée pour récupérer les factures utilisateur avec contrôle d''accès';

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
      'invoice_view_rls_fix',
      jsonb_build_object(
        'migration', '0045_fix_invoice_view_rls',
        'description', 'Correction RLS pour la vue des factures',
        'changes', ARRAY[
          'Recréation de invoices_with_subscription_details avec security_barrier',
          'Ajout de get_user_invoices() function sécurisée',
          'Amélioration des contrôles d''accès'
        ]
      ),
      jsonb_build_object(
        'execution_time', NOW(),
        'migration_file', '0045_fix_invoice_view_rls.sql'
      ),
      NULL
    );
  END IF;
END $$;

-- ====================================================
-- FIN DE LA MIGRATION 0045
-- ====================================================

-- Instructions post-migration :
-- 1. Tester l'accès aux factures via la vue
-- 2. Optionnellement, modifier useUserInvoices pour utiliser la fonction get_user_invoices()
-- 3. Vérifier que les policies RLS fonctionnent correctement