/*
# Add User Preferences, Import Source Tracking, Themes, and Lead Generator Access Role

## Overview
This migration adds support for four new features:
1. Per-user preferences (saved filters + theme selection)
2. Customer import source tracking with automatic "Lost/Churned" detection
3. Expense type lookup seeding (manageable dropdown values)
4. New "lead_generator_access" role for controlling Lead Generator page visibility

## Changes by Feature

### 1. User Preferences (profiles table)
- Adds `preferences` JSONB column to store saved customer filter preferences
- Adds `theme` TEXT column to store the user's selected theme name (defaults to 'teal')

### 2. Customer Import Source Tracking (customers table)
- Adds `import_source` TEXT column: values 'pm_surya_ghar', 'manual', 'native_crm_import', NULL (legacy)
- Adds `last_import_date` TIMESTAMPTZ column: timestamp of the last import that included this customer
- Adds `customer_lifecycle_status` TEXT column: 'active' (default) or 'lost'
- All existing customers default to 'active' lifecycle status

### 3. Expense Type Lookup Seeding (lookup_values table)
- Seeds the existing hardcoded expense types into the lookup_values table
- Category: 'expense_types' — admin can now manage these from the Dropdown Values settings page

### 4. Lead Generator Access Role (roles table)
- Drops the existing CHECK constraint on roles.name and replaces it with one that also allows 'lead_generator_access'
- Inserts the new role 'lead_generator_access' (display: 'Lead Generator Access')
- This role is assignable to any user from User Management
- Users with this role (or admins) can access the Lead Generators page

## Security
- No RLS policy changes needed — existing tenant-isolation policies cover all new columns
- The new columns on profiles are user-editable (their own preferences/theme)
- The new columns on customers follow existing customer RLS policies

## Idempotency
All column additions use IF NOT EXISTS checks. Role insertion uses ON CONFLICT.
*/

-- ============================================================
-- 1. Profiles: add preferences and theme columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
    ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme') THEN
    ALTER TABLE profiles ADD COLUMN theme TEXT DEFAULT 'teal';
  END IF;
END $$;

-- ============================================================
-- 2. Customers: add import source tracking and lifecycle status
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'import_source') THEN
    ALTER TABLE customers ADD COLUMN import_source TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_import_date') THEN
    ALTER TABLE customers ADD COLUMN last_import_date TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'customer_lifecycle_status') THEN
    ALTER TABLE customers ADD COLUMN customer_lifecycle_status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Set all existing customers to 'active' lifecycle status if NULL
UPDATE customers SET customer_lifecycle_status = 'active' WHERE customer_lifecycle_status IS NULL;

-- ============================================================
-- 3. Seed expense types into lookup_values
-- ============================================================
DO $$
DECLARE
  tenant_record RECORD;
  expense_types TEXT[] := ARRAY[
    'bond_cost', 'cable', 'documentation', 'installation', 'conduit_pipes',
    'agent_commission', 'custom_expense', 'solar_kit', 'structure',
    'wiring', 'labor', 'transport', 'lead_generator_commission',
    'employee_commission', 'permit', 'other'
  ];
  expense_labels TEXT[] := ARRAY[
    'Bond Cost', 'Cable', 'Documentation', 'Installation', 'Conduit Pipes',
    'Agent Commission', 'Custom Expense', 'Solar Kit/Panels', 'Structure Materials',
    'Wiring and Cables', 'Installation Labor', 'Travel and Logistics',
    'Lead Generator Commission', 'Employee Commission', 'Permits and Licenses',
    'Miscellaneous'
  ];
  i INTEGER;
BEGIN
  FOR tenant_record IN SELECT DISTINCT tenant_id FROM customers LIMIT 1 LOOP
    FOR i IN 1..array_length(expense_types, 1) LOOP
      INSERT INTO lookup_values (tenant_id, category, value, display_label, is_active, is_system, sort_order)
      SELECT tenant_record.tenant_id, 'expense_types', expense_types[i], expense_labels[i], true, true, i
      WHERE NOT EXISTS (
        SELECT 1 FROM lookup_values
        WHERE tenant_id = tenant_record.tenant_id
          AND category = 'expense_types'
          AND value = expense_types[i]
      );
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- 4. Add lead_generator_access role
-- ============================================================
-- Drop the existing CHECK constraint and replace with one that includes the new role
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'roles'::regclass AND contype = 'c'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE roles DROP CONSTRAINT %I', constraint_name);
  END IF;

  ALTER TABLE roles ADD CONSTRAINT roles_name_check
    CHECK (name = ANY (ARRAY['admin', 'lead_generator', 'employee', 'finance', 'lead_generator_access']));
END $$;

INSERT INTO roles (name, display_name, description)
VALUES ('lead_generator_access', 'Lead Generator Access', 'Can view and manage lead generators')
ON CONFLICT (name) DO NOTHING;
