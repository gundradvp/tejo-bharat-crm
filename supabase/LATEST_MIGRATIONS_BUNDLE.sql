-- ==========================================
-- TEJO BHARAT CRM: LATEST MIGRATIONS BUNDLE
-- ==========================================

-- >>> FILE: 20260906152621_add_surya_ghar_detailed_portal_columns.sql <<<
-- Add columns for detailed PM Surya Ghar portal export data
-- Uses ADD COLUMN IF NOT EXISTS to be safe against partial prior additions

ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS scheme_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sanction_load text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS approved_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS applied_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS existing_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS net_eligible_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dcr_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_auto_approved boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS approved_on timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS app_submission_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS submitted_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_approved_by text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_remarks text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS net_metering_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_inverter_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_module_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loan_application_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loan_sanction_amount numeric;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loan_sanction_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS current_loan_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ulb_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS village_panchayat_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS development_block_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS urban_local_body_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_as_per_bank text;

-- JSONB columns for structured portal data
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_inverter_list jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_module_list jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_workflow_steps jsonb;

-- Current stage tracking for display and filtering
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_current_step_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_current_step_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_current_step_date timestamptz;

-- Add index for filtering by portal current step
CREATE INDEX IF NOT EXISTS idx_customers_portal_current_step ON customers (portal_current_step_name);


-- >>> FILE: 20260906180457_make_bills_sc_number_based.sql <<<
/*
# Make eb_customer_bills SC-number-based instead of EB-customer-only

## Problem
Bills imported via the EB Bill Import only match SC numbers against `eb_customers`.
If an SC number exists only in `lead_prospects` or `customers` (Surya Ghar),
the bills are skipped as "unmatched." This means bills don't propagate across all three views.

## Changes
1. Make `eb_customer_id` nullable on `eb_customer_bills` — bills can now exist
   without a linked eb_customers row (they are matched by sc_number instead).
2. Drop the old unique index on (tenant_id, eb_customer_id, bill_month) and
   create a new unique index on (tenant_id, sc_number, bill_month) so dedup
   works by SC number regardless of which table the customer lives in.
3. Backfill `eb_customer_id` for existing rows that already have a matching
   eb_customers row by sc_number (best-effort, no data loss).

## Security
- No RLS policy changes — existing tenant-scoped CRUD policies remain unchanged.
*/

-- Step 1: Make eb_customer_id nullable so bills can exist without an EB customer link
ALTER TABLE eb_customer_bills ALTER COLUMN eb_customer_id DROP NOT NULL;

-- Step 2: Replace the unique index
DROP INDEX IF EXISTS idx_eb_bills_tenant_customer_month;
CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_bills_tenant_sc_month
  ON eb_customer_bills(tenant_id, sc_number, bill_month);


-- >>> FILE: 20260907192145_20260907120000_create_jsp_locations_table.sql.sql <<<
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


-- >>> FILE: 20260907192252_20260907130000_create_jsp_kriya_members_table.sql.sql <<<
/*
  # Create JSP Kriya Members Table

  ## Overview
  This migration creates the `jsp_kriya_members` table to store JSP (Jana Sena Party)
  Kriya membership records — political party members enrolled through volunteer/sadhak
  networks across constituencies, mandals, and panchayats.

  ## 1. New Table

  ### jsp_kriya_members
  Stores individual Kriya member enrollment records.

  | Column                      | Type        | Description                                          |
  |-----------------------------|-------------|------------------------------------------------------|
  | id                          | bigint (PK) | Original member ID from source data                  |
  | tenant_id                   | uuid        | Tenant isolation — NOT NULL                         |
  | jsp_id                      | text        | JSP internal member ID                               |
  | name                        | text        | Member full name                                     |
  | mobile                      | text        | Contact number                                       |
  | age                         | numeric     | Member age                                           |
  | dob                         | date        | Date of birth                                        |
  | gender                      | text        | Gender                                               |
  | aadhar_number               | text        | Aadhar number                                        |
  | address                     | text        | Residential address                                  |
  | photo_url                   | text        | URL to member photo                                  |
  | membership_type             | text        | fresh / renewal / Suspension                         |
  | phase                       | text        | first/second/third/fourth/fifth                      |
  | status                      | text        | Completed/Pending/Suspended/Constituency Changed     |
  | payment_id                  | text        | Payment reference                                    |
  | payment_status              | text        | Payment status                                       |
  | payment_verified            | text        | Payment verification status                          |
  | payment_completed_date      | date        | Date payment was completed                           |
  | parliament_constituency_id  | integer     | Parliament constituency reference                    |
  | parliament_constituency_name| text        | Parliament constituency name                         |
  | assembly_id                 | integer     | Assembly constituency reference                      |
  | constituency_name           | text        | Assembly constituency name                           |
  | mandal_name                 | text        | Mandal name                                          |
  | panchayat_name              | text        | Panchayat name                                       |
  | polling_booth_number        | text        | Polling booth number (may be empty)                  |
  | ward_no                     | text        | Ward number (may be empty)                           |
  | volunteername               | text        | Sadhak/volunteer who enrolled this member            |
  | volunteer_mobile            | text        | Volunteer's contact number                           |
  | added_by                    | integer     | Source user ID who added the record                  |
  | created_date                | date        | Date the member was created in source system         |
  | nominee_name                | text        | Nominee name                                         |
  | nominee_aadhar_number       | text        | Nominee's aadhar number                              |
  | y2021_present - y2026_present | integer   | Year-wise attendance flags                           |
  | remarks                     | text        | Free-form remarks                                    |
  | imported_at                 | timestamptz | Import timestamp (defaults to now())                 |

  ## 2. Indexes
  - tenant_id — tenant-scoped queries
  - assembly_id, mandal_name, panchayat_name — geographic filtering
  - status, phase — membership status filtering
  - volunteername, mobile — volunteer and contact lookups

  ## 3. Security (RLS)
  - Enable RLS on jsp_kriya_members.
  - Authenticated users can read members within their own tenant.
  - Authenticated users can insert/update/delete within their own tenant.
  - Super admins can access all members across tenants.
  - Uses existing get_user_tenant_id() and is_super_admin() helper functions.
  - Four separate policies per CRUD verb.
*/

