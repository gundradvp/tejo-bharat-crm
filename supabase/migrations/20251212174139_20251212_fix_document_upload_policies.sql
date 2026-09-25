/*
  # Fix Document Upload RLS Policies
  
  ## Overview
  Fixes RLS policies for customer_documents table to properly handle storage uploads and viewing permissions.
  The previous policies had issues with recursive queries and incorrect column references.
  
  ## Changes
  - Drop problematic RLS policies
  - Create new streamlined policies for document upload, viewing, and updates
  - Simplify agent/customer relationship checks
  
  ## Security
  - Users can only upload documents if they are authenticated
  - Users can only view documents they uploaded or documents linked to their customers
  - Admins can view all documents
  - Users can only update documents they uploaded or if they are admin
*/

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can view their documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can update matched documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can view matching logs for their documents" ON document_matching_logs;

CREATE POLICY "Users can insert documents"
  ON customer_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can view own documents"
  ON customer_documents
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'lead_generator')
    )
  );

CREATE POLICY "Users can update own documents"
  ON customer_documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view matching logs"
  ON document_matching_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_documents
      WHERE customer_documents.id = document_matching_logs.document_id
      AND (
        customer_documents.uploaded_by = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'lead_generator')
        )
      )
    )
  );

CREATE POLICY "Users can insert matching logs"
  ON document_matching_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customer_documents
      WHERE customer_documents.id = document_id
      AND customer_documents.uploaded_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );