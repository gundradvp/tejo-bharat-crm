/*
  # Fix Security and Performance Issues

  ## Description
  This migration addresses critical security and performance issues identified by Supabase analysis.

  ## Changes Made

  ### 1. Foreign Key Indexes
  Add missing indexes on foreign key columns to improve query performance:
  - activity_logs.user_id
  - audit_logs.user_id
  - customer_expenses.created_by
  - customer_notes.user_id
  - customers.lead_generated_by
  - customers.verified_by
  - document_templates.created_by
  - task_notes.user_id

  ### 2. RLS Policy Optimization
  Update customer_workflow_steps RLS policies to use `(select auth.uid())` 
  instead of `auth.uid()` for better performance at scale.

  ### 3. Function Security
  Fix search_path mutability for workflow step functions by explicitly 
  setting search_path to prevent security vulnerabilities.

  ## Security Impact
  - Improved query performance for foreign key lookups
  - Optimized RLS policy evaluation
  - Protected against search_path manipulation attacks
*/

-- ==========================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ==========================================

-- Index for activity_logs.user_id
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id 
  ON activity_logs(user_id);

-- Index for audit_logs.user_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
  ON audit_logs(user_id);

-- Index for customer_expenses.created_by
CREATE INDEX IF NOT EXISTS idx_customer_expenses_created_by 
  ON customer_expenses(created_by);

-- Index for customer_notes.user_id
CREATE INDEX IF NOT EXISTS idx_customer_notes_user_id 
  ON customer_notes(user_id);

-- Index for customers.lead_generated_by
CREATE INDEX IF NOT EXISTS idx_customers_lead_generated_by 
  ON customers(lead_generated_by);

-- Index for customers.verified_by
CREATE INDEX IF NOT EXISTS idx_customers_verified_by 
  ON customers(verified_by);

-- Index for document_templates.created_by
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by 
  ON document_templates(created_by);

-- Index for task_notes.user_id
CREATE INDEX IF NOT EXISTS idx_task_notes_user_id 
  ON task_notes(user_id);

-- ==========================================
-- 2. OPTIMIZE RLS POLICIES
-- ==========================================

-- Drop existing policies for customer_workflow_steps
DROP POLICY IF EXISTS "Lead generators can manage their customer workflow steps" 
  ON customer_workflow_steps;
DROP POLICY IF EXISTS "Employees can view their assigned workflow steps" 
  ON customer_workflow_steps;
DROP POLICY IF EXISTS "Employees can update their assigned workflow steps" 
  ON customer_workflow_steps;

-- Recreate optimized policies with (select auth.uid())
CREATE POLICY "Lead generators can manage their customer workflow steps"
  ON customer_workflow_steps
  FOR ALL
  TO authenticated
  USING (
    current_user_is_lead_generator()
    AND EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_workflow_steps.customer_id
      AND customers.assigned_agent_id = (select auth.uid())
    )
  )
  WITH CHECK (
    current_user_is_lead_generator()
    AND EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_workflow_steps.customer_id
      AND customers.assigned_agent_id = (select auth.uid())
    )
  );

CREATE POLICY "Employees can view their assigned workflow steps"
  ON customer_workflow_steps
  FOR SELECT
  TO authenticated
  USING (
    assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.customer_id = customer_workflow_steps.customer_id
      AND tasks.assigned_to = (select auth.uid())
    )
  );

CREATE POLICY "Employees can update their assigned workflow steps"
  ON customer_workflow_steps
  FOR UPDATE
  TO authenticated
  USING (assigned_to = (select auth.uid()))
  WITH CHECK (assigned_to = (select auth.uid()));

-- ==========================================
-- 3. FIX FUNCTION SEARCH PATH SECURITY
-- ==========================================

-- Recreate update_workflow_steps_updated_at with secure search_path
CREATE OR REPLACE FUNCTION update_workflow_steps_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.actual_completion_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate create_default_workflow_steps with secure search_path
CREATE OR REPLACE FUNCTION create_default_workflow_steps(p_customer_id uuid)
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO customer_workflow_steps (customer_id, step_name, step_type, order_index) VALUES
    (p_customer_id, 'Document Collection', 'document_collection', 1),
    (p_customer_id, 'Site Survey', 'site_survey', 2),
    (p_customer_id, 'Ship Material', 'ship_material', 3),
    (p_customer_id, 'Installation', 'installation', 4),
    (p_customer_id, 'Net Meter Application', 'net_meter_application', 5),
    (p_customer_id, 'Inspection', 'inspection', 6),
    (p_customer_id, 'Commissioning', 'commissioning', 7),
    (p_customer_id, 'Subsidy Application', 'subsidy_application', 8);
END;
$$;

-- Recreate trigger_create_workflow_steps with secure search_path
CREATE OR REPLACE FUNCTION trigger_create_workflow_steps()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM create_default_workflow_steps(NEW.id);
  RETURN NEW;
END;
$$;