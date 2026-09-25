-- Create a staging table of IDs to keep (most recent per tenant_id, sc_number)
CREATE TABLE _eb_dedup_keep AS
SELECT DISTINCT ON (tenant_id, sc_number) id
FROM eb_customers
WHERE sc_number IS NOT NULL
ORDER BY tenant_id, sc_number, created_at DESC;

CREATE INDEX ON _eb_dedup_keep(id);