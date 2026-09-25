DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_tenant_id_check') THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_tenant_id_check CHECK (tenant_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_customers_tenant_id_check') THEN
    ALTER TABLE task_customers ADD CONSTRAINT task_customers_tenant_id_check CHECK (tenant_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_tenant_id_check') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_tenant_id_check CHECK (tenant_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_logs_tenant_id_check') THEN
    ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_tenant_id_check CHECK (tenant_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_notes_tenant_id_check') THEN
    ALTER TABLE customer_notes ADD CONSTRAINT customer_notes_tenant_id_check CHECK (tenant_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_documents_tenant_id_check') THEN
    ALTER TABLE customer_documents ADD CONSTRAINT customer_documents_tenant_id_check CHECK (tenant_id IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
  RETURN v_tenant_id;
END;
$$;