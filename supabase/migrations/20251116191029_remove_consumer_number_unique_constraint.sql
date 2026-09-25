/*
  # Remove unique constraint on consumer_number

  Consumer numbers can be duplicated or null, so we remove the unique constraint.
  Only application_ref_no should be unique.
*/

DROP INDEX IF EXISTS idx_customers_consumer_number;

CREATE INDEX IF NOT EXISTS idx_customers_consumer_number_lookup 
ON customers(consumer_number) 
WHERE consumer_number IS NOT NULL;
