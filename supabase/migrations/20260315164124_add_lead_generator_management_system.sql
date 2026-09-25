/*
  # Lead Generator Management System

  1. New Tables
    - `lead_generators`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `user_id` (uuid, nullable - references auth.users if they have app access)
      - `full_name` (text, required)
      - `phone` (text, required)
      - `email` (text, nullable)
      - `address` (text, nullable)
      - `commission_rate` (numeric, default 0)
      - `status` (text, default 'active') - active, inactive
      - `added_by_user_id` (uuid, references auth.users)
      - `added_at` (timestamptz, default now())
      - `notes` (text, nullable)
      
    - `lead_generator_advances`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, references tenants)
      - `lead_generator_id` (uuid, references lead_generators)
      - `customer_id` (uuid, references customers)
      - `amount` (numeric, required)
      - `payment_date` (date, required)
      - `payment_method` (text) - cash, bank_transfer, upi, cheque
      - `reference_number` (text, nullable)
      - `notes` (text, nullable)
      - `given_by_user_id` (uuid, references auth.users)
      - `created_at` (timestamptz, default now())

  2. Modified Tables
    - `customers` - Add fields:
      - `introduced_by_lead_generator_id` (uuid, references lead_generators)
      - `introduction_date` (date, nullable)
      - `introduction_notes` (text, nullable)
      - `commission_amount` (numeric, default 0)
      - `commission_paid` (boolean, default false)
      - `commission_paid_date` (date, nullable)

  3. Security
    - Enable RLS on all new tables
    - Add policies for tenant isolation
    - Employees can view and manage lead generators
    - Admins have full access
    - Track who added/modified records

  4. Indexes
    - Index on tenant_id for performance
    - Index on lead_generator_id for lookups
    - Index on customer_id for tracking
*/

-- Create lead_generators table
CREATE TABLE IF NOT EXISTS lead_generators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  commission_rate numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  added_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create lead_generator_advances table
CREATE TABLE IF NOT EXISTS lead_generator_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_generator_id uuid NOT NULL REFERENCES lead_generators(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'upi', 'cheque', 'other')),
  reference_number text,
  notes text,
  given_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add lead generator tracking fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'introduced_by_lead_generator_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN introduced_by_lead_generator_id uuid REFERENCES lead_generators(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'introduction_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN introduction_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'introduction_notes'
  ) THEN
    ALTER TABLE customers ADD COLUMN introduction_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE customers ADD COLUMN commission_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'commission_paid'
  ) THEN
    ALTER TABLE customers ADD COLUMN commission_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'commission_paid_date'
  ) THEN
    ALTER TABLE customers ADD COLUMN commission_paid_date date;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_generators_tenant_id ON lead_generators(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_generators_status ON lead_generators(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_generator_advances_tenant_id ON lead_generator_advances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_generator_advances_lead_gen_id ON lead_generator_advances(lead_generator_id);
CREATE INDEX IF NOT EXISTS idx_lead_generator_advances_customer_id ON lead_generator_advances(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_generator_id ON customers(introduced_by_lead_generator_id);

-- Enable RLS
ALTER TABLE lead_generators ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_generator_advances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_generators
CREATE POLICY "Users can view lead generators in their tenant"
  ON lead_generators FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Employees and admins can insert lead generators"
  ON lead_generators FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (is_admin() OR is_employee())
  );

CREATE POLICY "Employees and admins can update lead generators"
  ON lead_generators FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (is_admin() OR is_employee())
  );

CREATE POLICY "Admins can delete lead generators"
  ON lead_generators FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_admin()
  );

-- RLS Policies for lead_generator_advances
CREATE POLICY "Users can view advances in their tenant"
  ON lead_generator_advances FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Employees and admins can insert advances"
  ON lead_generator_advances FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (is_admin() OR is_employee())
  );

CREATE POLICY "Employees and admins can update advances"
  ON lead_generator_advances FOR UPDATE
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (is_admin() OR is_employee())
  );

CREATE POLICY "Admins can delete advances"
  ON lead_generator_advances FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_admin()
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_generator_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_generators_updated_at
  BEFORE UPDATE ON lead_generators
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_generator_updated_at();

CREATE TRIGGER update_lead_generator_advances_updated_at
  BEFORE UPDATE ON lead_generator_advances
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_generator_updated_at();