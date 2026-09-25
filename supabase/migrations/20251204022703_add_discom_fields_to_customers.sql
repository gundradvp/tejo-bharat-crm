/*
  # Add DISCOM fields to customers table
  
  ## Overview
  This migration adds DISCOM (Distribution Company) related fields to the customers table
  for better filtering and organization.
  
  ## Changes
  1. New Columns
    - `discom_name` (text) - Name of the distribution company
    - `district_name` (text) - District name for the customer
  
  ## Notes
  - Fields are optional to support existing records
  - Will be populated from import data
*/

-- Add DISCOM and district fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS discom_name text,
ADD COLUMN IF NOT EXISTS district_name text;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_customers_discom_name ON customers(discom_name);
CREATE INDEX IF NOT EXISTS idx_customers_district_name ON customers(district_name);
