/*
  # Fix Workflow Steps to Include tenant_id

  ## Problem
  The create_default_workflow_steps function creates workflow steps without tenant_id,
  causing constraint violations when new customers are created.

  ## Solution
  Update the function to retrieve the tenant_id from the customer record and include it
  when inserting workflow steps.

  ## Changes
  1. Modify create_default_workflow_steps function to fetch and include tenant_id
*/

-- Update function to create default workflow steps with tenant_id
CREATE OR REPLACE FUNCTION create_default_workflow_steps(p_customer_id uuid)
RETURNS void AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get the tenant_id from the customer
  SELECT tenant_id INTO v_tenant_id
  FROM customers
  WHERE id = p_customer_id;

  -- Create workflow steps with tenant_id
  INSERT INTO customer_workflow_steps (tenant_id, customer_id, step_name, step_type, order_index) VALUES
    (v_tenant_id, p_customer_id, 'Document Collection', 'document_collection', 1),
    (v_tenant_id, p_customer_id, 'Site Survey', 'site_survey', 2),
    (v_tenant_id, p_customer_id, 'Ship Material', 'ship_material', 3),
    (v_tenant_id, p_customer_id, 'Installation', 'installation', 4),
    (v_tenant_id, p_customer_id, 'Net Meter Application', 'net_meter_application', 5),
    (v_tenant_id, p_customer_id, 'Inspection', 'inspection', 6),
    (v_tenant_id, p_customer_id, 'Commissioning', 'commissioning', 7),
    (v_tenant_id, p_customer_id, 'Subsidy Application', 'subsidy_application', 8);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;