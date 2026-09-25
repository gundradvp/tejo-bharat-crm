-- Create Super Admin User
-- This script creates a super admin user who can manage all tenants
-- Email: superadmin@tejobharat.com
-- Password: SuperAdmin@2024

-- First, you need to create the user through Supabase Auth Dashboard or use the admin API
-- Then run this script with their user ID

-- Option 1: If you already have a user and want to make them a super admin:
-- Replace 'USER_ID_HERE' with the actual user ID from auth.users

-- INSERT INTO super_admins (user_id, email)
-- VALUES ('USER_ID_HERE', 'superadmin@tejobharat.com')
-- ON CONFLICT (user_id) DO NOTHING;

-- Option 2: Use this query to find existing admin users who could be promoted:
-- SELECT id, email, full_name FROM profiles WHERE role = 'admin';

-- Then use one of their IDs:
-- INSERT INTO super_admins (user_id, email)
-- SELECT id, email FROM profiles WHERE email = 'desired-email@example.com'
-- ON CONFLICT (user_id) DO NOTHING;

-- Option 3: Promote the first admin user to super admin:
INSERT INTO super_admins (user_id, email)
SELECT id, email FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- Verify the super admin was created:
SELECT sa.*, p.full_name, p.email
FROM super_admins sa
JOIN profiles p ON sa.user_id = p.id;
