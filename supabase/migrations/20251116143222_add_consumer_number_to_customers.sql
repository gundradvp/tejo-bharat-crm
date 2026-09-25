/*
  # Add Consumer Number to Customers Table

  ## Changes
  - Add consumer_number column to customers table
  - Create unique index on consumer_number
  - This allows matching customers across CSV and JSON imports using the official consumer registration number

  ## Notes
  - Consumer number is the unique identifier from PM Surya Ghar portal
  - Can be null for existing records, but should be populated for all imports
*/

-- Add consumer_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'consumer_number'
  ) THEN
    ALTER TABLE customers ADD COLUMN consumer_number text;
  END IF;
END $$;

-- Create unique index on consumer_number (where not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_consumer_number 
  ON customers(consumer_number) 
  WHERE consumer_number IS NOT NULL;

-- Create index on phone for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone 
  ON customers(phone);
