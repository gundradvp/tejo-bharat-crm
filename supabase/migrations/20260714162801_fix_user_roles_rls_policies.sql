-- Drop old user_roles policies
DROP POLICY IF EXISTS "Admins can insert role assignments" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete role assignments" ON user_roles;
DROP POLICY IF EXISTS "Users can view own role assignments" ON user_roles;

-- Re-create policies using profiles.role directly to avoid recursive user_roles lookup
-- SELECT: users can see their own roles; admins (by profile.role) can see all in tenant
CREATE POLICY "select_user_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.tenant_id = (
          SELECT p2.tenant_id FROM profiles p2 WHERE p2.id = user_roles.user_id
        )
    )
  );

-- INSERT: admins (by profile.role) can assign roles
CREATE POLICY "insert_user_roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: admins (by profile.role) can remove roles
CREATE POLICY "delete_user_roles" ON user_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
