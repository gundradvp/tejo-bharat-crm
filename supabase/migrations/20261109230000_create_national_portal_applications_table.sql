-- =========================================================================
-- CREATE NATIONAL PORTAL APPLICATIONS TABLE (Eliminates Huge JSON in Browser)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.national_portal_applications (
  id TEXT PRIMARY KEY,
  app_num TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  sc TEXT,
  state TEXT,
  district TEXT,
  circle TEXT,
  division TEXT,
  subdiv TEXT,
  village TEXT,
  address TEXT,
  pincode TEXT,
  cap NUMERIC DEFAULT 0,
  sanction_load NUMERIC DEFAULT 0,
  step_id TEXT,
  step TEXT,
  vendor TEXT,
  subsidy_amt NUMERIC DEFAULT 0,
  subsidy_status TEXT,
  modules_count INT DEFAULT 0,
  inverters_count INT DEFAULT 0,
  docs_count INT DEFAULT 0,
  has_dcr BOOLEAN DEFAULT false,
  panel_serials TEXT[],
  inv_serials TEXT[],
  module_mfr TEXT,
  inv_mfr TEXT,
  loan_app_no TEXT,
  loan_amt NUMERIC DEFAULT 0,
  loan_status TEXT,
  loan_date TEXT,
  bank_name TEXT,
  account_no TEXT,
  ifsc TEXT,
  account_holder TEXT,
  net_meter_date TEXT,
  submission_date TEXT,
  raw_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast server-side search, filtering and sorting
CREATE INDEX IF NOT EXISTS idx_npa_sc ON public.national_portal_applications(sc);
CREATE INDEX IF NOT EXISTS idx_npa_phone ON public.national_portal_applications(phone);
CREATE INDEX IF NOT EXISTS idx_npa_app_num ON public.national_portal_applications(app_num);
CREATE INDEX IF NOT EXISTS idx_npa_state_district ON public.national_portal_applications(state, district);
CREATE INDEX IF NOT EXISTS idx_npa_step ON public.national_portal_applications(step);
CREATE INDEX IF NOT EXISTS idx_npa_vendor ON public.national_portal_applications(vendor);
CREATE INDEX IF NOT EXISTS idx_npa_created_at ON public.national_portal_applications(created_at DESC);

-- Enable RLS and setup permissive read/write policies
ALTER TABLE public.national_portal_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read national_portal_applications" ON public.national_portal_applications;
CREATE POLICY "Allow public read national_portal_applications"
  ON public.national_portal_applications FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access" ON public.national_portal_applications;
CREATE POLICY "Allow service_role full access"
  ON public.national_portal_applications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access" ON public.national_portal_applications;
CREATE POLICY "Allow authenticated full access"
  ON public.national_portal_applications FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
