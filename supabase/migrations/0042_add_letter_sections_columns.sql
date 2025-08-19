-- Migration: Add separate columns for letter sections
-- Date: 2025-01-19
-- Description: Add subject, greeting, and body columns to generated_letters table for better letter structure

-- Add new columns to generated_letters table
ALTER TABLE generated_letters 
ADD COLUMN subject TEXT,
ADD COLUMN greeting TEXT,
ADD COLUMN body TEXT;

-- Create index for better performance when searching by subject
CREATE INDEX idx_generated_letters_subject ON generated_letters(subject);

-- Update column comments
COMMENT ON COLUMN generated_letters.subject IS 'Letter subject/object line';
COMMENT ON COLUMN generated_letters.greeting IS 'Letter greeting/salutation';
COMMENT ON COLUMN generated_letters.body IS 'Main letter body content';
COMMENT ON COLUMN generated_letters.content IS 'Legacy full letter content - kept for backward compatibility';

-- Note: The content column is kept for backward compatibility
-- New letters will use the separated structure while old ones remain accessible