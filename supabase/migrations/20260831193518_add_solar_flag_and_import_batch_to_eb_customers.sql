/*
# Add solar flag and import batch tracking to eb_customers

1. New Columns on eb_customers
- solar_already_installed (boolean, default false) — tracks whether solar is already installed at this customer's premises
- import_batch_id (text, nullable) — UUID identifying the import batch
- import_batch_label (text, nullable) — human-readable label for the import batch

2. Indexes
- idx_eb_customers_import_batch on (tenant_id, import_batch_id) for batch filtering
- idx_eb_customers_created_at on (tenant_id, created_at) for date range filtering
- idx_eb_customers_solar on (tenant_id, solar_already_installed) for solar flag filtering

3. Security
- No RLS/policy changes. Existing policies remain unchanged.
- New columns inherit existing tenant isolation.
*/

ALTER TABLE eb_customers
  ADD COLUMN IF NOT EXISTS solar_already_installed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_batch_id text,
  ADD COLUMN IF NOT EXISTS import_batch_label text;

CREATE INDEX IF NOT EXISTS idx_eb_customers_import_batch
  ON eb_customers (tenant_id, import_batch_id);

CREATE INDEX IF NOT EXISTS idx_eb_customers_created_at
  ON eb_customers (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_eb_customers_solar
  ON eb_customers (tenant_id, solar_already_installed);
