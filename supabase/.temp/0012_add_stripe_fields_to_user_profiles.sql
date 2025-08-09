-- Add Stripe integration fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN stripe_customer_id TEXT;

-- Add stripe_subscription_id for managing subscription lifecycle
ALTER TABLE user_profiles 
ADD COLUMN stripe_subscription_id TEXT;

-- Create indexes for better performance on Stripe lookups
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);

-- Add constraint to ensure stripe_customer_id is unique when not null
ALTER TABLE user_profiles 
ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);

-- Add constraint to ensure stripe_subscription_id is unique when not null
ALTER TABLE user_profiles 
ADD CONSTRAINT unique_stripe_subscription_id UNIQUE (stripe_subscription_id);

-- Comment the new columns
COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN user_profiles.stripe_subscription_id IS 'Stripe subscription ID for managing premium subscriptions';