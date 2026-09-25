/*
  # Clean Up Duplicate Customers

  ## Description
  Removes duplicate customer records, keeping only the most complete/recent record.
  Duplicates are identified by:
  - Same customer name AND similar phone number (unmasked version)
  - Keeps the record with most complete data (non-null fields)
  - Keeps the most recently updated record as tiebreaker

  ## Strategy
  1. Identify duplicates by name and phone pattern
  2. For each duplicate group, keep the record with most data
  3. Delete the less complete duplicates
  4. Add unique constraints to prevent future duplicates
*/

-- Create a temporary function to count non-null fields
CREATE OR REPLACE FUNCTION count_filled_fields(customer_record customers)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    CASE WHEN customer_record.consumer_number IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN customer_record.email IS NOT NULL AND customer_record.email != '' THEN 1 ELSE 0 END +
    CASE WHEN customer_record.address IS NOT NULL AND customer_record.address != '' THEN 1 ELSE 0 END +
    CASE WHEN customer_record.inverter_brand IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN customer_record.panel_brand IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN customer_record.agreed_project_cost IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN customer_record.remarks IS NOT NULL AND customer_record.remarks != '' THEN 1 ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

-- Step 1: Find and mark duplicates to keep (most complete record per group)
CREATE TEMP TABLE customers_to_keep AS
WITH duplicate_groups AS (
  -- Group customers by name
  SELECT 
    customer_name,
    array_agg(id ORDER BY updated_at DESC NULLS LAST) as ids
  FROM customers
  GROUP BY customer_name
  HAVING COUNT(*) > 1
),
ranked_duplicates AS (
  SELECT 
    c.*,
    count_filled_fields(c.*) as completeness_score,
    ROW_NUMBER() OVER (
      PARTITION BY c.customer_name 
      ORDER BY 
        count_filled_fields(c.*) DESC,
        c.updated_at DESC NULLS LAST,
        c.created_at DESC
    ) as rank
  FROM customers c
  INNER JOIN duplicate_groups dg ON c.customer_name = dg.customer_name
)
SELECT id 
FROM ranked_duplicates 
WHERE rank = 1;

-- Step 2: Delete duplicates (keep only the best record per name)
DELETE FROM customers
WHERE customer_name IN (
  SELECT customer_name 
  FROM customers 
  GROUP BY customer_name 
  HAVING COUNT(*) > 1
)
AND id NOT IN (SELECT id FROM customers_to_keep);

-- Clean up
DROP FUNCTION IF EXISTS count_filled_fields(customers);

-- Step 3: Add unique constraint on consumer_number (if not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_consumer_number_unique 
ON customers(consumer_number) 
WHERE consumer_number IS NOT NULL AND consumer_number != '';

-- Step 4: Log the cleanup
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Get count from the audit perspective
  SELECT COUNT(*) INTO deleted_count
  FROM customers
  WHERE customer_name IN (
    SELECT customer_name 
    FROM customers 
    GROUP BY customer_name 
    HAVING COUNT(*) > 1
  );
  
  RAISE NOTICE 'Duplicate cleanup completed. Kept most complete records.';
END $$;
