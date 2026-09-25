-- PM Suryaghar Portal - Sample User Creation Script
-- Run this in Supabase SQL Editor AFTER creating users via Supabase Auth Dashboard

-- ============================================
-- IMPORTANT: First create users in Supabase Dashboard
-- ============================================
-- 1. Go to: Authentication → Users → Add User
-- 2. Create these users:
--    - admin@pmsuryaghar.com (password: Admin@123456)
--    - agent@pmsuryaghar.com (password: Agent@123456)
--    - employee@pmsuryaghar.com (password: Employee@123456)
-- 3. Then run this script to update their roles
-- ============================================

-- Update the admin user
UPDATE profiles
SET role = 'admin',
    full_name = 'System Administrator',
    phone = '+91-9876543210'
WHERE email = 'admin@pmsuryaghar.com';

-- Update the agent user
UPDATE profiles
SET role = 'agent',
    full_name = 'Demo Agent',
    phone = '+91-9876543211'
WHERE email = 'agent@pmsuryaghar.com';

-- Update the employee user
UPDATE profiles
SET role = 'employee',
    full_name = 'Demo Employee',
    phone = '+91-9876543212'
WHERE email = 'employee@pmsuryaghar.com';

-- Verify users were created and updated
SELECT
    email,
    full_name,
    role,
    phone,
    is_active,
    created_at
FROM profiles
ORDER BY
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'agent' THEN 2
        WHEN 'employee' THEN 3
    END;
