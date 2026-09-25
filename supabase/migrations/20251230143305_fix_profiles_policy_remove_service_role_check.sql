/*
  # Fix profiles INSERT policy - remove service role check

  1. Changes
    - Remove the service role JWT check from policy (doesn't work as expected)
    - Service role key automatically bypasses RLS, no policy needed for it
    - Keep admin-only check for regular authenticated users
    
  2. Security
    - Admins can insert profiles in their tenant
    - Service role bypasses RLS automatically (no explicit policy needed)
*/

DROP POLICY IF EXISTS "Admins and service role can insert profiles" ON profiles;

CREATE POLICY "Admins can insert profiles in tenant"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
      ))
    )
  );
