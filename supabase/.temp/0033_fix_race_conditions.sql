-- Fix race conditions in subscription synchronization
-- Adds delay mechanism and centralizes logic

-- ===========================================
-- PART 1: CREATE SYNC LOCK TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.subscription_sync_locks (
    user_id UUID PRIMARY KEY,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_by TEXT DEFAULT 'sync_trigger'
);

CREATE INDEX IF NOT EXISTS idx_subscription_sync_locks_locked_at ON public.subscription_sync_locks(locked_at);

-- ===========================================
-- PART 2: CENTRALIZED SYNC FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION centralized_subscription_sync(
    p_user_id UUID,
    p_source TEXT DEFAULT 'unknown'
) RETURNS BOOLEAN AS $$
DECLARE
    lock_exists BOOLEAN;
    lock_age INTERVAL;
    has_valid_subscription BOOLEAN;
    current_tier TEXT;
    new_tier TEXT;
    end_date TIMESTAMPTZ;
    customer_id TEXT;
    subscription_id TEXT;
BEGIN
    -- Check if there's a recent lock (prevent race conditions)
    SELECT 
        EXISTS(SELECT 1 FROM subscription_sync_locks WHERE user_id = p_user_id),
        COALESCE(NOW() - MAX(locked_at), INTERVAL '0 seconds')
    INTO lock_exists, lock_age
    FROM subscription_sync_locks 
    WHERE user_id = p_user_id;
    
    -- If locked less than 2 seconds ago, skip to prevent race
    IF lock_exists AND lock_age < INTERVAL '2 seconds' THEN
        RAISE NOTICE '🔒 [SYNC SKIP] User % locked %.2f seconds ago by %', 
                     p_user_id, EXTRACT(EPOCH FROM lock_age), p_source;
        RETURN FALSE;
    END IF;
    
    -- Create/update lock
    INSERT INTO subscription_sync_locks (user_id, locked_by)
    VALUES (p_user_id, p_source)
    ON CONFLICT (user_id) DO UPDATE SET
        locked_at = NOW(),
        locked_by = p_source;
    
    RAISE NOTICE '🔄 [SYNC START] User % sync initiated by %', p_user_id, p_source;
    
    -- Get current tier and subscription end date from user_profiles
    SELECT subscription_tier, subscription_end_date 
    INTO current_tier, end_date
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    -- Check for valid subscriptions (including cancel_at_period_end until end date)
    SELECT EXISTS (
        SELECT 1 FROM stripe_subscriptions s
        LEFT JOIN user_profiles up ON s.user_id = up.user_id
        WHERE s.user_id = p_user_id 
          AND s.status IN ('active', 'trialing', 'incomplete')
          AND (
            -- Not cancelled OR cancelled but still in valid period based on user_profiles.subscription_end_date
            (s.cancel_at_period_end = false AND COALESCE(up.subscription_end_date, s.current_period_end) > NOW()) OR
            (s.cancel_at_period_end = true AND COALESCE(up.subscription_end_date, s.current_period_end) > NOW()) OR
            s.current_period_end IS NULL
          )
    ) INTO has_valid_subscription;
    
    -- Determine new tier
    new_tier := CASE WHEN has_valid_subscription THEN 'premium' ELSE 'free' END;
    
    -- Get additional subscription details if premium (end_date already fetched above)
    IF has_valid_subscription THEN
        SELECT 
            MAX(stripe_customer_id),
            MAX(stripe_subscription_id)
        INTO customer_id, subscription_id
        FROM stripe_subscriptions 
        WHERE user_id = p_user_id 
          AND status IN ('active', 'trialing', 'incomplete');
          
        -- If end_date is null from user_profiles, fallback to stripe data
        IF end_date IS NULL THEN
            SELECT MAX(current_period_end)
            INTO end_date
            FROM stripe_subscriptions 
            WHERE user_id = p_user_id 
              AND status IN ('active', 'trialing', 'incomplete');
        END IF;
    END IF;
    
    -- Log the decision
    RAISE NOTICE '🎯 [SYNC DECISION] User %: % -> % (Source: %)', 
                 p_user_id, 
                 COALESCE(current_tier, 'NULL'),
                 new_tier,
                 p_source;
    
    -- Apply sync only if tier changed
    IF current_tier IS DISTINCT FROM new_tier THEN
        INSERT INTO public.user_profiles (
            user_id, 
            subscription_tier, 
            subscription_end_date,
            stripe_customer_id,
            stripe_subscription_id,
            updated_at
        )
        VALUES (
            p_user_id,
            new_tier,
            end_date,
            customer_id,
            subscription_id,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            subscription_tier = new_tier,
            subscription_end_date = end_date,
            stripe_customer_id = COALESCE(customer_id, user_profiles.stripe_customer_id),
            stripe_subscription_id = COALESCE(subscription_id, user_profiles.stripe_subscription_id),
            updated_at = NOW();
        
        RAISE NOTICE '✅ [SYNC APPLIED] User % updated: % -> %', p_user_id, current_tier, new_tier;
    ELSE
        RAISE NOTICE '⏭️ [SYNC SKIPPED] User % tier unchanged: %', p_user_id, current_tier;
    END IF;
    
    -- Clean up old locks (older than 1 minute)
    DELETE FROM subscription_sync_locks 
    WHERE locked_at < NOW() - INTERVAL '1 minute';
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PART 3: REPLACE EXISTING TRIGGER FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Call centralized sync with delay protection
    PERFORM centralized_subscription_sync(
        target_user_id, 
        'stripe_subscription_trigger'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PART 4: CREATE MANUAL SYNC FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION manual_subscription_sync(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    sync_result BOOLEAN;
BEGIN
    sync_result := centralized_subscription_sync(p_user_id, 'manual_call');
    
    RETURN CASE 
        WHEN sync_result THEN 'Sync completed successfully'
        ELSE 'Sync skipped (recent lock found)'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PART 5: PERMISSIONS
-- ===========================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_sync_locks TO service_role;
GRANT EXECUTE ON FUNCTION centralized_subscription_sync(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION manual_subscription_sync(UUID) TO service_role;

-- Enable RLS
ALTER TABLE public.subscription_sync_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access only" ON public.subscription_sync_locks
  FOR ALL TO service_role
  USING (true);

-- ===========================================
-- PART 6: COMMENTS
-- ===========================================

COMMENT ON FUNCTION centralized_subscription_sync IS 'v2.0: Centralized sync with race condition protection';
COMMENT ON FUNCTION manual_subscription_sync IS 'v2.0: Manual sync function for debugging/maintenance';
COMMENT ON TABLE subscription_sync_locks IS 'Prevents race conditions in subscription sync';

-- ===========================================
-- PART 7: IMMEDIATE TEST
-- ===========================================

DO $$
DECLARE
    test_user_id UUID;
    result TEXT;
BEGIN
    -- Test with a real user if exists
    SELECT user_id INTO test_user_id 
    FROM stripe_subscriptions 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE '=== TESTING RACE CONDITION FIX ===';
        RAISE NOTICE 'Testing with user: %', test_user_id;
        
        -- Test manual sync
        SELECT manual_subscription_sync(test_user_id) INTO result;
        RAISE NOTICE 'Manual sync result: %', result;
        
        -- Test immediate second call (should be blocked)
        SELECT manual_subscription_sync(test_user_id) INTO result;
        RAISE NOTICE 'Second sync result: %', result;
        
        RAISE NOTICE '=== RACE CONDITION FIX TESTED ===';
    ELSE
        RAISE NOTICE 'No active subscriptions found for testing';
    END IF;
END $$;