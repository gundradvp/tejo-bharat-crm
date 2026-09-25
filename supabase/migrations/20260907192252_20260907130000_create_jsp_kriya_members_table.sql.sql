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
