/*
  # Add Customer Workflow Steps Table

  1. New Tables
    - `customer_workflow_steps`
      - `id` (uuid, primary key) - Unique step identifier
      - `customer_id` (uuid, foreign key) - Reference to customer
      - `step_name` (text) - Name of the workflow step
      - `step_type` (text) - Type of step (document_collection, site_survey, ship_material, installation, net_meter_application, subsidy_application)
      - `status` (text) - Status of the step (not_started, in_progress, completed, blocked)
      - `assigned_to` (uuid, foreign key) - Employee assigned to this step
      - `order_index` (integer) - Order of step in workflow
      - `estimated_completion_date` (date) - Expected completion date
      - `actual_completion_date` (date) - Actual completion date
      - `notes` (text) - Additional notes for this step
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `customer_workflow_steps` table
    - Add policies for authenticated users to view steps for their customers
    - Add policies for employees to update steps assigned to them
    - Add policies for admins to manage all steps

  3. Indexes
    - Add index on customer_id for efficient lookups
    - Add index on status for filtering
    - Add composite index on (customer_id, order_index) for ordered retrieval
*/

-- Create customer_workflow_steps table
CREATE TABLE IF NOT EXISTS customer_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  step_type text NOT NULL CHECK (step_type IN (
    'document_collection',
    'site_survey', 
    'ship_material',
    'installation',
    'net_meter_application',
    'subsidy_application',
    'inspection',
    'commissioning'
  )),
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  estimated_completion_date date,
  actual_completion_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_steps_customer_id ON customer_workflow_steps(customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON customer_workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_customer_order ON customer_workflow_steps(customer_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_assigned_to ON customer_workflow_steps(assigned_to);

-- Enable RLS
ALTER TABLE customer_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all workflow steps"
  ON customer_workflow_steps
  FOR ALL
  TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Policy: Lead generators can view and update steps for their customers
CREATE POLICY "Lead generators can manage their customer workflow steps"
  ON customer_workflow_steps
  FOR ALL
  TO authenticated
  USING (
    current_user_is_lead_generator()
    AND EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_workflow_steps.customer_id
      AND customers.assigned_agent_id = auth.uid()
    )
  )
  WITH CHECK (
    current_user_is_lead_generator()
    AND EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_workflow_steps.customer_id
      AND customers.assigned_agent_id = auth.uid()
    )
  );

-- Policy: Employees can view steps assigned to them or related to their tasks
CREATE POLICY "Employees can view their assigned workflow steps"
  ON customer_workflow_steps
  FOR SELECT
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.customer_id = customer_workflow_steps.customer_id
      AND tasks.assigned_to = auth.uid()
    )
  );

-- Policy: Employees can update steps assigned to them
CREATE POLICY "Employees can update their assigned workflow steps"
  ON customer_workflow_steps
  FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.actual_completion_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_workflow_steps_timestamp ON customer_workflow_steps;
CREATE TRIGGER update_workflow_steps_timestamp
  BEFORE UPDATE ON customer_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_steps_updated_at();

-- Function to create default workflow steps for a new customer
CREATE OR REPLACE FUNCTION create_default_workflow_steps(p_customer_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO customer_workflow_steps (customer_id, step_name, step_type, order_index) VALUES
    (p_customer_id, 'Document Collection', 'document_collection', 1),
    (p_customer_id, 'Site Survey', 'site_survey', 2),
    (p_customer_id, 'Ship Material', 'ship_material', 3),
    (p_customer_id, 'Installation', 'installation', 4),
    (p_customer_id, 'Net Meter Application', 'net_meter_application', 5),
    (p_customer_id, 'Inspection', 'inspection', 6),
    (p_customer_id, 'Commissioning', 'commissioning', 7),
    (p_customer_id, 'Subsidy Application', 'subsidy_application', 8);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create workflow steps for new customers
CREATE OR REPLACE FUNCTION trigger_create_workflow_steps()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_workflow_steps(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_workflow_steps_on_customer_insert ON customers;
CREATE TRIGGER create_workflow_steps_on_customer_insert
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_workflow_steps();