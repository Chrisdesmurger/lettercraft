-- Solution rapide: Modifier la contrainte unique pour permettre les doublons
-- Un client Stripe peut avoir plusieurs abonnements (actuel + historique)

-- 1. Supprimer la contrainte unique sur stripe_customer_id
ALTER TABLE stripe_subscriptions 
DROP CONSTRAINT IF EXISTS unique_stripe_customer_id;

-- 2. Ajouter une contrainte unique sur stripe_subscription_id (qui doit être unique)
ALTER TABLE stripe_subscriptions 
ADD CONSTRAINT unique_stripe_subscription_id 
UNIQUE (stripe_subscription_id);

-- 3. Maintenant synchroniser les IDs sans problème de doublons
UPDATE user_profiles 
SET 
    stripe_subscription_id = ss.stripe_subscription_id,
    stripe_customer_id = ss.stripe_customer_id,
    updated_at = NOW()
FROM stripe_subscriptions ss
WHERE user_profiles.user_id = ss.user_id
  AND user_profiles.stripe_subscription_id IS DISTINCT FROM ss.stripe_subscription_id
  -- Prendre l'abonnement le plus récent en cas de multiples abonnements
  AND ss.stripe_subscription_id = (
    SELECT stripe_subscription_id 
    FROM stripe_subscriptions ss2 
    WHERE ss2.user_id = ss.user_id 
    ORDER BY 
      CASE 
        WHEN status = 'active' THEN 1
        WHEN status = 'trialing' THEN 2
        ELSE 3
      END,
      created_at DESC 
    LIMIT 1
  );

-- 4. Vérification
SELECT 
    'SYNC RESULT' as status,
    COUNT(*) as total_users,
    COUNT(stripe_subscription_id) as users_with_stripe_sub_id,
    COUNT(stripe_customer_id) as users_with_stripe_customer_id
FROM user_profiles;