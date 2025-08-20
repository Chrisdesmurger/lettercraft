-- Migration: Ajout des champs tone_key et tone_custom à la table generated_letters
-- Date: 2025-01-20
-- Description: Support pour la fonctionnalité "TON PREMIUM" - choix du ton d'écriture

-- Ajout des colonnes pour le ton d'écriture
ALTER TABLE generated_letters 
ADD COLUMN tone_key TEXT DEFAULT 'professionnel',
ADD COLUMN tone_custom TEXT;

-- Contraintes de validation
ALTER TABLE generated_letters 
ADD CONSTRAINT tone_key_valid CHECK (
    tone_key IN ('professionnel', 'chaleureux', 'direct', 'persuasif', 'créatif', 'concis', 'personnalisé')
);

ALTER TABLE generated_letters 
ADD CONSTRAINT tone_custom_length CHECK (
    tone_custom IS NULL OR (LENGTH(tone_custom) <= 120 AND LENGTH(TRIM(tone_custom)) > 0)
);

-- Commentaires pour la documentation
COMMENT ON COLUMN generated_letters.tone_key IS 'Clé du ton sélectionné parmi les options prédéfinies';
COMMENT ON COLUMN generated_letters.tone_custom IS 'Texte personnalisé pour le ton (max 120 caractères), utilisé uniquement si tone_key = "personnalisé"';

-- Index pour optimiser les requêtes par ton
CREATE INDEX idx_generated_letters_tone_key ON generated_letters(tone_key);

-- Mise à jour des lettres existantes (optionnel - elles garderont 'professionnel' par défaut)
-- UPDATE generated_letters SET tone_key = 'professionnel' WHERE tone_key IS NULL;