/*
  # Customer Inventory Allocations & Automatic Stock Deduction

  1. New Table:
    - `customer_inventory_allocations`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `customer_id` (uuid, foreign key to customers)
      - `item_id` (uuid, foreign key to items, nullable for custom items)
      - `item_name` (text)
      - `category` (text)
      - `quantity` (numeric)
      - `measuring_unit` (text)
      - `unit_cost` (numeric)
      - `total_cost` (numeric)
      - `serial_numbers` (text)
      - `dispatch_date` (date)
      - `challan_number` (text)
      - `status` (text) - 'dispatched', 'installed', 'returned'
      - `remarks` (text)
      - `expense_id` (uuid, optional link to customer_expenses)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security:
    - Enable RLS on `customer_inventory_allocations`
    - Add tenant-isolated RLS policies
*/

CREATE TABLE IF NOT EXISTS customer_inventory_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  category text,
  quantity numeric(12, 2) NOT NULL DEFAULT 1,
  measuring_unit text DEFAULT 'PCS',
  unit_cost numeric(12, 2) DEFAULT 0,
  total_cost numeric(12, 2) DEFAULT 0,
  serial_numbers text,
  dispatch_date date DEFAULT CURRENT_DATE,
  challan_number text,
  status text DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'installed', 'returned')),
  remarks text,
  expense_id uuid REFERENCES customer_expenses(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast customer lookups
CREATE INDEX IF NOT EXISTS idx_customer_inventory_allocations_customer ON customer_inventory_allocations(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_inventory_allocations_item ON customer_inventory_allocations(item_id);
CREATE INDEX IF NOT EXISTS idx_customer_inventory_allocations_tenant ON customer_inventory_allocations(tenant_id);

-- Enable RLS
ALTER TABLE customer_inventory_allocations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view customer inventory allocations in their tenant"
  ON customer_inventory_allocations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert customer inventory allocations in their tenant"
  ON customer_inventory_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update customer inventory allocations in their tenant"
  ON customer_inventory_allocations FOR UPDATE
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

CREATE POLICY "Users can delete customer inventory allocations in their tenant"
  ON customer_inventory_allocations FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );
