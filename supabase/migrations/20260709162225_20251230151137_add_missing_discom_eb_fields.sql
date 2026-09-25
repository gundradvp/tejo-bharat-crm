ALTER TABLE customers ADD COLUMN IF NOT EXISTS eb_distribution text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS eb_section text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discom_division text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS discom_subdivision text;
CREATE INDEX IF NOT EXISTS idx_customers_eb_distribution ON customers(eb_distribution);
CREATE INDEX IF NOT EXISTS idx_customers_eb_section ON customers(eb_section);
CREATE INDEX IF NOT EXISTS idx_customers_discom_division ON customers(discom_division);
CREATE INDEX IF NOT EXISTS idx_customers_discom_subdivision ON customers(discom_subdivision);