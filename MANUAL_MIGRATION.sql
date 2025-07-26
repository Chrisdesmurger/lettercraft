/*
MIGRATION MANUELLE - Système de Quotas avec Reset Personnalisé
À exécuter dans l'éditeur SQL de Supabase Dashboard

Cette migration ajoute le support des cycles de reset personnalisés
basés sur la date de première génération de chaque utilisateur.
*/

BEGIN;

-- 1. Ajouter la colonne first_generation_date
ALTER TABLE user_quotas 
ADD COLUMN IF NOT EXISTS first_generation_date TIMESTAMP WITH TIME ZONE;

-- 2. Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_quotas_first_generation_date 
ON user_quotas(first_generation_date);

-- 3. Mise à jour des enregistrements existants
-- Pour les utilisateurs qui ont déjà généré des lettres, 
-- utiliser created_at comme approximation de la première génération
UPDATE user_quotas 
SET first_generation_date = created_at
WHERE first_generation_date IS NULL 
  AND letters_generated > 0;

-- 4. Vérifier la structure mise à jour
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_quotas' 
  AND column_name IN ('first_generation_date', 'reset_date', 'letters_generated', 'max_letters')
ORDER BY ordinal_position;

-- 5. Exemple de vérification des données
SELECT 
  user_id,
  letters_generated,
  max_letters,
  first_generation_date,
  reset_date,
  created_at,
  CASE 
    WHEN first_generation_date IS NULL THEN 'Pas encore de génération'
    WHEN reset_date IS NULL THEN 'Reset sera défini à la prochaine génération'
    ELSE 'Cycle configuré'
  END as status
FROM user_quotas 
ORDER BY created_at DESC
LIMIT 10;

COMMIT;

-- Instructions post-migration :
-- 1. Vérifiez que la colonne first_generation_date a été ajoutée
-- 2. Confirmez que les utilisateurs existants ont une valeur first_generation_date
-- 3. Les nouveaux utilisateurs auront first_generation_date = NULL jusqu'à leur première génération
-- 4. Le code JavaScript gérera automatiquement la définition de cette date

/*
COMPORTEMENT ATTENDU après migration :

1. Nouveaux utilisateurs :
   - first_generation_date = NULL
   - reset_date = NULL
   - Message : "Reset après la première génération"

2. Utilisateurs existants (approximation) :
   - first_generation_date = created_at
   - reset_date sera recalculé lors du prochain refresh
   - Cycles basés sur la date approximative

3. Première génération d'un nouvel utilisateur :
   - first_generation_date = NOW()
   - reset_date = NOW() + 30 jours
   - Cycles mensuels à partir de cette date

4. Resets suivants :
   - Basés sur first_generation_date + 30 jours, puis +1 mois, +2 mois, etc.
   - Personnalisé pour chaque utilisateur
*/