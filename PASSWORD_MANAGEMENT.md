# Password Management Guide

## Overview

The system has comprehensive password management features for both regular admins and super admins.

## Default Password

**Default Password for all new users:** `TejoBharat@2024`

This password is used when:
- Creating new tenants with admin users
- Resetting passwords for existing users
- Creating new users through the admin panel

## Email Password Reset Issue

### Why Password Reset Emails May Not Work

Password reset emails require:
1. **SMTP Configuration**: Supabase needs to be configured with an email service provider (SendGrid, Mailgun, AWS SES, etc.)
2. **Email Templates**: Custom email templates need to be configured in Supabase
3. **DNS Settings**: Proper DNS records (SPF, DKIM) must be configured for email deliverability

### Workaround - Admin Password Reset

Instead of relying on email, users can contact their administrator who can reset passwords directly from the admin panel.

**Notice on Forgot Password Page:**
> "If password reset emails are not being delivered, please contact your system administrator. They can reset your password directly from the admin panel."

## Password Reset Features

### For Regular Admins

**Location:** User Management page (Admin access required)

**Features:**
1. View all users in their tenant
2. Reset any user's password to the default password
3. Shows confirmation with the new password after reset

**How to Reset a User's Password:**
1. Login as an admin
2. Navigate to "Users" menu
3. Find the user in the list
4. Click the "Reset Password" button (key icon)
5. Confirm the reset
6. The password will be reset to: `TejoBharat@2024`
7. Copy the password and provide it to the user

### For Super Admins

**Location:** Tenant Management page (Super Admin access required)

**Features:**
1. View all tenants in the system
2. Manage tenant details and licenses
3. View all users within each tenant
4. Reset any tenant user's password to the default password

**How to Reset a Tenant User's Password:**
1. Login as a super admin
2. Navigate to "Super Admin" menu
3. Find the tenant and click "Manage"
4. Scroll to the "Tenant Users" section
5. Click "Reset Password" next to any user
6. Confirm the reset
7. The password will be reset to: `TejoBharat@2024`
8. Copy the password and provide it to the user

## Creating New Tenants

### Default Password Setup

When creating a new tenant, you can:

1. **Generate a Secure Password:**
   - Click the refresh icon next to the password field
   - A random 12-character secure password will be generated
   - The password will be displayed prominently in a green box
   - Password format: Mix of uppercase, lowercase, numbers, and symbols

2. **Use Custom Password:**
   - Type your own password in the password field
   - Click the eye icon to show/hide the password

3. **Password Visibility:**
   - Eye icon: Toggle password visibility
   - Refresh icon: Generate new random password
   - Generated passwords are shown in a prominent box for easy copying

**Important:**
- Save the generated password securely before saving the tenant
- The generated password is shown only once during tenant creation
- After creating the tenant, you can reset the admin password if needed

### Generated Password Example

When you click the refresh icon, you'll see:
```
Password Generated Successfully

X9aB#mK4p@Yz

Save this password securely. The admin will need it to log in.
```

## Login Information for Current System

### Current Tenant: Tejo Bharat Global Energy

**Admin Users (can reset other users' passwords):**
- contact@tejobharat.com
- jyothsna@tejobharat.com
- durga@tejobharat.com - Default password: `TejoBharat@2024`
- venkatrao@tejobharat.com

**Other Users:**
- nag@tejobharat.com
- raj@tejobharat.com
- ganga@tejobharat.com
- venkat@tejobharat.com
- mouli@tejobharat.com

## Password Best Practices

### For Administrators

1. **Reset Passwords Immediately:**
   - When a user can't login, reset their password from the admin panel
   - Provide the new password through a secure channel (phone, in-person, encrypted message)
   - Ask the user to change their password after first login (future feature)

2. **Keep Track of Password Resets:**
   - Document when passwords are reset
   - Verify user identity before resetting passwords
   - Use secure communication channels to share passwords

3. **Creating New Users:**
   - Always use the default password: `TejoBharat@2024`
   - Or generate a random password and save it securely
   - Provide the password to the user through a secure channel
   - Inform users to keep their password confidential

### For Users

1. **Keep Password Secure:**
   - Don't share your password with anyone
   - Don't write passwords on paper or sticky notes
   - Use unique passwords for different systems

2. **If You Forget Your Password:**
   - Contact your system administrator
   - They can reset your password to the default
   - You'll be provided with the new password

3. **Password Security:**
   - Default password is: `TejoBharat@2024`
   - Consider changing it to a personal password (future feature)
   - Avoid common passwords like "password123" or "admin"

## Technical Implementation

### Password Reset Edge Function

**Endpoint:** `/functions/v1/reset-user-password`

**Method:** POST

**Requires:** Admin authentication

**Body:**
```json
{
  "user_id": "uuid-of-user",
  "new_password": "new-password-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Password Generation Algorithm

```typescript
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const length = 12;
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
```

**Characteristics:**
- 12 characters long
- Excludes confusing characters (0, O, 1, l, I)
- Includes uppercase, lowercase, numbers, and symbols
- Cryptographically secure random generation

## Security Considerations

1. **Admin-Only Access:**
   - Only admins can reset passwords
   - Super admins can reset passwords across all tenants
   - RLS policies enforce these restrictions at the database level

2. **No Password Storage:**
   - Passwords are never stored in plain text
   - Only password hashes are stored in the database
   - Supabase handles password hashing automatically

3. **Audit Trail:**
   - All password resets can be logged (future feature)
   - Activity logs track user actions
   - Admins should maintain records of password resets

4. **Default Password:**
   - The default password should be changed after first login (future feature)
   - Consider implementing password expiration policies (future feature)
   - Enforce password complexity requirements (future feature)

## Future Enhancements

1. **Force Password Change:**
   - Require users to change password after first login
   - Require password change after admin reset

2. **Password History:**
   - Prevent reuse of last 5 passwords
   - Track password change history

3. **Password Complexity:**
   - Enforce minimum length
   - Require mix of character types
   - Prevent common passwords

4. **Email Configuration:**
   - Setup SMTP provider for password reset emails
   - Configure custom email templates
   - Implement email verification

5. **Two-Factor Authentication:**
   - SMS-based 2FA
   - TOTP-based 2FA (Google Authenticator)
   - Email-based verification codes

6. **Password Expiration:**
   - Auto-expire passwords after 90 days
   - Send reminders before expiration
   - Force password change on expiration

7. **Security Questions:**
   - Add security questions for account recovery
   - Alternative to admin password reset

## Troubleshooting

### User Can't Login

**Solution:**
1. Verify the email address is correct
2. Reset the password from the admin panel
3. Provide the new password: `TejoBharat@2024`
4. Ask user to try logging in again
5. Check if user account is active

### Password Reset Not Working

**Solution:**
1. Check if you're logged in as an admin
2. Verify you have the "admin" role
3. Check browser console for errors
4. Try refreshing the page
5. Contact system administrator if issue persists

### Can't Access Admin Panel

**Solution:**
1. Verify you have admin privileges
2. Check your user role in the database
3. Contact super admin for role assignment
4. Clear browser cache and try again

### Forgot Admin Password

**Solution:**
1. Contact super admin
2. Super admin can reset your password
3. Or use SQL script to reset password:
   ```sql
   UPDATE auth.users
   SET encrypted_password = crypt('TejoBharat@2024', gen_salt('bf'))
   WHERE email = 'your-email@example.com';
   ```

## Support

For password-related issues:
1. Contact your system administrator
2. Email: support@tejobharat.com (update with actual support email)
3. Check this guide for common solutions
4. Review the LOGIN_CREDENTIALS.md file for account information
