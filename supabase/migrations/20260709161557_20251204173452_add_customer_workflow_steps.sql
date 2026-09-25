CREATE TABLE IF NOT EXISTS customer_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('document_collection','site_survey','ship_material','installation','net_meter_application','subsidy_application','inspection','commissioning')),
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  estimated_completion_date date,
  actual_completion_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_customer_id ON customer_workflow_steps(customer_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON customer_workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_customer_order ON customer_workflow_steps(customer_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_assigned_to ON customer_workflow_steps(assigned_to);

ALTER TABLE customer_workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all workflow steps" ON customer_workflow_steps FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY "Lead generators can manage their customer workflow steps" ON customer_workflow_steps FOR ALL TO authenticated USING (current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_workflow_steps.customer_id AND customers.assigned_agent_id = (select auth.uid()))) WITH CHECK (current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_workflow_steps.customer_id AND customers.assigned_agent_id = (select auth.uid())));

CREATE POLICY "Employees can view their assigned workflow steps" ON customer_workflow_steps FOR SELECT TO authenticated USING (assigned_to = (select auth.uid()) OR EXISTS (SELECT 1 FROM tasks WHERE tasks.customer_id = customer_workflow_steps.customer_id AND tasks.assigned_to = (select auth.uid())));

CREATE POLICY "Employees can update their assigned workflow steps" ON customer_workflow_steps FOR UPDATE TO authenticated USING (assigned_to = (select auth.uid())) WITH CHECK (assigned_to = (select auth.uid()));

CREATE OR REPLACE FUNCTION update_workflow_steps_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.actual_completion_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_workflow_steps_timestamp ON customer_workflow_steps;
CREATE TRIGGER update_workflow_steps_timestamp BEFORE UPDATE ON customer_workflow_steps FOR EACH ROW EXECUTE FUNCTION update_workflow_steps_updated_at();

CREATE OR REPLACE FUNCTION create_default_workflow_steps(p_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO customer_workflow_steps (customer_id, step_name, step_type, order_index) VALUES
    (p_customer_id, 'Document Collection', 'document_collection', 1),
    (p_customer_id, 'Site Survey', 'site_survey', 2),
    (p_customer_id, 'Ship Material', 'ship_material', 3),
    (p_customer_id, 'Installation', 'installation', 4),
    (p_customer_id, 'Net Meter Application', 'net_meter_application', 5),
    (p_customer_id, 'Inspection', 'inspection', 6),
    (p_customer_id, 'Commissioning', 'commissioning', 7),
    (p_customer_id, 'Subsidy Application', 'subsidy_application', 8);
END;
$$;

CREATE OR REPLACE FUNCTION trigger_create_workflow_steps()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM create_default_workflow_steps(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_workflow_steps_on_customer_insert ON customers;
CREATE TRIGGER create_workflow_steps_on_customer_insert AFTER INSERT ON customers FOR EACH ROW EXECUTE FUNCTION trigger_create_workflow_steps();