/*
  # Fix Customers RLS Policies

  ## Description
  Updates RLS policies on customers table to use the correct column name `assigned_agent_id`
  instead of `agent_id`.

  ## Changes
  1. Drops old policies that reference `agent_id`
  2. Creates new policies that reference `assigned_agent_id`
  3. Ensures agents can only see and modify customers assigned to them

  ## Security
  - Agents can only SELECT customers where assigned_agent_id matches their user ID
  - Agents can only INSERT customers where assigned_agent_id matches their user ID
  - Agents can only UPDATE customers where assigned_agent_id matches their user ID
  - Only admins can DELETE customers
*/

-- Drop old policies
DROP POLICY IF EXISTS "Agents can view own customers" ON customers;
DROP POLICY IF EXISTS "Agents can insert customers" ON customers;
DROP POLICY IF EXISTS "Agents can update own customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

-- Create new policies with correct column name
CREATE POLICY "Agents can view assigned customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (assigned_agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can insert customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (assigned_agent_id = auth.uid() OR is_admin());

CREATE POLICY "Agents can update assigned customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (assigned_agent_id = auth.uid() OR is_admin())
  WITH CHECK (assigned_agent_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can delete customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (is_admin());
