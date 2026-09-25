/*
  # Convert Panel Serial Numbers Column from Array to Text

  1. Changes
    - Change panel_serial_numbers column type from text[] to text
    - Convert all existing array values to comma-separated strings during migration
  
  2. Details
    - Uses array_to_string to convert existing PostgreSQL arrays to comma-separated strings
    - Handles NULL values properly
    - Changes column type from text[] to text
*/

-- First, convert all existing array values to comma-separated strings
-- and store in a temporary column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_serial_numbers_temp text;

UPDATE customers
SET panel_serial_numbers_temp = array_to_string(panel_serial_numbers, ',')
WHERE panel_serial_numbers IS NOT NULL;

-- Drop the old array column
ALTER TABLE customers DROP COLUMN panel_serial_numbers;

-- Rename the temp column to the original name
ALTER TABLE customers RENAME COLUMN panel_serial_numbers_temp TO panel_serial_numbers;
