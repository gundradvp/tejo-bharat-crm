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