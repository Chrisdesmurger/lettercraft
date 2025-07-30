-- Version simple et bulletproof du trigger de synchronisation
-- Gère correctement cancel_at_period_end avec subscription_end_date

CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    should_be_premium BOOLEAN;
    current_subscription_end_date TIMESTAMPTZ;
BEGIN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
    
    -- Récupérer la date d'expiration actuelle de user_profiles
    SELECT subscription_end_date INTO current_subscription_end_date
    FROM user_profiles 
    WHERE user_id = target_user_id;
    
    -- Logique simple : abonnement valide jusqu'à la date d'expiration
    SELECT EXISTS (
        SELECT 1 FROM stripe_subscriptions s
        LEFT JOIN user_profiles up ON s.user_id = up.user_id
        WHERE s.user_id = target_user_id 
          AND s.status IN ('active', 'trialing')
          AND (
            -- Utiliser subscription_end_date de user_profiles si disponible, sinon current_period_end
            COALESCE(up.subscription_end_date, s.current_period_end) > NOW()
          )
    ) INTO should_be_premium;
    
    RAISE NOTICE '🔄 [SIMPLE SYNC] User %: should_be_premium = %, end_date = %', 
                 target_user_id, should_be_premium, current_subscription_end_date;
    
    -- Mise à jour simple sans touching subscription_end_date (laisse les webhooks la gérer)
    UPDATE user_profiles 
    SET subscription_tier = CASE WHEN should_be_premium THEN 'premium' ELSE 'free' END,
        updated_at = NOW()
    WHERE user_id = target_user_id;
    
    RAISE NOTICE '✅ [SIMPLE SYNC] User % tier updated to: %', 
                 target_user_id, 
                 CASE WHEN should_be_premium THEN 'premium' ELSE 'free' END;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remplacer le trigger existant
DROP TRIGGER IF EXISTS trigger_sync_user_subscription_tier ON public.stripe_subscriptions;

CREATE TRIGGER trigger_sync_user_subscription_tier
    AFTER INSERT OR UPDATE OR DELETE ON public.stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_subscription_tier();

-- Permissions
GRANT EXECUTE ON FUNCTION sync_user_subscription_tier() TO service_role;

-- Test de la fonction
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    RAISE NOTICE '=== TESTING SIMPLE SYNC WITH CANCELLATION LOGIC ===';
    
    -- Tester avec un utilisateur qui a un abonnement
    SELECT user_id INTO test_user_id 
    FROM stripe_subscriptions 
    WHERE status = 'active' 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user: %', test_user_id;
        
        -- Déclencher le trigger en forçant un update
        UPDATE stripe_subscriptions 
        SET updated_at = NOW() 
        WHERE user_id = test_user_id 
        AND id = (
            SELECT id FROM stripe_subscriptions 
            WHERE user_id = test_user_id 
            ORDER BY created_at DESC 
            LIMIT 1
        );
        
        RAISE NOTICE '=== TEST COMPLETED ===';
    ELSE
        RAISE NOTICE 'No active subscriptions found for testing';
    END IF;
END $$;

COMMENT ON FUNCTION sync_user_subscription_tier IS 'v3.0: Simple sync respecting user_profiles.subscription_end_date for cancellations';