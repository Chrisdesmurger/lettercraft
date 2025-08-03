-- ====================================================
-- MIGRATION 0035: Système de suppression de compte et logs d'audit RGPD
-- ====================================================

-- 1. Création de la table des logs d'audit pour RGPD
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('account_deletion_requested', 'account_deletion_confirmed', 'account_deletion_cancelled', 'account_deleted', 'subscription_cancelled', 'data_export', 'email_confirmation_sent')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('user_account', 'subscription', 'data')),
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches par utilisateur et date
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- RLS pour les logs d'audit
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir tous les logs, les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs 
    FOR SELECT USING (user_id = auth.uid());

-- Seul le système peut insérer des logs d'audit
CREATE POLICY "System can insert audit logs" ON audit_logs 
    FOR INSERT WITH CHECK (true);

-- 2. Table pour les demandes de suppression de compte avec cooldown
CREATE TABLE IF NOT EXISTS account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    confirmation_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    deletion_type TEXT NOT NULL DEFAULT 'hard' CHECK (deletion_type IN ('soft', 'hard')),
    reason TEXT,
    scheduled_deletion_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_deletion ON account_deletion_requests(scheduled_deletion_at);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_token ON account_deletion_requests(confirmation_token);

-- RLS pour les demandes de suppression
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir et modifier leurs propres demandes
CREATE POLICY "Users can manage their own deletion requests" ON account_deletion_requests 
    FOR ALL USING (user_id = auth.uid());

