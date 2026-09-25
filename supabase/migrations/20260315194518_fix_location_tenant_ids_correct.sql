/*
  # Fix Location Data Tenant IDs - Correct Version

  1. Problem
    - Location data has tenant_id '12a7aad5-baea-46ca-8f39-72aa8a367ffe' (no users)
    - Main tenant is '00000000-0000-0000-0000-000000000001' with 10 users
    - Users cannot see location data due to tenant_id mismatch
  
  2. Solution
    - Update all location tables to use the correct main tenant_id
    - This allows all users in "Tejo Bharat Global Energy" to access location data
*/

-- Temporarily disable triggers to avoid foreign key issues
SET session_replication_role = replica;

-- Update all location tables with the correct main tenant_id
UPDATE villages 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';

UPDATE mandals 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';

UPDATE constituencies 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';

UPDATE districts 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';

UPDATE states 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';

-- Re-enable triggers
SET session_replication_role = DEFAULT;
