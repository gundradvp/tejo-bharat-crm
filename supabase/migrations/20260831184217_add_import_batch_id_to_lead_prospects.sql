/*
# Add import_batch_id to lead_prospects for batch filtering

1. Changes
- Add `import_batch_id` column (uuid, nullable) to lead_prospects. This groups rows imported in the same upload.
- Add `import_batch_label` column (text, nullable) to store the file name for display in the filter dropdown.
- Add index on (tenant_id, import_batch_id) for efficient batch filtering.
2. Security
- No RLS or policy changes. The new columns inherit existing tenant isolation.
*/

ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS import_batch_id uuid;
ALTER TABLE lead_prospects ADD COLUMN IF NOT EXISTS import_batch_label text;

CREATE INDEX IF NOT EXISTS idx_lead_prospects_import_batch ON lead_prospects(tenant_id, import_batch_id);
