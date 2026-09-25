DO $$
DECLARE
  test_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  test_count integer;
BEGIN
  SELECT COUNT(*) INTO test_count FROM customers WHERE tenant_id = test_tenant_id;
  RAISE NOTICE 'Main tenant customers: %', test_count;
  SELECT COUNT(*) INTO test_count FROM profiles WHERE tenant_id = test_tenant_id;
  RAISE NOTICE 'Main tenant users: %', test_count;
END $$;