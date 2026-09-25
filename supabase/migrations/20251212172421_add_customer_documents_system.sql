/*
  # Add Customer Documents and Matching System

  ## Overview
  Adds support for centralized document uploads with automatic customer matching using extracted text content.

  ## New Tables
  
  ### 1. `customer_documents`
  Stores uploaded documents with extracted text for intelligent customer matching
  - `id` (uuid, primary key)
  - `document_name` (text) - Original file name
  - `file_path` (text) - Path in Supabase Storage
  - `file_type` (text) - Document type (pdf, image, docx, xlsx, etc.)
  - `file_size` (integer) - File size in bytes
  - `extracted_text` (text) - Full text extracted from document
  - `customer_id` (uuid, FK to customers, nullable) - Linked customer if auto-matched or manually assigned
  - `upload_date` (timestamptz) - When document was uploaded
  - `uploaded_by` (uuid, FK to profiles) - User who uploaded the document
  - `processing_status` (text) - 'pending_extraction', 'extracted', 'matched', 'unmatched', 'error'
  - `match_confidence` (numeric) - Confidence score 0-100 for auto-match
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last modification time

  ### 2. `document_matching_logs`
  Audit trail for document matching attempts and results
  - `id` (uuid, primary key)
  - `document_id` (uuid, FK to customer_documents)
  - `attempted_at` (timestamptz) - When matching was attempted
  - `matched_customer_id` (uuid, FK to customers, nullable) - Matched customer
  - `confidence_score` (numeric) - Match confidence 0-100
  - `matching_fields` (jsonb) - Fields that were used for matching (phone, name, app_number, etc.)
  - `manual_override` (boolean) - Whether this was manually assigned
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on both tables
  - Add policy for authenticated users to upload documents
  - Add policy for users to view documents linked to their customers
  - Add policy for admins to view all documents

  ## Important Notes
  1. Extracted text stored for efficient searching and matching
  2. Processing status tracks extraction and matching pipeline
  3. Confidence score enables sorting by auto-match quality
  4. Manual override flag tracks human corrections to matches
*/

CREATE TABLE IF NOT EXISTS customer_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer,
  extracted_text text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  upload_date timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  processing_status text NOT NULL DEFAULT 'pending_extraction',
  match_confidence numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_matching_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES customer_documents(id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  matched_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  confidence_score numeric NOT NULL DEFAULT 0,
  matching_fields jsonb DEFAULT '{}'::jsonb,
  manual_override boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_matching_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can upload documents"
  ON customer_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can view their documents"
  ON customer_documents
  FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_documents.customer_id
      AND customers.agent_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = user_roles.role_id
        AND roles.name = 'admin'
      )
    )
  );

CREATE POLICY "Users can update matched documents"
  ON customer_documents
  FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = user_roles.role_id
        AND roles.name = 'admin'
      )
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM roles
        WHERE roles.id = user_roles.role_id
        AND roles.name = 'admin'
      )
    )
  );

CREATE POLICY "Users can view matching logs for their documents"
  ON document_matching_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customer_documents
      WHERE customer_documents.id = document_matching_logs.document_id
      AND (
        customer_documents.uploaded_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_roles.user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM roles
            WHERE roles.id = user_roles.role_id
            AND roles.name = 'admin'
          )
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_uploaded_by ON customer_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_customer_documents_processing_status ON customer_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_customer_documents_upload_date ON customer_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_document_matching_logs_document_id ON document_matching_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_matching_logs_matched_customer_id ON document_matching_logs(matched_customer_id);
