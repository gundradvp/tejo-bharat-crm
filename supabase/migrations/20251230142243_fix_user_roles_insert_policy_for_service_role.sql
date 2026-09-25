/*
  # Fix user_roles INSERT policy for service role

  1. Changes
    - Update policy to allow service role to insert role assignments
    - This enables the create-user edge function to assign roles properly
    
  2. Security
    - Service role can insert (used by edge functions with proper auth checks)
    - Admins can still insert role assignments
*/

-- Drop existing restrictive insert policy
DROP POLICY IF EXISTS "Admins can insert role assignments" ON user_roles;

-- Create new policy that allows both admins and service role
CREATE POLICY "Admins and service role can insert role assignments"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow service role (for edge functions)
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Allow admins
    current_user_is_admin()
  );
