-- Add subscription_tier column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium'));

-- Add subscription_end_date column for premium users
ALTER TABLE user_profiles 
ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Update existing users to have 'free' subscription by default
UPDATE user_profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL;