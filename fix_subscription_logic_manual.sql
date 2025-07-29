-- Fix pour maintenir l'accès premium jusqu'à la fin de la période même après annulation
-- Le problème : la logique actuelle ne considère que les status 'active' et 'trialing'
-- Mais un abonnement annulé garde le status 'active' avec cancel_at_period_end=true

-- Étape 1: Supprimer le trigger existant
DROP TRIGGER IF EXISTS trigger_sync_user_subscription_tier ON public.stripe_subscriptions;

-- Étape 2: Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS sync_user_subscription_tier();

-- Étape 3: Créer la nouvelle fonction avec logique d'annulation corrigée
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Logique améliorée : un abonnement donne accès premium si :
  -- 1. Status est 'active' ou 'trialing' ET current_period_end > NOW()
  -- 2. OU Status est 'canceled' mais current_period_end > NOW() (période payée restante)
  WITH subscription_status AS (
    SELECT 
      user_id,
      CASE 
        WHEN COUNT(*) > 0 AND MAX(current_period_end) > NOW() THEN 'premium'
        ELSE 'free'
      END as tier,
      MAX(current_period_end) as end_date,
      -- Récupérer les IDs Stripe du dernier abonnement valide (même annulé)
      (SELECT stripe_customer_id FROM public.stripe_subscriptions 
       WHERE user_id = s.user_id 
         AND (
           (status IN ('active', 'trialing')) OR 
           (status = 'canceled' AND current_period_end > NOW())
         )
       ORDER BY current_period_end DESC LIMIT 1) as customer_id,
      (SELECT stripe_subscription_id FROM public.stripe_subscriptions 
       WHERE user_id = s.user_id 
         AND (
           (status IN ('active', 'trialing')) OR 
           (status = 'canceled' AND current_period_end > NOW())
         )
       ORDER BY current_period_end DESC LIMIT 1) as subscription_id
    FROM public.stripe_subscriptions s
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND (
        -- Abonnement actif normal
        (status IN ('active', 'trialing') AND current_period_end > NOW()) OR
        -- Abonnement annulé mais encore valide
        (status = 'canceled' AND current_period_end > NOW())
      )
    GROUP BY user_id
  )
  UPDATE public.user_profiles 
  SET 
    subscription_tier = COALESCE(subscription_status.tier, 'free'),
    subscription_end_date = subscription_status.end_date,
    stripe_customer_id = subscription_status.customer_id,
    stripe_subscription_id = subscription_status.subscription_id,
    updated_at = NOW()
  FROM subscription_status
  WHERE user_profiles.user_id = subscription_status.user_id;

  -- Gestion des utilisateurs sans abonnement valide
  INSERT INTO public.user_profiles (user_id, subscription_tier, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), 'free', NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_tier = CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM public.stripe_subscriptions 
        WHERE user_id = EXCLUDED.user_id 
          AND (
            (status IN ('active', 'trialing') AND current_period_end > NOW()) OR
            (status = 'canceled' AND current_period_end > NOW())
          )
      ) THEN 'free'
      ELSE user_profiles.subscription_tier
    END,
    subscription_end_date = CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM public.stripe_subscriptions 
        WHERE user_id = EXCLUDED.user_id 
          AND (
            (status IN ('active', 'trialing') AND current_period_end > NOW()) OR
            (status = 'canceled' AND current_period_end > NOW())
          )
      ) THEN NULL
      ELSE user_profiles.subscription_end_date
    END,
    -- Préserver les IDs Stripe même pour les abonnements annulés
    stripe_customer_id = CASE 
      WHEN NEW.stripe_customer_id IS NOT NULL THEN NEW.stripe_customer_id
      ELSE user_profiles.stripe_customer_id
    END,
    stripe_subscription_id = CASE 
      WHEN NEW.stripe_subscription_id IS NOT NULL THEN NEW.stripe_subscription_id
      WHEN NOT EXISTS (
        SELECT 1 FROM public.stripe_subscriptions 
        WHERE user_id = EXCLUDED.user_id 
          AND current_period_end > NOW() -- Même les annulés
      ) THEN NULL -- Clear seulement si vraiment expiré
      ELSE user_profiles.stripe_subscription_id
    END,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Étape 4: Recréer le trigger
CREATE TRIGGER trigger_sync_user_subscription_tier
  AFTER INSERT OR UPDATE OR DELETE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

-- Étape 5: Ajouter un commentaire
COMMENT ON FUNCTION sync_user_subscription_tier IS 'Enhanced function to sync subscription_tier including canceled subscriptions with remaining period';

-- Étape 6: Synchroniser manuellement tous les utilisateurs pour corriger l'état actuel
UPDATE public.user_profiles 
SET 
  subscription_tier = CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.stripe_subscriptions 
      WHERE user_id = user_profiles.user_id 
        AND (
          (status IN ('active', 'trialing') AND current_period_end > NOW()) OR
          (status = 'canceled' AND current_period_end > NOW())
        )
    ) THEN 'premium'
    ELSE 'free'
  END,
  subscription_end_date = (
    SELECT MAX(current_period_end) 
    FROM public.stripe_subscriptions 
    WHERE user_id = user_profiles.user_id 
      AND (
        (status IN ('active', 'trialing') AND current_period_end > NOW()) OR
        (status = 'canceled' AND current_period_end > NOW())
      )
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.stripe_subscriptions 
  WHERE user_id = user_profiles.user_id
);

-- Confirmation avec statistiques
SELECT 
  'Fix completed!' as status,
  COUNT(*) as total_users,
  SUM(CASE WHEN subscription_tier = 'premium' THEN 1 ELSE 0 END) as premium_users,
  SUM(CASE WHEN subscription_tier = 'free' THEN 1 ELSE 0 END) as free_users
FROM public.user_profiles;