/*
  # Fix Tenant Creation Policies for Super Admins

  ## Changes
  - Add explicit policy for super admins to insert tenant_usage records
  - Ensure super admins can complete full tenant creation flow

  ## Security
  - Maintains existing RLS while adding super admin access
*/

-- Add explicit super admin policy for tenant_usage
CREATE POLICY "Super admins can manage all usage"
  ON tenant_usage FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
