# Migrations Supabase

## Migration 0004: Ajout des colonnes avatar_url et bio

Pour appliquer cette migration, exécutez le SQL suivant dans l'éditeur SQL de Supabase :

```sql
-- Add avatar_url column to user_profiles table and bio column
ALTER TABLE user_profiles
ADD COLUMN avatar_url TEXT,
ADD COLUMN bio TEXT;

-- Create avatars storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Cette migration ajoute :

1. La colonne `avatar_url` à la table `user_profiles`
2. La colonne `bio` à la table `user_profiles`
3. Un bucket de stockage `avatars` public
4. Les politiques RLS pour sécuriser l'accès aux avatars
