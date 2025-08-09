-- Migration pour créer le système d'abonnements Stripe dédié
-- Cette table centralise tous les abonnements Stripe et automatise les mises à jour

-- 1. Créer la table des abonnements Stripe
CREATE TABLE public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer des index pour optimiser les requêtes
CREATE INDEX idx_stripe_subscriptions_user_id ON public.stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subscriptions_customer_id ON public.stripe_subscriptions(stripe_customer_id);
CREATE INDEX idx_stripe_subscriptions_status ON public.stripe_subscriptions(status);
CREATE INDEX idx_stripe_subscriptions_current_period_end ON public.stripe_subscriptions(current_period_end);

-- 3. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_stripe_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_subscriptions_updated_at();

-- 4. Fonction pour synchroniser le subscription_tier dans user_profiles
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Déterminer le tier basé sur les abonnements actifs
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

  -- Si aucun abonnement actif, s'assurer que l'utilisateur est en free
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
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger pour synchroniser automatiquement user_profiles
CREATE TRIGGER trigger_sync_user_subscription_tier
  AFTER INSERT OR UPDATE OR DELETE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

-- 6. Fonction pour créer/mettre à jour un abonnement Stripe
CREATE OR REPLACE FUNCTION upsert_stripe_subscription(
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_stripe_price_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT false,
  p_canceled_at TIMESTAMPTZ DEFAULT NULL,
  p_trial_start TIMESTAMPTZ DEFAULT NULL,
  p_trial_end TIMESTAMPTZ DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  subscription_id UUID;
BEGIN
  INSERT INTO public.stripe_subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
    status, current_period_start, current_period_end, cancel_at_period_end,
    canceled_at, trial_start, trial_end, metadata
  )
  VALUES (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_stripe_price_id,
    p_status, p_current_period_start, p_current_period_end, p_cancel_at_period_end,
    p_canceled_at, p_trial_start, p_trial_end, p_metadata
  )
  ON CONFLICT (stripe_subscription_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    canceled_at = EXCLUDED.canceled_at,
    trial_start = EXCLUDED.trial_start,
    trial_end = EXCLUDED.trial_end,
    metadata = EXCLUDED.metadata,
    updated_at = NOW()
  RETURNING id INTO subscription_id;
  
  RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stripe_subscriptions TO service_role;
GRANT EXECUTE ON FUNCTION upsert_stripe_subscription TO service_role;

-- 8. RLS (Row Level Security) pour sécuriser la table
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politique pour les utilisateurs authentifiés (lecture seule de leurs propres abonnements)
CREATE POLICY "Users can view their own subscriptions" ON public.stripe_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Politique pour service_role (accès complet)
CREATE POLICY "Service role has full access" ON public.stripe_subscriptions
  FOR ALL TO service_role
  USING (true);

-- 9. Commentaires pour documentation
COMMENT ON TABLE public.stripe_subscriptions IS 'Table centralisée pour les abonnements Stripe avec synchronisation automatique des tiers utilisateur';
COMMENT ON FUNCTION upsert_stripe_subscription IS 'Fonction pour créer ou mettre à jour un abonnement Stripe depuis les webhooks';
COMMENT ON FUNCTION sync_user_subscription_tier IS 'Fonction trigger pour synchroniser automatiquement le subscription_tier dans user_profiles';