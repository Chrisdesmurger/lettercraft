-- LetterCraft Database Schema
-- PostgreSQL with Supabase Extensions

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

-- UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USER PROFILES TABLE
-- =============================================================================

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country TEXT,
  language TEXT DEFAULT 'fr',
  birth_date DATE,
  avatar_url TEXT,
  bio TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- CANDIDATES PROFILE TABLE (CV Data)
-- =============================================================================

CREATE TABLE candidates_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  description TEXT,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name TEXT,
  last_name TEXT,
  experiences TEXT[],
  skills TEXT[],
  education TEXT[],
  file_size INTEGER,
  is_active BOOLEAN DEFAULT FALSE
);

-- =============================================================================
-- JOB OFFERS TABLE
-- =============================================================================

CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[],
  location TEXT,
  salary_range TEXT,
  employment_type TEXT,
  source_url TEXT,
  extracted_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- LETTER QUESTIONNAIRE RESPONSES TABLE
-- =============================================================================

CREATE TABLE letter_questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_offer_id UUID REFERENCES job_offers(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES candidates_profile(id) ON DELETE CASCADE,
  motivation TEXT NOT NULL,
  experience_highlight JSONB,
  skills_match TEXT[],
  company_values TEXT,
  additional_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- GENERATED LETTERS TABLE
-- =============================================================================

CREATE TABLE generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  questionnaire_response_id TEXT, -- Temporary field for compatibility
  job_offer_id TEXT, -- Temporary field for compatibility
  cv_id TEXT, -- Temporary field for compatibility
  content TEXT NOT NULL,
  html_content TEXT,
  pdf_url TEXT,
  generation_settings JSONB,
  openai_model TEXT DEFAULT 'gpt-4',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- USER QUOTAS TABLE
-- =============================================================================

CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  letters_generated INTEGER DEFAULT 0,
  max_letters INTEGER DEFAULT 5,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =============================================================================
-- ONBOARDING RESPONSES TABLE
-- =============================================================================

CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question_id TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SAVED LETTERS TABLE
-- =============================================================================

CREATE TABLE saved_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'fr',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- REFERENCE TABLES
-- =============================================================================

-- Countries reference table
CREATE TABLE countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Languages reference table
CREATE TABLE languages (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  flag TEXT NOT NULL
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User profiles indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_subscription ON user_profiles(subscription_tier);
CREATE INDEX idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_stripe_subscription ON user_profiles(stripe_subscription_id);

-- Candidates profile indexes
CREATE INDEX idx_candidates_profile_user_id ON candidates_profile(user_id);
CREATE INDEX idx_candidates_profile_active ON candidates_profile(is_active);

-- Job offers indexes
CREATE INDEX idx_job_offers_user_id ON job_offers(user_id);
CREATE INDEX idx_job_offers_created_at ON job_offers(created_at DESC);

-- Generated letters indexes
CREATE INDEX idx_generated_letters_user_id ON generated_letters(user_id);
CREATE INDEX idx_generated_letters_created_at ON generated_letters(created_at DESC);

-- User quotas indexes
CREATE INDEX idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX idx_user_quotas_reset_date ON user_quotas(reset_date);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_letters ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Candidates profile policies
CREATE POLICY "Users can view own CV" ON candidates_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CV" ON candidates_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CV" ON candidates_profile
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own CV" ON candidates_profile
  FOR DELETE USING (auth.uid() = user_id);

-- Job offers policies
CREATE POLICY "Users can view own job offers" ON job_offers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own job offers" ON job_offers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job offers" ON job_offers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job offers" ON job_offers
  FOR DELETE USING (auth.uid() = user_id);

-- Letter questionnaire responses policies
CREATE POLICY "Users can view own questionnaire responses" ON letter_questionnaire_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own questionnaire responses" ON letter_questionnaire_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questionnaire responses" ON letter_questionnaire_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Generated letters policies
CREATE POLICY "Users can view own generated letters" ON generated_letters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated letters" ON generated_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated letters" ON generated_letters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated letters" ON generated_letters
  FOR DELETE USING (auth.uid() = user_id);

-- User quotas policies
CREATE POLICY "Users can view own quotas" ON user_quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotas" ON user_quotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotas" ON user_quotas
  FOR UPDATE USING (auth.uid() = user_id);

-- Onboarding responses policies
CREATE POLICY "Users can view own onboarding responses" ON onboarding_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding responses" ON onboarding_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding responses" ON onboarding_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Saved letters policies
CREATE POLICY "Users can view own saved letters" ON saved_letters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved letters" ON saved_letters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved letters" ON saved_letters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved letters" ON saved_letters
  FOR DELETE USING (auth.uid() = user_id);

-- Reference tables (public read access)
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Countries are viewable by everyone" ON countries
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Languages are viewable by everyone" ON languages
  FOR SELECT TO authenticated, anon USING (true);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at column
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_offers_updated_at BEFORE UPDATE ON job_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_letter_questionnaire_responses_updated_at BEFORE UPDATE ON letter_questionnaire_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_letters_updated_at BEFORE UPDATE ON generated_letters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_quotas_updated_at BEFORE UPDATE ON user_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_responses_updated_at BEFORE UPDATE ON onboarding_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_letters_updated_at BEFORE UPDATE ON saved_letters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert common languages
INSERT INTO languages (code, label, flag) VALUES
('fr', 'Français', '🇫🇷'),
('en', 'English', '🇬🇧'),
('es', 'Español', '🇪🇸'),
('de', 'Deutsch', '🇩🇪'),
('it', 'Italiano', '🇮🇹'),
('pt', 'Português', '🇵🇹'),
('nl', 'Nederlands', '🇳🇱'),
('ru', 'Русский', '🇷🇺'),
('zh', '中文', '🇨🇳'),
('ja', '日本語', '🇯🇵'),
('ko', '한국어', '🇰🇷'),
('ar', 'العربية', '🇸🇦')
ON CONFLICT (code) DO NOTHING;

-- Insert common countries
INSERT INTO countries (code, name) VALUES
('FR', 'France'),
('BE', 'Belgique'),
('CH', 'Suisse'),
('CA', 'Canada'),
('US', 'États-Unis'),
('GB', 'Royaume-Uni'),
('DE', 'Allemagne'),
('ES', 'Espagne'),
('IT', 'Italie'),
('PT', 'Portugal'),
('NL', 'Pays-Bas'),
('LU', 'Luxembourg'),
('MC', 'Monaco'),
('AD', 'Andorre'),
('MA', 'Maroc'),
('TN', 'Tunisie'),
('DZ', 'Algérie'),
('SN', 'Sénégal'),
('CI', 'Côte d\'Ivoire'),
('CM', 'Cameroun')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Create storage buckets (run these in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for documents bucket
-- CREATE POLICY "Users can view own documents" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can upload own documents" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update own documents" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own documents" ON storage.objects
--   FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars bucket
-- CREATE POLICY "Avatars are publicly accessible" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');

-- CREATE POLICY "Users can upload own avatars" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update own avatars" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own avatars" ON storage.objects
--   FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================================================

-- Function to initialize user quota when user signs up
CREATE OR REPLACE FUNCTION initialize_user_quota()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_quotas (user_id, letters_generated, max_letters, reset_date)
  VALUES (NEW.id, 0, 5, NOW() + INTERVAL '30 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create user quota on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_quota();

-- Function to check if user has available quota
CREATE OR REPLACE FUNCTION check_user_quota(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  quota_record RECORD;
BEGIN
  SELECT * INTO quota_record FROM user_quotas WHERE user_quotas.user_id = $1;
  
  IF quota_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Reset quota if reset_date has passed
  IF quota_record.reset_date < NOW() THEN
    UPDATE user_quotas 
    SET letters_generated = 0, 
        reset_date = NOW() + INTERVAL '30 days'
    WHERE user_quotas.user_id = $1;
    RETURN TRUE;
  END IF;
  
  RETURN quota_record.letters_generated < quota_record.max_letters;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user quota
CREATE OR REPLACE FUNCTION increment_user_quota(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_quotas 
  SET letters_generated = letters_generated + 1,
      updated_at = NOW()
  WHERE user_quotas.user_id = $1;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for user statistics
CREATE VIEW user_stats AS
SELECT 
  up.user_id,
  up.first_name,
  up.last_name,
  up.subscription_tier,
  COALESCE(cv_count.count, 0) as cv_count,
  COALESCE(letter_count.count, 0) as letter_count,
  uq.letters_generated,
  uq.max_letters,
  uq.reset_date
FROM user_profiles up
LEFT JOIN (
  SELECT user_id, COUNT(*) as count 
  FROM candidates_profile 
  GROUP BY user_id
) cv_count ON up.user_id = cv_count.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count 
  FROM generated_letters 
  GROUP BY user_id
) letter_count ON up.user_id = letter_count.user_id
LEFT JOIN user_quotas uq ON up.user_id = uq.user_id;

-- View for active CVs
CREATE VIEW active_cvs AS
SELECT 
  cp.*,
  up.first_name as profile_first_name,
  up.last_name as profile_last_name
FROM candidates_profile cp
JOIN user_profiles up ON cp.user_id = up.user_id
WHERE cp.is_active = true;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE user_profiles IS 'Extended user profile information';
COMMENT ON TABLE candidates_profile IS 'CV and candidate information extracted from uploaded documents';
COMMENT ON TABLE job_offers IS 'Job offers analyzed by users for letter generation';
COMMENT ON TABLE letter_questionnaire_responses IS 'User responses to questionnaires for personalized letter generation';
COMMENT ON TABLE generated_letters IS 'AI-generated cover letters with metadata';
COMMENT ON TABLE user_quotas IS 'User quotas and limits for letter generation';
COMMENT ON TABLE onboarding_responses IS 'User responses during onboarding process';
COMMENT ON TABLE saved_letters IS 'User-saved letters for future reference';
COMMENT ON TABLE countries IS 'Reference table for country codes and names';
COMMENT ON TABLE languages IS 'Reference table for supported languages';

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant limited access to anonymous users (for public reference tables)
GRANT SELECT ON countries TO anon;
GRANT SELECT ON languages TO anon;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================