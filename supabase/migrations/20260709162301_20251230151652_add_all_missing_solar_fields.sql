ALTER TABLE customers ADD COLUMN IF NOT EXISTS system_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS project_capacity_kw numeric(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS number_of_panels integer;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS module_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_watts integer;

CREATE INDEX IF NOT EXISTS idx_customers_project_capacity ON customers(project_capacity_kw);
CREATE INDEX IF NOT EXISTS idx_customers_total_watts ON customers(total_watts);
CREATE INDEX IF NOT EXISTS idx_customers_number_of_panels ON customers(number_of_panels);

CREATE OR REPLACE FUNCTION sync_system_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_capacity_kw IS NOT NULL AND (NEW.system_capacity IS NULL OR NEW.system_capacity = '') THEN
    NEW.system_capacity := NEW.project_capacity_kw || ' KWp';
  END IF;
  IF NEW.system_capacity IS NOT NULL AND NEW.project_capacity_kw IS NULL THEN
    BEGIN
      NEW.project_capacity_kw := CAST(regexp_replace(NEW.system_capacity, '[^0-9.]', '', 'g') AS numeric);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_system_capacity ON customers;
CREATE TRIGGER trigger_sync_system_capacity
  BEFORE INSERT OR UPDATE OF system_capacity, project_capacity_kw ON customers
  FOR EACH ROW EXECUTE FUNCTION sync_system_capacity();