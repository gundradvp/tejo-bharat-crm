-- Add new columns to lead_generators table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'commission_rate'
  ) THEN
    ALTER TABLE lead_generators DROP COLUMN commission_rate;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lead_generators' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE lead_generators ADD COLUMN commission_amount numeric(10,2) DEFAULT 0;
  END IF;

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

CREATE INDEX IF NOT EXISTS idx_lead_generators_village ON lead_generators(village);
CREATE INDEX IF NOT EXISTS idx_lead_generators_mandal ON lead_generators(mandal);
CREATE INDEX IF NOT EXISTS idx_lead_generators_district ON lead_generators(district);