CREATE TABLE IF NOT EXISTS jsp_kriya_members (
  id                          bigint PRIMARY KEY,
  tenant_id                   uuid NOT NULL,
  jsp_id                      text,
  name                        text,
  mobile                      text,
  age                         numeric,
  dob                         date,
  gender                      text,
  aadhar_number               text,
  address                     text,
  photo_url                   text,
  membership_type             text,
  phase                       text,
  status                      text,
  payment_id                  text,
  payment_status              text,
  payment_verified            text,
  payment_completed_date      date,
  parliament_constituency_id  integer,
  parliament_constituency_name text,
  assembly_id                 integer,
  constituency_name           text,
  mandal_name                 text,
  panchayat_name              text,
  polling_booth_number        text,
  ward_no                     text,
  volunteername               text,
  volunteer_mobile            text,
  added_by                    integer,
  created_date                date,
  nominee_name                text,
  nominee_aadhar_number       text,
  y2021_present               integer DEFAULT 0,
  y2022_present               integer DEFAULT 0,
  y2023_present               integer DEFAULT 0,
  y2024_present               integer DEFAULT 0,
  y2026_present               integer DEFAULT 0,
  remarks                     text,
  imported_at                 timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kriya_tenant ON jsp_kriya_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kriya_assembly ON jsp_kriya_members(assembly_id);
CREATE INDEX IF NOT EXISTS idx_kriya_mandal ON jsp_kriya_members(mandal_name);
CREATE INDEX IF NOT EXISTS idx_kriya_panchayat ON jsp_kriya_members(panchayat_name);
CREATE INDEX IF NOT EXISTS idx_kriya_status ON jsp_kriya_members(status);
CREATE INDEX IF NOT EXISTS idx_kriya_phase ON jsp_kriya_members(phase);
CREATE INDEX IF NOT EXISTS idx_kriya_volunteer ON jsp_kriya_members(volunteername);
CREATE INDEX IF NOT EXISTS idx_kriya_mobile ON jsp_kriya_members(mobile);

ALTER TABLE jsp_kriya_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jsp_kriya_select_own_tenant" ON jsp_kriya_members;
CREATE POLICY "jsp_kriya_select_own_tenant"
  ON jsp_kriya_members FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_kriya_insert_own_tenant" ON jsp_kriya_members;
CREATE POLICY "jsp_kriya_insert_own_tenant"
  ON jsp_kriya_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_kriya_update_own_tenant" ON jsp_kriya_members;
CREATE POLICY "jsp_kriya_update_own_tenant"
  ON jsp_kriya_members FOR UPDATE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY IF EXISTS "jsp_kriya_delete_own_tenant" ON jsp_kriya_members;
CREATE POLICY "jsp_kriya_delete_own_tenant"
  ON jsp_kriya_members FOR DELETE
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR
    tenant_id = get_user_tenant_id(auth.uid())
  );


-- >>> FILE: 20260907192400_20260907140000_create_jsp_incharges_table.sql.sql <<<
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


-- >>> FILE: 20260907192549_20260907150000_add_jsp_roles.sql.sql <<<
/*
  # Add JSP Political Roles

  ## Overview
  This migration adds seven new JSP (Jana Sena Party) role types to the existing
  `roles` table, enabling hierarchical political position-based access control.

  ## 1. Schema Change
  The `roles.name` column has an existing CHECK constraint that limits values to
  'admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access'.
  We replace it with a new constraint that also includes the seven JSP roles.

  ## 2. New Roles Inserted

  | Role Name                  | Display Name              | Description                                    |
  |----------------------------|---------------------------|------------------------------------------------|
  | jsp_admin                  | JSP Admin                 | Full JSP access - all assemblies and reports   |
  | jsp_parliament_incharge    | Parliament Incharge       | Access to all assemblies under their parliament|
  | jsp_assembly_incharge      | Assembly Incharge         | Access to all mandals under their assembly     |
  | jsp_mandal_incharge        | Mandal Incharge           | Access to all panchayats under their mandal    |
  | jsp_village_incharge       | Village/Panchayat Incharge| Access to members in their panchayat           |
  | jsp_booth_incharge         | Booth Incharge            | Access to members in their booth               |
  | jsp_sadhak                 | Sadhak                    | View their own enrolled members                |

  ## 3. Security
  No RLS changes — roles table already has existing policies. The new rows
  inherit the same access rules.
*/

ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

ALTER TABLE roles ADD CONSTRAINT roles_name_check
  CHECK (name IN (
    'admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access',
    'jsp_admin', 'jsp_parliament_incharge', 'jsp_assembly_incharge',
    'jsp_mandal_incharge', 'jsp_village_incharge', 'jsp_booth_incharge',
    'jsp_sadhak'
  ));

INSERT INTO roles (name, display_name, description) VALUES
  ('jsp_admin',                'JSP Admin',                'Full JSP access - all assemblies and reports'),
  ('jsp_parliament_incharge',  'Parliament Incharge',      'Access to all assemblies under their parliament'),
  ('jsp_assembly_incharge',    'Assembly Incharge',        'Access to all mandals under their assembly'),
  ('jsp_mandal_incharge',      'Mandal Incharge',          'Access to all panchayats under their mandal'),
  ('jsp_village_incharge',     'Village/Panchayat Incharge','Access to members in their panchayat'),
  ('jsp_booth_incharge',       'Booth Incharge',           'Access to members in their booth'),
  ('jsp_sadhak',               'Sadhak',                   'View their own enrolled members')
ON CONFLICT (name) DO NOTHING;


-- >>> FILE: 20260907195702_update_profiles_role_check_and_create_jsp_admin.sql <<<
/*
  # Update profiles role check to include JSP roles + Create JSP Admin User

  ## 1. Schema Change
  The `profiles.role` column had a CHECK constraint limited to
  'admin', 'lead_generator', 'employee'. We extend it to also allow
  all JSP roles so JSP users can have a profile row.

  ## 2. New User
  Creates a JSP admin login:
  - Email: jspadmin@tejobharat.com
  - Password: JSP@admin123
  - Role: jsp_admin
  - Tenant: Tejo Bharat
*/

-- 1. Update the profiles role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access',
    'jsp_admin', 'jsp_parliament_incharge', 'jsp_assembly_incharge',
    'jsp_mandal_incharge', 'jsp_village_incharge', 'jsp_booth_incharge',
    'jsp_sadhak'
  ));

