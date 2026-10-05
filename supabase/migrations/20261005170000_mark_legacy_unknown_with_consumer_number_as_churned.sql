-- Migration: Mark legacy/unknown customers with consumer numbers as churned (lost)
-- Total customers count should only reflect imported customers.
-- Any customer that is legacy/unknown (import_source IS NULL, empty, or 'unknown'/'legacy') is moved to churned ('lost').

UPDATE public.customers
SET 
  customer_lifecycle_status = 'lost',
  lost_at = COALESCE(lost_at, updated_at, NOW()),
  updated_at = NOW()
WHERE 
  (import_source IS NULL OR import_source = '' OR import_source = 'unknown' OR import_source = 'legacy')
  AND (customer_lifecycle_status IS DISTINCT FROM 'lost');
