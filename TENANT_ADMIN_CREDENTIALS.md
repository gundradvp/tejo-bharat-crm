# Tenant Admin Credentials Guide

## How Tenant Creation Works

When you create a new tenant through the Super Admin dashboard, you must provide the initial admin user credentials.

## Creating a Tenant

1. **Login as Super Admin**
   - Email: `superadmin@tejobharat.com`
   - Password: `TejoBharat@2024`
   - Go to: `/super-admin`

2. **Click "Create Tenant"**

3. **Fill in Tenant Information:**
   - Organization Name
   - Slug (URL identifier)
   - Status
   - Business details
   - Primary color

4. **Configure License:**
   - Tier Name (e.g., "Basic", "Premium")
   - Max Users
   - Max Customers
   - Start Date
   - Expiry Date (optional)

5. **Create Initial Admin User:**
   - Full Name
   - Email
   - Password (click the refresh icon to auto-generate a secure password)

## After Creating a Tenant

When you click "Save Tenant", the system will:

1. Create the tenant organization
2. Create the admin user account
3. Display a **success screen** with the credentials prominently shown:

```
┌─────────────────────────────────────────┐
│ Tenant Created Successfully!            │
│                                         │
│ TENANT NAME: [Your Tenant Name]        │
│                                         │
│ ADMIN LOGIN CREDENTIALS:                │
│ ├─ Full Name: [Admin Name]             │
│ ├─ Email: [admin@example.com]          │
│ └─ Password: [Generated Password]       │
│                                         │
│ [Copy Credentials to Clipboard]        │
│                                         │
│ [Done - Return to Dashboard]           │
└─────────────────────────────────────────┘
```

## Important Notes

1. **Save Credentials Immediately**
   - The credentials are shown only once on the success screen
   - Click "Copy Credentials to Clipboard" to save them
   - These credentials won't be shown again after you leave the page

2. **Share with Tenant Admin**
   - Send the credentials securely to the tenant admin
   - They can login at the main application URL
   - They should change their password after first login (feature coming soon)

3. **Password Reset**
   - If the admin loses their password, you can reset it from the Super Admin dashboard
   - Edit the tenant, scroll to "Tenant Users" section
   - Click "Reset Password" next to the user
   - Default reset password is: `TejoBharat@2024`

## Example Workflow

### Creating "ABC Solar Company" Tenant:

1. Login as super admin
2. Go to Super Admin Dashboard
3. Click "Create Tenant"
4. Fill in:
   - Name: "ABC Solar Company"
   - Slug: "abc-solar"
   - Admin Name: "Rajesh Kumar"
   - Admin Email: "rajesh@abcsolar.com"
   - Click refresh icon to generate password (e.g., "X7mP!9kQ2@nF")
5. Click "Save Tenant"
6. **SUCCESS SCREEN APPEARS** with all credentials
7. Click "Copy Credentials to Clipboard"
8. Send to Rajesh: "Your login is rajesh@abcsolar.com with password X7mP!9kQ2@nF"
9. Click "Done - Return to Dashboard"

### Rajesh Logs In:

1. Go to the application URL
2. Email: `rajesh@abcsolar.com`
3. Password: `X7mP!9kQ2@nF`
4. Access granted as Admin for ABC Solar Company

## Resetting Tenant Admin Password

If Rajesh forgets his password:

1. Super admin logs in
2. Goes to Super Admin Dashboard
3. Finds "ABC Solar Company" tenant
4. Clicks "Manage"
5. Scrolls to "Tenant Users" section
6. Finds Rajesh Kumar
7. Clicks "Reset Password"
8. Password reset to: `TejoBharat@2024`
9. Inform Rajesh: "Your password has been reset to: TejoBharat@2024"

## Security Best Practices

1. **Strong Passwords:**
   - Always use the password generator for secure passwords
   - Never use simple passwords like "password123"

2. **Secure Sharing:**
   - Send credentials through secure channels
   - Don't email passwords in plain text
   - Consider using secure password sharing tools

3. **Change Default Passwords:**
   - Encourage admins to change their password after first login
   - Regular password updates improve security

4. **Document Credentials:**
   - Keep a secure record of created tenants
   - Store credentials in a password manager
   - Track which tenants are active

## Troubleshooting

### Problem: Can't see credentials after creating tenant
**Solution:** The credentials are displayed on the success screen immediately after creation. You must copy them before leaving the page. If you missed them, reset the admin's password using the steps above.

### Problem: Admin can't login
**Solution:**
1. Verify the email address is correct
2. Try resetting the password
3. Check if the tenant status is "Active"
4. Verify the admin account is active

### Problem: Forgot tenant admin email
**Solution:**
1. Login as super admin
2. Go to Super Admin Dashboard
3. Find the tenant in the list
4. Click "Manage"
5. View "Tenant Users" section to see all users and their emails

## Related Documentation

- **LOGIN_CREDENTIALS.md** - Existing tenant login information
- **PASSWORD_MANAGEMENT.md** - Password management guide
- **QUICK_LOGIN_GUIDE.md** - Quick reference for logins
