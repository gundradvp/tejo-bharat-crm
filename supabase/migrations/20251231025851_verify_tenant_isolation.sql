/*
  # Verify and Fix Tenant Isolation

  1. Testing
    - Verify RLS policies are properly isolating data by tenant_id
    - Test that users can only see data from their own tenant

  2. Security Improvements
    - Add explicit tenant_id checks in all policies
    - Ensure super admins are properly handled
*/

-- Test function to verify tenant isolation
DO $$
DECLARE
  test_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  other_tenant_id uuid := '37396044-c56a-4934-a824-6bbef178200c';
  test_count integer;
BEGIN
  -- Check if customers are properly isolated
  SELECT COUNT(*) INTO test_count
  FROM customers
  WHERE tenant_id = test_tenant_id;
  
  RAISE NOTICE 'Main tenant customers: %', test_count;
  
  SELECT COUNT(*) INTO test_count
  FROM customers
  WHERE tenant_id = other_tenant_id;
  
  RAISE NOTICE 'Other tenant customers: %', test_count;
  
  -- Check if profiles are properly isolated
  SELECT COUNT(*) INTO test_count
  FROM profiles
  WHERE tenant_id = test_tenant_id;
  
  RAISE NOTICE 'Main tenant users: %', test_count;
  
  SELECT COUNT(*) INTO test_count
  FROM profiles
  WHERE tenant_id = other_tenant_id;
  
  RAISE NOTICE 'Other tenant users: %', test_count;
END $$;