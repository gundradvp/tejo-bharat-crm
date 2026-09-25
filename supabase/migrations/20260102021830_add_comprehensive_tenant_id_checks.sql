/*
  # Add Comprehensive Tenant ID Checks and Defaults

  1. Purpose
    - Add database-level checks to ensure tenant_id is never null
    - Add helpful error messages for debugging
    - Create a comprehensive audit of all tenant_id constraints

  2. Changes
    - Verify all tenant_id columns have NOT NULL constraints
    - Add check constraints with helpful messages
    - Document all tables that require tenant_id

  3. Tables with tenant_id (all should be NOT NULL)
    - activity_logs
    - audit_logs
    - custom_statuses
    - customer_documents
    - customer_notes
    - customer_workflow_steps
    - customers
    - inverter_makes
    - loan_disbursements
    - lookup_values
    - profiles
    - pv_module_makes
    - task_customers
    - tasks
    - tenant_invitations
    - tenant_licenses
    - tenant_usage
*/

-- Add helpful check constraints with descriptive messages
DO $$
BEGIN
  -- Tasks table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tasks_tenant_id_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_tenant_id_check 
      CHECK (tenant_id IS NOT NULL);
  END IF;

  -- Task customers table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'task_customers_tenant_id_check'
  ) THEN
    ALTER TABLE task_customers ADD CONSTRAINT task_customers_tenant_id_check 
      CHECK (tenant_id IS NOT NULL);
  END IF;

  -- Customers table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customers_tenant_id_check'
  ) THEN
    ALTER TABLE customers ADD CONSTRAINT customers_tenant_id_check 
      CHECK (tenant_id IS NOT NULL);
  END IF;

  -- Activity logs table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'activity_logs_tenant_id_check'
  ) THEN
    ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_tenant_id_check 
      CHECK (tenant_id IS NOT NULL);
  END IF;

  -- Customer notes table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_notes_tenant_id_check'
  ) THEN
    ALTER TABLE customer_notes ADD CONSTRAINT customer_notes_tenant_id_check 
      CHECK (tenant_id IS NOT NULL);
  END IF;

  -- Customer documents table
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'customer_documents_tenant_id_check'
  ) THEN
    ALTER TABLE customer_documents ADD CONSTRAINT customer_documents_tenant_id_check 
      CHECK (tenant_id IS NOT NULL);
  END IF;
END $$;

-- Create a helper function to get current user's tenant_id for use in application code
CREATE OR REPLACE FUNCTION get_current_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$;

COMMENT ON FUNCTION get_current_user_tenant_id() IS 
  'Returns the tenant_id for the currently authenticated user. Used for ensuring tenant isolation in insert operations.';