-- ====================================================
-- MIGRATION 0040: Sync stripe_subscription_id to user_profiles
-- ====================================================

-- Description: Add missing trigger to sync stripe_subscription_id from stripe_subscriptions
-- to user_profiles.stripe_subscription_id when subscriptions are created/updated

-- 1. Create function to sync stripe subscription IDs to user_profiles
CREATE OR REPLACE FUNCTION public.sync_stripe_subscription_to_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- For INSERT and UPDATE operations
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Update user_profiles with the stripe_subscription_id and stripe_customer_id
        UPDATE public.user_profiles 
        SET 
            stripe_subscription_id = NEW.stripe_subscription_id,
            stripe_customer_id = NEW.stripe_customer_id,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
        
        -- Log the sync operation
        RAISE NOTICE 'Synced stripe IDs for user %: subscription_id=%, customer_id=%', 
            NEW.user_id, NEW.stripe_subscription_id, NEW.stripe_customer_id;
        
        RETURN NEW;
    END IF;
    
    -- For DELETE operations (when subscription is deleted)
    IF TG_OP = 'DELETE' THEN
        -- Clear the stripe_subscription_id but keep stripe_customer_id
        UPDATE public.user_profiles 
        SET 
            stripe_subscription_id = NULL,
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        
        RAISE NOTICE 'Cleared stripe_subscription_id for user %', OLD.user_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 2. Create trigger on stripe_subscriptions table
DROP TRIGGER IF EXISTS trigger_sync_stripe_subscription_to_user_profile ON public.stripe_subscriptions;

CREATE TRIGGER trigger_sync_stripe_subscription_to_user_profile
    AFTER INSERT OR UPDATE OR DELETE ON public.stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_stripe_subscription_to_user_profile();

-- 3. Sync existing data - Update all user_profiles with current stripe_subscriptions data
UPDATE public.user_profiles 
SET 
    stripe_subscription_id = ss.stripe_subscription_id,
    stripe_customer_id = ss.stripe_customer_id,
    updated_at = NOW()
FROM public.stripe_subscriptions ss
WHERE user_profiles.user_id = ss.user_id
  AND user_profiles.stripe_subscription_id IS DISTINCT FROM ss.stripe_subscription_id;

-- 4. Log the results
DO $$
DECLARE
    v_synced_count INTEGER;
BEGIN
    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    RAISE NOTICE 'Synced % existing user profiles with stripe subscription IDs', v_synced_count;
END $$;

-- 5. Add comments for documentation
COMMENT ON FUNCTION public.sync_stripe_subscription_to_user_profile() IS 
'Automatically syncs stripe_subscription_id and stripe_customer_id from stripe_subscriptions to user_profiles';

COMMENT ON TRIGGER trigger_sync_stripe_subscription_to_user_profile ON public.stripe_subscriptions IS 
'Keeps user_profiles.stripe_subscription_id in sync with stripe_subscriptions table';