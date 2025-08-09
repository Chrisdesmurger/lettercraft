-- Script pour résoudre les doublons de stripe_customer_id
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. DIAGNOSTIC - Identifier les doublons
SELECT 
    stripe_customer_id,
    COUNT(*) as subscription_count,
    array_agg(stripe_subscription_id ORDER BY created_at DESC) as subscription_ids,
    array_agg(status ORDER BY created_at DESC) as statuses,
    array_agg(current_period_end ORDER BY created_at DESC) as end_dates
FROM stripe_subscriptions 
GROUP BY stripe_customer_id 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. DIAGNOSTIC - Vérifier les utilisateurs affectés
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.email,
    up.stripe_customer_id as profile_customer_id,
    COUNT(ss.*) as subscription_count,
    array_agg(ss.stripe_subscription_id ORDER BY ss.created_at DESC) as all_subscription_ids,
    array_agg(ss.status ORDER BY ss.created_at DESC) as all_statuses
FROM user_profiles up
LEFT JOIN stripe_subscriptions ss ON up.user_id = ss.user_id
WHERE up.stripe_customer_id IN (
    SELECT stripe_customer_id 
    FROM stripe_subscriptions 
    GROUP BY stripe_customer_id 
    HAVING COUNT(*) > 1
)
GROUP BY up.user_id, up.first_name, up.last_name, up.email, up.stripe_customer_id
ORDER BY subscription_count DESC;

-- 3. SOLUTION OPTION A - Garder seulement l'abonnement le plus récent actif
-- Cette requête identifie les abonnements à garder (le plus récent par customer)
WITH ranked_subscriptions AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (
            PARTITION BY stripe_customer_id 
            ORDER BY 
                CASE 
                    WHEN status = 'active' THEN 1
                    WHEN status = 'trialing' THEN 2  
                    WHEN status = 'past_due' THEN 3
                    ELSE 4
                END,
                created_at DESC
        ) as rn
    FROM stripe_subscriptions
),
subscriptions_to_delete AS (
    SELECT stripe_subscription_id
    FROM ranked_subscriptions 
    WHERE rn > 1
)
SELECT 
    'SUBSCRIPTIONS TO DELETE' as action,
    COUNT(*) as count
FROM subscriptions_to_delete;

-- 4. SOLUTION OPTION B - Supprimer la contrainte unique (si c'est acceptable d'avoir plusieurs abonnements par customer)
-- ALTER TABLE stripe_subscriptions DROP CONSTRAINT IF EXISTS unique_stripe_customer_id;

-- 5. NETTOYAGE - Supprimer les anciens abonnements (DÉCOMMENTEZ SI VOUS VOULEZ APPLIQUER)
/*
WITH ranked_subscriptions AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (
            PARTITION BY stripe_customer_id 
            ORDER BY 
                CASE 
                    WHEN status = 'active' THEN 1
                    WHEN status = 'trialing' THEN 2  
                    WHEN status = 'past_due' THEN 3
                    ELSE 4
                END,
                created_at DESC
        ) as rn
    FROM stripe_subscriptions
)
DELETE FROM stripe_subscriptions 
WHERE stripe_subscription_id IN (
    SELECT stripe_subscription_id 
    FROM ranked_subscriptions 
    WHERE rn > 1
);
*/

-- 6. VÉRIFICATION FINALE
SELECT 
    'AFTER CLEANUP' as status,
    COUNT(DISTINCT stripe_customer_id) as unique_customers,
    COUNT(*) as total_subscriptions,
    COUNT(*) - COUNT(DISTINCT stripe_customer_id) as remaining_duplicates
FROM stripe_subscriptions;