-- 2. Create auth user + profile + role assignment
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';

  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'jspadmin@tejobharat.com',
      crypt('JSP@admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"JSP Admin"}'
    )
    RETURNING id INTO new_user_id;
  END IF;

  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id)
    VALUES (new_user_id, 'jspadmin@tejobharat.com', 'JSP Admin', 'jsp_admin', true, '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO user_roles (user_id, role_id)
    SELECT new_user_id, id FROM roles WHERE name = 'jsp_admin'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- >>> FILE: 20260907200108_fix_jsp_admin_auth_user.sql <<<
/*
  # Fix JSP Admin Auth User

  The previously created auth user had incomplete metadata, causing
  "Database error querying schema" at login. This migration deletes
  the old user and recreates with correct jsonb metadata fields.
*/

DO $$
DECLARE
  old_user_id uuid;
  new_user_id uuid;
BEGIN
  -- Find and delete the existing broken user
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';
  IF old_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = old_user_id;
    DELETE FROM profiles WHERE id = old_user_id;
    DELETE FROM auth.users WHERE id = old_user_id;
  END IF;

  -- Create fresh auth user with all required fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jspadmin@tejobharat.com',
    crypt('JSP@admin123', gen_salt('bf')),
    now(),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"JSP Admin"}'::jsonb
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id)
    VALUES (new_user_id, 'jspadmin@tejobharat.com', 'JSP Admin', 'jsp_admin', true, '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING;

    -- Assign jsp_admin role
    INSERT INTO user_roles (user_id, role_id)
    SELECT new_user_id, id FROM roles WHERE name = 'jsp_admin'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- >>> FILE: 20260907200327_fix_jsp_admin_auth_user_v2.sql <<<
/*
  # Fix JSP Admin Auth User (v2)

  Previous attempts created the auth.user with missing columns that
  Supabase Auth expects (confirmation_token, recovery_token, etc.).
  This matches the exact pattern used by the working Tejo Bharat users.

  Credentials:
  - Email: jspadmin@tejobharat.com
  - Password: JSP@admin123
*/

DO $$
DECLARE
  v_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  v_role_jsp_admin uuid;
  v_enc_pwd text;
  old_user_id uuid;
  new_user_id uuid;
BEGIN
  -- Get the jsp_admin role id
  SELECT id INTO v_role_jsp_admin FROM roles WHERE name = 'jsp_admin';

  -- Hash the password
  v_enc_pwd := crypt('JSP@admin123', gen_salt('bf'));

  -- Find and delete the existing broken user
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';
  IF old_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = old_user_id;
    DELETE FROM profiles WHERE id = old_user_id;
    DELETE FROM auth.users WHERE id = old_user_id;
  END IF;

  -- Create auth user with ALL required columns (matching working users pattern)
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change_token, phone_change, email_change_token_current
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jspadmin@tejobharat.com',
    v_enc_pwd,
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"JSP Admin","role":"jsp_admin"}'::jsonb,
    '', '', '', '', '', '', ''
  )
  RETURNING id INTO new_user_id;

  -- Create profile
  IF new_user_id IS NOT NULL THEN
    INSERT INTO profiles (id, email, full_name, role, is_active, tenant_id, created_at, updated_at)
    VALUES (new_user_id, 'jspadmin@tejobharat.com', 'JSP Admin', 'jsp_admin', true, v_tenant_id, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      tenant_id = EXCLUDED.tenant_id,
      updated_at = now();

    -- Assign jsp_admin role
    INSERT INTO user_roles (user_id, role_id, assigned_at)
    VALUES (new_user_id, v_role_jsp_admin, now())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;


-- >>> FILE: 20260907200443_delete_jsp_admin_for_recreation.sql <<<
/*
  # Delete broken JSP auth user for recreation via edge function

  Removes the manually inserted auth.users row so the edge function
  can create it properly via the Auth Admin API.
*/

DO $$
DECLARE
  old_user_id uuid;
BEGIN
  SELECT id INTO old_user_id FROM auth.users WHERE email = 'jspadmin@tejobharat.com';
  IF old_user_id IS NOT NULL THEN
    DELETE FROM user_roles WHERE user_id = old_user_id;
    DELETE FROM profiles WHERE id = old_user_id;
    DELETE FROM auth.identities WHERE user_id = old_user_id;
    DELETE FROM auth.users WHERE id = old_user_id;
  END IF;
END $$;


-- >>> FILE: 20260907201909_create_jsp_dashboard_stats_rpc.sql <<<
CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(volunteer_filter text DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', COUNT(*),
    'completed_payments', COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed'),
    'pending_members', COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending'),
    'total_sadhaks', COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL),
    'phase_counts', COALESCE(
      (SELECT json_agg(json_build_object('phase', phase, 'count', cnt))
       FROM (
         SELECT LOWER(TRIM(phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE phase IS NOT NULL AND phase != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY LOWER(TRIM(phase))
       ) p),
      '[]'::json
    ),
    'top_sadhaks', COALESCE(
      (SELECT json_agg(json_build_object('volunteername', volunteername, 'volunteer_mobile', vmobile, 'count', cnt))
       FROM (
         SELECT volunteername, MAX(volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::json
    ),
    'assembly_counts', COALESCE(
      (SELECT json_agg(json_build_object('assembly_id', assembly_id, 'constituency_name', constituency_name, 'total', total, 'completed', completed, 'pending', pending))
       FROM (
         SELECT
           assembly_id,
           constituency_name,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed') AS completed,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending') AS pending
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY assembly_id, constituency_name
         ORDER BY total DESC
       ) a),
      '[]'::json
    ),
    'gender_counts', COALESCE(
      (SELECT json_agg(json_build_object('gender', gender, 'count', cnt))
       FROM (
         SELECT
           CASE
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('m', 'male') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('f', 'female') THEN 'Female'
             WHEN COALESCE(gender, '') = '' THEN 'Unknown'
             ELSE 'Other'
           END AS gender,
           COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY 1
       ) g),
      '[]'::json
    )
  ) INTO result
  FROM jsp_kriya_members
  WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter);

  RETURN result;
END;
$$;


-- >>> FILE: 20260908015825_create_jsp_filter_options_rpc.sql <<<
CREATE OR REPLACE FUNCTION get_jsp_filter_options(volunteer_filter text DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'assemblies', COALESCE(
      (SELECT json_agg(json_build_object('value', assembly_id::text, 'label', constituency_name))
       FROM (
         SELECT DISTINCT assembly_id, constituency_name
         FROM jsp_kriya_members
         WHERE assembly_id IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY constituency_name
       ) a),
      '[]'::json
    ),
    'sadhaks', COALESCE(
      (SELECT json_agg(json_build_object('value', volunteername, 'label', volunteername))
       FROM (
         SELECT DISTINCT volunteername
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY volunteername
       ) s),
      '[]'::json
    ),
    'mandals', COALESCE(
      (SELECT json_agg(json_build_object('value', mandal_name, 'label', mandal_name))
       FROM (
         SELECT DISTINCT mandal_name
         FROM jsp_kriya_members
         WHERE mandal_name IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY mandal_name
       ) m),
      '[]'::json
    ),
    'panchayats', COALESCE(
      (SELECT json_agg(json_build_object('value', panchayat_name, 'label', panchayat_name))
       FROM (
         SELECT DISTINCT panchayat_name
         FROM jsp_kriya_members
         WHERE panchayat_name IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY panchayat_name
       ) p),
      '[]'::json
    )
  ) INTO result;
  RETURN result;
END;
$$;


-- >>> FILE: 20260908015925_update_jsp_filter_options_use_constituency_name.sql <<<
CREATE OR REPLACE FUNCTION get_jsp_filter_options(volunteer_filter text DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'assemblies', COALESCE(
      (SELECT json_agg(json_build_object('value', constituency_name, 'label', constituency_name))
       FROM (
         SELECT DISTINCT constituency_name
         FROM jsp_kriya_members
         WHERE constituency_name IS NOT NULL AND constituency_name != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY constituency_name
       ) a),
      '[]'::json
    ),
    'sadhaks', COALESCE(
      (SELECT json_agg(json_build_object('value', volunteername, 'label', volunteername))
       FROM (
         SELECT DISTINCT volunteername
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY volunteername
       ) s),
      '[]'::json
    )
  ) INTO result;
  RETURN result;
END;
$$;


-- >>> FILE: 20260908020800_fix_jsp_rpcs_security_definer_jsonb.sql <<<
DROP FUNCTION IF EXISTS get_jsp_dashboard_stats(text);
DROP FUNCTION IF EXISTS get_jsp_filter_options(text);

CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(volunteer_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_members', COUNT(*),
    'completed_payments', COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed'),
    'pending_members', COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending'),
    'total_sadhaks', COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL),
    'phase_counts', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('phase', phase, 'count', cnt))
       FROM (
         SELECT LOWER(TRIM(phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE phase IS NOT NULL AND phase != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY LOWER(TRIM(phase))
       ) p),
      '[]'::jsonb
    ),
    'top_sadhaks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('volunteername', volunteername, 'volunteer_mobile', vmobile, 'count', cnt))
       FROM (
         SELECT volunteername, MAX(volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::jsonb
    ),
    'assembly_counts', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('assembly_id', assembly_id, 'constituency_name', constituency_name, 'total', total, 'completed', completed, 'pending', pending))
       FROM (
         SELECT
           assembly_id,
           constituency_name,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed') AS completed,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending') AS pending
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY assembly_id, constituency_name
         ORDER BY total DESC
       ) a),
      '[]'::jsonb
    ),
    'gender_counts', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('gender', gender, 'count', cnt))
       FROM (
         SELECT
           CASE
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('m', 'male') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('f', 'female') THEN 'Female'
             WHEN COALESCE(gender, '') = '' THEN 'Unknown'
             ELSE 'Other'
           END AS gender,
           COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY 1
       ) g),
      '[]'::jsonb
    )
  ) INTO result
  FROM jsp_kriya_members
  WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter);

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_filter_options(volunteer_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'assemblies', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('value', constituency_name, 'label', constituency_name))
       FROM (
         SELECT DISTINCT constituency_name
         FROM jsp_kriya_members
         WHERE constituency_name IS NOT NULL AND constituency_name != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY constituency_name
       ) a),
      '[]'::jsonb
    ),
    'sadhaks', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('value', volunteername, 'label', volunteername))
       FROM (
         SELECT DISTINCT volunteername
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         ORDER BY volunteername
       ) s),
      '[]'::jsonb
    )
  ) INTO result;
  RETURN result;
