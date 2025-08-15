-- ====================================================
-- MIGRATION 0036: Fix account deletion constraints and tables
-- ====================================================

-- 1. Mettre à jour les contraintes audit_logs pour inclure les types manquants
ALTER TABLE audit_logs DROP CONSTRAINT audit_logs_action_type_check;

ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_type_check 
CHECK (action_type IN (
  'account_deletion_requested', 
  'account_deletion_confirmed', 
  'account_deletion_cancelled', 
  'account_deleted', 
  'account_deletion_failed',
  'subscription_cancelled', 
  'data_export', 
  'email_confirmation_sent',
  'maintenance_cleanup',
  'maintenance_execution'
));

-- 2. Vérifier et créer la table saved_letters si elle n'existe pas
CREATE TABLE IF NOT EXISTS saved_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    job_title TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_saved_letters_user_id ON saved_letters(user_id);

-- RLS pour saved_letters
ALTER TABLE saved_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved letters" ON saved_letters 
    FOR ALL USING (user_id = auth.uid());

-- 3. Vérifier et créer la table letter_questionnaire_responses si elle n'existe pas
CREATE TABLE IF NOT EXISTS letter_questionnaire_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    motivation TEXT,
    key_strengths TEXT[],
    relevant_experience TEXT,
    company_knowledge TEXT,
    additional_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_letter_questionnaire_responses_user_id ON letter_questionnaire_responses(user_id);

-- RLS pour letter_questionnaire_responses
ALTER TABLE letter_questionnaire_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own questionnaire responses" ON letter_questionnaire_responses 
    FOR ALL USING (user_id = auth.uid());

