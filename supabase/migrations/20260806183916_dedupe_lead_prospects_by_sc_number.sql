-- Remove duplicate lead_prospects by sc_number, keeping the newest (latest created_at)
DELETE FROM lead_prospects
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY sc_number ORDER BY created_at DESC, id DESC) as rn
    FROM lead_prospects
    WHERE sc_number IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE lead_prospects ADD CONSTRAINT lead_prospects_sc_number_unique UNIQUE (sc_number);
