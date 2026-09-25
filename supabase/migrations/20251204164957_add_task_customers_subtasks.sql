/*
  # Add Task-Customer Subtasks System

  ## Overview
  This migration adds support for multiple customers per task, where each customer
  acts as a subtask with its own status. This enables better task management when
  a single task (e.g., "Site Survey") needs to be completed for multiple customers.

  ## Changes

  ### 1. New Tables
  
  #### task_customers
  Junction table linking tasks to multiple customers with individual statuses
  - `id` (uuid, primary key) - Unique identifier for the task-customer relationship
  - `task_id` (uuid, foreign key) - References tasks table
  - `customer_id` (uuid, foreign key) - References customers table
  - `status` (text) - Individual status for this customer's subtask (pending, in_progress, completed, blocked, cancelled)
  - `order_index` (integer) - Order of customers within the task (for sorting)
  - `notes` (text) - Notes specific to this customer's subtask
  - `completed_at` (timestamptz) - When this subtask was completed
  - `created_at` (timestamptz) - When this relationship was created
  - `updated_at` (timestamptz) - When this relationship was last updated

  ### 2. Migration Strategy
  - Keep existing `customer_id` in tasks table for backward compatibility
  - New tasks can use task_customers for multiple customers
  - Existing single-customer tasks continue to work

  ## Security
  - Enable RLS on task_customers table
  - Users can view task_customers for tasks they have access to
  - Users can modify task_customers for tasks they have access to
  - Activity logs track customer subtask status changes

  ## Indexes
  - task_id for efficient lookups
  - customer_id for reverse lookups
  - Combined index on (task_id, order_index) for sorted retrieval

  ## Important Notes
  - Cascading deletes ensure orphaned records are cleaned up
  - updated_at is automatically updated via trigger
  - Activity logs are created when subtask status changes
*/

-- Create task_customers junction table
CREATE TABLE IF NOT EXISTS task_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  order_index integer DEFAULT 0,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, customer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_customers_task_id ON task_customers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_customers_customer_id ON task_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_task_customers_task_order ON task_customers(task_id, order_index);
CREATE INDEX IF NOT EXISTS idx_task_customers_status ON task_customers(status);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_task_customers_updated_at ON task_customers;
CREATE TRIGGER update_task_customers_updated_at
  BEFORE UPDATE ON task_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE task_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_customers

-- SELECT: Users can view task_customers for tasks they have access to
CREATE POLICY "Users can view task customers"
  ON task_customers FOR SELECT
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
    )
    OR
    (current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM tasks
      JOIN customers ON task_customers.customer_id = customers.id
      WHERE tasks.id = task_customers.task_id
      AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
    ))
  );

-- INSERT: Users can add customers to tasks they have access to
CREATE POLICY "Users can add task customers"
  ON task_customers FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_by = auth.uid() OR current_user_is_lead_generator())
    )
  );

-- UPDATE: Users can update task_customers for tasks they have access to
CREATE POLICY "Users can update task customers"
  ON task_customers FOR UPDATE
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
    )
    OR
    (current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM tasks
      JOIN customers ON task_customers.customer_id = customers.id
      WHERE tasks.id = task_customers.task_id
      AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
    ))
  )
  WITH CHECK (
    current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
    )
    OR
    (current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM tasks
      JOIN customers ON task_customers.customer_id = customers.id
      WHERE tasks.id = task_customers.task_id
      AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
    ))
  );

-- DELETE: Users can remove customers from tasks they have access to
CREATE POLICY "Users can delete task customers"
  ON task_customers FOR DELETE
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_by = auth.uid() OR current_user_is_lead_generator())
    )
  );

-- Function to automatically set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_task_customer_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for completed_at
DROP TRIGGER IF EXISTS set_task_customer_completed_at_trigger ON task_customers;
CREATE TRIGGER set_task_customer_completed_at_trigger
  BEFORE UPDATE ON task_customers
  FOR EACH ROW
  EXECUTE FUNCTION set_task_customer_completed_at();

-- Function to log task customer status changes
CREATE OR REPLACE FUNCTION log_task_customer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  customer_name text;
  task_title text;
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) OR TG_OP = 'INSERT' THEN
    -- Get relevant names
    SELECT full_name INTO user_name FROM profiles WHERE id = auth.uid();
    SELECT customer_name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    SELECT title INTO task_title FROM tasks WHERE id = NEW.task_id;
    
    -- Insert activity log for the task
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
    VALUES (
      'task',
      NEW.task_id,
      auth.uid(),
      'status_change',
      user_name || ' changed ' || customer_name || ' subtask status to ' || NEW.status,
      jsonb_build_object(
        'task_customer_id', NEW.id,
        'customer_id', NEW.customer_id,
        'customer_name', customer_name,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
    
    -- Also log to customer activity
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
    VALUES (
      'customer',
      NEW.customer_id,
      auth.uid(),
      'status_change',
      user_name || ' changed task "' || task_title || '" status to ' || NEW.status,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_customer_id', NEW.id,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log status changes
DROP TRIGGER IF EXISTS log_task_customer_status_change_trigger ON task_customers;
CREATE TRIGGER log_task_customer_status_change_trigger
  AFTER INSERT OR UPDATE ON task_customers
  FOR EACH ROW
  EXECUTE FUNCTION log_task_customer_status_change();