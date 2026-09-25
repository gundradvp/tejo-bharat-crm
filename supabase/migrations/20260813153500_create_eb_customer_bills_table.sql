/*
# Create EB Customer Bills table

1. New Tables
- `eb_customer_bills`: Stores monthly electricity bill data (month, billed units, bill amount) linked to EB customers by SC number.
  - `id` (uuid, PK)
  - `tenant_id` (uuid, tenant isolation)
  - `eb_customer_id` (uuid, FK to eb_customers, cascade delete)
  - `sc_number` (text, the SC number from the bill file, used for matching during import)
  - `bill_month` (text, e.g. "Aug-26")
  - `bill_year` (int, derived from bill_month for sorting)
  - `bill_month_index` (int, 1-12 for sorting within a year)
  - `billed_units` (numeric, units consumed)
  - `bill_amount` (numeric, bill amount in rupees)
  - `bill_status` (text, e.g. "Success", "No Record Found")
  - `created_at` (timestamptz)

2. Indexes
- Unique index on (tenant_id, eb_customer_id, bill_month) to prevent duplicate months
- Index on (tenant_id, sc_number) for import matching
- Index on (tenant_id, bill_amount) for amount range filtering
- Index on (tenant_id, billed_units) for unit range filtering

3. Security
- RLS enabled with tenant-scoped CRUD policies (same pattern as eb_customers)
*/

CREATE TABLE IF NOT EXISTS eb_customer_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT get_current_user_tenant_id(),
  eb_customer_id uuid REFERENCES eb_customers(id) ON DELETE CASCADE,
  sc_number text NOT NULL,
  bill_month text,
  bill_year int,
  bill_month_index int,
  billed_units numeric,
  bill_amount numeric,
  bill_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE eb_customer_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_eb_customer_bills" ON eb_customer_bills;
CREATE POLICY "select_eb_customer_bills" ON eb_customer_bills FOR SELECT
  TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "insert_eb_customer_bills" ON eb_customer_bills;
CREATE POLICY "insert_eb_customer_bills" ON eb_customer_bills FOR INSERT
  TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "update_eb_customer_bills" ON eb_customer_bills;
CREATE POLICY "update_eb_customer_bills" ON eb_customer_bills FOR UPDATE
  TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "delete_eb_customer_bills" ON eb_customer_bills;
CREATE POLICY "delete_eb_customer_bills" ON eb_customer_bills FOR DELETE
  TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_bills_tenant_customer_month
  ON eb_customer_bills(tenant_id, eb_customer_id, bill_month);

CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_sc ON eb_customer_bills(tenant_id, sc_number);
CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_amount ON eb_customer_bills(tenant_id, bill_amount);
CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_units ON eb_customer_bills(tenant_id, billed_units);
CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_customer ON eb_customer_bills(tenant_id, eb_customer_id);
