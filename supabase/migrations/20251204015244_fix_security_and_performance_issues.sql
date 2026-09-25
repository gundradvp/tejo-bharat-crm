/*
  # Fix Security and Performance Issues
  
  ## Overview
  This migration addresses security and performance issues identified by Supabase analysis:
  1. Adds missing indexes on foreign keys
  2. Optimizes RLS policies to prevent re-evaluation of auth functions
  3. Fixes function search paths for security
  
  ## Changes Made
  
  ### Missing Indexes
  - Add index on customer_expenses.created_by
  - Add index on document_templates.created_by  
  - Add index on tasks.assigned_by
  
  ### RLS Policy Optimization
  - Wrap all auth.uid() calls with (select auth.uid()) for better performance
  - This prevents the function from being re-evaluated for each row
  
  ### Function Security
  - Set search_path to be immutable for security functions
  
  ## Notes
  - Multiple permissive policies are intentional for role-based access control
  - Unused indexes will be used as the application grows
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_customer_expenses_created_by ON customer_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);

-- Fix function search paths for security
ALTER FUNCTION update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION handle_new_user() SET search_path = pg_catalog, public;

-- Optimize profiles RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- Optimize customers RLS policies
DROP POLICY IF EXISTS "Agents can insert customers" ON customers;
CREATE POLICY "Agents can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Agents can update assigned customers" ON customers;
CREATE POLICY "Agents can update assigned customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    agent_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    agent_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their relevant customers" ON customers;
CREATE POLICY "Users can view their relevant customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    agent_id = (select auth.uid())
    OR assigned_agent_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'employee')
    )
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.customer_id = customers.id
      AND tasks.assigned_to = (select auth.uid())
    )
  );

-- Optimize tasks RLS policies
DROP POLICY IF EXISTS "Users can view relevant tasks" ON tasks;
CREATE POLICY "Users can view relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = (select auth.uid())
    OR assigned_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = tasks.customer_id
      AND customers.agent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Task assignees can update tasks" ON tasks;
CREATE POLICY "Task assignees can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    assigned_to = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- Optimize audit_logs RLS policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "All authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Optimize document_templates RLS policies
DROP POLICY IF EXISTS "All users can view active templates" ON document_templates;
CREATE POLICY "All users can view active templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

-- Optimize customer_expenses RLS policies
DROP POLICY IF EXISTS "Agents can view expenses for their customers" ON customer_expenses;
CREATE POLICY "Agents can view expenses for their customers"
  ON customer_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_expenses.customer_id
      AND customers.agent_id = (select auth.uid())
    )
  );

-- Optimize loan_disbursements RLS policies
DROP POLICY IF EXISTS "Admins can view all loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can view all loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view all loan disbursements" ON loan_disbursements;
CREATE POLICY "Employees can view all loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Agents can view disbursements for their customers" ON loan_disbursements;
CREATE POLICY "Agents can view disbursements for their customers"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = loan_disbursements.customer_id
      AND customers.agent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can insert loan disbursements" ON loan_disbursements;
CREATE POLICY "Employees can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Admins can update loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can update loan disbursements" ON loan_disbursements;
CREATE POLICY "Employees can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Admins can delete loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can delete loan disbursements"
  ON loan_disbursements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Optimize customer_payments RLS policies
DROP POLICY IF EXISTS "Admins can view all customer payments" ON customer_payments;
CREATE POLICY "Admins can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view all customer payments" ON customer_payments;
CREATE POLICY "Employees can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Agents can view payments for their customers" ON customer_payments;
CREATE POLICY "Agents can view payments for their customers"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_payments.customer_id
      AND customers.agent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert customer payments" ON customer_payments;
CREATE POLICY "Admins can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can insert customer payments" ON customer_payments;
CREATE POLICY "Employees can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Admins can update customer payments" ON customer_payments;
CREATE POLICY "Admins can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can update customer payments" ON customer_payments;
CREATE POLICY "Employees can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'employee'
    )
  );

DROP POLICY IF EXISTS "Admins can delete customer payments" ON customer_payments;
CREATE POLICY "Admins can delete customer payments"
  ON customer_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );
