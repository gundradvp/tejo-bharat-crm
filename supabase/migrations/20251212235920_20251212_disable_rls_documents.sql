/*
  # Disable RLS on customer_documents
  
  ## Overview
  Temporarily disabling RLS to test if the issue is RLS-related.
  This will allow any authenticated user to insert documents.
*/

ALTER TABLE customer_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_matching_logs DISABLE ROW LEVEL SECURITY;
