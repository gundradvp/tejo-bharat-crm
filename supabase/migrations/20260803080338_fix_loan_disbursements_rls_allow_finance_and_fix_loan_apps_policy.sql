-- Fix loan_disbursements RLS: allow finance role in addition to admin/employee
DROP POLICY IF EXISTS "insert_loan_disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "select_loan_disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "update_loan_disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "delete_loan_disbursements" ON loan_disbursements;

CREATE POLICY "select_loan_disbursements" ON loan_disbursements
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (current_user_is_admin_or_employee() OR user_has_role(auth.uid(), 'finance'))
  );

CREATE POLICY "insert_loan_disbursements" ON loan_disbursements
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (current_user_is_admin_or_employee() OR user_has_role(auth.uid(), 'finance'))
  );

CREATE POLICY "update_loan_disbursements" ON loan_disbursements
  FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (current_user_is_admin_or_employee() OR user_has_role(auth.uid(), 'finance'))
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (current_user_is_admin_or_employee() OR user_has_role(auth.uid(), 'finance'))
  );

CREATE POLICY "delete_loan_disbursements" ON loan_disbursements
  FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (current_user_is_admin_or_employee() OR user_has_role(auth.uid(), 'finance'))
  );

-- Fix loan_applications FOR ALL policy: replace raw profiles subquery with
-- SECURITY DEFINER function to avoid RLS recursion for non-admin users
DROP POLICY IF EXISTS "tenant_all_loan_applications" ON loan_applications;

CREATE POLICY "tenant_all_loan_applications" ON loan_applications
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
