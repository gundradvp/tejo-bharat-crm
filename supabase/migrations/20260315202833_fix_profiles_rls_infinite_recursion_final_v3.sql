/*
  # Fix profiles RLS policies - remove infinite recursion

  The issue is that the policies query the profiles table within a profiles policy,
  causing infinite recursion. We need to use a helper function that bypasses RLS.

  1. Changes
    - Recreate helper functions with correct implementation
    - Update policies to use these helper functions
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;

-- Recreate is_admin_in_tenant function (may already exist)
CREATE OR REPLACE FUNCTION is_admin_in_tenant(check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE p.id = auth.uid()
    AND p.tenant_id = check_tenant_id
    AND r.name = 'admin'
  );
END;
$$;

-- Recreate is_super_admin function with matching signature
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_uuid
    AND p.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  );
END;
$$;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles in their tenant
CREATE POLICY "Admins can read tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin_in_tenant(tenant_id));

-- Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));
