/*
  # Optimize Indexes and Consolidate RLS Policies

  ## Overview
  This migration optimizes database performance by:
  1. Removing premature optimization indexes that aren't needed yet
  2. Keeping critical indexes for RLS policies and foreign keys
  3. Consolidating redundant RLS policies for better performance

  ## Index Strategy
  
  ### Indexes KEPT (Critical for RLS/FKs/Performance):
  - task_customers: task_id, customer_id (used in RLS joins)
  - tasks: assigned_to, customer_id, assigned_by (heavily used in RLS)
  - user_roles: user_id, role_id (critical for user_has_role function)
  - customer_notes: customer_id (foreign key lookups)
  - task_notes: task_id (foreign key lookups)
  - activity_logs: entity index (critical for RLS)
  
  ### Indexes REMOVED (Premature Optimization):
  - Status-based indexes (can be added later when needed)
  - User-created timestamp indexes (not queried yet)
  - Single-column indexes that aren't used in RLS
  - Partial indexes that don't provide value yet

  ## Policy Consolidation
  Merges multiple permissive policies into single policies where appropriate
  for better query planning and performance.

  ## Impact
  - Reduces storage overhead
  - Improves write performance (fewer indexes to maintain)
  - Simplifies RLS policy evaluation
  - Can add indexes back if query patterns demand them
*/

-- ============================================================================
-- Part 1: Remove Unnecessary Indexes
-- ============================================================================

-- Remove status-based indexes (premature optimization)
DROP INDEX IF EXISTS idx_task_customers_status;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_loan_disbursements_status;
DROP INDEX IF EXISTS idx_customer_payments_status;

-- Remove audit/tracking indexes not used in RLS
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;

-- Remove template and expense creator indexes
DROP INDEX IF EXISTS idx_document_templates_created_by;
DROP INDEX IF EXISTS idx_customer_expenses_created_by;

-- Remove customer search indexes (can add back if search is implemented)
DROP INDEX IF EXISTS idx_customers_quotation_number;
DROP INDEX IF EXISTS idx_customers_lead_generated_by;
DROP INDEX IF EXISTS idx_customers_verified_by;
DROP INDEX IF EXISTS idx_customers_aadhar;
DROP INDEX IF EXISTS idx_customers_pan;
DROP INDEX IF EXISTS idx_customers_payment_method;
DROP INDEX IF EXISTS idx_customers_district_name;
DROP INDEX IF EXISTS idx_customers_overall_status;

-- Remove note metadata indexes (not used in RLS or queries yet)
DROP INDEX IF EXISTS idx_customer_notes_user_id;
DROP INDEX IF EXISTS idx_customer_notes_created_at;
DROP INDEX IF EXISTS idx_customer_notes_note_type;
DROP INDEX IF EXISTS idx_customer_notes_is_pinned;
DROP INDEX IF EXISTS idx_task_notes_user_id;
DROP INDEX IF EXISTS idx_task_notes_created_at;

-- Remove activity log indexes (not critical for current usage)
DROP INDEX IF EXISTS idx_activity_logs_user_id;
DROP INDEX IF EXISTS idx_activity_logs_created_at;

-- ============================================================================
-- Part 2: Consolidate Multiple Permissive Policies
-- ============================================================================

-- Consolidate profiles SELECT policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin() 
    OR id = (select auth.uid())
  );

-- Consolidate profiles UPDATE policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_admin() 
    OR id = (select auth.uid())
  )
  WITH CHECK (
    public.current_user_is_admin() 
    OR id = (select auth.uid())
  );

-- Consolidate custom_statuses SELECT policies
DROP POLICY IF EXISTS "Admins can manage custom statuses" ON custom_statuses;
DROP POLICY IF EXISTS "All authenticated users can view active custom statuses" ON custom_statuses;
CREATE POLICY "Users can view custom statuses"
  ON custom_statuses FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin() 
    OR is_active = true
  );

-- Re-create admin management policy for custom_statuses (INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can manage custom statuses"
  ON custom_statuses FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Consolidate customer_expenses SELECT policies
DROP POLICY IF EXISTS "Admins can manage all expenses" ON customer_expenses;
DROP POLICY IF EXISTS "Agents can view expenses for their customers" ON customer_expenses;
CREATE POLICY "Users can view customer expenses"
  ON customer_expenses FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = customer_expenses.customer_id
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  );

-- Re-create admin management policy for customer_expenses
CREATE POLICY "Admins can manage customer expenses"
  ON customer_expenses FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Consolidate document_templates SELECT policies
DROP POLICY IF EXISTS "Admins can manage templates" ON document_templates;
DROP POLICY IF EXISTS "All users can view active templates" ON document_templates;
CREATE POLICY "Users can view document templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin() 
    OR is_active = true
  );

-- Re-create admin management policy for document_templates
CREATE POLICY "Admins can manage document templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- Consolidate customer_payments SELECT policies
DROP POLICY IF EXISTS "Admins can view all customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Employees can view all customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Agents can view payments for their customers" ON customer_payments;
CREATE POLICY "Users can view customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = customer_payments.customer_id
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  );

-- Consolidate customer_payments INSERT policies
DROP POLICY IF EXISTS "Admins can insert customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Employees can insert customer payments" ON customer_payments;
CREATE POLICY "Authorized users can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
  );

-- Consolidate customer_payments UPDATE policies
DROP POLICY IF EXISTS "Admins can update customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Employees can update customer payments" ON customer_payments;
CREATE POLICY "Authorized users can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
  );

-- Consolidate loan_disbursements SELECT policies
DROP POLICY IF EXISTS "Admins can view all loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Employees can view all loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Agents can view disbursements for their customers" ON loan_disbursements;
CREATE POLICY "Users can view loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = loan_disbursements.customer_id
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  );

-- Consolidate loan_disbursements INSERT policies
DROP POLICY IF EXISTS "Admins can insert loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Employees can insert loan disbursements" ON loan_disbursements;
CREATE POLICY "Authorized users can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
  );

-- Consolidate loan_disbursements UPDATE policies
DROP POLICY IF EXISTS "Admins can update loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Employees can update loan disbursements" ON loan_disbursements;
CREATE POLICY "Authorized users can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR
    public.user_has_role((select auth.uid()), 'employee')
  );

-- ============================================================================
-- Part 3: Add Comment for Password Protection
-- ============================================================================

COMMENT ON DATABASE postgres IS 'Note: Enable "Leaked Password Protection" in Supabase Dashboard > Authentication > Settings to check passwords against HaveIBeenPwned.org for additional security.';