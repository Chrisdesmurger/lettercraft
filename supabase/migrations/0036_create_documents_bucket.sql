-- Migration: Create documents bucket for PDF storage
-- Description: Creates a bucket for storing generated letter PDFs with proper CORS and RLS policies

BEGIN;

-- Create documents bucket (public for easier access to generated PDFs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, -- Public bucket for generated letter PDFs
  5242880, -- 5MB limit
  ARRAY['application/pdf']::text[]
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- Remove existing policies to start fresh
DROP POLICY IF EXISTS "Public documents access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their documents" ON storage.objects;

-- Create RLS policies for documents bucket

-- Allow public read access to documents (for generated letter PDFs)
CREATE POLICY "Public documents access" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text -- Files must be in user's folder
  );

-- Allow users to update their own documents
CREATE POLICY "Authenticated users can update their documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own documents
CREATE POLICY "Authenticated users can delete their documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- Note: CORS configuration must be done in Supabase Dashboard
-- Go to: Settings > API > CORS Origins
-- Add your domains: http://localhost:3000, https://yourdomain.com