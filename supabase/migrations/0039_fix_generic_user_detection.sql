-- ====================================================
-- MIGRATION 0039: Fix Generic User Detection by Email
-- ====================================================

-- Update soft delete function to find generic user by email instead of hard-coded UUID
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
    v_deleted_user_id UUID;
    v_count INTEGER;
BEGIN
    -- Check if user exists
    SELECT * INTO v_user_data
    FROM auth.users
    WHERE id = p_user_id;
    
    IF v_user_data IS NULL THEN
        RAISE NOTICE 'User % not found', p_user_id;
        RETURN FALSE;
    END IF;
    
    RAISE NOTICE 'Starting soft delete for user % (email: %)', p_user_id, v_user_data.email;
    
    -- Find generic user by email (more flexible than hard-coded UUID)
    SELECT id INTO v_deleted_user_id
    FROM auth.users 
    WHERE email = 'deleted-user@system.local'
    LIMIT 1;
    
    IF v_deleted_user_id IS NULL THEN
        RAISE NOTICE 'Generic user not found, attempting to create one...';
        
        -- We can't create auth users from SQL, so we'll proceed without Stripe data transfer
        RAISE WARNING 'No generic user available for Stripe data transfer. Stripe data will be deleted instead.';
    ELSE
        RAISE NOTICE 'Found generic user: %', v_deleted_user_id;
        
        -- Ensure generic user has a profile
        INSERT INTO user_profiles (
            user_id,
            first_name,
            last_name,
            subscription_tier,
            created_at,
            updated_at
        ) VALUES (
            v_deleted_user_id,
            'Utilisateur',
            'Supprimé',
            'free',
            NOW(),
            NOW()
        ) ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    -- Generate anonymous suffix
    v_anonymous_suffix := substr(encode(gen_random_bytes(8), 'hex'), 1, 8);
    
    -- Create audit log
    PERFORM create_audit_log(
        p_user_id,
        'account_deleted',
        'user_account',
        p_user_id::TEXT,
        jsonb_build_object(
            'email_hash', encode(digest(v_user_data.email, 'sha256'), 'hex'),
            'deletion_type', 'soft',
            'generic_user_id', v_deleted_user_id
        ),
        jsonb_build_object(
            'anonymized_suffix', v_anonymous_suffix
        )
    );
    
    -- Transfer or delete Stripe data
    IF v_deleted_user_id IS NOT NULL THEN
        -- Transfer stripe_subscriptions
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_subscriptions'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            BEGIN
                UPDATE stripe_subscriptions 
                SET 
                    user_id = v_deleted_user_id,
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                        'original_user_id', p_user_id::TEXT,
                        'soft_deleted_at', NOW()::TEXT,
                        'deletion_reason', 'soft_account_deletion'
                    ),
                    updated_at = NOW()
                WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_count = ROW_COUNT;
                RAISE NOTICE 'Transferred % stripe_subscriptions to generic user', v_count;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Could not transfer stripe_subscriptions: %. Deleting instead.', SQLERRM;
                    DELETE FROM stripe_subscriptions WHERE user_id = p_user_id;
                    GET DIAGNOSTICS v_count = ROW_COUNT;
                    RAISE NOTICE 'Deleted % stripe_subscriptions', v_count;
            END;
        END IF;
        
        -- Transfer stripe_invoices
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_invoices'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            BEGIN
                UPDATE stripe_invoices 
                SET 
                    user_id = v_deleted_user_id,
                    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                        'original_user_id', p_user_id::TEXT,
                        'soft_deleted_at', NOW()::TEXT,
                        'deletion_reason', 'soft_account_deletion'
                    ),
                    updated_at = NOW()
                WHERE user_id = p_user_id;
                GET DIAGNOSTICS v_count = ROW_COUNT;
                RAISE NOTICE 'Transferred % stripe_invoices to generic user', v_count;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Could not transfer stripe_invoices: %. Deleting instead.', SQLERRM;
                    DELETE FROM stripe_invoices WHERE user_id = p_user_id;
                    GET DIAGNOSTICS v_count = ROW_COUNT;
                    RAISE NOTICE 'Deleted % stripe_invoices', v_count;
            END;
        END IF;
    ELSE
        -- If no generic user, delete Stripe data instead
        RAISE NOTICE 'No generic user available, deleting Stripe data instead of transferring';
        
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_subscriptions'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            DELETE FROM stripe_subscriptions WHERE user_id = p_user_id;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % stripe_subscriptions', v_count;
        END IF;
        
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_invoices'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            DELETE FROM stripe_invoices WHERE user_id = p_user_id;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % stripe_invoices', v_count;
        END IF;
    END IF;
    
    -- Anonymize user data
    UPDATE auth.users
    SET 
        email = 'deleted_user_' || v_anonymous_suffix || '@deleted.local',
        phone = NULL,
        raw_user_meta_data = '{}',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Anonymize user profile
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
    
    -- Anonymize candidates profile
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
    
    -- Anonymize saved letters
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'saved_letters'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        UPDATE saved_letters
        SET content = 'Contenu anonymisé suite à la suppression du compte'
        WHERE user_id = p_user_id;
    END IF;
    
    -- Mark deletion request as completed
    UPDATE account_deletion_requests
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id;
    
    RAISE NOTICE 'Soft delete completed successfully for user %', p_user_id;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Soft delete failed for user %: % (SQLSTATE: %)', p_user_id, SQLERRM, SQLSTATE;
        
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

