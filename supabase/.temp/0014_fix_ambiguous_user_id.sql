-- Fix ambiguous user_id reference in update_user_profile function
-- Drop the existing function first, then recreate with proper parameter names

DROP FUNCTION IF EXISTS public.update_user_profile(uuid,text,text,text,text,text,date,text,text,character varying,timestamp with time zone,text,text);

CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_subscription_tier VARCHAR(20) DEFAULT NULL,
  p_subscription_end_date TIMESTAMPTZ DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id, first_name, last_name, phone, country, language, 
    birth_date, avatar_url, bio, subscription_tier, subscription_end_date,
    stripe_customer_id, stripe_subscription_id, updated_at
  )
  VALUES (
    p_user_id, p_first_name, p_last_name, p_phone, p_country, p_language,
    p_birth_date, p_avatar_url, p_bio, 
    COALESCE(p_subscription_tier, 'free'), p_subscription_end_date,
    p_stripe_customer_id, p_stripe_subscription_id, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    country = COALESCE(EXCLUDED.country, user_profiles.country),
    language = COALESCE(EXCLUDED.language, user_profiles.language),
    birth_date = COALESCE(EXCLUDED.birth_date, user_profiles.birth_date),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
    subscription_tier = COALESCE(EXCLUDED.subscription_tier, user_profiles.subscription_tier),
    subscription_end_date = COALESCE(EXCLUDED.subscription_end_date, user_profiles.subscription_end_date),
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, user_profiles.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_profiles.stripe_subscription_id),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_profile TO service_role;

-- Comment
COMMENT ON FUNCTION public.update_user_profile IS 'Fixed function to update user profile without ambiguous column references';