# Tenant Login Credentials

## Login URL
**Main Application:** https://ctnridgmzwvwcioizspp.supabase.co (or your custom domain)

## Tenants

### 1. Tejo Bharat Global Energy (Default Tenant)
- **Tenant ID:** 00000000-0000-0000-0000-000000000001
- **Slug:** default
- **Status:** Active

#### Users:

##### Super Administrator
- **Email:** contact@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Super Admin (Can create tenants and manage all tenants)

##### Administrators
- **Email:** durga@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Admin

- **Email:** jyothsna@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Admin

- **Email:** venkatrao@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Admin

##### Employees
- **Email:** nag@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Employee

- **Email:** venkat@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Employee

##### Lead Generators
- **Email:** ganga@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Lead Generator

- **Email:** mouli@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Lead Generator

- **Email:** raj@tejobharat.com
- **Password:** Tenent@2026!
- **Role:** Lead Generator

---

### 2. Srinivas - sv
- **Tenant ID:** 12a7aad5-baea-46ca-8f39-72aa8a367ffe
- **Slug:** sv
- **Status:** Active
- **Users:** None created yet

### 3. Srinivas - svs
- **Tenant ID:** 64271481-a21a-487e-88d2-13089b0ab65e
- **Slug:** svs
- **Status:** Active
- **Users:** None created yet

### 4. Srinivas - svs1
- **Tenant ID:** edc4754b-ae49-4f6c-99c0-cc321c77a34b
- **Slug:** svs1
- **Status:** Suspended
- **Users:** None created yet

### 5. Srinivas - svs2
- **Tenant ID:** 98ae66cc-52f4-4bbf-9242-20a65be25ea0
- **Slug:** svs2
- **Status:** Active
- **Users:** None created yet

### 6. Srinivas - svs3
- **Tenant ID:** 37396044-c56a-4934-a824-6bbef178200c
- **Slug:** svs3
- **Status:** Active
- **Users:** None created yet

---

## How to Create Users for Other Tenants

1. Login as Super Admin: contact@tejobharat.com
2. Navigate to Super Admin Dashboard
3. Select "Tenant Management"
4. Choose a tenant and click "Manage"
5. Create admin users for that tenant

---

## Password Reset Instructions

If you need to reset passwords in the future, run the SQL script:
```bash
# In Supabase SQL Editor, run:
reset_all_passwords.sql
```

Or use the reset-user-password edge function from the application UI.

---

## Important Notes

- All passwords are currently set to: **Tenent@2026!**
- It's recommended to change passwords after first login
- Super Admin can create and manage all tenants
- Regular Admins can only manage users within their tenant
