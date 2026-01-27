-- Storage Bucket RLS Policies for Document Uploads
-- Run this in your Supabase SQL Editor after creating the 'documents' bucket

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- First, create the bucket if it doesn't exist (do this in Supabase Dashboard > Storage)
-- Bucket name: documents
-- Public: false (we'll control access via RLS)

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read documents
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- ============================================
-- PUBLIC ACCESS (for shared documents via token)
-- ============================================

-- Allow public read access (for shared document links)
CREATE POLICY "Public can read shared documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- ============================================
-- ALTERNATIVE: Allow all operations for development
-- Uncomment these if you want simpler policies during development
-- ============================================

-- DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can read shared documents" ON storage.objects;

-- CREATE POLICY "Allow all on documents bucket"
-- ON storage.objects FOR ALL
-- USING (bucket_id = 'documents')
-- WITH CHECK (bucket_id = 'documents');
