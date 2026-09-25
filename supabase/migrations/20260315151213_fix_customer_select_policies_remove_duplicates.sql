/*
  # Fix Customer SELECT Policies - Remove Duplicates

  ## Overview
  This migration removes old restrictive SELECT policies on the customers table
  that are preventing employees from viewing all customers in their tenant.

  ## Changes
  - Removes old "Users can view their relevant customers" policy
  - Removes old "Agents can update assigned customers" policy  
  - Removes old "Agents can insert customers" policy
  - Keeps the simplified "Users view customers in tenant" policy that allows all users to see all customers in their tenant

  ## Security
  - Maintains tenant isolation
  - All authenticated users in a tenant can view all customers in that tenant
  - Super admins can still view all customers across all tenants
*/

-- Remove old restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their relevant customers" ON customers;

-- Remove old UPDATE policy that conflicts with the new one
DROP POLICY IF EXISTS "Agents can update assigned customers" ON customers;

-- Remove old INSERT policy that conflicts with the new one
DROP POLICY IF EXISTS "Agents can insert customers" ON customers;
