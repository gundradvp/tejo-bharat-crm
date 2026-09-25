/*
  # Add Application Reference Number Field

  Adds application_ref_no as the unique identifier for customers.
  This is the application number from PM Surya Ghar portal like NP-APEPD25-8606813.
*/

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS application_ref_no TEXT;

DROP INDEX IF EXISTS idx_customers_consumer_number_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_application_ref_no_unique 
ON customers(application_ref_no) 
WHERE application_ref_no IS NOT NULL AND application_ref_no != '';

CREATE INDEX IF NOT EXISTS idx_customers_application_ref_no 
ON customers(application_ref_no) 
WHERE application_ref_no IS NOT NULL;