END;
$$;


-- >>> FILE: 20260908020857_create_jsp_mandal_panchayat_rpcs.sql <<<
CREATE OR REPLACE FUNCTION get_jsp_mandals_for_constituency(p_constituency text, volunteer_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('value', mandal_name, 'label', mandal_name)), '[]'::jsonb)
  INTO result
  FROM (
    SELECT DISTINCT mandal_name
    FROM jsp_kriya_members
    WHERE mandal_name IS NOT NULL AND mandal_name != ''
      AND constituency_name = p_constituency
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY mandal_name
  ) m;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_panchayats_for_mandal(p_mandal text, p_constituency text DEFAULT NULL, volunteer_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object('value', panchayat_name, 'label', panchayat_name)), '[]'::jsonb)
  INTO result
  FROM (
    SELECT DISTINCT panchayat_name
    FROM jsp_kriya_members
    WHERE panchayat_name IS NOT NULL AND panchayat_name != ''
      AND mandal_name = p_mandal
      AND (p_constituency IS NULL OR constituency_name = p_constituency)
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY panchayat_name
  ) p;

  RETURN result;
END;
$$;


-- >>> FILE: 20260908030756_recreate_jsp_rpcs_as_table_functions.sql <<<
DROP FUNCTION IF EXISTS get_jsp_dashboard_stats(text);
DROP FUNCTION IF EXISTS get_jsp_filter_options(text);
DROP FUNCTION IF EXISTS get_jsp_mandals_for_constituency(text, text);
DROP FUNCTION IF EXISTS get_jsp_panchayats_for_mandal(text, text, text);

-- Dashboard stats: returns a TABLE with one row, PostgREST always returns an array
CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(volunteer_filter text DEFAULT NULL)
RETURNS TABLE(
  total_members bigint,
  completed_payments bigint,
  pending_members bigint,
  total_sadhaks bigint,
  phase_counts jsonb,
  top_sadhaks jsonb,
  assembly_counts jsonb,
  gender_counts jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_members,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed')::bigint AS completed_payments,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending')::bigint AS pending_members,
    COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL)::bigint AS total_sadhaks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('phase', phase, 'count', cnt))
       FROM (
         SELECT LOWER(TRIM(phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE phase IS NOT NULL AND phase != ''
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY LOWER(TRIM(phase))
       ) p),
      '[]'::jsonb
    ) AS phase_counts,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('volunteername', volunteername, 'volunteer_mobile', vmobile, 'count', cnt))
       FROM (
         SELECT volunteername, MAX(volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE volunteername IS NOT NULL
           AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::jsonb
    ) AS top_sadhaks,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('assembly_id', assembly_id, 'constituency_name', constituency_name, 'total', total, 'completed', completed, 'pending', pending))
       FROM (
         SELECT
           assembly_id,
           constituency_name,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed') AS completed,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending') AS pending
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY assembly_id, constituency_name
         ORDER BY total DESC
       ) a),
      '[]'::jsonb
    ) AS assembly_counts,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('gender', gender, 'count', cnt))
       FROM (
         SELECT
           CASE
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('m', 'male') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(gender, ''))) IN ('f', 'female') THEN 'Female'
             WHEN COALESCE(gender, '') = '' THEN 'Unknown'
             ELSE 'Other'
           END AS gender,
           COUNT(*) AS cnt
         FROM jsp_kriya_members
         WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter)
         GROUP BY 1
       ) g),
      '[]'::jsonb
    ) AS gender_counts
  FROM jsp_kriya_members
  WHERE (volunteer_filter IS NULL OR volunteername = volunteer_filter);
END;
$$;

