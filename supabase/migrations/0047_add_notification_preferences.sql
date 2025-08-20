-- Migration: Ajout des préférences de notifications
-- Date: 2025-01-20
-- Description: Ajoute les colonnes pour gérer les préférences de notifications des utilisateurs

-- Ajouter les colonnes de préférences de notifications à la table user_profiles
ALTER TABLE user_profiles 
ADD COLUMN email_notifications BOOLEAN DEFAULT true,
ADD COLUMN newsletter_enabled BOOLEAN DEFAULT true;

-- Ajouter des commentaires pour documenter ces colonnes
COMMENT ON COLUMN user_profiles.email_notifications IS 'Préférence utilisateur pour recevoir des notifications par email (système)';
COMMENT ON COLUMN user_profiles.newsletter_enabled IS 'Préférence utilisateur pour recevoir la newsletter mensuelle';

-- Mettre à jour les utilisateurs existants avec les valeurs par défaut
UPDATE user_profiles 
SET 
  email_notifications = true,
  newsletter_enabled = true
WHERE email_notifications IS NULL OR newsletter_enabled IS NULL;

-- Ajouter des contraintes NOT NULL maintenant que les valeurs sont définies
ALTER TABLE user_profiles 
ALTER COLUMN email_notifications SET NOT NULL,
ALTER COLUMN newsletter_enabled SET NOT NULL;

-- Index pour optimiser les requêtes sur les préférences de notifications
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_notifications ON user_profiles(email_notifications);
CREATE INDEX IF NOT EXISTS idx_user_profiles_newsletter_enabled ON user_profiles(newsletter_enabled);