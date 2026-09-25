/*
  # Add Storage Policies for documents-central bucket
  
  ## Overview
  Adding RLS policies to allow authenticated users to upload, view, and delete documents
  from the documents-central storage bucket.
  
  ## Policies
  1. Allow authenticated users to insert objects
  2. Allow authenticated users to select objects
  3. Allow authenticated users to update objects
  4. Allow authenticated users to delete objects
*/

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents-central');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents-central');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents-central')
WITH CHECK (bucket_id = 'documents-central');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents-central');