-- Filter option functions: each returns TABLE with simple columns
CREATE OR REPLACE FUNCTION get_jsp_assembly_options(volunteer_filter text DEFAULT NULL)
RETURNS TABLE(constituency_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT constituency_name::text
    FROM jsp_kriya_members
    WHERE constituency_name IS NOT NULL AND constituency_name != ''
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY constituency_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_sadhak_options(volunteer_filter text DEFAULT NULL)
RETURNS TABLE(volunteername text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT volunteername::text
    FROM jsp_kriya_members
    WHERE volunteername IS NOT NULL
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY volunteername;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_mandal_options(p_constituency text, volunteer_filter text DEFAULT NULL)
RETURNS TABLE(mandal_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT mandal_name::text
    FROM jsp_kriya_members
    WHERE mandal_name IS NOT NULL AND mandal_name != ''
      AND constituency_name = p_constituency
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY mandal_name;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_panchayat_options(p_mandal text, p_constituency text DEFAULT NULL, volunteer_filter text DEFAULT NULL)
RETURNS TABLE(panchayat_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT panchayat_name::text
    FROM jsp_kriya_members
    WHERE panchayat_name IS NOT NULL AND panchayat_name != ''
      AND mandal_name = p_mandal
      AND (p_constituency IS NULL OR constituency_name = p_constituency)
      AND (volunteer_filter IS NULL OR volunteername = volunteer_filter)
    ORDER BY panchayat_name;
END;
$$;


-- >>> FILE: 20260908030904_recreate_jsp_rpcs_table_v2.sql <<<
DROP FUNCTION IF EXISTS get_jsp_dashboard_stats(text);
DROP FUNCTION IF EXISTS get_jsp_assembly_options(text);
DROP FUNCTION IF EXISTS get_jsp_sadhak_options(text);
DROP FUNCTION IF EXISTS get_jsp_mandal_options(text, text);
DROP FUNCTION IF EXISTS get_jsp_panchayat_options(text, text, text);

-- Dashboard stats: returns a TABLE with one row
CREATE OR REPLACE FUNCTION get_jsp_dashboard_stats(p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(
  total_members bigint,
  completed_payments bigint,
  pending_members bigint,
  total_sadhaks bigint,
  phase_counts jsonb,
  top_sadhaks jsonb,
  assembly_counts jsonb,
  gender_counts jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'completed')::bigint,
    COUNT(*) FILTER (WHERE LOWER(COALESCE(status, '')) = 'pending')::bigint,
    COUNT(DISTINCT volunteername) FILTER (WHERE volunteername IS NOT NULL)::bigint,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('phase', p.phase, 'count', p.cnt))
       FROM (
         SELECT LOWER(TRIM(m.phase)) AS phase, COUNT(*) AS cnt
         FROM jsp_kriya_members m
         WHERE m.phase IS NOT NULL AND m.phase != ''
           AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY LOWER(TRIM(m.phase))
       ) p),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('volunteername', s.volunteername, 'volunteer_mobile', s.vmobile, 'count', s.cnt))
       FROM (
         SELECT m.volunteername, MAX(m.volunteer_mobile) AS vmobile, COUNT(*) AS cnt
         FROM jsp_kriya_members m
         WHERE m.volunteername IS NOT NULL
           AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY m.volunteername
         ORDER BY cnt DESC
         LIMIT 10
       ) s),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('assembly_id', a.assembly_id, 'constituency_name', a.constituency_name, 'total', a.total, 'completed', a.completed, 'pending', a.pending))
       FROM (
         SELECT
           m.assembly_id,
           m.constituency_name,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(m.status, '')) = 'completed') AS completed,
           COUNT(*) FILTER (WHERE LOWER(COALESCE(m.status, '')) = 'pending') AS pending
         FROM jsp_kriya_members m
         WHERE (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY m.assembly_id, m.constituency_name
         ORDER BY total DESC
       ) a),
      '[]'::jsonb
    ),
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('gender', g.gender, 'count', g.cnt))
       FROM (
         SELECT
           CASE
             WHEN LOWER(TRIM(COALESCE(m.gender, ''))) IN ('m', 'male') THEN 'Male'
             WHEN LOWER(TRIM(COALESCE(m.gender, ''))) IN ('f', 'female') THEN 'Female'
             WHEN COALESCE(m.gender, '') = '' THEN 'Unknown'
             ELSE 'Other'
           END AS gender,
           COUNT(*) AS cnt
         FROM jsp_kriya_members m
         WHERE (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
         GROUP BY 1
       ) g),
      '[]'::jsonb
    )
  FROM jsp_kriya_members m
  WHERE (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter);
END;
$$;

