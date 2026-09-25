/*
  # Create JSP Incharges Table

  ## Overview
  This migration creates the `jsp_incharges` table to store political party
  position-holders (incharges) assigned at various geographic levels — parliament,
  assembly, mandal, panchayat, booth, and ward. Each incharge is linked to a user
  account and/or a specific location in the jsp_locations hierarchy.

  ## 1. New Table

  ### jsp_incharges
  Stores incharge assignment records.

  | Column          | Type        | Description                                                       |
  |-----------------|-------------|-------------------------------------------------------------------|
  | id              | uuid (PK)   | Auto-generated unique ID                                          |
  | tenant_id       | uuid        | Tenant isolation — NOT NULL                                      |
  | user_id         | uuid (FK)   | Optional link to auth.users account                               |
  | name            | text        | Incharge full name (NOT NULL)                                     |
  | mobile          | text        | Contact number                                                    |
  | level           | text        | parliament/assembly/mandal/panchayat/booth/ward                   |
  | location_id     | uuid (FK)   | Optional reference to jsp_locations(id)                           |
  | assembly_id     | integer     | Assembly constituency reference                                   |
  | mandal_name     | text        | Mandal name                                                       |
  | panchayat_name  | text        | Panchayat name                                                    |
  | booth_number    | text        | Polling booth number                                              |
  | ward_no         | text        | Ward number                                                       |
  | is_active       | boolean     | Whether the incharge is currently active (defaults true)          |
  | notes           | text        | Free-form notes                                                   |
  | assigned_at     | timestamptz | Assignment timestamp (defaults to now())                          |

  ## 2. Indexes
  - tenant_id — tenant-scoped queries
  - level — filter by position level
  - location_id — join to jsp_locations hierarchy
  - assembly_id, mandal_name, panchayat_name — geographic filtering
  - user_id — link to auth.users

  ## 3. Security (RLS)
  - Enable RLS on jsp_incharges.
  - Authenticated users can read incharges within their own tenant.
  - Authenticated users can insert/update/delete within their own tenant.
  - Super admins can access all incharges across tenants.
  - Uses existing get_user_tenant_id() and is_super_admin() helper functions.
  - Four separate policies per CRUD verb (no FOR ALL).
*/

CREATE TABLE IF NOT EXISTS jsp_incharges (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name           text NOT NULL,
  mobile         text,
  level          text NOT NULL CHECK (level IN ('parliament','assembly','mandal','panchayat','booth','ward')),
  location_id    uuid REFERENCES jsp_locations(id) ON DELETE SET NULL,
  assembly_id    integer,
  mandal_name    text,
  panchayat_name text,
  booth_number   text,
  ward_no        text,
  is_active      boolean DEFAULT true,
  notes          text,
  assigned_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jsp_incharges_tenant ON jsp_incharges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jsp_incharges_level ON jsp_incharges(level);
CREATE INDEX IF NOT EXISTS idx_jsp_incharges_location ON jsp_incharges(location_id);
CREATE INDEX IF NOT EXISTS idx_jsp_incharges_assembly ON jsp_incharges(assembly_id);
CREATE INDEX IF NOT EXISTS idx_jsp_incharges_mandal ON jsp_incharges(mandal_name);
CREATE INDEX IF NOT EXISTS idx_jsp_incharges_panchayat ON jsp_incharges(panchayat_name);
CREATE INDEX IF NOT EXISTS idx_jsp_incharges_user ON jsp_incharges(user_id);

ALTER TABLE jsp_incharges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jsp_incharges_select_own_tenant" ON jsp_incharges;
CREATE POLICY "jsp_incharges_select_own_tenant"
  ON jsp_incharges FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_incharges_insert_own_tenant" ON jsp_incharges;
CREATE POLICY "jsp_incharges_insert_own_tenant"
  ON jsp_incharges FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_incharges_update_own_tenant" ON jsp_incharges;
CREATE POLICY "jsp_incharges_update_own_tenant"
  ON jsp_incharges FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_incharges_delete_own_tenant" ON jsp_incharges;
CREATE POLICY "jsp_incharges_delete_own_tenant"
  ON jsp_incharges FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );
