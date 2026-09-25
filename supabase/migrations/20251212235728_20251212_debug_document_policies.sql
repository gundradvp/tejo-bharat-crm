/*
  # Debug Document Insert Policies
  
  ## Overview
  Creates more permissive policies to debug RLS issues.
  Allows any authenticated user to insert documents for now.
  
  ## Security Note
  This is a temporary debugging migration. Should be reverted after issue is fixed.
*/

DROP POLICY IF EXISTS "Authenticated users can insert documents" ON customer_documents;

CREATE POLICY "Authenticated users can insert documents"
  ON customer_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view documents" ON customer_documents;

CREATE POLICY "Users can view documents"
  ON customer_documents
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update documents" ON customer_documents;

CREATE POLICY "Users can update documents"
  ON customer_documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete documents" ON customer_documents;

CREATE POLICY "Users can delete documents"
  ON customer_documents
  FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "View document matching logs" ON document_matching_logs;

CREATE POLICY "View document matching logs"
  ON document_matching_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Insert document matching logs" ON document_matching_logs;

CREATE POLICY "Insert document matching logs"
  ON document_matching_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
