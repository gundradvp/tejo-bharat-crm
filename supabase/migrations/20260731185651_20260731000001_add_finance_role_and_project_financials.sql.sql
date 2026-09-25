/*
  # Add Finance Role, Project Financial Summary, and Margin Transactions

  ## Overview
  This migration introduces a new "finance" role and the financial data structures
  needed to track project profitability for solar installation projects.

  It adds:
  1. A new "finance" user role (alongside admin, lead_generator, employee)
  2. A project_financial_summary table (admin-only) capturing the bank-quotation
     to customer-margin math (agreed cost, quotation given to bank, loan %,
     loan amount from bank, customer margin, margin provided, margin pending)
  3. A margin_transactions table tracking each payout the company gives back to
     the customer from their margin (to be collected later, after subsidy)
  4. RLS policies that:
     - Let the finance role add/edit/delete customer_expenses (but not see any
       financial summary, loan, payment, or profit data)
     - Keep loan_disbursements, customer_payments, and project_financial_summary
       blocked from the finance role
  5. Tenant isolation on customer_expenses (currently missing)

  ## Detailed Example (from the owner's workflow)
  Agreed project cost = 210,000.
  Quotation given to bank = 220,000.
  Bank gives 90% as loan = 198,000.
  Customer margin = 22,000 (the 10% the bank does not cover).
  If the customer cannot pay the margin now, the company may provide part or all
  of the 22,000 to the customer and collect it later (after subsidy).
  Each such payout is a margin_transaction. The summary tracks total provided
  and total still pending to collect from the customer.

  ## New Tables

  ### project_financial_summary
  Admin-only financial summary per customer project.
  - id (uuid, pk)
  - customer_id (uuid, fk -> customers, unique)
  - agreed_project_cost (numeric) — the real agreed cost with the customer
  - quotation_to_bank (numeric) — the inflated quotation shown to the bank
  - bank_loan_percentage (numeric) — % of quotation the bank gives as loan (e.g. 90)
  - bank_loan_amount (numeric) — computed: quotation_to_bank * bank_loan_percentage / 100
  - customer_margin (numeric) — computed: quotation_to_bank - bank_loan_amount
  - margin_provided (numeric) — running total of margin given back to customer
  - margin_pending (numeric) — computed: customer_margin - margin_provided
  - loan_from_bank_received (numeric) — running total received from bank
  - customer_payment_received (numeric) — running total received from customer
  - notes (text)
  - tenant_id (uuid)
  - created_at, updated_at (timestamptz)

  ### margin_transactions
  Each dated payout the company gives the customer from their margin.
  - id (uuid, pk)
  - customer_id (uuid, fk -> customers)
  - amount (numeric) — amount provided to the customer in this transaction
  - transaction_date (date)
  - description (text)
  - collected_back (boolean, default false) — whether this has been collected back
  - collected_date (date) — when it was collected back from the customer
  - created_by (uuid, fk -> profiles)
  - tenant_id (uuid)
  - created_at (timestamptz)

  ## Modified Tables

  ### roles
  - CHECK constraint on roles.name expanded to include 'finance'

  ### customer_expenses
  - Added tenant_id column (was missing; needed for tenant isolation + finance role)
  - Added created_by default to auth.uid()
  - RLS replaced: finance role can INSERT/UPDATE/DELETE; admin and employee keep access;
    lead_generator keeps read for own customers; tenant isolation enforced.

  ### loan_disbursements
  - RLS tightened: previously was a wide-open tenant policy allowing ANY
    authenticated user in the tenant to see all loan disbursements. Now restricted
    to admin + employee only (finance role explicitly excluded).

  ## Security Changes
  - New "finance" role added to the roles table and CHECK constraint.
  - project_financial_summary: admin-only SELECT/INSERT/UPDATE/DELETE, tenant-isolated.
  - margin_transactions: admin-only all operations, tenant-isolated.
  - customer_expenses: finance role gets full CRUD within their tenant; admin,
    employee retain access; lead_generator read-only for own customers.
  - loan_disbursements: tightened to admin + employee only.
  - Helper functions: current_user_is_finance() and current_user_is_admin_or_employee().

  ## Important Notes
  1. The finance role can add expenses but CANNOT see project_financial_summary,
     margin_transactions, loan_disbursements, or customer_payments. The profit
     view is admin-only by design.
  2. bank_loan_amount, customer_margin, and margin_pending on
     project_financial_summary are computed columns maintained by a trigger so
     they stay consistent with the source values.
  3. margin_provided on project_financial_summary is maintained by a trigger on
     margin_transactions so it always equals the sum of uncollected payouts.
  4. All new tables are tenant-isolated using get_user_tenant_id(auth.uid()).
*/

