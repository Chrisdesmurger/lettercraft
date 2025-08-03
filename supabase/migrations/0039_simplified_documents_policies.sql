-- Migration: Simplified documents bucket policies for debugging
-- Description: Creates very permissive policies to isolate CORS vs RLS issues

BEGIN;

-- Drop all existing policies for documents bucket
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
DROP POLICY IF EXISTS "Authenticated update own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage root documents" ON storage.objects;

-- Create very simple, permissive policies for debugging

-- 1. Allow public read access to all documents
CREATE POLICY "documents_select_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- 2. Allow all authenticated users to insert anywhere in documents bucket
CREATE POLICY "documents_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
  );

-- 3. Allow all authenticated users to update any document
CREATE POLICY "documents_update_authenticated" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
  );

-- 4. Allow all authenticated users to delete any document  
CREATE POLICY "documents_delete_authenticated" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
  );

COMMIT;