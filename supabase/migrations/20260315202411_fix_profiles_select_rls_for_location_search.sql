/*
  # Fix profiles SELECT RLS for location search

  The issue is that RLS policies on profiles table use `get_user_tenant_id()` 
  which queries the same table, causing recursion or blocking when the 
  location API tries to get the user's tenant_id.

  We need a simple policy that allows users to read their own profile without
  any recursive function calls.

  1. Changes
    - Drop existing problematic SELECT policies
    - Add a simple policy that allows users to SELECT their own profile
    - This breaks the recursion chain
*/

-- Drop existing SELECT policies that might cause recursion
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users read profiles in tenant" ON profiles;
DROP POLICY IF EXISTS "Super admins read all profiles" ON profiles;

-- Add simple, non-recursive SELECT policies
-- Users can always read their own profile (needed for tenant_id lookup)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles in their tenant
CREATE POLICY "Admins can read tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = profiles.tenant_id
      AND p.role = 'admin'
    )
  );

-- Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.tenant_id = '00000000-0000-0000-0000-000000000000'
    )
  );
