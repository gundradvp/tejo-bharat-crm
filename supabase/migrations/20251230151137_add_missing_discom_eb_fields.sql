/*
  # Add Missing DISCOM and EB Fields to Customers Table

  ## Overview
  This migration adds electricity board (EB) and DISCOM organizational hierarchy fields
  that are used by the application but were missing from the database schema.

  ## Changes
  1. New Columns
    - `eb_distribution` (text) - EB distribution/circle name
    - `eb_section` (text) - EB section/subdivision name
    - `discom_division` (text) - DISCOM division
    - `discom_subdivision` (text) - DISCOM subdivision

  ## Notes
  - All fields are nullable to support existing records
  - These fields help organize customers by electricity board hierarchy
  - Adds indexes for better query performance
*/

-- Add EB and DISCOM organizational fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS eb_distribution text,
ADD COLUMN IF NOT EXISTS eb_section text,
ADD COLUMN IF NOT EXISTS discom_division text,
ADD COLUMN IF NOT EXISTS discom_subdivision text;

-- Add indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_customers_eb_distribution ON customers(eb_distribution);
CREATE INDEX IF NOT EXISTS idx_customers_eb_section ON customers(eb_section);
CREATE INDEX IF NOT EXISTS idx_customers_discom_division ON customers(discom_division);
CREATE INDEX IF NOT EXISTS idx_customers_discom_subdivision ON customers(discom_subdivision);
