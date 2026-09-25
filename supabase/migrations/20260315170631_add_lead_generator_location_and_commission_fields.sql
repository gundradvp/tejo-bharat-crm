/*
  # Update Lead Generators Table - Add Location and Commission Fields

  1. Changes
    - Remove `commission_rate` column
    - Add `commission_amount` column for fixed commission amount
    - Add `village` column for village/locality
    - Add `mandal` column for mandal/taluk
    - Add `district` column for district
    - Add `state` column for state (optional)
    - Add `pincode` column for pincode

  2. Notes
    - All new columns are optional except commission_amount
    - Location fields will be populated from lookup values
*/

-- Add new columns to lead_generators table
DO $$
BEGIN
  -- Remove commission_rate if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE lead_generators DROP COLUMN commission_rate;
  END IF;

  -- Add commission_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN commission_amount numeric(10,2) DEFAULT 0;
  END IF;

  -- Add location fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'village'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN village text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'mandal'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN mandal text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'district'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN district text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'state'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN state text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'pincode'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN pincode text;
  END IF;
END $$;

-- Create indexes for location fields for better search performance
CREATE INDEX IF NOT EXISTS idx_lead_generators_village ON lead_generators(village);
CREATE INDEX IF NOT EXISTS idx_lead_generators_mandal ON lead_generators(mandal);
CREATE INDEX IF NOT EXISTS idx_lead_generators_district ON lead_generators(district);