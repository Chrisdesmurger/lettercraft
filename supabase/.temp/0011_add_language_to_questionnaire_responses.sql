-- Add language field to letter_questionnaire_responses table
-- This field will store the language selected by the user for letter generation (fr, en, es)

ALTER TABLE letter_questionnaire_responses ADD COLUMN language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'es'));

-- Update existing responses to have a default language
UPDATE letter_questionnaire_responses SET language = 'fr' WHERE language IS NULL;

-- Add index for better performance
CREATE INDEX idx_letter_questionnaire_responses_language ON letter_questionnaire_responses(language);

-- Update the comment
COMMENT ON COLUMN letter_questionnaire_responses.language IS 'Language selected by user for letter generation (fr, en, es)';