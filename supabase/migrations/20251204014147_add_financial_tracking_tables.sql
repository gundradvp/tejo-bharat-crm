/*
  # Add Financial Tracking System
  
  ## Overview
  This migration adds comprehensive financial tracking for solar installation projects including:
  - Loan disbursement tracking (multiple disbursements per customer)
  - Customer payment tracking (money received from customers)
  - Loan information fields on customers
  - GST tracking fields on customers
  
  ## New Tables
  
  ### loan_disbursements
  Tracks individual loan disbursements from banks to the business
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `disbursement_amount` (decimal) - Amount received in this disbursement
  - `disbursement_date` (date) - Date when disbursement was received
  - `bank_reference_number` (text) - Bank transaction reference
  - `disbursement_status` (text) - Status: pending, received, rejected
  - `remarks` (text) - Additional notes about the disbursement
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### customer_payments
  Tracks payments received from customers
  - `id` (uuid, primary key)
  - `customer_id` (uuid, references customers)
  - `payment_amount` (decimal) - Amount received from customer
  - `payment_date` (date) - Date of payment
  - `payment_mode` (text) - cash, cheque, online_transfer, upi
  - `transaction_reference` (text) - Transaction reference number
  - `payment_status` (text) - Status: pending, received, bounced
  - `remarks` (text) - Additional notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Modified Tables
  
  ### customers
  Added fields for loan and GST tracking:
  - `payment_method_type` (text) - loan, cash, hybrid
  - `bank_name` (text) - Bank providing the loan
  - `bank_branch` (text) - Branch of the bank
  - `loan_reference_number` (text) - Loan reference from bank
  - `loan_sanctioned_amount` (decimal) - Total sanctioned loan amount
  - `loan_sanctioned_date` (date) - Date of loan sanction
  - `output_gst_amount` (decimal) - GST charged to customer
  - `input_gst_credit_amount` (decimal) - GST credit from purchases
  - `net_gst_payable` (decimal) - Net GST to be paid
  
  ## Security
  - Enable RLS on new tables
  - Add policies for authenticated users based on role
  - Admins and employees can manage all records
  - Agents can only view records for their assigned customers
*/

-- Create loan_disbursements table
CREATE TABLE IF NOT EXISTS loan_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  disbursement_amount decimal(12,2) NOT NULL DEFAULT 0,
  disbursement_date date NOT NULL DEFAULT CURRENT_DATE,
  bank_reference_number text DEFAULT '',
  disbursement_status text NOT NULL DEFAULT 'pending' CHECK (disbursement_status IN ('pending', 'received', 'rejected')),
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_payments table
CREATE TABLE IF NOT EXISTS customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_amount decimal(12,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_mode text NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'cheque', 'online_transfer', 'upi')),
  transaction_reference text DEFAULT '',
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'received', 'bounced')),
  remarks text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add loan tracking fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'payment_method_type') THEN
    ALTER TABLE customers ADD COLUMN payment_method_type text DEFAULT 'cash' CHECK (payment_method_type IN ('loan', 'cash', 'hybrid'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'bank_name') THEN
    ALTER TABLE customers ADD COLUMN bank_name text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'bank_branch') THEN
    ALTER TABLE customers ADD COLUMN bank_branch text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'loan_reference_number') THEN
    ALTER TABLE customers ADD COLUMN loan_reference_number text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'loan_sanctioned_amount') THEN
    ALTER TABLE customers ADD COLUMN loan_sanctioned_amount decimal(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'loan_sanctioned_date') THEN
    ALTER TABLE customers ADD COLUMN loan_sanctioned_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'output_gst_amount') THEN
    ALTER TABLE customers ADD COLUMN output_gst_amount decimal(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'input_gst_credit_amount') THEN
    ALTER TABLE customers ADD COLUMN input_gst_credit_amount decimal(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'net_gst_payable') THEN
    ALTER TABLE customers ADD COLUMN net_gst_payable decimal(12,2) DEFAULT 0;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_customer_id ON loan_disbursements(customer_id);
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_status ON loan_disbursements(disbursement_status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_status ON customer_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_customers_payment_method ON customers(payment_method_type);

-- Enable RLS on loan_disbursements
ALTER TABLE loan_disbursements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loan_disbursements
CREATE POLICY "Admins can view all loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view all loan disbursements"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

CREATE POLICY "Agents can view disbursements for their customers"
  ON loan_disbursements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = loan_disbursements.customer_id
      AND customers.agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can insert loan disbursements"
  ON loan_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

CREATE POLICY "Admins can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can update loan disbursements"
  ON loan_disbursements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

CREATE POLICY "Admins can delete loan disbursements"
  ON loan_disbursements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Enable RLS on customer_payments
ALTER TABLE customer_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_payments
CREATE POLICY "Admins can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can view all customer payments"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

CREATE POLICY "Agents can view payments for their customers"
  ON customer_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_payments.customer_id
      AND customers.agent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can insert customer payments"
  ON customer_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

CREATE POLICY "Admins can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Employees can update customer payments"
  ON customer_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
  );

CREATE POLICY "Admins can delete customer payments"
  ON customer_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_loan_disbursements_updated_at ON loan_disbursements;
CREATE TRIGGER update_loan_disbursements_updated_at
  BEFORE UPDATE ON loan_disbursements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_payments_updated_at ON customer_payments;
CREATE TRIGGER update_customer_payments_updated_at
  BEFORE UPDATE ON customer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
