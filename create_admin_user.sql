-- Create Admin User for PM Suryaghar Portal
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ctnridgmzwvwcioizspp/sql/new

-- Step 1: Create the auth user
-- Note: You need to create this user via Supabase Dashboard Authentication UI first
-- Go to: https://supabase.com/dashboard/project/ctnridgmzwvwcioizspp/auth/users
-- Click "Add user" and create user with:
-- Email: admin@pmsuryaghar.com
-- Password: Admin@2024!

-- Step 2: After creating the user in the Auth UI, run this to upgrade to admin:
UPDATE profiles
SET
  role = 'admin',
  full_name = 'Administrator',
  phone = '+91-1234567890'
WHERE email = 'admin@pmsuryaghar.com';

-- Verify the admin user was created correctly:
SELECT id, email, full_name, role, is_active, created_at
FROM profiles
WHERE email = 'admin@pmsuryaghar.com';
