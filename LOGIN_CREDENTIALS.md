# Login Credentials Guide

## Tenant Login Information

### Current Tenant: Tejo Bharat Global Energy

All users belong to the **"Tejo Bharat Global Energy"** tenant.

---

## DEFAULT PASSWORD FOR ALL USERS

**Password:** `TejoBharat@2024`

This is the default password used for:
- All existing users (if their password has been reset)
- All newly created users
- Password resets by administrators

**IMPORTANT:** For security, users should change this password after first login.

---

## How to Login

**Login URL:** https://your-app-url.com (replace with your actual URL)

**Steps:**
1. Go to the login page
2. Enter your email address (see list below)
3. Enter password: `TejoBharat@2024`
4. Click "Sign In"

---

## Available Users

### Admin Users (Can reset passwords and manage all features):

1. **Administrator**
   - **Email:** `contact@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Admin
   - **Access:** Full administrative access

2. **Jyothsna**
   - **Email:** `jyothsna@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Admin
   - **Access:** Full administrative access

3. **Durga Vara Prasad Gundra**
   - **Email:** `durga@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Admin
   - **Access:** Full administrative access

4. **Venkat Akula**
   - **Email:** `venkatrao@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Admin
   - **Access:** Full administrative access

### Other Users:

5. **Nagarjuna**
   - **Email:** `nag@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Employee/Lead Generator

6. **Surya Raju**
   - **Email:** `raj@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Employee/Lead Generator

7. **Gangarao Bandi**
   - **Email:** `ganga@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Employee/Lead Generator

8. **Venkata Ramana**
   - **Email:** `venkat@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Employee/Lead Generator

9. **Chandra Mouli**
   - **Email:** `mouli@tejobharat.com`
   - **Password:** `TejoBharat@2024`
   - **Role:** Employee/Lead Generator

---

## Quick Start Guide

### To Login as Admin:
```
Email: contact@tejobharat.com
Password: TejoBharat@2024
```

OR

```
Email: jyothsna@tejobharat.com
Password: TejoBharat@2024
```

OR

```
Email: durga@tejobharat.com
Password: TejoBharat@2024
```

OR

```
Email: venkatrao@tejobharat.com
Password: TejoBharat@2024
```

---

## If Password Doesn't Work

If the default password doesn't work for any user, an admin can reset it:

## How to Reset a User's Password (Admin Only)

### Option 1: Using Admin Panel (Recommended)
1. Login as an admin user (contact@tejobharat.com, jyothsna@tejobharat.com, durga@tejobharat.com, or venkatrao@tejobharat.com)
2. Navigate to **"Users"** menu
3. Find the user in the list
4. Click **"Reset Password"** button
5. Confirm the reset
6. Password will be reset to: `TejoBharat@2024`
7. Inform the user of their new password

**Note:** Email password reset may not work if SMTP is not configured. Use the admin panel method instead.

### Option 2: Super Admin Reset (For Tenant Admins)
If you're a super admin:
1. Login as super admin
2. Navigate to **"Super Admin"** menu
3. Find the tenant and click **"Manage"**
4. Scroll to **"Tenant Users"** section
5. Click **"Reset Password"** next to any user
6. Password will be reset to: `TejoBharat@2024`

### Option 3: Using SQL (Database Access Required)
If you have database access, run in Supabase SQL Editor:

```sql
-- Reset password to default: TejoBharat@2024
-- Replace 'user@email.com' with the actual email
UPDATE auth.users
SET encrypted_password = crypt('TejoBharat@2024', gen_salt('bf'))
WHERE email = 'user@email.com';
```

**Example - Reset Durga's password:**
```sql
UPDATE auth.users
SET encrypted_password = crypt('TejoBharat@2024', gen_salt('bf'))
WHERE email = 'durga@tejobharat.com';
```

## Creating a Super Admin

Super admins have access to manage multiple tenants. To create a super admin:

1. Run the `create_super_admin.sql` script in Supabase SQL Editor
2. This creates a super admin with:
   - **Email:** `superadmin@tejobharat.com`
   - **Password:** `TejoBharat@2024`
3. Login with these credentials
4. Navigate to `/super-admin` to manage tenants

## User Roles

- **Admin**: Full access to manage customers, users, tasks, and settings within their tenant
- **Employee**: Can view and manage customers and tasks
- **Lead Generator**: Can create and view customers and leads
- **Super Admin**: Can manage multiple tenants (cross-tenant access)

## Tenant Isolation

Each tenant's data is completely isolated. Users can only access data from their assigned tenant. The tenant is automatically determined from the user's profile.

## Multi-Tenant Access

Currently, the system has:
- **Main Tenant**: Tejo Bharat Global Energy (ID: `00000000-0000-0000-0000-000000000001`)
- **Other Tenants**: Srinivas (ID: `12a7aad5-baea-46ca-8f39-72aa8a367ffe`) - No users assigned

## Need Help?

If you're locked out or can't access any accounts:
1. **Ask an Admin:** Any admin user can reset your password from the Users page
2. **Database Access:** Use SQL scripts in the project root to reset passwords
3. **New User:** Check `CREATE_ADMIN_USER.md` for creating new admin users
4. **Documentation:** See `PASSWORD_MANAGEMENT.md` for comprehensive password management guide

## Creating New Tenants

When a super admin creates a new tenant, the system will:
1. Show a form to enter tenant details and admin credentials
2. After creation, display the credentials prominently on a success screen
3. Allow copying credentials to clipboard
4. Credentials won't be shown again after leaving that page

For detailed instructions, see: **TENANT_ADMIN_CREDENTIALS.md**

## Additional Documentation

- **TENANT_ADMIN_CREDENTIALS.md** - Guide for creating new tenants and managing their admin credentials
- **PASSWORD_MANAGEMENT.md** - Complete password management guide
- **CREATE_ADMIN_USER.md** - Instructions for creating admin users
- **INSTALL_APP.md** - Application installation guide
- **QUICK_LOGIN_GUIDE.md** - Quick reference for existing users

## Security Notes

- **Default Password:** All users share the default password `TejoBharat@2024`
- **Change Password:** Users should change their password after first login
- **Admin Access:** Only admins can reset other users' passwords
- **Email Reset:** Email password reset may not work without SMTP configuration
- **Secure Storage:** Never share credentials through unsecured channels
- **Regular Audits:** Regularly review user access and remove inactive accounts

## Troubleshooting

### Can't Login?
1. Verify email address is correct (no typos)
2. Use default password: `TejoBharat@2024`
3. Check if account exists in Users list (admin view)
4. Ask admin to reset your password
5. Clear browser cache and try again

### Forgot Which Email?
Check the list above for your name and corresponding email address.

### Admin Can't Reset Password?
1. Verify you have admin role
2. Check browser console for errors
3. Ensure you're logged in
4. Contact super admin or database administrator
