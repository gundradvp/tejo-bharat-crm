/*
  # Fix Employee Task Visibility
  
  ## Overview
  This migration fixes the task RLS policies so that employees can only see
  tasks that are assigned to them, not all tasks in the system.
  
  ## Changes
  1. Update task SELECT policy to properly filter employee tasks
     - Employees can only see tasks where they are assigned_to
     - Admins can see all tasks
     - Users can see tasks they created or are assigned to
  
  ## Security
  - Maintains proper data isolation for employees
  - Ensures employees only access their own assigned tasks
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view relevant tasks" ON tasks;

-- Create improved policy with proper employee filtering
CREATE POLICY "Users can view relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    -- User is assigned to this task
    (select auth.uid()) = assigned_to
    -- User created this task
    OR (select auth.uid()) = assigned_by
    -- User is an admin (can see all tasks)
    OR is_admin()
  );
