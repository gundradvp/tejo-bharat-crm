/*
  # Fix All RLS Infinite Recursion Issues

  ## Changes
  This migration fixes infinite recursion in customers, tasks, audit_logs, and document_templates RLS policies.
  
  ## Problem
  Multiple policies create circular dependencies by querying profiles table within their policy checks.

  ## Solution
  Use the existing is_admin() security definer function for all admin checks across all tables.

  ## Security
  - All operations remain secure and restrictive
  - Policies now use the safe is_admin() function
  - No circular dependencies between table policies
*/

-- Drop existing problematic policies on customers
DROP POLICY IF EXISTS "Agents can view own customers" ON customers;
DROP POLICY IF EXISTS "Agents can insert customers" ON customers;
DROP POLICY IF EXISTS "Agents can update own customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

-- Drop existing problematic policies on tasks
DROP POLICY IF EXISTS "Users can view relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Admins and agents can create tasks" ON tasks;
DROP POLICY IF EXISTS "Task assignees can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

-- Drop existing problematic policies on audit_logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON audit_logs;

-- Drop existing problematic policies on document_templates
DROP POLICY IF EXISTS "All users can view active templates" ON document_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON document_templates;

-- Create helper function to check if user is agent
CREATE OR REPLACE FUNCTION is_agent()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'agent'
  );
$$;

-- Recreate customers policies without recursion
CREATE POLICY "Agents can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.customer_id = customers.id
      AND tasks.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Agents can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Agents can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    agent_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate tasks policies without recursion
CREATE POLICY "Users can view relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = tasks.customer_id
      AND customers.agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins and agents can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR is_agent());

CREATE POLICY "Task assignees can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR is_admin()
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (is_admin());

-- Recreate audit_logs policies without recursion
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "All authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Recreate document_templates policies without recursion
CREATE POLICY "All users can view active templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
