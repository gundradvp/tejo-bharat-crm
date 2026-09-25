-- These are no-ops on a fresh database (no location data yet)
-- but maintained for migration history completeness

-- Fix: revert location data to default tenant (no data to update on fresh install)
UPDATE villages SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';
UPDATE mandals SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';
UPDATE constituencies SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';
UPDATE districts SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';
UPDATE states SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id = '12a7aad5-baea-46ca-8f39-72aa8a367ffe';
