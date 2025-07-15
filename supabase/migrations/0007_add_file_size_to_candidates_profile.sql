-- Add file_size and is_active columns to candidates_profile table
ALTER TABLE candidates_profile 
ADD COLUMN file_size BIGINT DEFAULT NULL,
ADD COLUMN is_active BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN candidates_profile.file_size IS 'File size in bytes';
COMMENT ON COLUMN candidates_profile.is_active IS 'Whether this CV is the active/default one for the user';

-- Create index for better performance when querying user CVs
CREATE INDEX IF NOT EXISTS idx_candidates_profile_user_id_uploaded_at 
ON candidates_profile(user_id, uploaded_at DESC);

-- Create unique constraint to ensure only one active CV per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_profile_user_active 
ON candidates_profile(user_id) WHERE is_active = true;