-- ====================================================
-- MIGRATION 0037: Fix Stripe data deletion with generic user
-- ====================================================

-- 1. Créer un utilisateur générique pour les comptes supprimés
-- D'abord via Supabase Auth Admin API (simulé)
DO $$
DECLARE
    v_user_exists BOOLEAN;
BEGIN
    -- Vérifier si l'utilisateur générique existe déjà
    SELECT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = '00000000-0000-0000-0000-000000000001'
    ) INTO v_user_exists;
    
    -- Créer l'utilisateur seulement s'il n'existe pas
    IF NOT v_user_exists THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            '00000000-0000-0000-0000-000000000001',
            'authenticated',
            'authenticated',
            'deleted-user@system.local',
            '$2a$10$placeholder.hash.for.system.user',
            NOW(),
            NULL,
            '',
            NULL,
            '',
            NULL,
            '',
            '',
            NULL,
            NULL,
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{"system_user": true, "purpose": "deleted_accounts_placeholder"}'::jsonb,
            false,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL
        );
        
        RAISE NOTICE 'Created generic user for deleted accounts';
    ELSE
        RAISE NOTICE 'Generic user already exists';
    END IF;
END $$;

-- 2. Créer le profil pour l'utilisateur générique
INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    subscription_tier,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Utilisateur',
    'Supprimé',
    'free',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- 3. Mettre à jour la fonction de suppression hard
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
    v_deleted_user_id UUID := '00000000-0000-0000-0000-000000000001';
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
    
    -- 8. Anonymiser les données Stripe en les assignant à l'utilisateur générique
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_subscriptions'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_subscriptions 
        SET 
            user_id = v_deleted_user_id,
            metadata = metadata || jsonb_build_object(
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
            metadata = metadata || jsonb_build_object(
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

-- 4. Mettre à jour la fonction soft delete aussi
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
    v_deleted_user_id UUID := '00000000-0000-0000-0000-000000000001';
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
    
    -- Pour soft delete, on peut garder les données Stripe mais les anonymiser
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_subscriptions'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_subscriptions 
        SET 
            user_id = v_deleted_user_id,
            metadata = metadata || jsonb_build_object(
                'original_user_id', p_user_id::TEXT,
                'soft_deleted_at', NOW()::TEXT,
                'deletion_reason', 'soft_account_deletion'
            ),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'stripe_invoices'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE stripe_invoices 
        SET 
            user_id = v_deleted_user_id,
            metadata = metadata || jsonb_build_object(
                'original_user_id', p_user_id::TEXT,
                'soft_deleted_at', NOW()::TEXT,
                'deletion_reason', 'soft_account_deletion'
            ),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
    
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
    
    -- Anonymiser les autres données...
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

-- 5. Grants
GRANT EXECUTE ON FUNCTION execute_hard_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION execute_soft_delete_user TO authenticated;

-- 6. Exclure l'utilisateur générique des triggers de synchronisation
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorer l'utilisateur générique des suppressions
  IF COALESCE(NEW.user_id, OLD.user_id) = '00000000-0000-0000-0000-000000000001' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Logique normale de synchronisation...
  WITH active_subscription AS (
    SELECT 
      user_id,
      CASE 
        WHEN COUNT(*) > 0 AND MAX(current_period_end) > NOW() THEN 'premium'
        ELSE 'free'
      END as tier,
      MAX(current_period_end) as end_date
    FROM public.stripe_subscriptions 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND user_id != '00000000-0000-0000-0000-000000000001'  -- Exclure l'utilisateur générique
      AND status IN ('active', 'trialing')
    GROUP BY user_id
  )
  UPDATE public.user_profiles 
  SET 
    subscription_tier = COALESCE(active_subscription.tier, 'free'),
    subscription_end_date = active_subscription.end_date,
    updated_at = NOW()
  FROM active_subscription
  WHERE user_profiles.user_id = active_subscription.user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE auth.users IS 'Table utilisateurs avec utilisateur générique 00000000-0000-0000-0000-000000000001 pour les comptes supprimés';
COMMENT ON FUNCTION execute_hard_delete_user IS 'Suppression hard avec transfert des données Stripe vers utilisateur générique';
COMMENT ON FUNCTION execute_soft_delete_user IS 'Suppression soft avec transfert des données Stripe vers utilisateur générique';