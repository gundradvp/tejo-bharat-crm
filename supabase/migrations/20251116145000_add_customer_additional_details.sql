/*
  # Add Additional Customer Details Fields

  ## Overview
  This migration adds comprehensive fields to the customers table for tracking solar installation details,
  identification documents, technical specifications, and location information.

  ## New Fields Added

  ### Installation Details
  - inverter_brand (text) - Brand of inverter installed
  - inverter_serial_number (text) - Serial number of inverter
  - inverter_capacity (numeric) - Capacity in kW
  - panel_brand (text) - Solar panel manufacturer
  - panel_serial_numbers (text[]) - Array of panel serial numbers
  - panel_quantity (integer) - Number of panels installed
  - panel_wattage (numeric) - Wattage per panel
  - total_capacity_kw (numeric) - Total system capacity

  ### Location & Site Details
  - latitude (numeric) - GPS latitude coordinate
  - longitude (numeric) - GPS longitude coordinate
  - site_type (text) - Type of installation site
  - roof_type (text) - Roof material/type
  - shadow_free_area (boolean) - Whether area is shadow-free

  ### Identification Documents
  - aadhar_number (text) - Aadhar card number (encrypted)
  - pan_number (text) - PAN card number
  - electricity_bill_number (text) - Electricity bill reference

  ### Technical Certificates
  - grounding_certificate_number (text) - Grounding certificate ref
  - grounding_certificate_date (date) - Certificate issue date
  - sync_certificate_number (text) - Synchronisation certificate ref
  - sync_certificate_date (date) - Sync certificate date
  - commissioning_date (date) - System commissioning date

  ### Agreement & Legal
  - agreement_number (text) - Agreement reference number
  - agreement_date (date) - Date of agreement
  - agreement_signed (boolean) - Whether agreement is signed
  - terms_accepted (boolean) - Terms acceptance status

  ### Bank Details
  - bank_name (text) - Customer's bank name
  - account_number (text) - Bank account number (encrypted)
  - ifsc_code (text) - Bank IFSC code
  - account_holder_name (text) - Name on bank account

  ### Inspection & Verification
  - inspection_date (date) - Date of site inspection
  - inspector_name (text) - Name of inspector
  - inspection_remarks (text) - Inspection notes
  - verification_date (date) - Verification completion date
  - verified_by (uuid) - Reference to verifying user

  ### Assignment
  - assigned_agent_id (uuid) - Reference to assigned agent

  ## Security
  - All fields are nullable to support gradual data collection
  - Sensitive fields like Aadhar and account numbers should be encrypted at application level
  - RLS policies remain unchanged - existing policies cover new fields
*/

-- Installation Details
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inverter_brand text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inverter_serial_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inverter_capacity numeric(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_brand text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_serial_numbers text[];
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_quantity integer;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS panel_wattage numeric(10,2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_capacity_kw numeric(10,2);

-- Location & Site Details
ALTER TABLE customers ADD COLUMN IF NOT EXISTS latitude numeric(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS longitude numeric(10,7);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS site_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS roof_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shadow_free_area boolean DEFAULT false;

-- Identification Documents
ALTER TABLE customers ADD COLUMN IF NOT EXISTS aadhar_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS electricity_bill_number text;

-- Technical Certificates
ALTER TABLE customers ADD COLUMN IF NOT EXISTS grounding_certificate_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS grounding_certificate_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sync_certificate_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sync_certificate_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS commissioning_date date;

-- Agreement & Legal
ALTER TABLE customers ADD COLUMN IF NOT EXISTS agreement_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS agreement_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS agreement_signed boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false;

-- Bank Details
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ifsc_code text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_holder_name text;

-- Inspection & Verification
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inspection_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inspector_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS inspection_remarks text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS verification_date date;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id);

-- Assignment
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES profiles(id);

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_customers_assigned_agent ON customers(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_verified_by ON customers(verified_by);
CREATE INDEX IF NOT EXISTS idx_customers_aadhar ON customers(aadhar_number) WHERE aadhar_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan_number) WHERE pan_number IS NOT NULL;