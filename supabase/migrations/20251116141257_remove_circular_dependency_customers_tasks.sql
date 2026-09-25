/*
  # Remove Circular Dependency Between Customers and Tasks

  ## Problem
  - customers SELECT policy queries tasks table
  - tasks SELECT policy queries customers table
  - This creates infinite recursion

  ## Solution
  Remove the tasks subquery from customers SELECT policy.
  Employees will only see customers through:
  1. Direct agent_id ownership
  2. Admin access
  
  Tasks will handle visibility for assigned employees through their own policies.
*/

-- Drop and recreate customers SELECT policy without tasks subquery
DROP POLICY IF EXISTS "Agents can view own customers" ON customers;

CREATE POLICY "Agents can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR is_admin()
  );
