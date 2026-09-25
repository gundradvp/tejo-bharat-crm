/*
  # Add GST Tracking to Customer Expenses
  
  ## Overview
  This migration adds GST tracking fields to the customer_expenses table to support
  proper input GST credit tracking and financial calculations.
  
  ## Modified Tables
  
  ### customer_expenses
  Added fields for GST tracking:
  - `gst_amount` (decimal) - GST amount paid on this expense
  - `gst_percentage` (decimal) - GST percentage applied (0, 5, 12, 18, 28)
  - `base_amount` (decimal) - Base amount before GST (auto-calculated or manual)
  
  ## Notes
  - GST amount helps track input GST credit available
  - Base amount + GST amount should equal the total amount
  - This supports proper profit/loss calculation with GST considerations
*/

-- Add GST tracking fields to customer_expenses table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_expenses' AND column_name = 'gst_amount') THEN
    ALTER TABLE customer_expenses ADD COLUMN gst_amount decimal(12,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_expenses' AND column_name = 'gst_percentage') THEN
    ALTER TABLE customer_expenses ADD COLUMN gst_percentage decimal(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_expenses' AND column_name = 'base_amount') THEN
    ALTER TABLE customer_expenses ADD COLUMN base_amount decimal(12,2) DEFAULT 0;
  END IF;
END $$;
