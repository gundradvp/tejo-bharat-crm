/*
# Create Lead Prospects CRM tables

1. New Tables
- `lead_prospects` — stores imported Excel prospect rows (circle/division/subdiv/section,
  SC number, loads, registration numbers, complaint date, mobile, email, portal statuses,
  village name, monthly bill amounts). Includes CRM calling fields: call_status, remark,
  last_called_at, called_by, follow_up_date, and a cross-reference to existing customers
  (is_existing_customer, linked_customer_id).
- `lead_prospect_calls` — call history log per prospect (outcome, remark, called_by, called_at,
  follow_up_date).
2. Security
- Enable RLS on both tables.
- Tenant-scoped CRUD policies for authenticated users (same pattern as customers).
3. Indexes
- Indexes on tenant_id + circle_name, division_name, subdiv_name, section_name, sc_number,
  mobile_number, call_status for fast filtering.
*/

CREATE TABLE IF NOT EXISTS lead_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT get_current_user_tenant_id(),

  -- Excel import fields
  serial_number integer,
  circle_name text,
  division_name text,
  subdiv_name text,
  section_name text,
  sc_number text,
  existing_load_kw numeric,
  existing_solar_load_kw numeric,
  applied_solar_load_kw numeric,
  np_registration_number text,
  ep_registration_number text,
  complaint_date date,
  mobile_number text,
  email text,
  national_portal_status text,
  epdcl_portal_status text,
  village_name text,

  -- Monthly bill history (last 3 months)
  bill_amount_1 numeric,
  bill_month_1 text,
  bill_amount_2 numeric,
  bill_month_2 text,
  bill_amount_3 numeric,
  bill_month_3 text,

  -- CRM calling / tracking fields
  call_status text NOT NULL DEFAULT 'not_called',
  remark text,
  last_called_at timestamptz,
  called_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  follow_up_date date,

  -- Cross-reference to existing Surya Ghar customers
  is_existing_customer boolean NOT NULL DEFAULT false,
  linked_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lead_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lead_prospects" ON lead_prospects;
CREATE POLICY "select_lead_prospects" ON lead_prospects
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "insert_lead_prospects" ON lead_prospects;
CREATE POLICY "insert_lead_prospects" ON lead_prospects
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "update_lead_prospects" ON lead_prospects;
CREATE POLICY "update_lead_prospects" ON lead_prospects
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "delete_lead_prospects" ON lead_prospects;
CREATE POLICY "delete_lead_prospects" ON lead_prospects
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_circle ON lead_prospects(tenant_id, circle_name);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_division ON lead_prospects(tenant_id, division_name);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_subdiv ON lead_prospects(tenant_id, subdiv_name);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_section ON lead_prospects(tenant_id, section_name);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_sc ON lead_prospects(tenant_id, sc_number);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_mobile ON lead_prospects(tenant_id, mobile_number);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_status ON lead_prospects(tenant_id, call_status);
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_followup ON lead_prospects(tenant_id, follow_up_date);

-- Call history log
CREATE TABLE IF NOT EXISTS lead_prospect_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT get_current_user_tenant_id(),
  prospect_id uuid NOT NULL REFERENCES lead_prospects(id) ON DELETE CASCADE,
  call_status text NOT NULL,
  remark text,
  called_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  called_at timestamptz NOT NULL DEFAULT now(),
  follow_up_date date
);

ALTER TABLE lead_prospect_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lead_prospect_calls" ON lead_prospect_calls;
CREATE POLICY "select_lead_prospect_calls" ON lead_prospect_calls
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "insert_lead_prospect_calls" ON lead_prospect_calls;
CREATE POLICY "insert_lead_prospect_calls" ON lead_prospect_calls
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "delete_lead_prospect_calls" ON lead_prospect_calls;
CREATE POLICY "delete_lead_prospect_calls" ON lead_prospect_calls
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_lead_prospect_calls_prospect ON lead_prospect_calls(prospect_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_prospect_calls_tenant ON lead_prospect_calls(tenant_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_lead_prospects_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_prospects_updated_at ON lead_prospects;
CREATE TRIGGER trigger_lead_prospects_updated_at
  BEFORE UPDATE ON lead_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_prospects_updated_at();
