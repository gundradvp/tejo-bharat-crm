/*
  # PM Suryaghar Customer & Agent Management Portal - Base Schema

  ## Overview
  This migration creates the foundational database structure for a multi-tenant customer and task management platform for PM Suryaghar vendors.

  ## New Tables

  ### 1. `profiles`
  Extended user profile linked to Supabase auth.users
  - `id` (uuid, FK to auth.users) - User identifier
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'admin', 'agent', or 'employee'
  - `phone` (text) - Contact number
  - `is_active` (boolean) - Account status
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `customers`
  Core customer/applicant records
  - `id` (uuid) - Unique customer identifier
  - `agent_id` (uuid, FK to profiles) - Assigned agent
  - `customer_name` (text) - Full name
  - `phone` (text) - Primary contact
  - `email` (text) - Email address
  - `address` (text) - Full address
  - `loan_status` (text) - Loan approval status
  - `document_status` (text) - Document submission status
  - `installation_status` (text) - Installation progress
  - `subsidy_status` (text) - Subsidy claim status
  - `overall_status` (text) - Overall workflow status
  - `remarks` (text) - General notes
  - `created_at` (timestamptz) - Record creation
  - `updated_at` (timestamptz) - Last modification

  ### 3. `tasks`
  Task/assignment definitions and tracking
  - `id` (uuid) - Unique task identifier
  - `customer_id` (uuid, FK to customers) - Related customer
  - `assigned_to` (uuid, FK to profiles) - Assigned employee
  - `assigned_by` (uuid, FK to profiles) - Admin who assigned
  - `title` (text) - Task title
  - `description` (text) - Task details
  - `task_type` (text) - Type: 'document_collection', 'eb_change', 'follow_up', 'installation', 'other'
  - `status` (text) - Task status: 'pending', 'in_progress', 'completed', 'blocked'
  - `priority` (text) - Priority: 'low', 'medium', 'high', 'urgent'
  - `due_date` (date) - Expected completion date
  - `completed_at` (timestamptz) - Completion timestamp
  - `remarks` (text) - Task notes
  - `created_at` (timestamptz) - Task creation
  - `updated_at` (timestamptz) - Last update

  ### 4. `audit_logs`
  Complete change tracking for compliance
  - `id` (uuid) - Log entry identifier
  - `user_id` (uuid, FK to profiles) - User who made change
  - `action` (text) - Action type: 'create', 'update', 'delete', 'assign'
  - `entity_type` (text) - Entity affected: 'customer', 'task', 'profile'
  - `entity_id` (uuid) - ID of affected record
  - `changes` (jsonb) - Before/after data
  - `ip_address` (text) - Request IP
  - `user_agent` (text) - Browser/device info
  - `created_at` (timestamptz) - When action occurred

  ### 5. `document_templates`
  Pre-defined document templates for generation
  - `id` (uuid) - Template identifier
  - `name` (text) - Template name
  - `description` (text) - Template purpose
  - `template_type` (text) - Document type: 'agreement', 'letter', 'certificate'
  - `content` (text) - Template content with placeholders
  - `is_active` (boolean) - Template status
  - `created_by` (uuid, FK to profiles) - Creator
  - `created_at` (timestamptz) - Creation date
  - `updated_at` (timestamptz) - Last modification

  ## Security
  - RLS enabled on all tables
  - Admins have full access
  - Agents can only view/edit their own customers
  - Employees can view assigned tasks and related customer data
  - All users can read their own profile
  - Audit logs are read-only for non-admins

  ## Important Notes
  1. All tables use RLS for multi-tenant security
  2. Cascading relationships ensure data integrity
  3. Timestamps auto-update via triggers
  4. JSONB used for flexible audit log storage
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'agent', 'employee')),
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  loan_status text DEFAULT 'pending' CHECK (loan_status IN ('pending', 'approved', 'rejected', 'not_applicable')),
  document_status text DEFAULT 'not_submitted' CHECK (document_status IN ('not_submitted', 'partial', 'complete', 'verified')),
  installation_status text DEFAULT 'not_started' CHECK (installation_status IN ('not_started', 'scheduled', 'in_progress', 'completed')),
  subsidy_status text DEFAULT 'not_claimed' CHECK (subsidy_status IN ('not_claimed', 'claimed', 'received', 'rejected')),
  overall_status text DEFAULT 'new' CHECK (overall_status IN ('new', 'in_progress', 'pending_docs', 'completed', 'on_hold')),
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('document_collection', 'eb_change', 'follow_up', 'installation', 'verification', 'other')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  completed_at timestamptz,
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'assign', 'login', 'logout')),
  entity_type text NOT NULL CHECK (entity_type IN ('customer', 'task', 'profile', 'template', 'auth')),
  entity_id uuid,
  changes jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create document_templates table
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text NOT NULL CHECK (template_type IN ('agreement', 'letter', 'certificate', 'notice', 'report')),
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customers_agent_id ON customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_overall_status ON customers(overall_status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for customers table
CREATE POLICY "Agents can view own customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.customer_id = customers.id
      AND tasks.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Agents can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Agents can update own customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for tasks table
CREATE POLICY "Users can view relevant tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = tasks.customer_id
      AND customers.agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins and agents can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent')
    )
  );

CREATE POLICY "Task assignees can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for audit_logs table
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for document_templates table
CREATE POLICY "All users can view active templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Admins can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );