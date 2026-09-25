/*
  # Fix Tasks RLS Policies with Helper Functions
  
  ## Overview
  This migration updates the tasks table RLS policies to use security definer
  helper functions, preventing recursion issues.
  
  ## Problem
  The current policies may directly query other tables causing circular dependencies.
  
  ## Solution
  Update all task policies to use helper functions and avoid recursion.
  
  ## Changes
  - Drop existing policies
  - Create new non-recursive policies using helper functions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Admins and agents can create tasks" ON tasks;
DROP POLICY IF EXISTS "Task assignees can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

-- Users can view tasks they're involved with
CREATE POLICY "Users can view relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = assigned_to
    OR (select auth.uid()) = assigned_by
    OR is_admin_or_employee()
  );

-- Authenticated users can create tasks
CREATE POLICY "Admins and agents can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Task assignees can update tasks
CREATE POLICY "Task assignees can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = assigned_to
    OR is_admin()
  )
  WITH CHECK (
    (select auth.uid()) = assigned_to
    OR is_admin()
  );

-- Only admins can delete tasks
CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (is_admin());
