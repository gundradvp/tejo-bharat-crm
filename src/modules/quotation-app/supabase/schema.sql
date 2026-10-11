-- Tejo Bharat Solar Quotation Database Schema for Supabase
-- Can be run directly in Supabase SQL Editor

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(100),
  gstin VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Tejo Bharat Branches
INSERT INTO public.branches (code, name, address, city, state, phone, email, gstin, is_default)
VALUES 
  ('HYD', 'Tejo Bharat Hyderabad HQ', 'N V Homes, Moosapet, Hyderabad, Telangana', 'Hyderabad', 'Telangana', '+91 94797 97947', 'contact@tejobharat.com', '36AAAAA0000A1Z5', TRUE),
  ('PITH', 'Pithapuram / Kakinada Branch', 'Main Road, Pithapuram, Kakinada District, Andhra Pradesh', 'Pithapuram', 'Andhra Pradesh', '+91 94797 97947', 'ap@tejobharat.com', '37AAAAA0000A1Z5', FALSE)
ON CONFLICT (code) DO NOTHING;

-- 3. Ensure Quotations Table has all required columns
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_no VARCHAR(100) NOT NULL UNIQUE,
  quotation_date VARCHAR(50),
  expiry_date VARCHAR(50),
  customer_name VARCHAR(255) NOT NULL,
  customer_mobile VARCHAR(50),
  customer_address TEXT,
  customer_location VARCHAR(255),
  category VARCHAR(100) DEFAULT 'Commercial / Institutional',
  installation_type VARCHAR(100) DEFAULT 'On-Grid Rooftop Solar Plant',
  system_capacity_kw NUMERIC DEFAULT 5,
  rate_per_kw NUMERIC DEFAULT 60000,
  total_amount NUMERIC DEFAULT 300000,
  monthly_units INTEGER,
  annual_units INTEGER,
  monthly_savings_rs NUMERIC,
  payback_period_years NUMERIC,
  panel_brand VARCHAR(255) DEFAULT 'Premier / Waaree / Adani / ReNew',
  inverter_brand VARCHAR(255) DEFAULT 'Deye Inverter',
  cables_brand VARCHAR(255) DEFAULT 'Polycab',
  structure_type VARCHAR(255) DEFAULT 'Heavy Duty HDG',
  branch_code VARCHAR(50) DEFAULT 'HYD',
  document_type VARCHAR(50) DEFAULT 'Quotation',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Allow Full Access for App
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to quotations" ON public.quotations;
CREATE POLICY "Allow all access to quotations" ON public.quotations
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to branches" ON public.branches;
CREATE POLICY "Allow all access to branches" ON public.branches
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
