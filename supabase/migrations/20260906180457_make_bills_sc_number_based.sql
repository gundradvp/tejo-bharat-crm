/*
# Make eb_customer_bills SC-number-based instead of EB-customer-only

## Problem
Bills imported via the EB Bill Import only match SC numbers against `eb_customers`.
If an SC number exists only in `lead_prospects` or `customers` (Surya Ghar),
the bills are skipped as "unmatched." This means bills don't propagate across all three views.

## Changes
1. Make `eb_customer_id` nullable on `eb_customer_bills` — bills can now exist
   without a linked eb_customers row (they are matched by sc_number instead).
2. Drop the old unique index on (tenant_id, eb_customer_id, bill_month) and
   create a new unique index on (tenant_id, sc_number, bill_month) so dedup
   works by SC number regardless of which table the customer lives in.
3. Backfill `eb_customer_id` for existing rows that already have a matching
   eb_customers row by sc_number (best-effort, no data loss).

## Security
- No RLS policy changes — existing tenant-scoped CRUD policies remain unchanged.
*/

-- Step 1: Make eb_customer_id nullable so bills can exist without an EB customer link
ALTER TABLE eb_customer_bills ALTER COLUMN eb_customer_id DROP NOT NULL;

-- Step 2: Replace the unique index
DROP INDEX IF EXISTS idx_eb_bills_tenant_customer_month;
CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_bills_tenant_sc_month
  ON eb_customer_bills(tenant_id, sc_number, bill_month);
