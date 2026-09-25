-- Migration: Add lost_at (Lost/Churned date) to customers table
-- Purpose: Track the exact timestamp when a customer lifecycle status was changed to 'lost' or churned

-- 1. Add lost_at column if it does not already exist
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;

-- 2. Backfill lost_at for customers currently marked as 'lost' that do not have lost_at set
UPDATE public.customers 
SET lost_at = COALESCE(updated_at, NOW())
WHERE customer_lifecycle_status = 'lost' 
  AND lost_at IS NULL;

-- 3. Create index for efficient sorting and filtering on lost customers by churn date
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle_lost_at 
ON public.customers (customer_lifecycle_status, lost_at DESC);