-- Filter option functions with aliased output columns to avoid ambiguity
CREATE OR REPLACE FUNCTION get_jsp_assembly_options(p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(assembly_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.constituency_name::text
    FROM jsp_kriya_members m
    WHERE m.constituency_name IS NOT NULL AND m.constituency_name != ''
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_sadhak_options(p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(sadhak_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.volunteername::text
    FROM jsp_kriya_members m
    WHERE m.volunteername IS NOT NULL
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_mandal_options(p_constituency text, p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(mandal_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.mandal_name::text
    FROM jsp_kriya_members m
    WHERE m.mandal_name IS NOT NULL AND m.mandal_name != ''
      AND m.constituency_name = p_constituency
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_jsp_panchayat_options(p_mandal text, p_constituency text DEFAULT NULL, p_volunteer_filter text DEFAULT NULL)
RETURNS TABLE(panchayat_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT m.panchayat_name::text
    FROM jsp_kriya_members m
    WHERE m.panchayat_name IS NOT NULL AND m.panchayat_name != ''
      AND m.mandal_name = p_mandal
      AND (p_constituency IS NULL OR m.constituency_name = p_constituency)
      AND (p_volunteer_filter IS NULL OR m.volunteername = p_volunteer_filter)
    ORDER BY 1;
END;
$$;

-- Add indexes to speed up the dashboard queries
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_volunteername ON jsp_kriya_members(volunteername);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_constituency ON jsp_kriya_members(constituency_name);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_mandal ON jsp_kriya_members(mandal_name);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_status ON jsp_kriya_members(status);
CREATE INDEX IF NOT EXISTS idx_jsp_kriya_members_phase ON jsp_kriya_members(phase);


-- >>> FILE: 20260908084244_20260908120000_add_gdrive_folder_fields.sql.sql <<<
/*
# Add Google Drive Folder Link Fields

1. Purpose
   Allows admins to map each customer to a Google Drive sub-folder containing
   that customer's documents. Also stores the main "Customers" parent folder
   link at the company-settings level.

2. Changes
   - customers.gdrive_folder_url (text, nullable) — per-customer Drive sub-folder URL
   - company_settings.gdrive_customers_folder_url (text, nullable) — main "Customers" parent folder URL
   - company_settings.gdrive_picker_api_key (text, nullable) — Google API key for Picker
   - company_settings.gdrive_picker_client_id (text, nullable) — Google OAuth client ID for Picker

3. Security
   No new tables. Existing RLS policies on customers and company_settings
   remain unchanged — these columns inherit the same row-level access rules.
*/

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS gdrive_folder_url text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS gdrive_customers_folder_url text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS gdrive_picker_api_key text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS gdrive_picker_client_id text;

-- >>> FILE: 20260908093336_20260908130000_add_missing_company_settings_columns.sql.sql <<<
/*
# Add missing columns to company_settings

1. Purpose
   The TenantSettings form references columns (pan_number, gstin, cgst_rate,
   sgst_rate, igst_rate) that don't exist in company_settings yet. This
   migration adds them so saving company settings no longer errors.

2. Changes
   - company_settings.pan_number (text, nullable)
   - company_settings.gstin (text, nullable)
   - company_settings.cgst_rate (numeric, default 4.45)
   - company_settings.sgst_rate (numeric, default 4.45)
   - company_settings.igst_rate (numeric, default 9.00)

3. Note
   Existing columns company_address, company_phone, company_email,
   company_website, bank_account_number, bank_ifsc_code already exist.
   The form code is being updated to use those correct names.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'pan_number') THEN
    ALTER TABLE company_settings ADD COLUMN pan_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'gstin') THEN
    ALTER TABLE company_settings ADD COLUMN gstin text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'cgst_rate') THEN
    ALTER TABLE company_settings ADD COLUMN cgst_rate numeric DEFAULT 4.45;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'sgst_rate') THEN
    ALTER TABLE company_settings ADD COLUMN sgst_rate numeric DEFAULT 4.45;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'igst_rate') THEN
    ALTER TABLE company_settings ADD COLUMN igst_rate numeric DEFAULT 9.00;
  END IF;
END $$;

-- >>> FILE: 20260912000000_create_jsp_sadhaks_table.sql <<<
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


-- >>> FILE: 20260924100000_create_whatsapp_inbox_tables.sql <<<
-- Create whatsapp_chats table
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  sc_number TEXT,
  circle_name TEXT,
  mandal_name TEXT,
  applied_load_kw NUMERIC,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_direction TEXT DEFAULT 'inbound',
  unread_count INT DEFAULT 1,
  status TEXT DEFAULT 'open',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  type TEXT DEFAULT 'text',
  content TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_phone TEXT,
  status TEXT DEFAULT 'delivered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and service role full access
DROP POLICY IF EXISTS "Allow authenticated whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Allow authenticated whatsapp_chats" ON public.whatsapp_chats FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Allow public read whatsapp_chats" ON public.whatsapp_chats FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow authenticated whatsapp_messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow public read whatsapp_messages" ON public.whatsapp_messages FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime replication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_chats;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;


-- >>> FILE: 20260925014000_add_lost_at_to_customers.sql <<<
-- Migration: Add lost_at (Lost/Churned date) to customers table
-- Purpose: Track the exact timestamp when a customer lifecycle status was changed to 'lost' or churned

-- 1. Add lost_at column if it does not already exist
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;

-- 2. Backfill lost_at for customers currently marked as 'lost' that do not have lost_at set
UPDATE public.customers 
SET lost_at = COALESCE(updated_at, NOW())
WHERE customer_lifecycle_status = 'lost' 
  AND lost_at IS NULL;

-- 3. Create index for efficient sorting and filtering on lost customers by churn date
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle_lost_at 
ON public.customers (customer_lifecycle_status, lost_at DESC);


-- >>> FILE: 20260930123000_fix_search_eb_customers_bills_and_area_codes.sql <<<
/*
# Fix search_eb_customers RPC for bills and area codes

1. Bill Filtering Fix:
   - Match `eb_customer_bills` by both `eb_customer_id = ec.id` OR `sc_number = ec.sc_number`.
   - Ensures customers whose bills were linked via SC number are properly included.

2. Area Filter Fix:
   - Allow `p_area` to match either `ec.area_name` (area names like 'UPPADA') OR `ec.sc_number` pattern (area codes like '3331').
*/

CREATE OR REPLACE FUNCTION search_eb_customers(
  p_search TEXT DEFAULT NULL,
  p_ero TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_mandal TEXT DEFAULT NULL,
  p_sub_station TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_exclude_solar BOOLEAN DEFAULT FALSE,
  p_import_batch_id TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  bill_conditions JSONB DEFAULT '[]'::JSONB,
  p_page_size INT DEFAULT 50,
  p_page_offset INT DEFAULT 0
)
RETURNS TABLE(rows JSON, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_where TEXT := '';
  v_bill_clause TEXT := '';
  v_has_bill_cond BOOLEAN := false;
  v_cond JSONB;
  v_column TEXT;
  v_operator TEXT;
  v_value NUMERIC;
  v_max_value NUMERIC;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
    RETURN;
  END IF;

  v_where := 'ec.tenant_id = ' || quote_literal(v_tenant_id);

  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND ('
    || 'fuzzy_name_match(ec.customer_name, ' || quote_literal(p_search) || ')'
    || ' OR ec.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.mobile_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.phone ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.area_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address1 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address2 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address3 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR ec.address4 ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN v_where := v_where || ' AND ec.ero_name = ANY(string_to_array(' || quote_literal(p_ero) || ','',''))'; END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN v_where := v_where || ' AND ec.section_name = ANY(string_to_array(' || quote_literal(p_section) || ','',''))'; END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN v_where := v_where || ' AND ec.status = ANY(string_to_array(' || quote_literal(p_status) || ','',''))'; END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN v_where := v_where || ' AND ec.call_status = ANY(string_to_array(' || quote_literal(p_call_status) || ','',''))'; END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN v_where := v_where || ' AND ec.category = ANY(string_to_array(' || quote_literal(p_category) || ','',''))'; END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN v_where := v_where || ' AND ec.mandal_name = ANY(string_to_array(' || quote_literal(p_mandal) || ','',''))'; END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN v_where := v_where || ' AND ec.sub_station_name = ANY(string_to_array(' || quote_literal(p_sub_station) || ','',''))'; END IF;
  
  -- Support both area names (e.g. 'UPPADA') and 4-digit area codes in SC number (e.g. '3331')
  IF p_area IS NOT NULL AND p_area <> 'all' AND p_area <> '' THEN
    v_where := v_where || ' AND ('
      || 'ec.area_name = ANY(string_to_array(' || quote_literal(p_area) || ','',''))'
      || ' OR EXISTS ('
      || '   SELECT 1 FROM unnest(string_to_array(' || quote_literal(p_area) || ','','')) AS code'
      || '   WHERE ec.sc_number LIKE ''%'' || TRIM(code) || ''______'''
      || ' )'
      || ')';
  END IF;

  IF p_exclude_solar THEN v_where := v_where || ' AND (ec.solar_already_installed = false OR ec.solar_already_installed IS NULL)'; END IF;
  IF p_import_batch_id IS NOT NULL THEN v_where := v_where || ' AND ec.import_batch_id = ' || quote_literal(p_import_batch_id); END IF;
  IF p_date_from IS NOT NULL THEN v_where := v_where || ' AND ec.created_at >= ' || quote_literal(p_date_from || ' 00:00:00'); END IF;
  IF p_date_to IS NOT NULL THEN v_where := v_where || ' AND ec.created_at <= ' || quote_literal(p_date_to || ' 23:59:59'); END IF;

  IF jsonb_array_length(bill_conditions) > 0 THEN
    FOR v_cond IN SELECT jsonb_array_elements(bill_conditions) LOOP
      v_column := v_cond->>'column';
      v_operator := v_cond->>'operator';
      v_value := (v_cond->>'value')::NUMERIC;
      v_max_value := NULLIF(v_cond->>'max_value', '')::NUMERIC;
      IF v_column NOT IN ('bill_amount', 'billed_units') THEN CONTINUE; END IF;
      IF v_operator NOT IN ('gte', 'gt', 'lte', 'lt', 'eq', 'between') THEN CONTINUE; END IF;
      IF v_bill_clause <> '' THEN v_bill_clause := v_bill_clause || ' AND '; END IF;
      IF v_operator = 'between' AND v_max_value IS NOT NULL THEN
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE (eb.eb_customer_id = ec.id OR eb.sc_number = ec.sc_number) AND eb.tenant_id = ec.tenant_id) >= %s AND (SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE (eb.eb_customer_id = ec.id OR eb.sc_number = ec.sc_number) AND eb.tenant_id = ec.tenant_id) <= %s',
          quote_ident(v_column), v_value::TEXT, quote_ident(v_column), v_max_value::TEXT
        );
      ELSE
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE (eb.eb_customer_id = ec.id OR eb.sc_number = ec.sc_number) AND eb.tenant_id = ec.tenant_id) %s %s',
          quote_ident(v_column),
          CASE v_operator WHEN 'gte' THEN '>=' WHEN 'gt' THEN '>' WHEN 'lte' THEN '<=' WHEN 'lt' THEN '<' WHEN 'eq' THEN '=' WHEN 'between' THEN '>=' END,
          v_value::TEXT
        );
      END IF;
    END LOOP;
  END IF;

  v_has_bill_cond := v_bill_clause <> '';

  IF v_has_bill_cond THEN
    EXECUTE format(
      'SELECT count(*) FROM eb_customers ec WHERE %s AND %s',
      v_where, v_bill_clause
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
      SELECT ec.id, ec.tenant_id, ec.ero_name, ec.section_name, ec.area_name,
      ec.sc_number, ec.sur_name, ec.customer_name, ec.fhp_name,
      ec.address1, ec.address2, ec.address3, ec.address4,
      ec.category, ec.uksc_number, ec.contracted_load, ec.connected_load,
      ec.load_unit, ec.phase, ec.sm_mtr, ec.sub_group,
      ec.trans_struc_code, ec.feeder_no, ec.feeder_name,
      ec.sub_station_name, ec.feeder_type, ec.pol_no,
      ec.service_type, ec.supply_release_date, ec.status,
      ec.phone, ec.sd_amount, ec.multpf, ec.cat_iiib_flag,
      ec.meter_no, ec.meter_make, ec.meter_capacity, ec.metering_side,
      ec.mus_flag, ec.colony_name, ec.assembly_constituency,
      ec.mandal_name, ec.panchayath_name, ec.sc_st_flag,
      ec.aadhaar_number, ec.mobile_number, ec.ir_flag,
      ec.call_status, ec.remark, ec.last_called_at, ec.called_by,
      ec.follow_up_date, ec.solar_already_installed,
      ec.import_batch_id, ec.import_batch_label,
      ec.created_at, ec.updated_at,
      (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = ec.called_by) AS called_by_profile
      FROM eb_customers ec WHERE %s AND %s
      ORDER BY ec.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    ) INTO rows;
  ELSE
    EXECUTE format(
      'SELECT count(*) FROM eb_customers ec WHERE %s', v_where
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
      SELECT ec.id, ec.tenant_id, ec.ero_name, ec.section_name, ec.area_name,
      ec.sc_number, ec.sur_name, ec.customer_name, ec.fhp_name,
      ec.address1, ec.address2, ec.address3, ec.address4,
      ec.category, ec.uksc_number, ec.contracted_load, ec.connected_load,
      ec.load_unit, ec.phase, ec.sm_mtr, ec.sub_group,
      ec.trans_struc_code, ec.feeder_no, ec.feeder_name,
      ec.sub_station_name, ec.feeder_type, ec.pol_no,
      ec.service_type, ec.supply_release_date, ec.status,
      ec.phone, ec.sd_amount, ec.multpf, ec.cat_iiib_flag,
      ec.meter_no, ec.meter_make, ec.meter_capacity, ec.metering_side,
      ec.mus_flag, ec.colony_name, ec.assembly_constituency,
      ec.mandal_name, ec.panchayath_name, ec.sc_st_flag,
      ec.aadhaar_number, ec.mobile_number, ec.ir_flag,
      ec.call_status, ec.remark, ec.last_called_at, ec.called_by,
      ec.follow_up_date, ec.solar_already_installed,
      ec.import_batch_id, ec.import_batch_label,
      ec.created_at, ec.updated_at,
      (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = ec.called_by) AS called_by_profile
      FROM eb_customers ec WHERE %s
      ORDER BY ec.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, p_page_size, p_page_offset
    ) INTO rows;
  END IF;

  RETURN QUERY SELECT rows, total_count;
END;
$$;


-- >>> FILE: 20261005130000_add_phone_search_to_prospects.sql <<<
/*
# Add Phone and Mobile Number Search to search_prospects RPC
*/
CREATE OR REPLACE FUNCTION search_prospects(
  p_search TEXT DEFAULT NULL,
  p_circle TEXT DEFAULT NULL,
  p_division TEXT DEFAULT NULL,
  p_subdiv TEXT DEFAULT NULL,
  p_ero TEXT DEFAULT NULL,
  p_section TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_call_status TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_mandal TEXT DEFAULT NULL,
  p_sub_station TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  bill_conditions JSONB DEFAULT '[]'::JSONB,
  p_page_size INT DEFAULT 50,
  p_page_offset INT DEFAULT 0
)
RETURNS TABLE(rows JSON, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_where TEXT := '';
  v_bill_clause TEXT := '';
  v_has_bill_cond BOOLEAN := false;
  v_cond JSONB;
  v_column TEXT;
  v_operator TEXT;
  v_value NUMERIC;
  v_max_value NUMERIC;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT '[]'::JSON, 0::BIGINT;
    RETURN;
  END IF;

  v_where := 'lp.tenant_id = ' || quote_literal(v_tenant_id);

  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_where := v_where || ' AND ('
    || 'lp.sc_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.customer_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.mobile_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.email ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.meter_no ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.np_registration_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.ep_registration_number ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'''
    || ' OR lp.village_name ILIKE ''%' || REPLACE(p_search, '''', '''''') || '%'')';
  END IF;
  IF p_circle IS NOT NULL AND p_circle <> 'all' THEN v_where := v_where || ' AND lp.circle_name = ANY(string_to_array(' || quote_literal(p_circle) || ','',''))'; END IF;
  IF p_division IS NOT NULL AND p_division <> 'all' THEN v_where := v_where || ' AND lp.division_name = ANY(string_to_array(' || quote_literal(p_division) || ','',''))'; END IF;
  IF p_subdiv IS NOT NULL AND p_subdiv <> 'all' THEN v_where := v_where || ' AND lp.subdiv_name = ANY(string_to_array(' || quote_literal(p_subdiv) || ','',''))'; END IF;
  IF p_ero IS NOT NULL AND p_ero <> 'all' THEN v_where := v_where || ' AND lp.ero_name = ANY(string_to_array(' || quote_literal(p_ero) || ','',''))'; END IF;
  IF p_section IS NOT NULL AND p_section <> 'all' THEN v_where := v_where || ' AND lp.section_name = ANY(string_to_array(' || quote_literal(p_section) || ','',''))'; END IF;
  IF p_status IS NOT NULL AND p_status <> 'all' THEN v_where := v_where || ' AND lp.eb_status = ANY(string_to_array(' || quote_literal(p_status) || ','',''))'; END IF;
  IF p_call_status IS NOT NULL AND p_call_status <> 'all' THEN v_where := v_where || ' AND lp.call_status = ANY(string_to_array(' || quote_literal(p_call_status) || ','',''))'; END IF;
  IF p_category IS NOT NULL AND p_category <> 'all' THEN v_where := v_where || ' AND lp.category = ANY(string_to_array(' || quote_literal(p_category) || ','',''))'; END IF;
  IF p_mandal IS NOT NULL AND p_mandal <> 'all' THEN v_where := v_where || ' AND lp.mandal_name = ANY(string_to_array(' || quote_literal(p_mandal) || ','',''))'; END IF;
  IF p_sub_station IS NOT NULL AND p_sub_station <> 'all' THEN v_where := v_where || ' AND lp.sub_station_name = ANY(string_to_array(' || quote_literal(p_sub_station) || ','',''))'; END IF;
  IF p_date_from IS NOT NULL THEN v_where := v_where || ' AND lp.created_at >= ' || quote_literal(p_date_from || ' 00:00:00'); END IF;
  IF p_date_to IS NOT NULL THEN v_where := v_where || ' AND lp.created_at <= ' || quote_literal(p_date_to || ' 23:59:59'); END IF;

  -- Build bill conditions using MAX aggregate subqueries
  IF jsonb_array_length(bill_conditions) > 0 THEN
    FOR v_cond IN SELECT jsonb_array_elements(bill_conditions) LOOP
      v_column := v_cond->>'column';
      v_operator := v_cond->>'operator';
      v_value := (v_cond->>'value')::NUMERIC;
      v_max_value := NULLIF(v_cond->>'max_value', '')::NUMERIC;
      IF v_column NOT IN ('bill_amount', 'billed_units') THEN CONTINUE; END IF;
      IF v_operator NOT IN ('gte', 'gt', 'lte', 'lt', 'eq', 'between') THEN CONTINUE; END IF;
      IF v_bill_clause <> '' THEN v_bill_clause := v_bill_clause || ' AND '; END IF;
      IF v_operator = 'between' AND v_max_value IS NOT NULL THEN
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id) >= %s AND (SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id) <= %s',
          quote_ident(v_column), v_value::TEXT, quote_ident(v_column), v_max_value::TEXT
        );
      ELSE
        v_bill_clause := v_bill_clause || format(
          '(SELECT MAX(eb.%s) FROM eb_customer_bills eb WHERE eb.sc_number = lp.sc_number AND eb.tenant_id = lp.tenant_id) %s %s',
          quote_ident(v_column),
          CASE v_operator WHEN 'gte' THEN '>=' WHEN 'gt' THEN '>' WHEN 'lte' THEN '<=' WHEN 'lt' THEN '<' WHEN 'eq' THEN '=' WHEN 'between' THEN '>=' END,
          v_value::TEXT
        );
      END IF;
    END LOOP;
  END IF;

  v_has_bill_cond := v_bill_clause <> '';

  IF v_has_bill_cond THEN
    EXECUTE format(
      'SELECT count(*) FROM lead_prospects lp WHERE %s AND %s',
      v_where, v_bill_clause
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
      SELECT lp.id, lp.tenant_id, lp.serial_number, lp.circle_name, lp.division_name,
      lp.subdiv_name, lp.ero_name, lp.section_name, lp.sc_number,
      lp.customer_name, lp.existing_load_kw, lp.existing_solar_load_kw,
      lp.applied_solar_load_kw, lp.np_registration_number, lp.ep_registration_number,
      lp.complaint_date, lp.mobile_number, lp.email, lp.national_portal_status,
      lp.epdcl_portal_status, lp.village_name, lp.bill_amount_1, lp.bill_month_1,
      lp.bill_amount_2, lp.bill_month_2, lp.bill_amount_3, lp.bill_month_3,
      lp.is_existing_customer, lp.linked_customer_id, lp.eb_status,
      lp.call_status, lp.remark, lp.last_called_at, lp.called_by,
      lp.follow_up_date, lp.import_batch_id, lp.import_batch_label,
      lp.created_at, lp.updated_at, lp.category, lp.meter_no,
      lp.mandal_name, lp.sub_station_name, lp.area_name,
      (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = lp.called_by) AS called_by_profile
      FROM lead_prospects lp WHERE %s AND %s
      ORDER BY lp.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, v_bill_clause, p_page_size, p_page_offset
    ) INTO rows;
  ELSE
    EXECUTE format(
      'SELECT count(*) FROM lead_prospects lp WHERE %s', v_where
    ) INTO total_count;

    EXECUTE format(
      'SELECT coalesce(json_agg(row_to_json(t)), ''[]''::json) FROM (
      SELECT lp.id, lp.tenant_id, lp.serial_number, lp.circle_name, lp.division_name,
      lp.subdiv_name, lp.ero_name, lp.section_name, lp.sc_number,
      lp.customer_name, lp.existing_load_kw, lp.existing_solar_load_kw,
      lp.applied_solar_load_kw, lp.np_registration_number, lp.ep_registration_number,
      lp.complaint_date, lp.mobile_number, lp.email, lp.national_portal_status,
      lp.epdcl_portal_status, lp.village_name, lp.bill_amount_1, lp.bill_month_1,
      lp.bill_amount_2, lp.bill_month_2, lp.bill_amount_3, lp.bill_month_3,
      lp.is_existing_customer, lp.linked_customer_id, lp.eb_status,
      lp.call_status, lp.remark, lp.last_called_at, lp.called_by,
      lp.follow_up_date, lp.import_batch_id, lp.import_batch_label,
      lp.created_at, lp.updated_at, lp.category, lp.meter_no,
      lp.mandal_name, lp.sub_station_name, lp.area_name,
      (SELECT json_build_object(''id'', p.id, ''full_name'', p.full_name) FROM profiles p WHERE p.id = lp.called_by) AS called_by_profile
      FROM lead_prospects lp WHERE %s
      ORDER BY lp.created_at DESC LIMIT %s OFFSET %s
      ) t',
      v_where, p_page_size, p_page_offset
    ) INTO rows;
  END IF;

  RETURN QUERY SELECT rows, total_count;
END;
$$;


-- >>> FILE: 20261005170000_mark_legacy_unknown_with_consumer_number_as_churned.sql <<<
-- Migration: Mark legacy/unknown customers with consumer numbers as churned (lost)
-- Total customers count should only reflect imported customers.
-- Any customer that is legacy/unknown (import_source IS NULL, empty, or 'unknown'/'legacy') is moved to churned ('lost').

UPDATE public.customers
SET 
  customer_lifecycle_status = 'lost',
  lost_at = COALESCE(lost_at, updated_at, NOW()),
  updated_at = NOW()
WHERE 
  (import_source IS NULL OR import_source = '' OR import_source = 'unknown' OR import_source = 'legacy')
  AND (customer_lifecycle_status IS DISTINCT FROM 'lost');


