/*
  # Add Hierarchical Location Master Data System
  
  1. New Tables
    - `states` - Store state information
      - `id` (bigint, primary key)
      - `name` (text, unique)
      - `code` (text)
      - `tenant_id` (uuid, references tenants)
      - `created_at` (timestamptz)
    
    - `districts` - Store district information
      - `id` (bigint, primary key)
      - `state_id` (bigint, references states)
      - `name` (text)
      - `tenant_id` (uuid, references tenants)
      - `created_at` (timestamptz)
    
    - `constituencies` - Store constituency information
      - `id` (bigint, primary key)
      - `district_id` (bigint, references districts)
      - `name` (text)
      - `parliament_constituency_name` (text)
      - `tenant_id` (uuid, references tenants)
      - `created_at` (timestamptz)
    
    - `mandals` - Store mandal/tehsil information
      - `id` (bigint, primary key)
      - `constituency_id` (bigint, references constituencies)
      - `name` (text)
      - `tenant_id` (uuid, references tenants)
      - `created_at` (timestamptz)
    
    - `villages` - Store village/panchayat information
      - `id` (bigint, primary key)
      - `mandal_id` (bigint, references mandals)
      - `name` (text)
      - `name_telugu` (text)
      - `area_category` (text)
      - `total_wards` (integer)
      - `tenant_id` (uuid, references tenants)
      - `created_at` (timestamptz)
  
  2. Lead Generator Updates
    - Add foreign key columns to `lead_generators` table
    - Keep existing text fields for backward compatibility
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for tenant isolation
    - Add policies for read/write access based on roles
  
  4. Performance
    - Add indexes on foreign keys
    - Add indexes on name fields for search
    - Add composite indexes for common queries
*/

-- Create states table
CREATE TABLE IF NOT EXISTS states (
  id bigint PRIMARY KEY,
  name text NOT NULL,
  code text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, id),
  UNIQUE(tenant_id, name)
);

-- Create districts table
CREATE TABLE IF NOT EXISTS districts (
  id bigint PRIMARY KEY,
  state_id bigint NOT NULL,
  name text NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, id),
  FOREIGN KEY (tenant_id, state_id) REFERENCES states(tenant_id, id) ON DELETE CASCADE
);

-- Create constituencies table
CREATE TABLE IF NOT EXISTS constituencies (
  id bigint PRIMARY KEY,
  district_id bigint NOT NULL,
  name text NOT NULL,
  parliament_constituency_id bigint,
  parliament_constituency_name text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, id),
  FOREIGN KEY (tenant_id, district_id) REFERENCES districts(tenant_id, id) ON DELETE CASCADE
);

-- Create mandals table
CREATE TABLE IF NOT EXISTS mandals (
  id bigint PRIMARY KEY,
  constituency_id bigint NOT NULL,
  name text NOT NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, id),
  FOREIGN KEY (tenant_id, constituency_id) REFERENCES constituencies(tenant_id, id) ON DELETE CASCADE
);

-- Create villages/panchayats table
CREATE TABLE IF NOT EXISTS villages (
  id bigint PRIMARY KEY,
  mandal_id bigint NOT NULL,
  name text NOT NULL,
  name_telugu text,
  area_category text DEFAULT 'Rural/Panchayat',
  total_wards integer DEFAULT 0,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, id),
  FOREIGN KEY (tenant_id, mandal_id) REFERENCES mandals(tenant_id, id) ON DELETE CASCADE
);

-- Add location foreign keys to lead_generators table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'state_id'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN state_id bigint;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'district_id'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN district_id bigint;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'constituency_id'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN constituency_id bigint;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'mandal_id'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN mandal_id bigint;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'village_id'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN village_id bigint;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_districts_state_id ON districts(tenant_id, state_id);
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_constituencies_district_id ON constituencies(tenant_id, district_id);
CREATE INDEX IF NOT EXISTS idx_constituencies_name ON constituencies(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_mandals_constituency_id ON mandals(tenant_id, constituency_id);
CREATE INDEX IF NOT EXISTS idx_mandals_name ON mandals(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_villages_mandal_id ON villages(tenant_id, mandal_id);
CREATE INDEX IF NOT EXISTS idx_villages_name ON villages(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_lead_generators_state_id ON lead_generators(tenant_id, state_id);
CREATE INDEX IF NOT EXISTS idx_lead_generators_district_id ON lead_generators(tenant_id, district_id);
CREATE INDEX IF NOT EXISTS idx_lead_generators_village_id ON lead_generators(tenant_id, village_id);

-- Enable RLS
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandals ENABLE ROW LEVEL SECURITY;
ALTER TABLE villages ENABLE ROW LEVEL SECURITY;

-- States policies
CREATE POLICY "Users can view states in their tenant"
  ON states FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert states"
  ON states FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update states"
  ON states FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Districts policies
CREATE POLICY "Users can view districts in their tenant"
  ON districts FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert districts"
  ON districts FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update districts"
  ON districts FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Constituencies policies
CREATE POLICY "Users can view constituencies in their tenant"
  ON constituencies FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert constituencies"
  ON constituencies FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update constituencies"
  ON constituencies FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Mandals policies
CREATE POLICY "Users can view mandals in their tenant"
  ON mandals FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert mandals"
  ON mandals FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update mandals"
  ON mandals FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Villages policies
CREATE POLICY "Users can view villages in their tenant"
  ON villages FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert villages"
  ON villages FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update villages"
  ON villages FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );