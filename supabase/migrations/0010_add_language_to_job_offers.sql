-- Add language field to job_offers table
-- This field will store the detected language of the job offer (fr, en, es, de, it)

ALTER TABLE job_offers ADD COLUMN language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'es', 'de', 'it'));

-- Update existing job offers to have a default language
UPDATE job_offers SET language = 'fr' WHERE language IS NULL;

-- Add index for better performance
CREATE INDEX idx_job_offers_language ON job_offers(language);

-- Update the comment
COMMENT ON COLUMN job_offers.language IS 'Detected language of the job offer (fr, en, es, de, it)';