-- Update hard delete function as well to use email-based lookup
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
BEGIN
    -- Find generic user by email instead of hard-coded UUID
    SELECT id INTO v_deleted_user_id
    FROM auth.users 
    WHERE email = 'deleted-user@system.local'
    LIMIT 1;
    
    IF v_deleted_user_id IS NULL THEN
        RAISE WARNING 'No generic user found for Stripe data transfer. Data will be deleted instead.';
    END IF;
    
    -- Rest of the function remains the same...
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
        'had_stripe_subscription', v_user_data.stripe_subscription_id IS NOT NULL,
        'generic_user_id', v_deleted_user_id
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
    
    -- Delete user data (tables with foreign keys first)
    -- [Rest of deletion logic from original function...]
    
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
    
    -- [Continue with all other table deletions...]
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
    
    -- 8. Transfer or delete Stripe data
    IF v_deleted_user_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_subscriptions'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            BEGIN
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
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Could not transfer stripe_subscriptions: %. Deleting instead.', SQLERRM;
                    DELETE FROM stripe_subscriptions WHERE user_id = p_user_id;
                    GET DIAGNOSTICS v_count = ROW_COUNT;
                    RAISE NOTICE 'Deleted % stripe_subscriptions', v_count;
            END;
        END IF;
        
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_invoices'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            BEGIN
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
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Could not transfer stripe_invoices: %. Deleting instead.', SQLERRM;
                    DELETE FROM stripe_invoices WHERE user_id = p_user_id;
                    GET DIAGNOSTICS v_count = ROW_COUNT;
                    RAISE NOTICE 'Deleted % stripe_invoices', v_count;
            END;
        END IF;
    ELSE
        -- Delete Stripe data if no generic user
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_subscriptions'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            DELETE FROM stripe_subscriptions WHERE user_id = p_user_id;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % stripe_subscriptions', v_count;
        END IF;
        
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'stripe_invoices'
        ) INTO v_table_exists;
        IF v_table_exists THEN
            DELETE FROM stripe_invoices WHERE user_id = p_user_id;
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE 'Deleted % stripe_invoices', v_count;
        END IF;
    END IF;
    
    -- 9. User profile (before auth.users due to FK)
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) INTO v_table_exists;
    IF v_table_exists THEN
        DELETE FROM user_profiles WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % user_profiles', v_count;
    END IF;
    
    -- 10. Mark deletion requests as completed
    UPDATE account_deletion_requests
    SET status = 'completed', completed_at = NOW()
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Completed % deletion_requests', v_count;
    
    -- 11. Delete auth user (last)
    DELETE FROM auth.users WHERE id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % auth.users (should be 1)', v_count;
    
    RAISE NOTICE 'Hard delete completed successfully for user %', p_user_id;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION execute_soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION execute_hard_delete_user TO authenticated;

-- Comments
COMMENT ON FUNCTION execute_soft_delete_user IS 'Soft delete with email-based generic user lookup and fallback to deletion';
COMMENT ON FUNCTION execute_hard_delete_user IS 'Hard delete with email-based generic user lookup and fallback to deletion';