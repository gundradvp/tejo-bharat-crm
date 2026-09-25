/*
  # Fix Customer Update Policy for Employees

  ## Overview
  This migration fixes the RLS policy for updating customers to allow employees
  to update customer technical details and other fields.

  ## Changes
  - Drop existing "Users update customers in tenant" policy
  - Create new policy that includes employee role
  - Employees can now update customers they have access to

  ## Security
  - Maintains tenant isolation
  - Employees can only update customers in their tenant
  - All updates still validate tenant_id
*/

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users update customers in tenant" ON customers;

-- Create new UPDATE policy that includes employees
CREATE POLICY "Users update customers in tenant"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    (
      agent_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator', 'employee'))
    )
  )
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
