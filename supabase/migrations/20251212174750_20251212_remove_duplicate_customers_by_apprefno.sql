/*
  # Remove Duplicate Customers by Application Reference Number
  
  ## Overview
  Removes duplicate customer records that share the same application_ref_no,
  keeping only the most recently updated record for each application reference.
  
  ## Changes
  - Identifies customers with duplicate application_ref_no values
  - Keeps the record with the latest updated_at timestamp
  - Deletes older duplicate records
  - Preserves data integrity with foreign key cascades
  
  ## Important Notes
  1. Only processes customers where application_ref_no is NOT NULL
  2. Keeps the most recently updated version of each customer
  3. Dependent records (tasks, notes, payments, etc.) are handled by CASCADE DELETE
  4. This is a one-time cleanup operation
  5. Future duplicates are prevented by the UNIQUE constraint
*/

WITH duplicate_ids AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY application_ref_no 
           ORDER BY updated_at DESC, id DESC
         ) AS rn
  FROM customers
  WHERE application_ref_no IS NOT NULL
)
DELETE FROM customers
WHERE id IN (
  SELECT id FROM duplicate_ids WHERE rn > 1
);