/*
  # Fix profiles INSERT policy for service role

  1. Changes
    - Add a policy that allows service role to insert profiles
    - This enables the create-user edge function to work properly
    
  2. Security
    - Only applies when using service role key (used by edge functions)
    - Does not affect regular user permissions
*/

-- Drop existing restrictive insert policy if it exists
DROP POLICY IF EXISTS "Admins insert profiles in tenant" ON profiles;

-- Create new policy that allows both admins and service role to insert
CREATE POLICY "Admins and service role can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow service role (bypasses this anyway but explicit is good)
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Allow admins in same tenant
    (
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
    )
  );
