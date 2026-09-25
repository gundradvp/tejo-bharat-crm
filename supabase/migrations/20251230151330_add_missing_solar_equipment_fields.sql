/*
  # Add Missing Solar Equipment Fields to Customers Table

  ## Overview
  This migration adds solar equipment fields that are used by the application
  for tracking panel and inverter specifications.

  ## Changes
  1. New Columns
    - `inverter_make` (text) - Inverter manufacturer/make
    - `panel_make` (text) - Solar panel manufacturer/make
    - `panel_type` (text) - Type/model of solar panels

  ## Notes
  - All fields are nullable to support existing records
  - These complement existing `inverter_brand` and `panel_brand` fields
  - `inverter_make` and `panel_make` provide alternative naming for equipment manufacturers
*/

-- Add solar equipment specification fields
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS inverter_make text,
ADD COLUMN IF NOT EXISTS panel_make text,
ADD COLUMN IF NOT EXISTS panel_type text;

-- Add indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_customers_inverter_make ON customers(inverter_make);
CREATE INDEX IF NOT EXISTS idx_customers_panel_make ON customers(panel_make);
CREATE INDEX IF NOT EXISTS idx_customers_panel_type ON customers(panel_type);
