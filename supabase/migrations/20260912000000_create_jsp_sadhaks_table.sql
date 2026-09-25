/*
  # Create JSP Sadhaks Table

  1. New Table: jsp_sadhaks
     - id: bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY
     - tenant_id: uuid NOT NULL
     - name: text NOT NULL
     - mobile: text
     - constituency_name: text NOT NULL
     - mandal_name: text
     - panchayat_name: text
     - member_count: integer DEFAULT 0
     - created_at: timestamptz DEFAULT now()
     - updated_at: timestamptz DEFAULT now()

  2. Constraints & Indexes:
     - UNIQUE (tenant_id, name, constituency_name)
     - idx_jsp_sadhaks_constituency on (constituency_name)
     - idx_jsp_sadhaks_tenant on (tenant_id)
     - idx_jsp_sadhaks_name on (name)

  3. Security:
     - Enable RLS
     - Tenant-isolated SELECT, INSERT, UPDATE, DELETE policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS jsp_sadhaks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  mobile text,
  constituency_name text NOT NULL,
  mandal_name text,
  panchayat_name text,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT jsp_sadhaks_tenant_name_constituency_key UNIQUE (tenant_id, name, constituency_name)
);

CREATE INDEX IF NOT EXISTS idx_jsp_sadhaks_constituency ON jsp_sadhaks(constituency_name);
CREATE INDEX IF NOT EXISTS idx_jsp_sadhaks_tenant ON jsp_sadhaks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jsp_sadhaks_name ON jsp_sadhaks(name);

ALTER TABLE jsp_sadhaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jsp_sadhaks_select_own_tenant" ON jsp_sadhaks;
CREATE POLICY "jsp_sadhaks_select_own_tenant"
  ON jsp_sadhaks FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_sadhaks_insert_own_tenant" ON jsp_sadhaks;
CREATE POLICY "jsp_sadhaks_insert_own_tenant"
  ON jsp_sadhaks FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_sadhaks_update_own_tenant" ON jsp_sadhaks;
CREATE POLICY "jsp_sadhaks_update_own_tenant"
  ON jsp_sadhaks FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_sadhaks_delete_own_tenant" ON jsp_sadhaks;
CREATE POLICY "jsp_sadhaks_delete_own_tenant"
  ON jsp_sadhaks FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );
