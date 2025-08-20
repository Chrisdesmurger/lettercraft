-- Migration: Ajout du champ writing_tone à letter_questionnaire_responses
-- Date: 2025-01-20
-- Description: Support pour la sauvegarde des choix de ton dans le questionnaire

-- Ajout de la colonne writing_tone (JSONB pour stocker toneKey et customText)
ALTER TABLE letter_questionnaire_responses 
ADD COLUMN writing_tone JSONB DEFAULT '{"toneKey": "professionnel", "customText": ""}'::jsonb;

-- Contrainte de validation pour s'assurer que le JSON a la bonne structure
ALTER TABLE letter_questionnaire_responses 
ADD CONSTRAINT writing_tone_structure CHECK (
    writing_tone ? 'toneKey' AND 
    writing_tone->>'toneKey' IN ('professionnel', 'chaleureux', 'direct', 'persuasif', 'créatif', 'concis', 'personnalisé')
);

-- Index pour optimiser les requêtes par ton
CREATE INDEX idx_letter_questionnaire_responses_tone ON letter_questionnaire_responses 
USING GIN ((writing_tone->>'toneKey'));

-- Commentaire pour la documentation
COMMENT ON COLUMN letter_questionnaire_responses.writing_tone IS 'Choix de ton d''écriture: {"toneKey": "professionnel|chaleureux|...", "customText": "texte personnalisé"}';

-- Mise à jour des entrées existantes avec le ton par défaut
UPDATE letter_questionnaire_responses 
SET writing_tone = '{"toneKey": "professionnel", "customText": ""}'::jsonb 
WHERE writing_tone IS NULL;