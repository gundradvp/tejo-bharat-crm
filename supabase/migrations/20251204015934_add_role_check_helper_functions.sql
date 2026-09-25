/*
  # Add Role Check Helper Functions
  
  ## Overview
  This migration adds security definer helper functions to check user roles
  and prevent RLS recursion issues across all tables.
  
  ## New Functions
  1. is_employee() - Check if user is an employee
  2. is_admin_or_employee() - Check if user is admin or employee
  3. user_has_customer_access() - Check if user can access a customer
  
  ## Benefits
  - Prevents RLS recursion issues
  - Improves query performance
  - Makes policies more maintainable
*/

-- Check if current user is an employee
CREATE OR REPLACE FUNCTION is_employee()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role = 'employee'
  );
$$;

-- Check if current user is admin or employee
CREATE OR REPLACE FUNCTION is_admin_or_employee()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid()) AND role IN ('admin', 'employee')
  );
$$;

-- Check if user has access to a specific customer
CREATE OR REPLACE FUNCTION user_has_customer_access(customer_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = customer_uuid
    AND (
      agent_id = (select auth.uid())
      OR assigned_agent_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'employee')
      )
    )
  );
$$;

-- Update loan_disbursements policies to use helper functions
DROP POLICY IF EXISTS "Admins can view all loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can view all loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Employees can view all loan disbursements" ON loan_disbursements;
CREATE POLICY "Employees can view all loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (is_employee());

DROP POLICY IF EXISTS "Agents can view disbursements for their customers" ON loan_disbursements;
CREATE POLICY "Agents can view disbursements for their customers"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = loan_disbursements.customer_id
      AND customers.agent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Employees can insert loan disbursements" ON loan_disbursements;
CREATE POLICY "Employees can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (is_employee());

DROP POLICY IF EXISTS "Admins can update loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Employees can update loan disbursements" ON loan_disbursements;
CREATE POLICY "Employees can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (is_employee())
  WITH CHECK (is_employee());

DROP POLICY IF EXISTS "Admins can delete loan disbursements" ON loan_disbursements;
CREATE POLICY "Admins can delete loan disbursements"
  ON loan_disbursements FOR DELETE
  TO authenticated
  USING (is_admin());

-- Update customer_payments policies to use helper functions
DROP POLICY IF EXISTS "Admins can view all customer payments" ON customer_payments;
CREATE POLICY "Admins can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Employees can view all customer payments" ON customer_payments;
CREATE POLICY "Employees can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (is_employee());

DROP POLICY IF EXISTS "Agents can view payments for their customers" ON customer_payments;
CREATE POLICY "Agents can view payments for their customers"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_payments.customer_id
      AND customers.agent_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can insert customer payments" ON customer_payments;
CREATE POLICY "Admins can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Employees can insert customer payments" ON customer_payments;
CREATE POLICY "Employees can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (is_employee());

DROP POLICY IF EXISTS "Admins can update customer payments" ON customer_payments;
CREATE POLICY "Admins can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Employees can update customer payments" ON customer_payments;
CREATE POLICY "Employees can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (is_employee())
  WITH CHECK (is_employee());

DROP POLICY IF EXISTS "Admins can delete customer payments" ON customer_payments;
CREATE POLICY "Admins can delete customer payments"
  ON customer_payments FOR DELETE
  TO authenticated
  USING (is_admin());
