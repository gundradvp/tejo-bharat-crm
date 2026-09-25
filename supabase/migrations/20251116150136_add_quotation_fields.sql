/*
  # Add Quotation Fields to Customers Table

  ## Overview
  This migration adds fields to store customer-specific quotation details for solar installations.

  ## New Fields Added

  ### Quotation Details
  - quotation_number (text) - Unique quotation reference number
  - quotation_date (date) - Date when quotation was issued
  - quotation_valid_until (date) - Quotation validity date
  - system_cost (numeric) - Total system cost
  - subsidy_amount (numeric) - Government subsidy amount
  - net_payable (numeric) - Net amount payable by customer
  - gst_amount (numeric) - GST amount
  - total_amount (numeric) - Grand total including GST
  - payment_terms (text) - Payment terms and conditions
  - installation_timeline (text) - Expected installation timeline
  - warranty_details (text) - Warranty information
  - special_terms (text) - Any special terms or conditions

  ## Security
  - All fields are nullable to support gradual data entry
  - RLS policies remain unchanged - existing policies cover new fields
*/

-- Quotation Details
ALTER TABLE customers ADD COLUMN IF NOT EXISTS quotation_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS quotation_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS quotation_valid_until date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS system_cost numeric(12,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS subsidy_amount numeric(12,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS net_payable numeric(12,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gst_amount numeric(12,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_amount numeric(12,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS installation_timeline text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS warranty_details text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS special_terms text;

-- Create index for quotation number
CREATE INDEX IF NOT EXISTS idx_customers_quotation_number ON customers(quotation_number) WHERE quotation_number IS NOT NULL;