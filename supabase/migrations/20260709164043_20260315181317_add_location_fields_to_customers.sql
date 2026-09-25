DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'state_id') THEN
    ALTER TABLE customers ADD COLUMN state_id bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'district_id') THEN
    ALTER TABLE customers ADD COLUMN district_id bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'constituency_id') THEN
    ALTER TABLE customers ADD COLUMN constituency_id bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'mandal_id') THEN
    ALTER TABLE customers ADD COLUMN mandal_id bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'village_id') THEN
    ALTER TABLE customers ADD COLUMN village_id bigint;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_state_id ON customers(tenant_id, state_id);
CREATE INDEX IF NOT EXISTS idx_customers_district_id ON customers(tenant_id, district_id);
CREATE INDEX IF NOT EXISTS idx_customers_constituency_id ON customers(tenant_id, constituency_id);
CREATE INDEX IF NOT EXISTS idx_customers_mandal_id ON customers(tenant_id, mandal_id);
CREATE INDEX IF NOT EXISTS idx_customers_village_id ON customers(tenant_id, village_id);
