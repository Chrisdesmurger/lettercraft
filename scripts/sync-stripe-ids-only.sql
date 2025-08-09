-- Script de synchronisation uniquement (sans modification de contraintes)
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. Vérifier l'état actuel
SELECT 
    'BEFORE SYNC' as status,
    COUNT(*) as total_users,
    COUNT(stripe_subscription_id) as users_with_stripe_sub_id,
    COUNT(stripe_customer_id) as users_with_stripe_customer_id
FROM user_profiles;

-- 2. Synchroniser les stripe_subscription_id manquants
-- Prendre l'abonnement le plus récent/actif pour chaque utilisateur
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
        WHEN status = 'past_due' THEN 3
        ELSE 4
      END,
      created_at DESC 
    LIMIT 1
  );

-- 3. Vérifier le résultat
SELECT 
    'AFTER SYNC' as status,
    COUNT(*) as total_users,
    COUNT(stripe_subscription_id) as users_with_stripe_sub_id,
    COUNT(stripe_customer_id) as users_with_stripe_customer_id
FROM user_profiles;

-- 4. Afficher les utilisateurs maintenant synchronisés
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.subscription_tier,
    up.stripe_subscription_id,
    ss.status as subscription_status,
    ss.current_period_end
FROM user_profiles up
INNER JOIN stripe_subscriptions ss ON up.stripe_subscription_id = ss.stripe_subscription_id
WHERE up.stripe_subscription_id IS NOT NULL
ORDER BY ss.current_period_end DESC;