-- Fix foreign key constraint in candidates_profile table to reference user_profiles instead of users

-- Drop the existing foreign key constraint
ALTER TABLE candidates_profile DROP CONSTRAINT IF EXISTS candidates_profile_user_id_fkey;

-- Add the correct foreign key constraint to user_profiles.user_id
ALTER TABLE candidates_profile 
ADD CONSTRAINT candidates_profile_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;