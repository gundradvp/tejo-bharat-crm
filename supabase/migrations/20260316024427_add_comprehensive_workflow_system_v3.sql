/*
  # Comprehensive Solar Installation Workflow Management System

  ## Overview
  Complete project lifecycle management for solar installations from site visit to warranty registration.

  ## New Tables
  1. workflow_stages - Master stages definition
  2. customer_workflow_transitions - Track stage changes
  3. loan_applications - Loan tracking
  4. loan_disbursements - Disbursement installments
  5. material_shipments - Material tracking
  6. discom_submissions - DISCOM document submissions
  7. discom_inspections - DISCOM inspections
  8. subsidy_applications - Subsidy claims
  9. warranty_registrations - Equipment warranties
  10. installation_milestones - Installation progress

  ## Security
  RLS enabled on all tables with tenant isolation
*/

-- Create workflow_stages table
CREATE TABLE IF NOT EXISTS workflow_stages (
  id bigserial PRIMARY KEY,
  stage_code text UNIQUE NOT NULL,
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  stage_category text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create customer_workflow_transitions table
CREATE TABLE IF NOT EXISTS customer_workflow_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  from_stage_code text,
  to_stage_code text NOT NULL,
  transition_date timestamptz DEFAULT now(),
  transitioned_by uuid REFERENCES profiles(id),
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create loan_applications table
CREATE TABLE IF NOT EXISTS loan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  bank_name text,
  bank_branch text,
  loan_type text DEFAULT 'solar_loan',
  application_number text,
  application_date date,
  loan_amount_requested numeric(12,2),
  loan_amount_sanctioned numeric(12,2),
  sanction_date date,
  sanction_letter_url text,
  disbursement_type text DEFAULT 'full',
  total_disbursed_amount numeric(12,2) DEFAULT 0,
  disbursement_status text DEFAULT 'pending',
  loan_status text DEFAULT 'not_required',
  documents_submitted_date date,
  documents_acknowledged boolean DEFAULT false,
  completion_docs_submitted_date date,
  completion_docs_acknowledged boolean DEFAULT false,
  final_disbursement_requested_date date,
  remarks text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create loan_disbursements table
CREATE TABLE IF NOT EXISTS loan_disbursements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid REFERENCES loan_applications(id) ON DELETE CASCADE NOT NULL,
  disbursement_number integer NOT NULL,
  disbursement_amount numeric(12,2) NOT NULL,
  disbursement_date date,
  disbursement_reference text,
  received_in_account boolean DEFAULT false,
  receipt_url text,
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create material_shipments table
CREATE TABLE IF NOT EXISTS material_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  supplier_name text,
  order_date date,
  order_reference text,
  expected_delivery_date date,
  actual_delivery_date date,
  tracking_number text,
  shipment_status text DEFAULT 'ordered',
  items_json jsonb,
  delivery_location text,
  received_by uuid REFERENCES profiles(id),
  inspection_completed boolean DEFAULT false,
  inspection_notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discom_submissions table
CREATE TABLE IF NOT EXISTS discom_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  submission_date date,
  submission_reference text,
  submitted_by uuid REFERENCES profiles(id),
  documents_submitted text[],
  acknowledgment_received boolean DEFAULT false,
  acknowledgment_number text,
  acknowledgment_date date,
  submission_status text DEFAULT 'pending',
  rejection_reason text,
  resubmission_date date,
  approval_date date,
  approval_reference text,
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discom_inspections table
CREATE TABLE IF NOT EXISTS discom_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  discom_submission_id uuid REFERENCES discom_submissions(id),
  inspection_scheduled_date date,
  inspection_actual_date date,
  inspector_name text,
  inspector_contact text,
  inspection_status text DEFAULT 'pending',
  inspection_result text,
  inspection_report_url text,
  meter_number text,
  meter_installation_date date,
  net_metering_approved boolean DEFAULT false,
  net_metering_agreement_url text,
  issues_found text[],
  corrective_actions_required text[],
  reinspection_required boolean DEFAULT false,
  reinspection_date date,
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subsidy_applications table
CREATE TABLE IF NOT EXISTS subsidy_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  application_number text,
  application_date date,
  applied_by uuid REFERENCES profiles(id),
  subsidy_scheme_name text DEFAULT 'PM-KUSUM / State Subsidy',
  eligible_amount numeric(12,2),
  claimed_amount numeric(12,2),
  approved_amount numeric(12,2),
  application_status text DEFAULT 'not_claimed',
  documents_submitted text[],
  submission_portal text,
  submission_reference text,
  review_date date,
  approval_date date,
  approval_reference text,
  disbursement_date date,
  disbursement_reference text,
  disbursed_to_account text,
  rejection_reason text,
  appeal_filed boolean DEFAULT false,
  appeal_date date,
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create warranty_registrations table
CREATE TABLE IF NOT EXISTS warranty_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  equipment_type text NOT NULL,
  manufacturer_name text,
  model_number text,
  serial_numbers text[],
  installation_date date,
  warranty_start_date date,
  warranty_period_years integer,
  warranty_expiry_date date,
  registration_date date,
  registration_number text,
  registration_portal_url text,
  warranty_certificate_url text,
  registered_by uuid REFERENCES profiles(id),
  warranty_status text DEFAULT 'pending',
  warranty_terms text,
  amc_included boolean DEFAULT false,
  amc_start_date date,
  amc_end_date date,
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create installation_milestones table
CREATE TABLE IF NOT EXISTS installation_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  milestone_type text NOT NULL,
  milestone_name text NOT NULL,
  planned_date date,
  actual_date date,
  completed_by uuid REFERENCES profiles(id),
  status text DEFAULT 'pending',
  photos text[],
  verification_required boolean DEFAULT true,
  verified_by uuid REFERENCES profiles(id),
  verification_date date,
  quality_check_passed boolean,
  issues_found text,
  notes text,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'current_workflow_stage'
  ) THEN
    ALTER TABLE customers ADD COLUMN current_workflow_stage text DEFAULT 'site_survey';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'workflow_stage_updated_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN workflow_stage_updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_customer ON customer_workflow_transitions(customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_tenant ON customer_workflow_transitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_customer ON loan_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_tenant ON loan_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loan_disbursements_application ON loan_disbursements(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_material_shipments_customer ON material_shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_discom_submissions_customer ON discom_submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_discom_inspections_customer ON discom_inspections(customer_id);
