-- Script de correction manuelle pour synchroniser les stripe_subscription_id
-- À exécuter directement dans Supabase Dashboard > SQL Editor

-- 1. Vérifier l'état actuel
SELECT 
    'BEFORE SYNC' as status,
    COUNT(*) as total_users,
    COUNT(stripe_subscription_id) as users_with_stripe_sub_id,
    COUNT(stripe_customer_id) as users_with_stripe_customer_id
FROM user_profiles;

-- 2. Montrer les utilisateurs avec des abonnements mais sans stripe_subscription_id dans user_profiles
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.subscription_tier,
    up.stripe_subscription_id as profile_sub_id,
    ss.stripe_subscription_id as subscription_table_sub_id,
    ss.status
FROM user_profiles up
LEFT JOIN stripe_subscriptions ss ON up.user_id = ss.user_id
WHERE ss.stripe_subscription_id IS NOT NULL 
  AND up.stripe_subscription_id IS NULL;

-- 3. Synchronisation manuelle
UPDATE user_profiles 
SET 
    stripe_subscription_id = ss.stripe_subscription_id,
    stripe_customer_id = ss.stripe_customer_id,
    updated_at = NOW()
FROM stripe_subscriptions ss
WHERE user_profiles.user_id = ss.user_id
  AND user_profiles.stripe_subscription_id IS DISTINCT FROM ss.stripe_subscription_id;

-- 4. Vérifier le résultat
SELECT 
    'AFTER SYNC' as status,
    COUNT(*) as total_users,
    COUNT(stripe_subscription_id) as users_with_stripe_sub_id,
    COUNT(stripe_customer_id) as users_with_stripe_customer_id
FROM user_profiles;

-- 5. Afficher les utilisateurs maintenant synchronisés
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.subscription_tier,
    up.stripe_subscription_id,
    ss.status,
    ss.current_period_end
FROM user_profiles up
INNER JOIN stripe_subscriptions ss ON up.user_id = ss.user_id
WHERE up.stripe_subscription_id IS NOT NULL
ORDER BY ss.current_period_end DESC;