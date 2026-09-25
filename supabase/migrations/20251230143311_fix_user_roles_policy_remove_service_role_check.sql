/*
  # Fix user_roles INSERT policy - remove service role check

  1. Changes
    - Remove the service role JWT check from policy
    - Service role key automatically bypasses RLS
    - Keep admin-only check for regular authenticated users
    
  2. Security
    - Admins can insert role assignments
    - Service role bypasses RLS automatically
*/

DROP POLICY IF EXISTS "Admins and service role can insert role assignments" ON user_roles;

CREATE POLICY "Admins can insert role assignments"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_admin());
