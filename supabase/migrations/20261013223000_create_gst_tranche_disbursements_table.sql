/*
  # Create gst_tranche_disbursements Table

  ## Purpose
  Tracks loan tranche disbursements from bank statements against PM Surya Ghar customers.
  Allows admin to:
  1. View 1st tranche, 2nd tranche, and lump-sum disbursals with dates & UTRs.
  2. Sort by date (newest/oldest).
  3. Link/relink directly to CRM customers.
  4. Track and mark whether GST tax invoice has been raised or is pending.
*/

CREATE TABLE IF NOT EXISTS gst_tranche_disbursements (
  id text PRIMARY KEY,
  customer_name text NOT NULL,
  category text NOT NULL, -- 'both_tranches', 'single_tranche', 'lumpsum'
  bank_name text,
  t1_date text,
  t1_amount numeric DEFAULT 0,
  t1_utr text,
  t2_date text,
  t2_amount numeric DEFAULT 0,
  t2_utr text,
  total_amount numeric DEFAULT 0,
  est_pending numeric DEFAULT 0,
  status text,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  is_gst_invoiced boolean DEFAULT false,
  invoice_file text,
  invoice_number text,
  invoice_date text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gtd_category ON gst_tranche_disbursements(category);
CREATE INDEX IF NOT EXISTS idx_gtd_customer_id ON gst_tranche_disbursements(customer_id);
CREATE INDEX IF NOT EXISTS idx_gtd_is_gst_invoiced ON gst_tranche_disbursements(is_gst_invoiced);

ALTER TABLE gst_tranche_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to gst_tranche_disbursements" ON gst_tranche_disbursements;
CREATE POLICY "Admins full access to gst_tranche_disbursements"
  ON gst_tranche_disbursements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR 'admin' = ANY(profiles.roles))
    )
  );
