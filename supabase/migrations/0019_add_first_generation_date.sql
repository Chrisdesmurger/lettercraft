-- Migration pour ajouter first_generation_date au système de quotas
-- Cette date détermine le cycle de reset personnalisé par utilisateur

BEGIN;

-- Ajouter la colonne first_generation_date
ALTER TABLE user_quotas 
ADD COLUMN first_generation_date TIMESTAMP WITH TIME ZONE;

-- Créer un index pour les performances
CREATE INDEX idx_user_quotas_first_generation_date 
ON user_quotas(first_generation_date);

-- Mise à jour des enregistrements existants sans first_generation_date
-- On utilise created_at comme approximation pour les utilisateurs existants
UPDATE user_quotas 
SET first_generation_date = created_at
WHERE first_generation_date IS NULL 
  AND letters_generated > 0;

-- Pour les utilisateurs qui n'ont jamais généré de lettre, 
-- first_generation_date restera NULL jusqu'à leur première génération

-- Fonction pour calculer la prochaine date de reset basée sur first_generation_date
CREATE OR REPLACE FUNCTION calculate_next_reset_date(first_gen_date TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  -- Si pas de première génération, retourner NULL
  IF first_gen_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculer 30 jours après la première génération
  RETURN first_gen_date + INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour calculer le prochain cycle de reset
CREATE OR REPLACE FUNCTION get_next_quota_reset_date(user_quota_record user_quotas)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  base_reset_date TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Si pas de première génération, pas de reset défini
  IF user_quota_record.first_generation_date IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calculer la date de reset de base (30 jours après première génération)
  base_reset_date := user_quota_record.first_generation_date + INTERVAL '30 days';
  
  -- Si la date de reset de base est dans le futur, c'est notre prochaine date
  IF base_reset_date > current_time THEN
    RETURN base_reset_date;
  END IF;
  
  -- Sinon, calculer le prochain cycle mensuel
  -- Nombre de mois écoulés depuis la date de reset de base
  DECLARE
    months_elapsed INTEGER := EXTRACT(YEAR FROM AGE(current_time, base_reset_date)) * 12 + 
                             EXTRACT(MONTH FROM AGE(current_time, base_reset_date));
  BEGIN
    -- Ajouter un mois de plus pour obtenir le prochain reset
    RETURN base_reset_date + ((months_elapsed + 1) * INTERVAL '1 month');
  END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;