-- ============================================================================
-- 1. Add "finance" role
-- ============================================================================

ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;
ALTER TABLE roles ADD CONSTRAINT roles_name_check
  CHECK (name IN ('admin', 'lead_generator', 'employee', 'finance'));

INSERT INTO roles (name, display_name, description) VALUES
  ('finance', 'Finance', 'Can add and manage project expenses but cannot view full financials or profit')
ON CONFLICT (name) DO NOTHING;

-- Helper function for finance role check
CREATE OR REPLACE FUNCTION current_user_is_finance()
RETURNS boolean AS $$
BEGIN
  RETURN user_has_role(auth.uid(), 'finance');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: user is admin or employee (used for loan/payment access)
CREATE OR REPLACE FUNCTION current_user_is_admin_or_employee()
RETURNS boolean AS $$
BEGIN
  RETURN current_user_is_admin() OR user_has_role(auth.uid(), 'employee');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. project_financial_summary table
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_financial_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  agreed_project_cost numeric DEFAULT 0,
  quotation_to_bank numeric DEFAULT 0,
  bank_loan_percentage numeric DEFAULT 90,
  bank_loan_amount numeric DEFAULT 0,
  customer_margin numeric DEFAULT 0,
  margin_provided numeric DEFAULT 0,
  margin_pending numeric DEFAULT 0,
  loan_from_bank_received numeric DEFAULT 0,
  customer_payment_received numeric DEFAULT 0,
  notes text DEFAULT '',
  tenant_id uuid NOT NULL DEFAULT get_user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to auto-compute bank_loan_amount, customer_margin, margin_pending
CREATE OR REPLACE FUNCTION compute_financial_summary()
RETURNS trigger AS $$
BEGIN
  NEW.bank_loan_amount := ROUND((COALESCE(NEW.quotation_to_bank, 0) * COALESCE(NEW.bank_loan_percentage, 0) / 100), 2);
  NEW.customer_margin := ROUND((COALESCE(NEW.quotation_to_bank, 0) - NEW.bank_loan_amount), 2);
  NEW.margin_pending := ROUND((NEW.customer_margin - COALESCE(NEW.margin_provided, 0)), 2);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_compute_financial_summary ON project_financial_summary;
CREATE TRIGGER trg_compute_financial_summary
  BEFORE INSERT OR UPDATE ON project_financial_summary
  FOR EACH ROW EXECUTE FUNCTION compute_financial_summary();

