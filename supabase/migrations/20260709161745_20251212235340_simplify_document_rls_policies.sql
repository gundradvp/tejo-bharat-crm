DROP POLICY IF EXISTS "Users can insert documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can view own documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can view matching logs" ON document_matching_logs;
DROP POLICY IF EXISTS "Users can insert matching logs" ON document_matching_logs;

CREATE POLICY "Authenticated users can insert documents" ON customer_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Users can view documents" ON customer_documents FOR SELECT TO authenticated USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('admin', 'lead_generator', 'manager', 'finance', 'employee')));
CREATE POLICY "Users can update documents" ON customer_documents FOR UPDATE TO authenticated USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')) WITH CHECK (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can delete documents" ON customer_documents FOR DELETE TO authenticated USING (uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));
CREATE POLICY "View document matching logs" ON document_matching_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM customer_documents WHERE customer_documents.id = document_matching_logs.document_id AND (customer_documents.uploaded_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role IN ('admin', 'lead_generator')))));
CREATE POLICY "Insert document matching logs" ON document_matching_logs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM customer_documents WHERE customer_documents.id = document_id AND customer_documents.uploaded_by = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

ALTER TABLE customer_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_matching_logs DISABLE ROW LEVEL SECURITY;