-- ====================================================
-- MIGRATION 0037: Fix Stripe data deletion - Simple version
-- ====================================================

-- Mettre à jour la fonction de suppression hard pour utiliser l'utilisateur générique
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
    v_count INTEGER := 0;
    v_deleted_user_id UUID;
    v_generic_user_exists BOOLEAN;
BEGIN
    -- Trouver l'utilisateur générique (peut être différent UUID)
    SELECT id INTO v_deleted_user_id
    FROM auth.users 
    WHERE email = 'deleted-user@system.local'
       OR raw_user_meta_data::jsonb ->> 'system_user' = 'true'
       OR id = '00000000-0000-0000-0000-000000000001'
    LIMIT 1;
    
    IF v_deleted_user_id IS NULL THEN
        RAISE NOTICE 'No generic user found. Please create it first via /api/setup-generic-user';
        PERFORM create_audit_log(
            p_user_id,
            'account_deletion_failed',
            'user_account',
            p_user_id::TEXT,
            NULL,
            jsonb_build_object('error', 'Generic user not found'),
            jsonb_build_object('error_code', 'GENERIC_USER_MISSING')
        );
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Using generic user ID: %', v_deleted_user_id;

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
        RAISE NOTICE 'User % not found', p_user_id;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Starting hard delete for user % (email: %)', p_user_id, v_user_data.email;
    
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
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % generated_letters', v_count;
    END IF;
    
    -- 2. Letter questionnaire responses
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'letter_questionnaire_responses'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM letter_questionnaire_responses WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % letter_questionnaire_responses', v_count;
    END IF;
    
    -- 3. Job offers
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'job_offers'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM job_offers WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % job_offers', v_count;
    END IF;
    
    -- 4. Candidates profile
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'candidates_profile'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM candidates_profile WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % candidates_profile', v_count;
    END IF;
    
    -- 5. Saved letters
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'saved_letters'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM saved_letters WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % saved_letters', v_count;
    END IF;
    
    -- 6. User quotas
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_quotas'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM user_quotas WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user_quotas', v_count;
    END IF;
    
    -- 7. Onboarding responses
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'onboarding_responses'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM onboarding_responses WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % onboarding_responses', v_count;
    END IF;
    
    -- 8. Transférer les données Stripe vers l'utilisateur générique
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_subscriptions'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_subscriptions 
        SET 
            user_id = v_deleted_user_id,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'original_user_id', p_user_id::TEXT,
                'deleted_at', NOW()::TEXT,
                'deletion_reason', 'account_deletion'
            ),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Transferred % stripe_subscriptions to generic user', v_count;
    END IF;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_invoices'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_invoices 
        SET 
            user_id = v_deleted_user_id,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'original_user_id', p_user_id::TEXT,
                'deleted_at', NOW()::TEXT,
                'deletion_reason', 'account_deletion'
            ),
            updated_at = NOW()
        WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Transferred % stripe_invoices to generic user', v_count;
    END IF;
    
    -- 9. User profile (avant auth.users à cause de la FK)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM user_profiles WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user_profiles', v_count;
    END IF;
    
    -- 10. Deletion requests (marquer comme completed)
    UPDATE account_deletion_requests
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Completed % deletion_requests', v_count;
    
    -- 11. Utilisateur Auth (en dernier)
    DELETE FROM auth.users WHERE id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth.users (should be 1)', v_count;
    
    RAISE NOTICE 'Hard delete completed successfully for user %', p_user_id;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log l'erreur avec le bon type d'action
        RAISE NOTICE 'Hard delete failed for user %: % (SQLSTATE: %)', p_user_id, SQLERRM, SQLSTATE;
        
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

-- Grants
GRANT EXECUTE ON FUNCTION execute_hard_delete_user TO authenticated;

COMMENT ON FUNCTION execute_hard_delete_user IS 'Suppression hard avec transfert des données Stripe vers utilisateur générique (doit être créé via /api/setup-generic-user)';