/*
# Create EB Customers CRM tables
EB (Electricity Board) consumer records CRM with 45 data columns + CRM calling fields.
Designed for 113,000+ records with server-side pagination.
*/
CREATE TABLE IF NOT EXISTS eb_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT get_current_user_tenant_id(),
  ero_name text, section_name text, area_name text, sc_number text NOT NULL,
  sur_name text, customer_name text, fhp_name text,
  address1 text, address2 text, address3 text, address4 text,
  category text, uksc_number text,
  contracted_load numeric, connected_load numeric, load_unit text, phase text,
  sm_mtr text, sub_group text, trans_struc_code text,
  feeder_no text, feeder_name text, sub_station_name text, feeder_type text, pol_no text,
  service_type text, supply_release_date date, status text, phone text,
  sd_amount numeric, multpf numeric, cat_iiib_flag text,
  meter_no text, meter_make text, meter_capacity text, metering_side text, mus_flag text,
  colony_name text, assembly_constituency text, mandal_name text, panchayath_name text,
  sc_st_flag text, aadhaar_number text, mobile_number text, ir_flag text,
  call_status text NOT NULL DEFAULT 'not_called',
  remark text, last_called_at timestamptz,
  called_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE eb_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_eb_customers" ON eb_customers;
CREATE POLICY "select_eb_customers" ON eb_customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "insert_eb_customers" ON eb_customers;
CREATE POLICY "insert_eb_customers" ON eb_customers FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "update_eb_customers" ON eb_customers;
CREATE POLICY "update_eb_customers" ON eb_customers FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "delete_eb_customers" ON eb_customers;
CREATE POLICY "delete_eb_customers" ON eb_customers FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
DROP INDEX IF EXISTS eb_customers_tenant_sc_unique;
CREATE UNIQUE INDEX IF NOT EXISTS eb_customers_tenant_sc_unique ON eb_customers(tenant_id, sc_number);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_ero ON eb_customers(tenant_id, ero_name);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_section ON eb_customers(tenant_id, section_name);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_mobile ON eb_customers(tenant_id, mobile_number);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_status ON eb_customers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_call_status ON eb_customers(tenant_id, call_status);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_category ON eb_customers(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_mandal ON eb_customers(tenant_id, mandal_name);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_followup ON eb_customers(tenant_id, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_name ON eb_customers(tenant_id, customer_name);
CREATE TABLE IF NOT EXISTS eb_customer_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT get_current_user_tenant_id(),
  eb_customer_id uuid NOT NULL REFERENCES eb_customers(id) ON DELETE CASCADE,
  call_status text NOT NULL, remark text,
  called_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  called_at timestamptz NOT NULL DEFAULT now(),
  follow_up_date date
);
ALTER TABLE eb_customer_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_eb_customer_calls" ON eb_customer_calls;
CREATE POLICY "select_eb_customer_calls" ON eb_customer_calls FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "insert_eb_customer_calls" ON eb_customer_calls;
CREATE POLICY "insert_eb_customer_calls" ON eb_customer_calls FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
DROP POLICY IF EXISTS "delete_eb_customer_calls" ON eb_customer_calls;
CREATE POLICY "delete_eb_customer_calls" ON eb_customer_calls FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_eb_customer_calls_customer ON eb_customer_calls(eb_customer_id, called_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_customer_calls_tenant ON eb_customer_calls(tenant_id);
CREATE OR REPLACE FUNCTION update_eb_customers_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_eb_customers_updated_at ON eb_customers;
CREATE TRIGGER trigger_eb_customers_updated_at BEFORE UPDATE ON eb_customers FOR EACH ROW EXECUTE FUNCTION update_eb_customers_updated_at();
