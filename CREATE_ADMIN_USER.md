# Creating Users in PM Suryaghar Portal

## Method 1: Create Initial Admin User via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ctnridgmzwvwcioizspp
   - Go to **Authentication** → **Users**

2. **Create New User**
   - Click "Add user" → "Create new user"
   - Enter email: `admin@pmsuryaghar.com` (or your email)
   - Enter password: `Admin@123456` (or your secure password)
   - Click "Create user"

3. **Update User Role to Admin**
   - Go to **SQL Editor** in Supabase Dashboard
   - Run this query (replace with your email):
   ```sql
   UPDATE profiles
   SET role = 'admin', full_name = 'System Admin'
   WHERE email = 'admin@pmsuryaghar.com';
   ```

## Method 2: Using SQL Directly

You can run these commands in Supabase SQL Editor:

### Create Admin User
```sql
-- Step 1: The user will be created through Supabase Auth
-- Use Supabase Dashboard: Authentication → Users → Add User

-- Step 2: After user is created, update their profile
UPDATE profiles
SET role = 'admin',
    full_name = 'System Administrator',
    phone = '+91-1234567890'
WHERE email = 'admin@pmsuryaghar.com';
```

### Create Agent User
```sql
-- Create via Dashboard first, then update role:
UPDATE profiles
SET role = 'agent',
    full_name = 'Agent Name'
WHERE email = 'agent@example.com';
```

### Create Employee User
```sql
-- Create via Dashboard first, then update role:
UPDATE profiles
SET role = 'employee',
    full_name = 'Employee Name'
WHERE email = 'employee@example.com';
```

## Method 3: Self-Registration (After First Admin is Created)

Once you have an admin account, admins can create other users through a user management interface.

## Default Test Credentials (After Creation)

After following Method 1 or 2 above, you can login with:

**Admin Login:**
- Email: `admin@pmsuryaghar.com`
- Password: `Admin@123456`

**Agent Login (Example):**
- Email: `agent@pmsuryaghar.com`
- Password: `Agent@123456`

**Employee Login (Example):**
- Email: `employee@pmsuryaghar.com`
- Password: `Employee@123456`

## Quick Setup Steps

1. Open Supabase Dashboard
2. Go to Authentication → Users → Add User
3. Create user with email: `admin@pmsuryaghar.com`, password: `Admin@123456`
4. Go to SQL Editor
5. Run: `UPDATE profiles SET role = 'admin', full_name = 'Admin' WHERE email = 'admin@pmsuryaghar.com';`
6. Login to your app with admin@pmsuryaghar.com / Admin@123456

## Verifying User Creation

To check if users were created successfully:

```sql
SELECT id, email, full_name, role, is_active, created_at
FROM profiles
ORDER BY created_at DESC;
```

## Important Notes

- Email confirmation is disabled by default in this setup
- Users are automatically active upon creation
- Change passwords after first login for security
- Admin users have full access to all features
- Agent users can only manage their own customers
- Employee users can only see their assigned tasks
