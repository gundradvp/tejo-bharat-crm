/*
  # Migrate 'agent' role to 'lead_generator'

  1. Changes
    - Drops old role check constraint
    - Updates all profiles with role='agent' to role='lead_generator'
    - Adds new role check constraint with 'lead_generator' instead of 'agent'
  
  2. Security
    - No RLS changes needed as this is a schema and data migration only
  
  3. Important Notes
    - This migration must be run in the exact order specified
    - The constraint is dropped first to allow the data update
    - After updating all data, the new constraint is added
*/

-- Step 1: Drop the old check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Update all profiles that have role='agent' to role='lead_generator'
UPDATE profiles 
SET role = 'lead_generator', updated_at = now()
WHERE role = 'agent';

-- Step 3: Add new check constraint with lead_generator instead of agent
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'lead_generator', 'employee'));
