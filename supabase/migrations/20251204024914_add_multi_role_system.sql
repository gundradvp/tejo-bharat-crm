/*
  # Multi-Role User System Migration

  ## Description
  Transforms the user role system from single-role to multi-role, allowing users to have multiple roles simultaneously (admin, lead_generator, employee).

  ## New Tables

  ### 1. `roles`
  Predefined system roles
  - `id` (uuid, primary key)
  - `name` (text, unique) - Role name: 'admin', 'lead_generator', 'employee'
  - `display_name` (text) - Human-readable role name
  - `description` (text) - Role description
  - `created_at` (timestamptz)

  ### 2. `user_roles`
  Many-to-many junction table linking users to roles
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles) - User reference
  - `role_id` (uuid, FK to roles) - Role reference
  - `assigned_at` (timestamptz) - When role was assigned
  - Unique constraint on (user_id, role_id)

  ## Data Migration
  - Migrates existing single role from profiles.role to user_roles table
  - Maps 'agent' to 'lead_generator'
  - Preserves all existing role assignments

  ## Helper Functions
  - `user_has_role(user_id, role_name)` - Check if user has specific role
  - `user_has_any_role(user_id, role_names[])` - Check if user has any of the specified roles
  - `get_user_roles(user_id)` - Get array of role names for a user

  ## Security
  - RLS enabled on both new tables
  - All authenticated users can read roles table
  - Only admins can manage user_roles assignments
  - Users can view their own role assignments

  ## Important Notes
  1. Legacy `role` column in profiles kept for backward compatibility
  2. New system uses user_roles table as source of truth
  3. Helper functions simplify role checking in RLS policies
*/

-- Create roles table with predefined system roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL CHECK (name IN ('admin', 'lead_generator', 'employee')),
  display_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Insert predefined roles
INSERT INTO roles (name, display_name, description) VALUES
  ('admin', 'Admin', 'Full system access, can manage users and settings'),
  ('lead_generator', 'Lead Generator', 'Can generate leads and manage assigned customers'),
  ('employee', 'Employee', 'Can view and work on assigned tasks')
ON CONFLICT (name) DO NOTHING;

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Migrate existing role data from profiles to user_roles
-- Map 'agent' to 'lead_generator'
INSERT INTO user_roles (user_id, role_id)
SELECT 
  p.id,
  r.id
FROM profiles p
JOIN roles r ON (
  CASE 
    WHEN p.role = 'agent' THEN r.name = 'lead_generator'
    WHEN p.role = 'admin' THEN r.name = 'admin'
    WHEN p.role = 'employee' THEN r.name = 'employee'
    ELSE false
  END
)
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id AND ur.role_id = r.id
);

-- Create helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_has_role.user_id 
    AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION user_has_any_role(user_id uuid, role_names text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_has_any_role.user_id 
    AND r.name = ANY(role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to get all roles for a user as array
CREATE OR REPLACE FUNCTION get_user_roles(user_id uuid)
RETURNS text[] AS $$
  SELECT array_agg(r.name ORDER BY r.name)
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = get_user_roles.user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Create optimized helper function for current user admin check
CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN user_has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create optimized helper function for current user lead generator check
CREATE OR REPLACE FUNCTION current_user_is_lead_generator()
RETURNS boolean AS $$
BEGIN
  RETURN user_has_role(auth.uid(), 'lead_generator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles(user_id, role_id);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles table
CREATE POLICY "All authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_roles table
CREATE POLICY "Users can view own role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR current_user_is_admin());

CREATE POLICY "Admins can insert role assignments"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins can delete role assignments"
  ON user_roles FOR DELETE
  TO authenticated
  USING (current_user_is_admin());

-- Update is_admin helper to use new system
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN current_user_is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;