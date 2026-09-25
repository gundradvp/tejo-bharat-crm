/*
  # Add All Missing Solar System Fields to Customers Table

  ## Overview
  This migration adds all solar system fields that are currently being used by the 
  application but are missing from the database schema.

  ## New Columns Added
  
  ### System Capacity Fields
  - `system_capacity` (text) - System capacity as text (e.g., "5 KWp")
  - `project_capacity_kw` (numeric) - Project capacity in kilowatts
  
  ### Panel/Module Fields
  - `number_of_panels` (integer) - Total number of solar panels installed
  - `module_capacity` (text) - Module/panel wattage capacity
  - `total_watts` (integer) - Total system wattage
  
  ## Relationships
  - `system_capacity` is a text representation, while `project_capacity_kw` is numeric
  - `total_capacity_kw` (from previous migration) can be computed from other fields
  - `number_of_panels` * module wattage = `total_watts`
  
  ## Notes
  - All fields are nullable to support existing records
  - Numeric fields use appropriate precision for solar calculations
  - These fields are used by document extraction and customer forms
*/

-- Add system capacity fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS system_capacity text,
ADD COLUMN IF NOT EXISTS project_capacity_kw numeric(10,2);

-- Add panel/module count and capacity fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS number_of_panels integer,
ADD COLUMN IF NOT EXISTS module_capacity text,
ADD COLUMN IF NOT EXISTS total_watts integer;

-- Add indexes for filtering and reporting
CREATE INDEX IF NOT EXISTS idx_customers_project_capacity ON customers(project_capacity_kw);
CREATE INDEX IF NOT EXISTS idx_customers_total_watts ON customers(total_watts);
CREATE INDEX IF NOT EXISTS idx_customers_number_of_panels ON customers(number_of_panels);

-- Create a function to auto-sync system_capacity with project_capacity_kw
CREATE OR REPLACE FUNCTION sync_system_capacity()
RETURNS TRIGGER AS $$
BEGIN
  -- If project_capacity_kw is set but system_capacity is not, auto-generate it
  IF NEW.project_capacity_kw IS NOT NULL AND (NEW.system_capacity IS NULL OR NEW.system_capacity = '') THEN
    NEW.system_capacity := NEW.project_capacity_kw || ' KWp';
  END IF;
  
  -- If system_capacity is set but project_capacity_kw is not, try to extract it
  IF NEW.system_capacity IS NOT NULL AND NEW.project_capacity_kw IS NULL THEN
    BEGIN
      NEW.project_capacity_kw := CAST(regexp_replace(NEW.system_capacity, '[^0-9.]', '', 'g') AS numeric);
    EXCEPTION WHEN OTHERS THEN
      -- If conversion fails, just leave it as is
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep system_capacity and project_capacity_kw in sync
DROP TRIGGER IF EXISTS trigger_sync_system_capacity ON customers;
CREATE TRIGGER trigger_sync_system_capacity
  BEFORE INSERT OR UPDATE OF system_capacity, project_capacity_kw ON customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_system_capacity();
