-- SCRIPT DE RÉCUPÉRATION URGENT
-- Restaurer immédiatement tous les abonnements premium qui ont été incorrectement passés en free

-- Étape 1: RESTAURER IMMÉDIATEMENT tous les comptes premium basés sur stripe_subscriptions
UPDATE public.user_profiles 
SET 
  subscription_tier = 'premium',
  subscription_end_date = s.current_period_end,
  updated_at = NOW()
FROM public.stripe_subscriptions s
WHERE user_profiles.user_id = s.user_id
  AND s.status IN ('active', 'trialing', 'canceled')  -- Inclure TOUS les status
  AND s.current_period_end > NOW()  -- Période encore valide
  AND user_profiles.subscription_tier = 'free';  -- Seulement ceux passés incorrectement en free

-- Étape 2: Vérification - Afficher les comptes restaurés
SELECT 
  'RESTORATION COMPLETED' as status,
  COUNT(*) as accounts_restored
FROM public.user_profiles up
JOIN public.stripe_subscriptions s ON up.user_id = s.user_id
WHERE s.current_period_end > NOW()
  AND up.subscription_tier = 'premium';

-- Étape 3: Lister tous les abonnements actifs pour vérification
SELECT 
  up.user_id,
  up.subscription_tier,
  up.subscription_end_date,
  s.status as stripe_status,
  s.current_period_end,
  s.cancel_at_period_end,
  CASE 
    WHEN s.current_period_end > NOW() THEN 'SHOULD_BE_PREMIUM'
    ELSE 'SHOULD_BE_FREE'
  END as correct_status
FROM public.user_profiles up
JOIN public.stripe_subscriptions s ON up.user_id = s.user_id
ORDER BY s.current_period_end DESC;

-- Étape 4: Stats finales
SELECT 
  subscription_tier,
  COUNT(*) as count
FROM public.user_profiles
GROUP BY subscription_tier;