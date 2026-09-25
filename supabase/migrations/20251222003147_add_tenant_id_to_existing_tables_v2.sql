/*
  # Add tenant_id to Existing Tables (v2)

  ## Overview
  This migration adds tenant_id foreign keys to all existing data tables and creates a default tenant
  for existing data. All existing records will be migrated to this default tenant.

  ## Changes
  1. Create a default tenant for existing data
  2. Add tenant_id column to all data tables
  3. Migrate all existing data to the default tenant
  4. Add NOT NULL constraint after data migration
  5. Add indexes for performance
  6. Create triggers to automatically update tenant_usage counts
*/

-- Create default tenant for existing data
INSERT INTO tenants (id, name, slug, status, business_name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  'active',
  'Default Organization',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Create default license for the default tenant
INSERT INTO tenant_licenses (tenant_id, tier_name, max_users, max_customers, license_start_date)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Unlimited',
  999999,
  999999,
  CURRENT_DATE
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Create default usage record
INSERT INTO tenant_usage (tenant_id, current_users, current_customers)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  0,
  0
)
ON CONFLICT (tenant_id) DO NOTHING;

-- Add tenant_id to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE profiles ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- Add tenant_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);

-- Add tenant_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE tasks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);

-- Add tenant_id to customer_notes table
ALTER TABLE customer_notes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customer_notes SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customer_notes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_notes_tenant_id ON customer_notes(tenant_id);

-- Add tenant_id to activity_logs table
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE activity_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE activity_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_id ON activity_logs(tenant_id);

-- Add tenant_id to customer_documents table
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customer_documents SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customer_documents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_documents_tenant_id ON customer_documents(tenant_id);

-- Add tenant_id to custom_statuses table
ALTER TABLE custom_statuses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE custom_statuses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE custom_statuses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_statuses_tenant_id ON custom_statuses(tenant_id);

-- Add tenant_id to task_customers table
ALTER TABLE task_customers ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE task_customers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE task_customers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_task_customers_tenant_id ON task_customers(tenant_id);

-- Add tenant_id to customer_workflow_steps table
ALTER TABLE customer_workflow_steps ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
UPDATE customer_workflow_steps SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE customer_workflow_steps ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_workflow_steps_tenant_id ON customer_workflow_steps(tenant_id);

-- Add tenant_id to conditional tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE audit_logs SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE expenses SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant_id ON expenses(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE payments SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE payments ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_disbursements') THEN
    ALTER TABLE loan_disbursements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE loan_disbursements SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE loan_disbursements ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_loan_disbursements_tenant_id ON loan_disbursements(tenant_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subtasks') THEN
    ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    UPDATE subtasks SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
    ALTER TABLE subtasks ALTER COLUMN tenant_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_subtasks_tenant_id ON subtasks(tenant_id);
  END IF;
END $$;

-- Create triggers to update tenant_usage automatically
DROP TRIGGER IF EXISTS update_tenant_usage_on_profile_change ON profiles;
CREATE TRIGGER update_tenant_usage_on_profile_change
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_usage_count();

DROP TRIGGER IF EXISTS update_tenant_usage_on_customer_change ON customers;
CREATE TRIGGER update_tenant_usage_on_customer_change
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_usage_count();

-- Update the current usage counts for the default tenant
UPDATE tenant_usage
SET 
  current_users = (SELECT COUNT(*) FROM profiles WHERE tenant_id = '00000000-0000-0000-0000-000000000001'),
  current_customers = (SELECT COUNT(*) FROM customers WHERE tenant_id = '00000000-0000-0000-0000-000000000001'),
  updated_at = now()
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';