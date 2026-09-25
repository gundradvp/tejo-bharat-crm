/*
  # Add Company Logo URL to Company Settings

  1. Changes
    - Add `company_logo_url` column to `company_settings` table
  
  2. Purpose
    - Allow companies to store their logo URL for use in quotations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'company_logo_url'
  ) THEN
    ALTER TABLE company_settings 
    ADD COLUMN company_logo_url text;
  END IF;
END $$;