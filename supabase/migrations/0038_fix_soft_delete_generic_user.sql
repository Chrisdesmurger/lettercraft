-- ====================================================
-- MIGRATION 0038: Fix Soft Delete Generic User Issue
-- ====================================================

-- 1. Ensure generic user exists or handle gracefully
DO $$
DECLARE
    v_user_exists BOOLEAN;
BEGIN
    -- Check if generic user exists
    SELECT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = '00000000-0000-0000-0000-000000000001'
    ) INTO v_user_exists;
    
    -- Create generic user if it doesn't exist
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

-- 2. Create generic user profile if it doesn't exist
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

-- 3. Create improved soft delete function with better error handling
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
    v_generic_user_exists BOOLEAN;
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
    
    -- Check if generic user exists
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE id = v_deleted_user_id
    ) INTO v_generic_user_exists;
    
    IF NOT v_generic_user_exists THEN
        RAISE NOTICE 'Generic user does not exist, creating it...';
        
        -- Create generic user inline
        BEGIN
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_deleted_user_id,
                'authenticated',
                'authenticated',
                'deleted-user@system.local',
                '$2a$10$placeholder.hash.for.system.user',
                NOW(),
                '{"provider": "email", "providers": ["email"]}'::jsonb,
                '{"system_user": true, "purpose": "deleted_accounts_placeholder"}'::jsonb,
                NOW(),
                NOW()
            );
            
            -- Create profile for generic user
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
            
            RAISE NOTICE 'Generic user created successfully';
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Could not create generic user: % (will proceed without Stripe data transfer)', SQLERRM;
                v_deleted_user_id := NULL; -- Disable Stripe data transfer
        END;
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
            'deletion_type', 'soft'
        ),
        jsonb_build_object(
            'anonymized_suffix', v_anonymous_suffix
        )
    );
    
    -- Transfer Stripe data only if generic user exists
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
                    RAISE WARNING 'Could not transfer stripe_subscriptions: %', SQLERRM;
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
                    RAISE WARNING 'Could not transfer stripe_invoices: %', SQLERRM;
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

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION execute_soft_delete_user TO authenticated;

-- 5. Comment
COMMENT ON FUNCTION execute_soft_delete_user IS 'Soft delete with improved error handling for missing generic user';