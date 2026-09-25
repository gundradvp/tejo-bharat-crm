WITH duplicate_ids AS (
  SELECT id,
         row_number() OVER (PARTITION BY application_ref_no ORDER BY updated_at DESC, id DESC) AS rn
  FROM customers
  WHERE application_ref_no IS NOT NULL
)
DELETE FROM customers WHERE id IN (SELECT id FROM duplicate_ids WHERE rn > 1);