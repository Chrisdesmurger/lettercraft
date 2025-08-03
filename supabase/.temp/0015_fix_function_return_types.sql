-- Fix return types for webhook functions to match actual database column types

-- 1. Fix get_user_by_stripe_customer_id function
CREATE OR REPLACE FUNCTION public.get_user_by_stripe_customer_id(customer_id TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  subscription_tier TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uwp.id,
    uwp.email,
    COALESCE(uwp.first_name, '') as first_name,
    COALESCE(uwp.last_name, '') as last_name,
    COALESCE(uwp.subscription_tier::TEXT, 'free') as subscription_tier,
    COALESCE(uwp.stripe_customer_id, '') as stripe_customer_id,
    COALESCE(uwp.stripe_subscription_id, '') as stripe_subscription_id
  FROM public.users_with_profiles uwp
  WHERE uwp.stripe_customer_id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix get_user_by_email function  
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE(
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  subscription_tier TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uwp.id,
    uwp.email,
    COALESCE(uwp.first_name, '') as first_name,
    COALESCE(uwp.last_name, '') as last_name,
    COALESCE(uwp.subscription_tier::TEXT, 'free') as subscription_tier,
    COALESCE(uwp.stripe_customer_id, '') as stripe_customer_id,
    COALESCE(uwp.stripe_subscription_id, '') as stripe_subscription_id
  FROM public.users_with_profiles uwp
  WHERE uwp.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_by_stripe_customer_id TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_by_email TO service_role;

-- Comments
COMMENT ON FUNCTION public.get_user_by_stripe_customer_id IS 'Fixed function to get user by Stripe customer ID with correct return types';
COMMENT ON FUNCTION public.get_user_by_email IS 'Fixed function to get user by email with correct return types';