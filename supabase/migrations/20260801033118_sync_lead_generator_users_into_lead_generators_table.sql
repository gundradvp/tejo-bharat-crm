/*
# Sync users with lead_generator role into the lead_generators table

## Problem
The Lead Generator dropdown on the customer overview and edit pages only
queries the `lead_generators` table. However, 6 users have the `lead_generator`
role assigned in `user_roles` but do NOT have a corresponding row in
`lead_generators`. This means they are invisible in the dropdown.

## Changes
1. Insert missing `lead_generators` rows for every user who has the
   `lead_generator` role in `user_roles` but no existing row in
   `lead_generators` (matched by `user_id`). Copies `full_name`, `phone`,
   `tenant_id` from the profile. Uses 'N/A' when phone is null since the
   column requires a value.
2. Add a trigger `sync_lead_generator_on_role_assign` that automatically
   creates a `lead_generators` row whenever a `user_roles` entry with the
   `lead_generator` role is inserted. This keeps future role assignments
   in sync.
3. The trigger is idempotent — if a `lead_generators` row already exists for
   that `user_id`, it does nothing.

## Security
- No RLS changes. Existing policies on `lead_generators` remain unchanged.
- The trigger function runs with SECURITY DEFINER and a fixed search_path.
*/

-- Step 1: Backfill missing lead_generators rows for existing lead_generator role users
INSERT INTO lead_generators (id, tenant_id, user_id, full_name, phone, status)
SELECT
  gen_random_uuid(),
  p.tenant_id,
  p.id,
  p.full_name,
  COALESCE(p.phone, 'N/A'),
  'active'
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
JOIN roles r ON r.id = ur.role_id
WHERE r.name = 'lead_generator'
  AND NOT EXISTS (
    SELECT 1 FROM lead_generators lg WHERE lg.user_id = p.id
  );

-- Step 2: Create trigger function to auto-sync on future role assignments
CREATE OR REPLACE FUNCTION sync_lead_generator_on_role_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
  v_profile record;
BEGIN
  SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;

  IF v_role_name = 'lead_generator' THEN
    IF NOT EXISTS (SELECT 1 FROM lead_generators WHERE user_id = NEW.user_id) THEN
      SELECT full_name, phone, tenant_id INTO v_profile
        FROM profiles WHERE id = NEW.user_id;

      IF FOUND THEN
        INSERT INTO lead_generators (id, tenant_id, user_id, full_name, phone, status)
        VALUES (gen_random_uuid(), v_profile.tenant_id, NEW.user_id, v_profile.full_name, COALESCE(v_profile.phone, 'N/A'), 'active');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Attach the trigger to user_roles inserts
DROP TRIGGER IF EXISTS trg_sync_lead_generator_on_role_assign ON user_roles;
CREATE TRIGGER trg_sync_lead_generator_on_role_assign
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_lead_generator_on_role_assign();