-- 3. Fonction pour créer un log d'audit
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_action_type TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, action_type, entity_type, entity_id,
        old_data, new_data, metadata, ip_address,
        user_agent, request_id, performed_by
    ) VALUES (
        p_user_id, p_action_type, p_entity_type, p_entity_id,
        p_old_data, p_new_data, p_metadata, p_ip_address,
        p_user_agent, p_request_id, COALESCE(p_performed_by, p_user_id)
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- 4. Fonction pour créer une demande de suppression de compte
CREATE OR REPLACE FUNCTION create_account_deletion_request(
    p_user_id UUID,
    p_deletion_type TEXT DEFAULT 'hard',
    p_reason TEXT DEFAULT NULL,
    p_cooldown_hours INTEGER DEFAULT 48,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(
    request_id UUID,
    confirmation_token TEXT,
    scheduled_deletion_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_scheduled_at TIMESTAMPTZ;
    v_request_id UUID;
    v_existing_request RECORD;
BEGIN
    -- Vérifier s'il y a une demande active
    SELECT * INTO v_existing_request 
    FROM account_deletion_requests 
    WHERE user_id = p_user_id 
    AND status IN ('pending', 'confirmed')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF v_existing_request.id IS NOT NULL THEN
        RAISE EXCEPTION 'Une demande de suppression est déjà en cours pour cet utilisateur';
    END IF;
    
    -- Générer un token de confirmation sécurisé
    v_token := encode(gen_random_bytes(32), 'base64');
    v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');
    
    -- Calculer la date de suppression programmée
    v_scheduled_at := NOW() + (p_cooldown_hours || ' hours')::INTERVAL;
    
    -- Insérer la demande
    INSERT INTO account_deletion_requests (
        user_id, confirmation_token, deletion_type, reason,
        scheduled_deletion_at, ip_address, user_agent,
        metadata
    ) VALUES (
        p_user_id, v_token, p_deletion_type, p_reason,
        v_scheduled_at, p_ip_address, p_user_agent,
        jsonb_build_object(
            'cooldown_hours', p_cooldown_hours,
            'created_via', 'api'
        )
    ) RETURNING id INTO v_request_id;
    
    -- Créer un log d'audit
    PERFORM create_audit_log(
        p_user_id,
        'account_deletion_requested',
        'user_account',
        p_user_id::TEXT,
        NULL,
        jsonb_build_object(
            'deletion_type', p_deletion_type,
            'reason', p_reason,
            'scheduled_deletion_at', v_scheduled_at,
            'cooldown_hours', p_cooldown_hours
        ),
        jsonb_build_object(
            'request_id', v_request_id,
            'confirmation_token_length', length(v_token)
        ),
        p_ip_address,
        p_user_agent
    );
    
    RETURN QUERY SELECT v_request_id, v_token, v_scheduled_at;
END;
$$;

-- 5. Fonction pour confirmer la suppression via email
CREATE OR REPLACE FUNCTION confirm_account_deletion(
    p_confirmation_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    user_id UUID,
    scheduled_deletion_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
    v_user_email TEXT;
BEGIN
    -- Trouver la demande avec le token
    SELECT * INTO v_request
    FROM account_deletion_requests
    WHERE confirmation_token = p_confirmation_token
    AND status = 'pending';
    
    IF v_request.id IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Token invalide ou expiré', NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Vérifier que la demande n'a pas expiré (token valable 7 jours)
    IF v_request.created_at < NOW() - INTERVAL '7 days' THEN
        RETURN QUERY SELECT FALSE, 'Token expiré', NULL::UUID, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Récupérer l'email de l'utilisateur pour les logs
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_request.user_id;
    
    -- Confirmer la demande
    UPDATE account_deletion_requests
    SET 
        status = 'confirmed',
        confirmed_at = NOW(),
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'confirmed_ip', p_ip_address,
            'confirmed_user_agent', p_user_agent
        )
    WHERE id = v_request.id;
    
    -- Créer un log d'audit
    PERFORM create_audit_log(
        v_request.user_id,
        'account_deletion_confirmed',
        'user_account',
        v_request.user_id::TEXT,
        jsonb_build_object('status', 'pending'),
        jsonb_build_object('status', 'confirmed'),
        jsonb_build_object(
            'confirmation_token_used', p_confirmation_token,
            'user_email', v_user_email
        ),
        p_ip_address,
        p_user_agent
    );
    
    RETURN QUERY SELECT 
        TRUE, 
        'Suppression confirmée', 
        v_request.user_id, 
        v_request.scheduled_deletion_at;
END;
$$;

-- 6. Fonction pour annuler une demande de suppression
CREATE OR REPLACE FUNCTION cancel_account_deletion(
    p_user_id UUID,
    p_confirmation_token TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- Trouver la demande active
    IF p_confirmation_token IS NOT NULL THEN
        SELECT * INTO v_request
        FROM account_deletion_requests
        WHERE confirmation_token = p_confirmation_token
        AND user_id = p_user_id
        AND status IN ('pending', 'confirmed');
    ELSE
        SELECT * INTO v_request
        FROM account_deletion_requests
        WHERE user_id = p_user_id
        AND status IN ('pending', 'confirmed')
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    IF v_request.id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier qu'on n'est pas après la date de suppression
    IF NOW() >= v_request.scheduled_deletion_at THEN
        RETURN FALSE;
    END IF;
    
    -- Annuler la demande
    UPDATE account_deletion_requests
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'cancelled_ip', p_ip_address,
            'cancelled_user_agent', p_user_agent
        )
    WHERE id = v_request.id;
    
    -- Créer un log d'audit
    PERFORM create_audit_log(
        p_user_id,
        'account_deletion_cancelled',
        'user_account',
        p_user_id::TEXT,
        jsonb_build_object('status', v_request.status),
        jsonb_build_object('status', 'cancelled'),
        jsonb_build_object(
            'was_confirmed', v_request.confirmed_at IS NOT NULL,
            'time_remaining_hours', EXTRACT(EPOCH FROM (v_request.scheduled_deletion_at - NOW())) / 3600
        ),
        p_ip_address,
        p_user_agent
    );
    
    RETURN TRUE;
END;
$$;

-- 7. Fonction pour la suppression complète (hard delete)
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
    
    -- Supprimer en cascade (l'ordre est important à cause des FK)
    -- 1. Generated letters
    DELETE FROM generated_letters WHERE user_id = p_user_id;
    
    -- 2. Letter questionnaire responses
    DELETE FROM letter_questionnaire_responses WHERE user_id = p_user_id;
    
    -- 3. Job offers
    DELETE FROM job_offers WHERE user_id = p_user_id;
    
    -- 4. Candidates profile
    DELETE FROM candidates_profile WHERE user_id = p_user_id;
    
    -- 5. Saved letters
    DELETE FROM saved_letters WHERE user_id = p_user_id;
    
    -- 6. User quotas
    DELETE FROM user_quotas WHERE user_id = p_user_id;
    
    -- 7. Onboarding responses
    DELETE FROM onboarding_responses WHERE user_id = p_user_id;
    
    -- 8. User profile
    DELETE FROM user_profiles WHERE user_id = p_user_id;
    
    -- 9. Stripe data (conserver pour comptabilité légale)
    -- On ne supprime PAS stripe_subscriptions et stripe_invoices
    -- mais on anonymise les références utilisateur
    UPDATE stripe_subscriptions 
    SET user_id = NULL, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    UPDATE stripe_invoices 
    SET user_id = NULL, updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 10. Deletion requests
    UPDATE account_deletion_requests
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 11. Utilisateur Auth (en dernier)
    DELETE FROM auth.users WHERE id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log l'erreur
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

-- 8. Fonction pour la suppression soft (anonymisation)
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
    
    -- Anonymiser le profil utilisateur
    UPDATE user_profiles
    SET 
        first_name = 'Utilisateur',
        last_name = 'Supprimé',
        phone = NULL,
        bio = NULL,
        avatar_url = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Anonymiser les données candidates
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
    
    -- Anonymiser les lettres sauvegardées (conserver pour analytics)
    UPDATE saved_letters
    SET content = 'Contenu anonymisé suite à la suppression du compte'
    WHERE user_id = p_user_id;
    
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
            jsonb_build_object('error', SQLERRM, 'deletion_type', 'soft')
        );
        RETURN FALSE;
END;
$$;

-- 9. Vue pour les demandes de suppression actives (pour monitoring)
CREATE OR REPLACE VIEW active_deletion_requests AS
SELECT 
    adr.*,
    u.email,
    up.first_name,
    up.last_name,
    up.subscription_tier,
    EXTRACT(HOURS FROM (adr.scheduled_deletion_at - NOW())) as hours_remaining
FROM account_deletion_requests adr
JOIN auth.users u ON u.id = adr.user_id
LEFT JOIN user_profiles up ON up.user_id = adr.user_id
WHERE adr.status IN ('pending', 'confirmed')
AND adr.scheduled_deletion_at > NOW()
ORDER BY adr.scheduled_deletion_at ASC;

-- 10. Table pour feedback de suppression (optionnel)
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('subscription_cancellation', 'account_deletion', 'feature_request', 'bug_report', 'general')),
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);

-- RLS pour le feedback
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own feedback" ON user_feedback 
    FOR ALL USING (user_id = auth.uid());

-- Fonction pour nettoyer les demandes expirées (à appeler via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_deletion_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Marquer comme expirées les demandes pending depuis plus de 7 jours
    UPDATE account_deletion_requests 
    SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        metadata = metadata || jsonb_build_object('cancellation_reason', 'expired')
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN cleanup_count;
END;
$$;

-- Grants pour les fonctions
GRANT EXECUTE ON FUNCTION create_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION create_account_deletion_request TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_account_deletion TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_account_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_deletion_requests TO postgres;

-- Grant pour la vue (admins seulement)
GRANT SELECT ON active_deletion_requests TO postgres;

COMMENT ON TABLE audit_logs IS 'Logs d''audit pour conformité RGPD et traçabilité des actions';
COMMENT ON TABLE account_deletion_requests IS 'Demandes de suppression de compte avec période de cooldown';
COMMENT ON FUNCTION create_audit_log IS 'Crée un log d''audit pour traçabilité RGPD';
COMMENT ON FUNCTION execute_hard_delete_user IS 'Suppression complète et irréversible d''un compte utilisateur';
COMMENT ON FUNCTION execute_soft_delete_user IS 'Anonymisation d''un compte utilisateur (soft delete)';