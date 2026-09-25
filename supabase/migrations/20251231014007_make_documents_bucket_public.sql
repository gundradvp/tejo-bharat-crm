/*
  # Make documents-central bucket public
  
  ## Overview
  Making the documents-central storage bucket public to allow public access to uploaded
  logos and documents. This is necessary for displaying organization logos in the UI
  without requiring signed URLs.
  
  ## Changes
  1. Update the documents-central bucket to be public
*/

UPDATE storage.buckets 
SET public = true 
WHERE name = 'documents-central';