-- Drop existing policy
DROP POLICY IF EXISTS "Users can view relevant tasks" ON tasks;

-- Create improved policy with proper employee filtering
CREATE POLICY "Users can view relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = assigned_to
    OR (select auth.uid()) = assigned_by
    OR is_admin()
  );