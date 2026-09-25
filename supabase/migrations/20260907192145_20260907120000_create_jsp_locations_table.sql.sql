/*
  # Create JSP Locations Table

  ## Overview
  This migration creates the `jsp_locations` table to store the master location hierarchy
  for JSP (Jana Sena Party) political work. All political/local-body units — states,
  districts, parliament constituencies, assembly constituencies, mandals, and panchayats —
  are stored here with a self-referencing parent_id for hierarchy traversal.

  ## 1. New Table

  ### jsp_locations
  Stores the complete political geography hierarchy.

  | Column         | Type        | Description                                                        |
  |----------------|-------------|--------------------------------------------------------------------|
  | id             | uuid (PK)   | Auto-generated unique ID                                           |
  | tenant_id      | uuid (FK)   | Tenant isolation — references tenants(id), defaults to caller's   |
  | source_id      | integer     | Original ID from source JSON data                                  |
  | name           | text        | English name of the location unit (NOT NULL)                       |
  | name_telugu    | text        | Telugu name if available                                           |
  | type           | text        | One of: state, district, parliament, assembly, mandal, panchayat  |
  | area_category  | text        | Only for panchayat: Rural/Panchayat, Municipality, etc.            |
  | total_wards    | integer     | Only for panchayat: number of wards                                |
  | parent_id      | uuid (FK)   | Self-reference to parent jsp_locations(id) for hierarchy           |
  | state_id       | integer     | Denormalized state source_id for easy filtering                    |
  | created_at     | timestamptz | Record creation timestamp (defaults to now())                      |

  ## 2. Indexes
  - idx_jsp_locations_type — filter by location type (state, district, etc.)
  - idx_jsp_locations_parent — traverse hierarchy via parent_id
  - idx_jsp_locations_source — look up by (source_id, type) for import dedup
  - idx_jsp_locations_tenant — tenant-scoped queries

  ## 3. Security (RLS)
  - Enable RLS on jsp_locations.
  - Authenticated users can read locations within their own tenant.
  - Authenticated users (admins/lead_generators) can insert/update within their tenant.
  - Super admins can read and manage all locations across tenants.
  - Four separate policies per CRUD verb (no FOR ALL).
*/

CREATE TABLE IF NOT EXISTS jsp_locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES tenants(id) ON DELETE CASCADE,
  source_id     integer,
  name          text NOT NULL,
  name_telugu   text,
  type          text NOT NULL CHECK (type IN ('state','district','parliament','assembly','mandal','panchayat')),
  area_category text,
  total_wards   integer,
  parent_id     uuid REFERENCES jsp_locations(id) ON DELETE CASCADE,
  state_id      integer,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jsp_locations_type ON jsp_locations(type);
CREATE INDEX IF NOT EXISTS idx_jsp_locations_parent ON jsp_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_jsp_locations_source ON jsp_locations(source_id, type);
CREATE INDEX IF NOT EXISTS idx_jsp_locations_tenant ON jsp_locations(tenant_id);

ALTER TABLE jsp_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jsp_loc_select_own_tenant" ON jsp_locations;
CREATE POLICY "jsp_loc_select_own_tenant"
  ON jsp_locations FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_loc_insert_own_tenant" ON jsp_locations;
CREATE POLICY "jsp_loc_insert_own_tenant"
  ON jsp_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_loc_update_own_tenant" ON jsp_locations;
CREATE POLICY "jsp_loc_update_own_tenant"
  ON jsp_locations FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_loc_delete_own_tenant" ON jsp_locations;
CREATE POLICY "jsp_loc_delete_own_tenant"
  ON jsp_locations FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );
