INSERT INTO tenants (id, name, slug, status, business_name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'active', 'Default Organization', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_licenses (tenant_id, tier_name, max_users, max_customers, license_start_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Unlimited', 999999, 999999, CURRENT_DATE)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO tenant_usage (tenant_id, current_users, current_customers)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0)
ON CONFLICT (tenant_id) DO NOTHING;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE profiles ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE tasks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);

ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customer_notes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customer_notes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_notes_tenant_id ON customer_notes(tenant_id);

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE activity_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE activity_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON activity_logs(tenant_id);

ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customer_documents SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customer_documents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_documents_tenant_id ON customer_documents(tenant_id);

ALTER TABLE custom_statuses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE custom_statuses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE custom_statuses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_statuses_tenant_id ON custom_statuses(tenant_id);

ALTER TABLE task_customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE task_customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE task_customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_customers_tenant_id ON task_customers(tenant_id);

ALTER TABLE customer_workflow_steps ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customer_workflow_steps SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customer_workflow_steps ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_workflow_steps_tenant_id ON customer_workflow_steps(tenant_id);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE audit_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_disbursements') THEN
    ALTER TABLE loan_disbursements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE loan_disbursements SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE loan_disbursements ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_loan_disbursements_tenant_id ON loan_disbursements(tenant_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_tenant_usage_on_profile_change ON profiles;
CREATE TRIGGER update_tenant_usage_on_profile_change AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION update_tenant_usage_count();

DROP TRIGGER IF EXISTS update_tenant_usage_on_customer_change ON customers;
CREATE TRIGGER update_tenant_usage_on_customer_change AFTER INSERT OR UPDATE OR DELETE ON customers FOR EACH ROW EXECUTE FUNCTION update_tenant_usage_count();

UPDATE tenant_usage SET current_users = (SELECT COUNT(*) FROM profiles WHERE tenant_id = '00000000-0000-0000-0000-000000000001'), current_customers = (SELECT COUNT(*) FROM customers WHERE tenant_id = '00000000-0000-0000-0000-000000000001'), updated_at = now() WHERE tenant_id = '00000000-0000-0000-0000-000000000001';