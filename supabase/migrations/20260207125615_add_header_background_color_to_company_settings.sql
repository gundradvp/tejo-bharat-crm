/*
  # Add Header Background Color to Company Settings

  1. Changes
    - Add `header_background_color` column to `company_settings` table
    - Default value is the gradient that was previously hardcoded
  
  2. Purpose
    - Allow companies to customize their quotation header background color
    - Support both solid colors (e.g., '#3B82F6') and gradients
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_settings' AND column_name = 'header_background_color'
  ) THEN
    ALTER TABLE company_settings 
    ADD COLUMN header_background_color text DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  END IF;
END $$;