CREATE INDEX IF NOT EXISTS idx_subsidy_applications_customer ON subsidy_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_registrations_customer ON warranty_registrations(customer_id);
CREATE INDEX IF NOT EXISTS idx_installation_milestones_customer ON installation_milestones(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_workflow_stage ON customers(current_workflow_stage);

-- Enable RLS
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discom_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsidy_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tenant_select_workflow_stages" ON workflow_stages FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_select_workflow_transitions" ON customer_workflow_transitions FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_insert_workflow_transitions" ON customer_workflow_transitions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_loan_applications" ON loan_applications FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_loan_disbursements" ON loan_disbursements FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_material_shipments" ON material_shipments FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_discom_submissions" ON discom_submissions FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_discom_inspections" ON discom_inspections FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_subsidy_applications" ON subsidy_applications FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_warranty_registrations" ON warranty_registrations FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_all_installation_milestones" ON installation_milestones FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Insert default workflow stages
INSERT INTO workflow_stages (stage_code, stage_name, stage_order, stage_category, description, tenant_id) 
SELECT 
  stage_code, stage_name, stage_order, stage_category, description,
  t.id as tenant_id
FROM (VALUES
  ('site_survey', 'Site Assessment', 1, 'Assessment', 'First visit to assess site feasibility'),
  ('doc_collection', 'Document Collection', 2, 'Documentation', 'Collecting customer documents'),
  ('quotation_prep', 'Quotation Preparation', 3, 'Commercial', 'Preparing quotation'),
  ('quotation_approved', 'Quotation Approved', 4, 'Commercial', 'Customer approved quotation'),
  ('loan_prep', 'Financing Arrangement', 5, 'Financing', 'Preparing loan application'),
  ('loan_applied', 'Loan Applied', 6, 'Financing', 'Loan submitted to bank'),
  ('bank_docs_submitted', 'Bank Documents Submitted', 7, 'Financing', 'Documents to bank'),
  ('loan_sanctioned', 'Loan Sanctioned', 8, 'Financing', 'Bank approved loan'),
  ('awaiting_disbursement', 'Awaiting Disbursement', 9, 'Financing', 'Waiting for disbursement'),
  ('material_procurement', 'Material Procurement', 10, 'Installation', 'Ordering materials'),
  ('material_in_transit', 'Material in Transit', 11, 'Installation', 'Materials shipping'),
  ('material_delivered', 'Material Delivered', 12, 'Installation', 'Materials received'),
  ('installation_started', 'Installation In Progress', 13, 'Installation', 'Installation begun'),
  ('installation_completed', 'Installation Completed', 14, 'Installation', 'Installation finished'),
  ('discom_docs_prep', 'DISCOM Documentation', 15, 'Regulatory', 'Preparing DISCOM docs'),
  ('discom_submitted', 'DISCOM Submitted', 16, 'Regulatory', 'Submitted to DISCOM'),
  ('inspection_scheduled', 'Inspection Scheduled', 17, 'Regulatory', 'DISCOM inspection scheduled'),
  ('inspection_completed', 'Inspection Passed', 18, 'Regulatory', 'Inspection successful'),
  ('meter_installed', 'Net Meter Installed', 19, 'Regulatory', 'Meter installed'),
  ('subsidy_prep', 'Subsidy Preparation', 20, 'Subsidy', 'Preparing subsidy application'),
  ('subsidy_submitted', 'Subsidy Submitted', 21, 'Subsidy', 'Subsidy claim submitted'),
  ('subsidy_approved', 'Subsidy Approved', 22, 'Subsidy', 'Subsidy approved'),
  ('bank_completion_docs', 'Bank Completion Docs', 23, 'Closure', 'Final docs to bank'),
  ('final_disbursement_requested', 'Final Disbursement', 24, 'Closure', 'Requested remaining loan'),
  ('warranty_registration', 'Warranty Registration', 25, 'Closure', 'Registering warranties'),
  ('project_completed', 'Project Completed', 26, 'Closure', 'All completed')
) AS v(stage_code, stage_name, stage_order, stage_category, description)
CROSS JOIN tenants t
ON CONFLICT DO NOTHING;

-- Create trigger for workflow transitions
CREATE OR REPLACE FUNCTION track_workflow_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.current_workflow_stage IS DISTINCT FROM NEW.current_workflow_stage) THEN
    INSERT INTO customer_workflow_transitions (
      customer_id,
      from_stage_code,
      to_stage_code,
      transitioned_by,
      tenant_id
    ) VALUES (
      NEW.id,
      OLD.current_workflow_stage,
      NEW.current_workflow_stage,
      auth.uid(),
      NEW.tenant_id
    );
    
    NEW.workflow_stage_updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS track_customer_workflow_transition ON customers;
CREATE TRIGGER track_customer_workflow_transition
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION track_workflow_transition();
