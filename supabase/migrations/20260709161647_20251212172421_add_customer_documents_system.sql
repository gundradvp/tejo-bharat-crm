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

CREATE POLICY "Authenticated users can upload documents" ON customer_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can view their documents" ON customer_documents FOR SELECT TO authenticated USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_documents.customer_id AND customers.agent_id = auth.uid()) OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND EXISTS (SELECT 1 FROM roles WHERE roles.id = user_roles.role_id AND roles.name = 'admin')));
CREATE POLICY "Users can update matched documents" ON customer_documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND EXISTS (SELECT 1 FROM roles WHERE roles.id = user_roles.role_id AND roles.name = 'admin'))) WITH CHECK (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND EXISTS (SELECT 1 FROM roles WHERE roles.id = user_roles.role_id AND roles.name = 'admin')));
CREATE POLICY "Users can view matching logs for their documents" ON document_matching_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM customer_documents WHERE customer_documents.id = document_matching_logs.document_id AND (customer_documents.uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND EXISTS (SELECT 1 FROM roles WHERE roles.id = user_roles.role_id AND roles.name = 'admin')))));

CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_uploaded_by ON customer_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_customer_documents_processing_status ON customer_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_customer_documents_upload_date ON customer_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_document_matching_logs_document_id ON document_matching_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_matching_logs_matched_customer_id ON document_matching_logs(matched_customer_id);