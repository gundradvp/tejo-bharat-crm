/*
  # Update Employee Permissions for Customer Access

  ## Overview
  This migration updates RLS policies to allow employees to:
  1. View all customers in their organization (tenant)
  2. Edit all customers in their organization
  3. Add technical details to any customer in their organization

  ## Changes
  - Updates customer SELECT policy to allow all employees to view all tenant customers
  - Updates customer UPDATE policy to allow all employees to edit all tenant customers
  - Maintains tenant isolation for security

  ## Security
  - Employees can only access customers in their own tenant
  - Super admins can still access all customers across all tenants
  - Tenant isolation is maintained
*/

-- Drop existing customer view policy
DROP POLICY IF EXISTS "Users view customers in tenant" ON customers;

-- Create new policy allowing employees to view all customers in their tenant
CREATE POLICY "Users view customers in tenant"
  ON customers FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  );

-- Drop existing customer update policy
DROP POLICY IF EXISTS "Users update customers in tenant" ON customers;

-- Create new policy allowing employees to update all customers in their tenant
CREATE POLICY "Users update customers in tenant"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
  );
