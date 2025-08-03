-- Migration: Fix documents bucket policies to resolve CORS and permission issues
-- Description: Creates proper RLS policies for the documents bucket with correct permissions

BEGIN;

-- Ensure the documents bucket exists first
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, -- Public bucket pour faciliter l'accès
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp']::text[];

-- Drop all existing policies for documents bucket to start fresh
DROP POLICY IF EXISTS "Public documents access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to documents" ON storage.objects;

-- Create new, more permissive policies for documents bucket

-- 1. Allow public read access to all documents (for PDFs, images, etc.)
CREATE POLICY "Public read access for documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- 2. Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated upload to documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Allow authenticated users to update their own files
CREATE POLICY "Authenticated update own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Allow authenticated users to delete their own files
CREATE POLICY "Authenticated delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Special policy for files directly in root (legacy compatibility)
CREATE POLICY "Authenticated manage root documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IS NULL
  );

COMMIT;

-- Instructions pour la configuration CORS (à faire manuellement) :
-- 1. Aller sur https://supabase.com/dashboard/project/arrljqqnxadilegepnyh
-- 2. Settings > API > CORS Origins
-- 3. Ajouter : http://localhost:3000, https://lettercraft.fr
-- 4. Redémarrer le projet Supabase si nécessaire