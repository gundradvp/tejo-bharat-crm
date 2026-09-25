/*
  # Add Master Data Tables for Equipment

  1. New Tables
    - `pv_module_makes` - Store PV module manufacturers
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `make_name` (text) - Manufacturer name
      - `model_numbers` (text[]) - Array of model numbers
      - `is_active` (boolean) - Whether this make is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)

    - `inverter_makes` - Store inverter manufacturers
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `make_name` (text) - Manufacturer name
      - `model_numbers` (text[]) - Array of model numbers
      - `is_active` (boolean) - Whether this make is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to profiles)

  2. Security
    - Enable RLS on both tables
    - Add policies for tenant isolation
    - Only admins can manage master data
    - All authenticated users in tenant can view

  3. Indexes
    - Index on tenant_id for both tables
    - Index on make_name for searching
*/

-- Create PV Module Makes table
CREATE TABLE IF NOT EXISTS pv_module_makes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  make_name text NOT NULL,
  model_numbers text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create Inverter Makes table
CREATE TABLE IF NOT EXISTS inverter_makes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  make_name text NOT NULL,
  model_numbers text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pv_module_makes_tenant_id ON pv_module_makes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pv_module_makes_make_name ON pv_module_makes(make_name);
CREATE INDEX IF NOT EXISTS idx_inverter_makes_tenant_id ON inverter_makes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inverter_makes_make_name ON inverter_makes(make_name);

-- Enable RLS
ALTER TABLE pv_module_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inverter_makes ENABLE ROW LEVEL SECURITY;

-- PV Module Makes Policies
CREATE POLICY "Super admins view all pv module makes"
  ON pv_module_makes FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users view pv module makes in tenant"
  ON pv_module_makes FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins insert pv module makes in tenant"
  ON pv_module_makes FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update pv module makes in tenant"
  ON pv_module_makes FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete pv module makes in tenant"
  ON pv_module_makes FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Inverter Makes Policies
CREATE POLICY "Super admins view all inverter makes"
  ON inverter_makes FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users view inverter makes in tenant"
  ON inverter_makes FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins insert inverter makes in tenant"
  ON inverter_makes FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update inverter makes in tenant"
  ON inverter_makes FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete inverter makes in tenant"
  ON inverter_makes FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pv_module_makes_updated_at
  BEFORE UPDATE ON pv_module_makes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inverter_makes_updated_at
  BEFORE UPDATE ON inverter_makes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();