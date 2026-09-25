ALTER TABLE customers ADD COLUMN IF NOT EXISTS inverter_make text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_make text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_type text;
CREATE INDEX IF NOT EXISTS idx_customers_inverter_make ON customers(inverter_make);
CREATE INDEX IF NOT EXISTS idx_customers_panel_make ON customers(panel_make);
CREATE INDEX IF NOT EXISTS idx_customers_panel_type ON customers(panel_type);