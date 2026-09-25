/*
  # Fix Customer SELECT Policy - Remove Duplicate

  ## Issue
  There are two SELECT policies on customers table:
  1. "Users can view customers in their tenant" (old, uses subquery)
  2. "Users view customers in tenant" (new, from migration 20260315133511)
  
  The old policy was not dropped, causing conflicts.

  ## Changes
  - Drop the old policy with incorrect name
  - Ensure only the correct policy exists

  ## Security
  - Maintains tenant isolation
  - All authenticated users can view customers in their tenant
*/

-- Drop the old policy with subquery
DROP POLICY IF EXISTS "Users can view customers in their tenant" ON customers;

-- Ensure the correct policy exists (from migration 20260315133511)
DROP POLICY IF EXISTS "Users view customers in tenant" ON customers;

CREATE POLICY "Users view customers in tenant"
  ON customers FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
  );
