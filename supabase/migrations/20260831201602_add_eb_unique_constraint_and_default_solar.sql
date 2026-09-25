-- Add unique constraint on eb_customers (tenant_id, sc_number)
CREATE UNIQUE INDEX IF NOT EXISTS eb_customers_tenant_sc_unique
  ON eb_customers (tenant_id, sc_number)
  WHERE sc_number IS NOT NULL;

-- Set solar_already_installed = false where it's NULL
UPDATE eb_customers SET solar_already_installed = false WHERE solar_already_installed IS NULL;

-- Drop staging table
DROP TABLE IF EXISTS _eb_dedup_keep;