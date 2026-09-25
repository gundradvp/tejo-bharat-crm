/*
  # Fix Customers RLS with Direct Subquery

  ## Overview
  Replace the get_user_tenant_id function call with a direct subquery in RLS policies
  to ensure proper tenant isolation works in all contexts.

  ## Changes
  - Drop existing SELECT policies on customers
  - Create new SELECT policy using direct subquery instead of function call
  - This ensures the policy works correctly with auth.uid() in all contexts

  ## Security
  - Maintains strict tenant isolation
  - All authenticated users can see customers in their tenant
  - Super admins can see all customers
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users view customers in tenant" ON customers;
DROP POLICY IF EXISTS "Super admins view all customers" ON customers;

-- Create new SELECT policy with direct subquery
CREATE POLICY "Users can view customers in their tenant"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Super admins can see everything
CREATE POLICY "Super admins can view all customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
  );
