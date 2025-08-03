-- Migration pour utiliser auth.users au lieu de user_profiles
-- Ajouter les colonnes personnalisées à auth.users

-- Ajouter les colonnes de profil utilisateur à auth.users
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Migrer les données de user_profiles vers auth.users
UPDATE auth.users 
SET 
  first_name = up.first_name,
  last_name = up.last_name,
  phone = up.phone,
  country = up.country,
  language = up.language,
  birth_date = up.birth_date,
  avatar_url = up.avatar_url,
  bio = up.bio,
  subscription_tier = up.subscription_tier,
  subscription_end_date = up.subscription_end_date,
  stripe_customer_id = up.stripe_customer_id,
  stripe_subscription_id = up.stripe_subscription_id
FROM user_profiles up
WHERE auth.users.id = up.user_id;

-- Créer des index pour optimiser les recherches Stripe
CREATE INDEX IF NOT EXISTS idx_auth_users_stripe_customer ON auth.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_auth_users_stripe_subscription ON auth.users(stripe_subscription_id);

-- Ajouter des contraintes d'unicité pour les IDs Stripe (avec gestion des erreurs)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_stripe_customer_id'
    ) THEN
        ALTER TABLE auth.users ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_stripe_subscription_id'
    ) THEN
        ALTER TABLE auth.users ADD CONSTRAINT unique_stripe_subscription_id UNIQUE (stripe_subscription_id);
    END IF;
END $$;

-- Supprimer la table user_profiles après migration des données
-- ATTENTION: Cette étape est irréversible
-- DROP TABLE IF EXISTS user_profiles CASCADE;

-- Commentaires sur les nouvelles colonnes
COMMENT ON COLUMN auth.users.first_name IS 'Prénom de l utilisateur';
COMMENT ON COLUMN auth.users.last_name IS 'Nom de famille de l utilisateur';
COMMENT ON COLUMN auth.users.phone IS 'Numéro de téléphone';
COMMENT ON COLUMN auth.users.country IS 'Code pays de résidence';
COMMENT ON COLUMN auth.users.language IS 'Langue préférée';
COMMENT ON COLUMN auth.users.birth_date IS 'Date de naissance';
COMMENT ON COLUMN auth.users.avatar_url IS 'URL de l avatar utilisateur';
COMMENT ON COLUMN auth.users.bio IS 'Biographie utilisateur';
COMMENT ON COLUMN auth.users.subscription_tier IS 'Niveau d abonnement (free/premium)';
COMMENT ON COLUMN auth.users.subscription_end_date IS 'Date de fin d abonnement premium';
COMMENT ON COLUMN auth.users.stripe_customer_id IS 'ID client Stripe pour les paiements';
COMMENT ON COLUMN auth.users.stripe_subscription_id IS 'ID abonnement Stripe';