CREATE OR REPLACE FUNCTION create_default_workflow_steps(p_customer_id uuid)
RETURNS void AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM customers WHERE id = p_customer_id;
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