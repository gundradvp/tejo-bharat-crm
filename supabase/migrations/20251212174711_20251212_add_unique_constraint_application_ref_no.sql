/*
  # Add Unique Constraint for Application Reference Number
  
  ## Overview
  Adds a unique constraint on application_ref_no to prevent duplicate customer imports.
  
  ## Changes
  - Add UNIQUE constraint on customers.application_ref_no
  - Ensures applicationRefNo serves as the primary unique identifier
  - Prevents duplicate customers when importing
  
  ## Important Notes
  - NULL values are allowed (for customers without an application reference)
  - Multiple NULLs don't violate uniqueness
  - Consumer number and phone can still be used as fallback identifiers
*/

DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_application_ref_no_unique'
  ) THEN
    ALTER TABLE customers 
    ADD CONSTRAINT customers_application_ref_no_unique 
    UNIQUE (application_ref_no);
  END IF;
END $$;