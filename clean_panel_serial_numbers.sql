-- Clean up panel serial numbers that have extra quotes
-- This script removes surrounding quotes from panel serial number array elements

UPDATE customers
SET panel_serial_numbers = (
  SELECT array_agg(
    regexp_replace(elem, '^"?(.*?)"?$', '\1', 'g')
  )
  FROM unnest(panel_serial_numbers) AS elem
)
WHERE panel_serial_numbers IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(panel_serial_numbers) AS elem
    WHERE elem LIKE '"%"' OR elem LIKE '"_%'
  );

-- Verify the fix
SELECT
  id,
  customer_name,
  panel_serial_numbers
FROM customers
WHERE panel_serial_numbers IS NOT NULL
LIMIT 10;
