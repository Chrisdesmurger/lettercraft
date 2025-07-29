-- VERSION SIMPLE ET SÛRE DU TRIGGER
-- Ne touche PAS aux comptes existants, corrige seulement la logique future

-- Supprimer le trigger défaillant
DROP TRIGGER IF EXISTS trigger_sync_user_subscription_tier ON public.stripe_subscriptions;
DROP FUNCTION IF EXISTS sync_user_subscription_tier();

-- Créer une version SIMPLE et SÛRE
CREATE OR REPLACE FUNCTION sync_user_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- LOGIQUE SIMPLE : Si on a un abonnement avec une période valide, c'est premium
  -- Sinon, on ne change RIEN (pour éviter les erreurs)
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Seulement pour les nouveaux abonnements ou mises à jour
    IF NEW.current_period_end > NOW() AND NEW.status IN ('active', 'trialing', 'canceled') THEN
      -- Mettre à jour vers premium seulement si période valide
      UPDATE public.user_profiles 
      SET 
        subscription_tier = 'premium',
        subscription_end_date = NEW.current_period_end,
        stripe_customer_id = NEW.stripe_customer_id,
        stripe_subscription_id = NEW.stripe_subscription_id,
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  -- NE PAS TOUCHER aux comptes en cas de DELETE ou d'expiration
  -- Laisser un job séparé gérer l'expiration
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
CREATE TRIGGER trigger_sync_user_subscription_tier
  AFTER INSERT OR UPDATE ON public.stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_subscription_tier();

-- Note: Ce trigger NE gère plus les DELETE pour éviter les problèmes
-- Un job cron séparé devrait gérer l'expiration des abonnements

COMMENT ON FUNCTION sync_user_subscription_tier IS 'Safe version - only promotes to premium, never demotes';

SELECT 'Safe trigger installed - no accounts modified' as result;