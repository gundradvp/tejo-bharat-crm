/*
  # Simplify Document Insert Policy
  
  ## Overview
  Removes complex subqueries from INSERT policy that can cause RLS recursion issues.
  The policy simply checks that auth.uid() matches uploaded_by.
  
  ## Changes
  - Drop complex INSERT policy
  - Create simple policy: auth.uid() = uploaded_by
  - This prevents users from inserting documents for other users
*/

DROP POLICY IF EXISTS "Authenticated users can insert documents v2" ON customer_documents;

CREATE POLICY "Authenticated users can insert documents"
  ON customer_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);
