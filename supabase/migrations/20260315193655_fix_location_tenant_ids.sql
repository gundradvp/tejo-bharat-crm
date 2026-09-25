/*
  # Fix Location Data Tenant IDs

  1. Problem
    - Location data was imported with default tenant_id '00000000-0000-0000-0000-000000000001'
    - Actual tenant has id '12a7aad5-baea-46ca-8f39-72aa8a367ffe'
    - RLS policies prevent users from seeing location data with wrong tenant_id
  
  2. Solution
    - Update all location tables to use the correct tenant_id
    - Must update in specific order to avoid foreign key violations
*/

-- Temporarily disable triggers
SET session_replication_role = replica;

-- Update all tables with correct tenant_id
UPDATE villages SET tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe' WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE mandals SET tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe' WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE constituencies SET tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe' WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE districts SET tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe' WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
UPDATE states SET tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe' WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Re-enable triggers
SET session_replication_role = DEFAULT;
