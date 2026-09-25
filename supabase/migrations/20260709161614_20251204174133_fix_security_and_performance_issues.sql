CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_expenses_created_by ON customer_expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_customer_notes_user_id ON customer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_generated_by ON customers(lead_generated_by);
CREATE INDEX IF NOT EXISTS idx_customers_verified_by ON customers(verified_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_task_notes_user_id ON task_notes(user_id);

DROP POLICY IF EXISTS "Lead generators can manage their customer workflow steps" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Employees can view their assigned workflow steps" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Employees can update their assigned workflow steps" ON customer_workflow_steps;

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