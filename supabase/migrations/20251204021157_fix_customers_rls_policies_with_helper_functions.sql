/*
  # Fix Customers RLS Policies with Helper Functions
  
  ## Overview
  This migration updates the customers table RLS policies to use security definer
  helper functions, preventing recursion issues and fixing import failures.
  
  ## Problem
  The current policies directly query the profiles table, causing recursion and
  "Failed to fetch" errors during bulk imports.
  
  ## Solution
  1. Update all customer policies to use helper functions (is_admin, is_admin_or_employee)
  2. Support both agent_id and assigned_agent_id fields
  3. Prevent RLS recursion
  
  ## Changes
  - Drop existing recursive policies
  - Create new non-recursive policies using helper functions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their relevant customers" ON customers;
DROP POLICY IF EXISTS "Agents can insert customers" ON customers;
DROP POLICY IF EXISTS "Agents can update assigned customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

-- Users can view customers they're associated with
CREATE POLICY "Users can view their relevant customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = agent_id 
    OR (select auth.uid()) = assigned_agent_id
    OR is_admin_or_employee()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.customer_id = customers.id
      AND tasks.assigned_to = (select auth.uid())
    )
  );

-- Agents can insert customers assigned to themselves, admins can insert any
CREATE POLICY "Agents can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = agent_id
    OR (select auth.uid()) = assigned_agent_id
    OR is_admin()
  );

-- Agents can update customers assigned to them, admins can update any
CREATE POLICY "Agents can update assigned customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = agent_id 
    OR (select auth.uid()) = assigned_agent_id
    OR is_admin()
  )
  WITH CHECK (
    (select auth.uid()) = agent_id 
    OR (select auth.uid()) = assigned_agent_id
    OR is_admin()
  );

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (is_admin());
