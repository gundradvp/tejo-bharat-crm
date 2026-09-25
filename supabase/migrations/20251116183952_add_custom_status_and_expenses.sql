/*
  # Add Custom Status, Expenses, and Lead Tracking

  ## Description
  Adds comprehensive features for custom status management, expense tracking, 
  project costs, and employee lead commission tracking.

  ## New Tables
  
  ### 1. `custom_statuses`
  Custom status definitions that admins can create for tasks and customers
  - `id` (uuid, primary key)
  - `name` (text) - Status name
  - `color` (text) - Hex color code for the status
  - `applies_to` (text) - Either 'task' or 'customer'
  - `is_active` (boolean) - Whether status is currently active
  - `created_at` (timestamptz)
  
  ### 2. `customer_expenses`
  Track expenses for each customer project
  - `id` (uuid, primary key)
  - `customer_id` (uuid, foreign key to customers)
  - `expense_type` (text) - Type of expense (material, labor, transport, etc)
  - `description` (text) - Expense description
  - `amount` (numeric) - Expense amount
  - `expense_date` (date) - Date of expense
  - `vendor_name` (text) - Vendor/supplier name
  - `payment_status` (text) - paid/pending/partial
  - `remarks` (text)
  - `created_by` (uuid, foreign key to profiles)
  - `created_at` (timestamptz)

  ## Modified Tables
  
  ### `customers`
  - Add `agreed_project_cost` (numeric) - Total agreed project cost
  - Add `structure_height` (numeric) - Structure height in feet/meters
  - Add `lead_generated_by` (uuid, foreign key to profiles) - Employee who generated lead
  - Add `employee_commission_amount` (numeric) - Commission amount for employee
  - Add `employee_commission_percentage` (numeric) - Commission percentage

  ## Security
  - Enable RLS on all new tables
  - Admins can do everything
  - Employees can view expenses for customers they manage
  - Employees can view customers they generated leads for
*/

-- Create custom_statuses table
CREATE TABLE IF NOT EXISTS custom_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  applies_to text NOT NULL CHECK (applies_to IN ('task', 'customer')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage custom statuses"
  ON custom_statuses
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "All authenticated users can view active custom statuses"
  ON custom_statuses
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create customer_expenses table
CREATE TABLE IF NOT EXISTS customer_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  expense_type text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date DEFAULT CURRENT_DATE,
  vendor_name text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'partial')),
  remarks text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all expenses"
  ON customer_expenses
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Agents can view expenses for their customers"
  ON customer_expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_expenses.customer_id
      AND customers.assigned_agent_id = auth.uid()
    )
  );

-- Add new columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'agreed_project_cost'
  ) THEN
    ALTER TABLE customers ADD COLUMN agreed_project_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'structure_height'
  ) THEN
    ALTER TABLE customers ADD COLUMN structure_height numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'lead_generated_by'
  ) THEN
    ALTER TABLE customers ADD COLUMN lead_generated_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'employee_commission_amount'
  ) THEN
    ALTER TABLE customers ADD COLUMN employee_commission_amount numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'employee_commission_percentage'
  ) THEN
    ALTER TABLE customers ADD COLUMN employee_commission_percentage numeric;
  END IF;
END $$;

-- Update customers RLS to allow employees to view leads they generated
DROP POLICY IF EXISTS "Agents can view assigned customers" ON customers;

CREATE POLICY "Users can view their relevant customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    assigned_agent_id = auth.uid() 
    OR lead_generated_by = auth.uid() 
    OR is_admin()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_statuses_applies_to ON custom_statuses(applies_to, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_expenses_customer_id ON customer_expenses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_generated_by ON customers(lead_generated_by);
