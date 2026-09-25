/*
  # Setup Documents Storage Bucket
  
  ## Overview
  This migration documents the storage bucket configuration for document uploads.
  The `documents-central` bucket must be created through Supabase dashboard or edge functions.
  
  ## Storage Bucket Configuration
  
  ### Bucket: documents-central
  - Type: Private (requires authentication)
  - Path format: {user_id}/{customer_id}/{timestamp}_{filename}
  - Max file size: 25MB (enforced client-side)
  - Supported formats: PDF, images (JPG/PNG), Word, Excel
  
  ## Storage Access Control
  
  Users can upload documents they own:
  - Path: authenticated/{user_id}/{customer_id}/{file}
  - Only users with admin or lead_generator role can upload
  - Files are associated with customers in customer_documents table
  
  ## Database-Storage Integration
  
  - Each document upload creates a customer_documents record
  - Extracted text is stored in database for searching
  - File path is stored for retrieval
  - Storage and database access are coordinated via RLS
  
  ## Important Notes
  
  1. Storage bucket must exist at: /storage/v1/object/public/documents-central/
  2. Access is controlled via JWT authentication
  3. Users can only access their own files or files linked to admin/lead_generator roles
  4. All uploads require authentication via Supabase client
  5. The init-storage-bucket edge function can initialize this bucket on demand
*/

DO $$
BEGIN
  -- This is a documentation migration
  -- Storage buckets are managed through Supabase UI or API
  -- The edge function 'init-storage-bucket' can create this bucket automatically
  RAISE NOTICE 'Document storage bucket "documents-central" must be configured for uploads to work';
END $$;