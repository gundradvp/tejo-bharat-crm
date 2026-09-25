-- Create a temp table of IDs to keep (most recent per tenant_id, sc_number)
CREATE TEMP TABLE eb_keep_ids AS
SELECT DISTINCT ON (tenant_id, sc_number) id
FROM eb_customers
WHERE sc_number IS NOT NULL
ORDER BY tenant_id, sc_number, created_at DESC;