-- 4. Mettre à jour les fonctions de suppression pour gérer les tables manquantes
CREATE OR REPLACE FUNCTION execute_hard_delete_user(
    p_user_id UUID,
    p_performed_by UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_data RECORD;
    v_deleted_data JSONB;
    v_table_exists BOOLEAN;
BEGIN
    -- Récupérer les données de l'utilisateur avant suppression
    SELECT 
        u.email, u.created_at,
        up.first_name, up.last_name, up.subscription_tier,
        up.stripe_customer_id, up.stripe_subscription_id
    INTO v_user_data
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE u.id = p_user_id;
    
    IF v_user_data IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Préparer les données pour l'audit
    v_deleted_data := jsonb_build_object(
        'email_hash', encode(digest(v_user_data.email, 'sha256'), 'hex'),
        'account_age_days', EXTRACT(DAYS FROM (NOW() - v_user_data.created_at)),
        'subscription_tier', v_user_data.subscription_tier,
        'had_stripe_customer', v_user_data.stripe_customer_id IS NOT NULL,
        'had_stripe_subscription', v_user_data.stripe_subscription_id IS NOT NULL
    );
    
    -- Créer le log d'audit avant suppression
    PERFORM create_audit_log(
        p_user_id,
        'account_deleted',
        'user_account',
        p_user_id::TEXT,
        v_deleted_data,
        jsonb_build_object('deletion_type', 'hard'),
        jsonb_build_object(
            'deletion_method', 'hard_delete',
            'performed_by', COALESCE(p_performed_by, p_user_id)
        )
    );
    
    -- Supprimer en cascade (vérifier l'existence des tables)
    
    -- 1. Generated letters
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'generated_letters'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM generated_letters WHERE user_id = p_user_id;
    END IF;
    
    -- 2. Letter questionnaire responses
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'letter_questionnaire_responses'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM letter_questionnaire_responses WHERE user_id = p_user_id;
    END IF;
    
    -- 3. Job offers
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'job_offers'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM job_offers WHERE user_id = p_user_id;
    END IF;
    
    -- 4. Candidates profile
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'candidates_profile'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM candidates_profile WHERE user_id = p_user_id;
    END IF;
    
    -- 5. Saved letters
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'saved_letters'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM saved_letters WHERE user_id = p_user_id;
    END IF;
    
    -- 6. User quotas
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_quotas'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM user_quotas WHERE user_id = p_user_id;
    END IF;
    
    -- 7. Onboarding responses
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'onboarding_responses'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM onboarding_responses WHERE user_id = p_user_id;
    END IF;
    
    -- 8. User profile
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM user_profiles WHERE user_id = p_user_id;
    END IF;
    
    -- 9. Stripe data (conserver pour comptabilité légale)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_subscriptions'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_subscriptions 
        SET user_id = NULL, updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_invoices'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_invoices 
        SET user_id = NULL, updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- 10. Deletion requests
    UPDATE account_deletion_requests
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 11. Utilisateur Auth (en dernier)
    DELETE FROM auth.users WHERE id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log l'erreur avec le bon type d'action
        PERFORM create_audit_log(
            p_user_id,
            'account_deletion_failed',
            'user_account',
            p_user_id::TEXT,
            NULL,
            jsonb_build_object('error', SQLERRM),
            jsonb_build_object('error_state', SQLSTATE)
        );
        RETURN FALSE;
END;
$$;

-- 5. Mettre à jour la fonction soft delete aussi
CREATE OR REPLACE FUNCTION execute_soft_delete_user(
    p_user_id UUID,
    p_performed_by UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_data RECORD;
    v_anonymous_suffix TEXT;
    v_table_exists BOOLEAN;
BEGIN
    -- Récupérer les données de l'utilisateur
    SELECT * INTO v_user_data
    FROM auth.users
    WHERE id = p_user_id;
    
    IF v_user_data IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Générer un suffixe anonyme
    v_anonymous_suffix := substr(encode(gen_random_bytes(8), 'hex'), 1, 8);
    
    -- Créer le log d'audit
    PERFORM create_audit_log(
        p_user_id,
        'account_deleted',
        'user_account',
        p_user_id::TEXT,
        jsonb_build_object(
            'email_hash', encode(digest(v_user_data.email, 'sha256'), 'hex'),
            'deletion_type', 'soft'
        ),
        jsonb_build_object(
            'anonymized_suffix', v_anonymous_suffix
        )
    );
    
    -- Anonymiser les données utilisateur
    UPDATE auth.users
    SET 
        email = 'deleted_user_' || v_anonymous_suffix || '@deleted.local',
        phone = NULL,
        raw_user_meta_data = '{}',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Anonymiser le profil utilisateur si la table existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE user_profiles
        SET 
            first_name = 'Utilisateur',
            last_name = 'Supprimé',
            phone = NULL,
            bio = NULL,
            avatar_url = NULL,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    -- Anonymiser les données candidates si la table existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'candidates_profile'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE candidates_profile
        SET 
            first_name = 'Utilisateur',
            last_name = 'Supprimé',
            description = 'Profil anonymisé',
            experiences = NULL,
            skills = NULL,
            education = NULL,
            is_active = false
        WHERE user_id = p_user_id;
    END IF;
    
    -- Anonymiser les lettres sauvegardées si la table existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'saved_letters'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE saved_letters
        SET content = 'Contenu anonymisé suite à la suppression du compte'
        WHERE user_id = p_user_id;
    END IF;
    
    -- Marquer la demande comme complétée
    UPDATE account_deletion_requests
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        PERFORM create_audit_log(
            p_user_id,
            'account_deletion_failed',
            'user_account',
            p_user_id::TEXT,
            NULL,
            jsonb_build_object('error', SQLERRM, 'deletion_type', 'soft'),
            jsonb_build_object('error_state', SQLSTATE)
        );
        RETURN FALSE;
END;
$$;

-- 6. Mettre à jour les grants
GRANT EXECUTE ON FUNCTION execute_hard_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION execute_soft_delete_user TO authenticated;

COMMENT ON TABLE saved_letters IS 'Lettres de motivation sauvegardées par les utilisateurs';
COMMENT ON TABLE letter_questionnaire_responses IS 'Réponses aux questionnaires pour personnaliser les lettres';