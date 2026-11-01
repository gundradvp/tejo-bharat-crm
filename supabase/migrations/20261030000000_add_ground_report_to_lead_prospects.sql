-- Migration: Add PM Surya Ghar Ground Report fields to lead_prospects
-- Allows storing solar panel serial numbers, inverter manufacturer, inverter serials, net meter number, and CFA subsidy

ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS ground_report jsonb;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS panel_serial_numbers text;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS inverter_manufacturer text;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS inverter_serial_number text;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS total_cfa_amt numeric;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS customer_share_amt numeric;

-- Index for searching prospects by panel serial number or inverter serial number
CREATE INDEX IF NOT EXISTS idx_lead_prospects_inverter_serial ON lead_prospects (inverter_serial_number);
