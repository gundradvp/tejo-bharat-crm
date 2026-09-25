/*
  # Add Lookup Values Table for Dropdown Management

  1. New Table
    - `lookup_values` - Store all configurable dropdown values
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to tenants)
      - `category` (text) - Type of lookup (task_type, task_status, priority, etc.)
      - `value` (text) - The actual value/code
      - `display_label` (text) - Human-readable label
      - `description` (text) - Optional description
      - `is_active` (boolean) - Whether this value is active
      - `is_system` (boolean) - System values that cannot be deleted
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on lookup_values table
    - Add policies for tenant isolation
    - Only admins can manage lookup values
    - All authenticated users in tenant can view

  3. Indexes
    - Index on tenant_id and category for fast lookups
    - Unique constraint on tenant_id + category + value
*/

-- Create lookup values table
CREATE TABLE IF NOT EXISTS lookup_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  value text NOT NULL,
  display_label text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, category, value)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lookup_values_tenant_category ON lookup_values(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_lookup_values_category ON lookup_values(category);
CREATE INDEX IF NOT EXISTS idx_lookup_values_sort_order ON lookup_values(sort_order);

-- Enable RLS
ALTER TABLE lookup_values ENABLE ROW LEVEL SECURITY;

-- Lookup Values Policies
CREATE POLICY "Super admins view all lookup values"
  ON lookup_values FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users view lookup values in tenant"
  ON lookup_values FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins insert lookup values in tenant"
  ON lookup_values FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins update lookup values in tenant"
  ON lookup_values FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete non-system lookup values in tenant"
  ON lookup_values FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') AND
    is_system = false
  );

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_lookup_values_updated_at
  BEFORE UPDATE ON lookup_values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system lookup values for Tejo Bharat tenant
INSERT INTO lookup_values (tenant_id, category, value, display_label, description, is_system, sort_order) VALUES
  -- Task Types
  ('00000000-0000-0000-0000-000000000001', 'task_type', 'document_collection', 'Document Collection', 'Collect required documents from customer', true, 1),
  ('00000000-0000-0000-0000-000000000001', 'task_type', 'eb_change', 'EB Change', 'Electricity board meter change', true, 2),
  ('00000000-0000-0000-0000-000000000001', 'task_type', 'follow_up', 'Follow Up', 'Customer follow-up call or visit', true, 3),
  ('00000000-0000-0000-0000-000000000001', 'task_type', 'installation', 'Installation', 'Solar panel installation', true, 4),
  ('00000000-0000-0000-0000-000000000001', 'task_type', 'verification', 'Verification', 'Document or site verification', true, 5),
  ('00000000-0000-0000-0000-000000000001', 'task_type', 'other', 'Other', 'Other task types', true, 6),
  
  -- Task Status
  ('00000000-0000-0000-0000-000000000001', 'task_status', 'pending', 'Pending', 'Task is pending', true, 1),
  ('00000000-0000-0000-0000-000000000001', 'task_status', 'in_progress', 'In Progress', 'Task is in progress', true, 2),
  ('00000000-0000-0000-0000-000000000001', 'task_status', 'completed', 'Completed', 'Task is completed', true, 3),
  ('00000000-0000-0000-0000-000000000001', 'task_status', 'blocked', 'Blocked', 'Task is blocked', true, 4),
  ('00000000-0000-0000-0000-000000000001', 'task_status', 'cancelled', 'Cancelled', 'Task is cancelled', true, 5),
  
  -- Priority Levels
  ('00000000-0000-0000-0000-000000000001', 'priority', 'low', 'Low', 'Low priority', true, 1),
  ('00000000-0000-0000-0000-000000000001', 'priority', 'medium', 'Medium', 'Medium priority', true, 2),
  ('00000000-0000-0000-0000-000000000001', 'priority', 'high', 'High', 'High priority', true, 3),
  ('00000000-0000-0000-0000-000000000001', 'priority', 'urgent', 'Urgent', 'Urgent priority', true, 4),
  
  -- Connection Types
  ('00000000-0000-0000-0000-000000000001', 'connection_type', 'residential', 'Residential', 'Residential connection', false, 1),
  ('00000000-0000-0000-0000-000000000001', 'connection_type', 'commercial', 'Commercial', 'Commercial connection', false, 2),
  ('00000000-0000-0000-0000-000000000001', 'connection_type', 'industrial', 'Industrial', 'Industrial connection', false, 3),
  
  -- Installation Types
  ('00000000-0000-0000-0000-000000000001', 'installation_type', 'rooftop', 'Rooftop', 'Rooftop installation', false, 1),
  ('00000000-0000-0000-0000-000000000001', 'installation_type', 'ground_mounted', 'Ground Mounted', 'Ground mounted installation', false, 2),
  ('00000000-0000-0000-0000-000000000001', 'installation_type', 'carport', 'Carport', 'Carport installation', false, 3)
ON CONFLICT (tenant_id, category, value) DO NOTHING;