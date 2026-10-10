/*
  # GST Input Tax Credit (ITC) & Portal Reconciliation Center

  1. New Table:
    - `gst_input_credits`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `return_period` (text, e.g. '04-2026', '05-2026')
      - `source_type` (text) - 'gstr2b', 'gstr2a', 'manual'
      - `supplier_gstin` (text)
      - `supplier_name` (text)
      - `invoice_number` (text)
      - `invoice_type` (text) - 'R' (Regular), 'C' (Credit Note), 'D' (Debit Note)
      - `invoice_date` (date)
      - `invoice_value` (numeric)
      - `taxable_value` (numeric)
      - `igst_amount` (numeric)
      - `cgst_amount` (numeric)
      - `sgst_amount` (numeric)
      - `cess_amount` (numeric)
      - `total_tax` (numeric)
      - `itc_availability` (text) - 'Y' (Yes), 'N' (No)
      - `reconciliation_status` (text) - 'matched', 'unmatched', 'manually_matched', 'disputed'
      - `customer_id` (uuid, optional foreign key to customers)
      - `expense_id` (uuid, optional foreign key to customer_expenses)
      - `notes` (text)
      - `raw_data` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security:
    - Enable RLS on `gst_input_credits`
    - Add tenant-isolated RLS policies
*/

CREATE TABLE IF NOT EXISTS gst_input_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  return_period text NOT NULL,
  source_type text DEFAULT 'gstr2b' CHECK (source_type IN ('gstr2b', 'gstr2a', 'manual')),
  supplier_gstin text NOT NULL,
  supplier_name text NOT NULL,
  invoice_number text NOT NULL,
  invoice_type text DEFAULT 'R',
  invoice_date date,
  invoice_value numeric(12, 2) DEFAULT 0,
  taxable_value numeric(12, 2) DEFAULT 0,
  igst_amount numeric(12, 2) DEFAULT 0,
  cgst_amount numeric(12, 2) DEFAULT 0,
  sgst_amount numeric(12, 2) DEFAULT 0,
  cess_amount numeric(12, 2) DEFAULT 0,
  total_tax numeric(12, 2) DEFAULT 0,
  itc_availability text DEFAULT 'Y',
  reconciliation_status text DEFAULT 'unmatched' CHECK (reconciliation_status IN ('matched', 'unmatched', 'manually_matched', 'disputed')),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES customer_expenses(id) ON DELETE SET NULL,
  notes text,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique index to prevent duplicate invoice imports per tenant & supplier
CREATE UNIQUE INDEX IF NOT EXISTS idx_gst_input_credits_unique_inv 
  ON gst_input_credits(tenant_id, supplier_gstin, invoice_number, return_period);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_gst_input_credits_period ON gst_input_credits(tenant_id, return_period);
CREATE INDEX IF NOT EXISTS idx_gst_input_credits_supplier ON gst_input_credits(supplier_name);
CREATE INDEX IF NOT EXISTS idx_gst_input_credits_status ON gst_input_credits(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_gst_input_credits_customer ON gst_input_credits(customer_id);

-- Enable RLS
ALTER TABLE gst_input_credits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view gst input credits in their tenant"
  ON gst_input_credits FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert gst input credits in their tenant"
  ON gst_input_credits FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update gst input credits in their tenant"
  ON gst_input_credits FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete gst input credits in their tenant"
  ON gst_input_credits FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
