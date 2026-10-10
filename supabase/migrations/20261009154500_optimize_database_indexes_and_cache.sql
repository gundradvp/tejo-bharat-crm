-- Database Performance Optimization Migration
-- Run this in Supabase SQL Editor to index, vacuum, and prewarm cache after compute resize/upgrade.

-- 1. Ensure clean default and no NULL values for boolean flags
UPDATE eb_customers SET solar_already_installed = false WHERE solar_already_installed IS NULL;
ALTER TABLE eb_customers ALTER COLUMN solar_already_installed SET DEFAULT false;

-- 2. Performance Indexes for EB Customers (438k+ rows)
CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_created_desc 
  ON eb_customers(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_sc_num 
  ON eb_customers(tenant_id, sc_number);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_category 
  ON eb_customers(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_solar 
  ON eb_customers(tenant_id, solar_already_installed);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_ero 
  ON eb_customers(tenant_id, ero_name);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_section 
  ON eb_customers(tenant_id, section_name);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_mandal 
  ON eb_customers(tenant_id, mandal_name);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_status 
  ON eb_customers(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_eb_customers_tenant_call_status 
  ON eb_customers(tenant_id, call_status);

CREATE INDEX IF NOT EXISTS idx_eb_customers_mobile 
  ON eb_customers(mobile_number) WHERE mobile_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eb_customers_phone 
  ON eb_customers(phone) WHERE phone IS NOT NULL;

-- 3. Performance Indexes for EB Bills (sc_number based)
CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_sc 
  ON eb_customer_bills(tenant_id, sc_number);

CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_units 
  ON eb_customer_bills(tenant_id, billed_units DESC);

CREATE INDEX IF NOT EXISTS idx_eb_bills_tenant_amount 
  ON eb_customer_bills(tenant_id, bill_amount DESC);

-- 4. Performance Indexes for Lead Prospects
CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_sc 
  ON lead_prospects(tenant_id, sc_number);

CREATE INDEX IF NOT EXISTS idx_lead_prospects_tenant_mobile 
  ON lead_prospects(tenant_id, mobile_number);

-- 5. Enable pg_prewarm extension if available
CREATE EXTENSION IF NOT EXISTS pg_prewarm;

-- 6. Refresh Query Planner Statistics
ANALYZE eb_customers;
ANALYZE eb_customer_bills;
ANALYZE lead_prospects;
ANALYZE profiles;

-- 7. Prewarm Tables & Indexes into RAM Buffer Cache
DO $$
BEGIN
  BEGIN
    PERFORM pg_prewarm('eb_customers');
    PERFORM pg_prewarm('eb_customer_bills');
    PERFORM pg_prewarm('lead_prospects');
  EXCEPTION WHEN OTHERS THEN
    -- If pg_prewarm is restricted, warm up via sequential index scan
    PERFORM count(*) FROM eb_customers;
    PERFORM count(*) FROM eb_customer_bills;
    PERFORM count(*) FROM lead_prospects;
  END;
END $$;
