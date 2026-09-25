/*
  # Fix profiles RLS policies to remove legacy role column checks

  The issue is that the new policies check `p.role = 'admin'` but we use
  the `user_roles` table for role management now, not the legacy `role` column.

  1. Changes
    - Drop the policies that check the legacy `role` column
    - Recreate them using the `user_roles` table instead
*/

-- Drop the policies with legacy role checks
DROP POLICY IF EXISTS "Admins can read tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;

-- Admins can read all profiles in their tenant (using user_roles table)
CREATE POLICY "Admins can read tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      JOIN roles r ON r.id = ur.role_id
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND r.name = 'admin'
    )
  );

-- Super admins can read all profiles (using tenant_id check for super admin tenant)
CREATE POLICY "Super admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
    )
  );
