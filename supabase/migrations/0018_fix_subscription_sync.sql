-- Fix subscription synchronization to also update stripe_customer_id and stripe_subscription_id in user_profiles
-- This ensures user_profiles always has the latest Stripe IDs for easy access

-- Drop the trigger first, then the function (to avoid dependency error)
DROP TRIGGER IF EXISTS trigger_sync_user_subscription_tier ON public.stripe_subscriptions;
DROP FUNCTION IF EXISTS sync_user_subscription_tier();

CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Déterminer le tier et les IDs Stripe basés sur les abonnements actifs
  WITH active_subscription AS (
    SELECT 
      user_id,
      CASE 
        WHEN COUNT(*) > 0 AND MAX(current_period_end) > NOW() THEN 'premium'
        ELSE 'free'
      END as tier,
      MAX(current_period_end) as end_date,
      -- Récupérer les IDs Stripe du dernier abonnement actif
      (SELECT stripe_customer_id FROM public.stripe_subscriptions 
       WHERE user_id = s.user_id AND status IN ('active', 'trialing')
       ORDER BY current_period_end DESC LIMIT 1) as customer_id,
      (SELECT stripe_subscription_id FROM public.stripe_subscriptions 
       WHERE user_id = s.user_id AND status IN ('active', 'trialing')
       ORDER BY current_period_end DESC LIMIT 1) as subscription_id
    FROM public.stripe_subscriptions s
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND status IN ('active', 'trialing')
    GROUP BY user_id
  )
  UPDATE public.user_profiles 
  SET 
    subscription_tier = COALESCE(active_subscription.tier, 'free'),
    subscription_end_date = active_subscription.end_date,
    stripe_customer_id = active_subscription.customer_id,
    stripe_subscription_id = active_subscription.subscription_id,
    updated_at = NOW()
  FROM active_subscription
  WHERE user_profiles.user_id = active_subscription.user_id;

  -- Si aucun abonnement actif, s'assurer que l'utilisateur est en free mais garde ses IDs Stripe
  INSERT INTO public.user_profiles (user_id, subscription_tier, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), 'free', NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_tier = CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM public.stripe_subscriptions 
        WHERE user_id = EXCLUDED.user_id 
          AND status IN ('active', 'trialing')
          AND current_period_end > NOW()
      ) THEN 'free'
      ELSE user_profiles.subscription_tier
    END,
    subscription_end_date = CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM public.stripe_subscriptions 
        WHERE user_id = EXCLUDED.user_id 
          AND status IN ('active', 'trialing')
          AND current_period_end > NOW()
      ) THEN NULL
      ELSE user_profiles.subscription_end_date
    END,
    -- Mettre à jour les IDs Stripe si on a un nouvel abonnement
    stripe_customer_id = CASE 
      WHEN NEW.stripe_customer_id IS NOT NULL THEN NEW.stripe_customer_id
      ELSE user_profiles.stripe_customer_id
    END,
    stripe_subscription_id = CASE 
      WHEN NEW.stripe_subscription_id IS NOT NULL AND NEW.status IN ('active', 'trialing') THEN NEW.stripe_subscription_id
      WHEN NOT EXISTS (
        SELECT 1 FROM public.stripe_subscriptions 
        WHERE user_id = EXCLUDED.user_id 
          AND status IN ('active', 'trialing')
          AND current_period_end > NOW()
      ) THEN NULL -- Clear subscription_id si plus d'abonnement actif
      ELSE user_profiles.stripe_subscription_id
    END,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_sync_user_subscription_tier
  AFTER INSERT OR UPDATE OR DELETE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

-- Update comment
COMMENT ON FUNCTION sync_user_subscription_tier IS 'Enhanced function to sync subscription_tier, dates, and Stripe IDs in user_profiles';