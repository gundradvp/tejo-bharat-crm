-- Drop any existing conflicting profiles SELECT policies
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users read profiles in tenant" ON profiles;
DROP POLICY IF EXISTS "Super admins read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;

-- Helper function to check if current user is admin in a given tenant (SECURITY DEFINER to avoid recursion)
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

-- Update is_super_admin to use profiles-based check
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = user_uuid
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
