-- Migration pour le système de génération de lettres personnalisées
-- Créer les tables pour stocker les données du questionnaire et offres d'emploi

-- Table pour stocker les offres d'emploi analysées
CREATE TABLE job_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[],
    location VARCHAR(255),
    salary_range VARCHAR(100),
    employment_type VARCHAR(50),
    source_url VARCHAR(500),
    extracted_keywords TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour stocker les réponses du questionnaire de génération
CREATE TABLE letter_questionnaire_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    cv_id UUID NOT NULL REFERENCES candidates_profile(id) ON DELETE CASCADE,
    motivation TEXT NOT NULL,
    experience_highlight JSONB NOT NULL,
    skills_match TEXT[] NOT NULL,
    company_values TEXT NOT NULL,
    additional_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour stocker les lettres générées
CREATE TABLE generated_letters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    questionnaire_response_id UUID NOT NULL REFERENCES letter_questionnaire_responses(id) ON DELETE CASCADE,
    job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
    cv_id UUID NOT NULL REFERENCES candidates_profile(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    html_content TEXT,
    pdf_url VARCHAR(500),
    generation_settings JSONB DEFAULT '{}',
    openai_model VARCHAR(50) DEFAULT 'gpt-4-turbo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes pour optimiser les requêtes
CREATE INDEX idx_job_offers_user_id ON job_offers(user_id);
CREATE INDEX idx_job_offers_created_at ON job_offers(created_at DESC);
CREATE INDEX idx_letter_questionnaire_responses_user_id ON letter_questionnaire_responses(user_id);
CREATE INDEX idx_letter_questionnaire_responses_job_offer_id ON letter_questionnaire_responses(job_offer_id);
CREATE INDEX idx_generated_letters_user_id ON generated_letters(user_id);
CREATE INDEX idx_generated_letters_created_at ON generated_letters(created_at DESC);

-- RLS (Row Level Security) pour sécuriser l'accès aux données
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;

-- Policies pour job_offers
CREATE POLICY "Users can view their own job offers" ON job_offers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job offers" ON job_offers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own job offers" ON job_offers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job offers" ON job_offers
    FOR DELETE USING (auth.uid() = user_id);

-- Policies pour letter_questionnaire_responses
CREATE POLICY "Users can view their own questionnaire responses" ON letter_questionnaire_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own questionnaire responses" ON letter_questionnaire_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaire responses" ON letter_questionnaire_responses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questionnaire responses" ON letter_questionnaire_responses
    FOR DELETE USING (auth.uid() = user_id);

-- Policies pour generated_letters
CREATE POLICY "Users can view their own generated letters" ON generated_letters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generated letters" ON generated_letters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated letters" ON generated_letters
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated letters" ON generated_letters
    FOR DELETE USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

-- Triggers pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_job_offers_updated_at 
    BEFORE UPDATE ON job_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_letter_questionnaire_responses_updated_at 
    BEFORE UPDATE ON letter_questionnaire_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_letters_updated_at 
    BEFORE UPDATE ON generated_letters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();