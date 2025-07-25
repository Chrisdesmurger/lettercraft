-- Script de test pour vérifier le nouveau système de quotas
-- À exécuter manuellement dans l'éditeur SQL de Supabase

-- 1. Ajouter la colonne first_generation_date si elle n'existe pas
ALTER TABLE user_quotas 
ADD COLUMN IF NOT EXISTS first_generation_date TIMESTAMP WITH TIME ZONE;

-- 2. Vérifier la structure de la table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_quotas';

-- 3. Exemple de test du nouveau comportement
-- Simuler un utilisateur avec sa première génération aujourd'hui
INSERT INTO user_quotas (user_id, letters_generated, max_letters, first_generation_date, reset_date)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, -- User ID de test
  1, 
  10, 
  NOW(), -- Première génération maintenant
  NOW() + INTERVAL '30 days' -- Reset dans 30 jours
) ON CONFLICT (user_id) DO UPDATE SET
  first_generation_date = EXCLUDED.first_generation_date,
  reset_date = EXCLUDED.reset_date;

-- 4. Vérifier le résultat
SELECT 
  user_id,
  letters_generated,
  max_letters,
  first_generation_date,
  reset_date,
  (reset_date - NOW()) as time_until_reset
FROM user_quotas 
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;