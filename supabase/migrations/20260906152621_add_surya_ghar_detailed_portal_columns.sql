-- Add columns for detailed PM Surya Ghar portal export data
-- Uses ADD COLUMN IF NOT EXISTS to be safe against partial prior additions

ALTER TABLE customers ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS scheme_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sanction_load text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS approved_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS applied_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS existing_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS net_eligible_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS connection_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dcr_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_auto_approved boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS approved_on timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS app_submission_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS submitted_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_approved_by text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feasibility_remarks text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS net_metering_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_inverter_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_module_capacity text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loan_application_number text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loan_sanction_amount numeric;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loan_sanction_date timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS current_loan_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS ulb_type text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS village_panchayat_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS development_block_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS urban_local_body_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name_as_per_bank text;

-- JSONB columns for structured portal data
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_inverter_list jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_module_list jsonb;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_workflow_steps jsonb;

-- Current stage tracking for display and filtering
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_current_step_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_current_step_status text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS portal_current_step_date timestamptz;

-- Add index for filtering by portal current step
CREATE INDEX IF NOT EXISTS idx_customers_portal_current_step ON customers (portal_current_step_name);
