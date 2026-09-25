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

-- Remove old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their relevant customers" ON customers;

-- Remove old UPDATE policy that conflicts with the new one
DROP POLICY IF EXISTS "Agents can update assigned customers" ON customers;

-- Remove old INSERT policy that conflicts with the new one
DROP POLICY IF EXISTS "Agents can insert customers" ON customers;

-- Drop extra duplicate SELECT policies
DROP POLICY IF EXISTS "Super admins view all customers" ON customers;
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON customers;
DROP POLICY IF EXISTS "Super admins can view all customers" ON customers;