ALTER TABLE project_financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_financial_summary" ON project_financial_summary;
CREATE POLICY "admin_select_financial_summary"
  ON project_financial_summary FOR SELECT TO authenticated
  USING (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_financial_summary" ON project_financial_summary;
CREATE POLICY "admin_insert_financial_summary"
  ON project_financial_summary FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "admin_update_financial_summary" ON project_financial_summary;
CREATE POLICY "admin_update_financial_summary"
  ON project_financial_summary FOR UPDATE TO authenticated
  USING (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_financial_summary" ON project_financial_summary;
CREATE POLICY "admin_delete_financial_summary"
  ON project_financial_summary FOR DELETE TO authenticated
  USING (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================================
-- 3. margin_transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS margin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description text DEFAULT '',
  collected_back boolean DEFAULT false,
  collected_date date,
  created_by uuid DEFAULT auth.uid() REFERENCES profiles(id),
  tenant_id uuid NOT NULL DEFAULT get_user_tenant_id(auth.uid()),
  created_at timestamptz DEFAULT now()
);

-- Trigger to update margin_provided on the summary when a margin_transaction changes
CREATE OR REPLACE FUNCTION update_margin_provided()
RETURNS trigger AS $$
DECLARE
  v_customer_id uuid;
  v_total numeric;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
  IF v_customer_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT ROUND(SUM(amount), 2) INTO v_total
  FROM margin_transactions
  WHERE customer_id = v_customer_id AND collected_back = false;

  UPDATE project_financial_summary
  SET margin_provided = COALESCE(v_total, 0),
      margin_pending = ROUND((customer_margin - COALESCE(v_total, 0)), 2),
      updated_at = now()
  WHERE customer_id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_margin_provided ON margin_transactions;
CREATE TRIGGER trg_update_margin_provided
  AFTER INSERT OR UPDATE OR DELETE ON margin_transactions
  FOR EACH ROW EXECUTE FUNCTION update_margin_provided();

ALTER TABLE margin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_margin_transactions" ON margin_transactions;
CREATE POLICY "admin_select_margin_transactions"
  ON margin_transactions FOR SELECT TO authenticated
  USING (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "admin_insert_margin_transactions" ON margin_transactions;
CREATE POLICY "admin_insert_margin_transactions"
  ON margin_transactions FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "admin_update_margin_transactions" ON margin_transactions;
CREATE POLICY "admin_update_margin_transactions"
  ON margin_transactions FOR UPDATE TO authenticated
  USING (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_margin_transactions" ON margin_transactions;
CREATE POLICY "admin_delete_margin_transactions"
  ON margin_transactions FOR DELETE TO authenticated
  USING (current_user_is_admin() AND tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================================
-- 4. Add tenant_id to customer_expenses (was missing)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_expenses' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE customer_expenses ADD COLUMN tenant_id uuid;
  END IF;
END $$;

-- Backfill tenant_id from the customer
UPDATE customer_expenses ce
SET tenant_id = c.tenant_id
FROM customers c
WHERE ce.customer_id = c.id AND ce.tenant_id IS NULL;

-- Make NOT NULL after backfill (only if there are no orphaned expenses)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customer_expenses WHERE tenant_id IS NULL) THEN
    ALTER TABLE customer_expenses ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE customer_expenses ALTER COLUMN tenant_id SET DEFAULT get_user_tenant_id(auth.uid());
  END IF;
END $$;

-- Ensure created_by defaults to current user
ALTER TABLE customer_expenses ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ============================================================================
-- 5. Replace customer_expenses RLS policies for finance role + tenant isolation
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can manage customer expenses" ON customer_expenses;
DROP POLICY IF EXISTS "Agents can view expenses for their customers" ON customer_expenses;
DROP POLICY IF EXISTS "tenant_all_customer_expenses" ON customer_expenses;

-- SELECT: admin, employee, finance can see all in tenant; lead_generator sees own customers
DROP POLICY IF EXISTS "select_customer_expenses" ON customer_expenses;
CREATE POLICY "select_customer_expenses"
  ON customer_expenses FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      current_user_is_admin()
      OR user_has_role(auth.uid(), 'employee')
      OR current_user_is_finance()
      OR (current_user_is_lead_generator() AND EXISTS (
        SELECT 1 FROM customers
        WHERE customers.id = customer_expenses.customer_id
        AND customers.assigned_agent_id = auth.uid()
      ))
    )
  );

-- INSERT: admin, employee, finance can insert in tenant
DROP POLICY IF EXISTS "insert_customer_expenses" ON customer_expenses;
CREATE POLICY "insert_customer_expenses"
  ON customer_expenses FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      current_user_is_admin()
      OR user_has_role(auth.uid(), 'employee')
      OR current_user_is_finance()
    )
  );

-- UPDATE: admin, employee, finance can update in tenant
DROP POLICY IF EXISTS "update_customer_expenses" ON customer_expenses;
CREATE POLICY "update_customer_expenses"
  ON customer_expenses FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      current_user_is_admin()
      OR user_has_role(auth.uid(), 'employee')
      OR current_user_is_finance()
    )
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      current_user_is_admin()
      OR user_has_role(auth.uid(), 'employee')
      OR current_user_is_finance()
    )
  );

-- DELETE: admin, employee, finance can delete in tenant
DROP POLICY IF EXISTS "delete_customer_expenses" ON customer_expenses;
CREATE POLICY "delete_customer_expenses"
  ON customer_expenses FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      current_user_is_admin()
      OR user_has_role(auth.uid(), 'employee')
      OR current_user_is_finance()
    )
  );

-- ============================================================================
-- 6. Tighten loan_disbursements RLS (exclude finance role)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_all_loan_disbursements" ON loan_disbursements;

DROP POLICY IF EXISTS "select_loan_disbursements" ON loan_disbursements;
CREATE POLICY "select_loan_disbursements"
  ON loan_disbursements FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND current_user_is_admin_or_employee()
  );

DROP POLICY IF EXISTS "insert_loan_disbursements" ON loan_disbursements;
CREATE POLICY "insert_loan_disbursements"
  ON loan_disbursements FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND current_user_is_admin_or_employee()
  );

DROP POLICY IF EXISTS "update_loan_disbursements" ON loan_disbursements;
CREATE POLICY "update_loan_disbursements"
  ON loan_disbursements FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND current_user_is_admin_or_employee()
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND current_user_is_admin_or_employee()
  );

DROP POLICY IF EXISTS "delete_loan_disbursements" ON loan_disbursements;
CREATE POLICY "delete_loan_disbursements"
  ON loan_disbursements FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND current_user_is_admin_or_employee()
  );

-- ============================================================================
-- 7. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_financial_summary_customer ON project_financial_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_tenant ON project_financial_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_margin_transactions_customer ON margin_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_margin_transactions_tenant ON margin_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_expenses_tenant ON customer_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_expenses_type ON customer_expenses(expense_type, expense_date);
