CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_has_role.user_id AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION user_has_any_role(user_id uuid, role_names text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_has_any_role.user_id AND r.name = ANY(role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_user_roles(user_id uuid)
RETURNS text[] AS $$
  SELECT array_agg(r.name ORDER BY r.name)
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = get_user_roles.user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION current_user_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.user_has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION current_user_is_lead_generator()
RETURNS boolean AS $$
BEGIN
  RETURN public.user_has_role(auth.uid(), 'lead_generator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.current_user_is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION log_note_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  entity_type_val text;
  entity_id_val uuid;
BEGIN
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  IF TG_TABLE_NAME = 'customer_notes' THEN
    entity_type_val := 'customer';
    entity_id_val := NEW.customer_id;
  ELSIF TG_TABLE_NAME = 'task_notes' THEN
    entity_type_val := 'task';
    entity_id_val := NEW.task_id;
  END IF;
  INSERT INTO public.activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
  VALUES (entity_type_val, entity_id_val, NEW.user_id, 'note_added', user_name || ' added a ' || NEW.note_type || ' note', jsonb_build_object('note_id', NEW.id, 'note_type', NEW.note_type));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION set_task_customer_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION log_task_customer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  cust_name text;
  task_title text;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) OR TG_OP = 'INSERT' THEN
    SELECT full_name INTO user_name FROM public.profiles WHERE id = auth.uid();
    SELECT customers.customer_name INTO cust_name FROM public.customers WHERE customers.id = NEW.customer_id;
    SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
    INSERT INTO public.activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
    VALUES ('task', NEW.task_id, auth.uid(), 'status_change', user_name || ' changed ' || cust_name || ' subtask status to ' || NEW.status, jsonb_build_object('task_customer_id', NEW.id, 'customer_id', NEW.customer_id, 'customer_name', cust_name, 'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, 'new_status', NEW.status));
    INSERT INTO public.activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
    VALUES ('customer', NEW.customer_id, auth.uid(), 'status_change', user_name || ' changed task "' || task_title || '" status to ' || NEW.status, jsonb_build_object('task_id', NEW.task_id, 'task_customer_id', NEW.id, 'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, 'new_status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP POLICY IF EXISTS "Users can view own role assignments" ON user_roles;
CREATE POLICY "Users can view own role assignments" ON user_roles FOR SELECT TO authenticated USING (user_id = (select auth.uid()) OR public.current_user_is_admin());

DROP POLICY IF EXISTS "Users can view customer notes" ON customer_notes;
CREATE POLICY "Users can view customer notes" ON customer_notes FOR SELECT TO authenticated USING (public.current_user_is_admin() OR (NOT is_private AND ((public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_notes.customer_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))) OR (public.user_has_role((select auth.uid()), 'employee') AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.customer_id = customer_notes.customer_id AND tasks.assigned_to = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can create customer notes" ON customer_notes;
CREATE POLICY "Users can create customer notes" ON customer_notes FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()) AND ((public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_notes.customer_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))) OR (public.user_has_role((select auth.uid()), 'employee') AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.customer_id = customer_notes.customer_id AND tasks.assigned_to = (select auth.uid()))) OR public.current_user_is_admin()));

DROP POLICY IF EXISTS "Users can update own customer notes" ON customer_notes;
CREATE POLICY "Users can update own customer notes" ON customer_notes FOR UPDATE TO authenticated USING (public.current_user_is_admin() OR (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours')) WITH CHECK (public.current_user_is_admin() OR (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours'));

DROP POLICY IF EXISTS "Users can delete own customer notes" ON customer_notes;
CREATE POLICY "Users can delete own customer notes" ON customer_notes FOR DELETE TO authenticated USING (public.current_user_is_admin() OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view task notes" ON task_notes;
CREATE POLICY "Users can view task notes" ON task_notes FOR SELECT TO authenticated USING (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_notes.task_id AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))) OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.tasks JOIN public.customers ON tasks.customer_id = customers.id WHERE tasks.id = task_notes.task_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can create task notes" ON task_notes;
CREATE POLICY "Users can create task notes" ON task_notes FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()) AND (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_notes.task_id AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))) OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.tasks JOIN public.customers ON tasks.customer_id = customers.id WHERE tasks.id = task_notes.task_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))))));

DROP POLICY IF EXISTS "Users can update own task notes" ON task_notes;
CREATE POLICY "Users can update own task notes" ON task_notes FOR UPDATE TO authenticated USING (public.current_user_is_admin() OR (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours')) WITH CHECK (public.current_user_is_admin() OR (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours'));

DROP POLICY IF EXISTS "Users can delete own task notes" ON task_notes;
CREATE POLICY "Users can delete own task notes" ON task_notes FOR DELETE TO authenticated USING (public.current_user_is_admin() OR user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
CREATE POLICY "Users can view activity logs" ON activity_logs FOR SELECT TO authenticated USING (public.current_user_is_admin() OR (entity_type = 'customer' AND ((public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.customers WHERE customers.id = activity_logs.entity_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))) OR (public.user_has_role((select auth.uid()), 'employee') AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.customer_id = activity_logs.entity_id AND tasks.assigned_to = (select auth.uid()))))) OR (entity_type = 'task' AND (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = activity_logs.entity_id AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))) OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.tasks JOIN public.customers ON tasks.customer_id = customers.id WHERE tasks.id = activity_logs.entity_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))))));

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can create activity logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view task customers" ON task_customers;
CREATE POLICY "Users can view task customers" ON task_customers FOR SELECT TO authenticated USING (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_customers.task_id AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))) OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.tasks JOIN public.customers ON task_customers.customer_id = customers.id WHERE tasks.id = task_customers.task_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can add task customers" ON task_customers;
CREATE POLICY "Users can add task customers" ON task_customers FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_customers.task_id AND (tasks.assigned_by = (select auth.uid()) OR public.current_user_is_lead_generator())));

DROP POLICY IF EXISTS "Users can update task customers" ON task_customers;
CREATE POLICY "Users can update task customers" ON task_customers FOR UPDATE TO authenticated USING (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_customers.task_id AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))) OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.tasks JOIN public.customers ON task_customers.customer_id = customers.id WHERE tasks.id = task_customers.task_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))))) WITH CHECK (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_customers.task_id AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))) OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.tasks JOIN public.customers ON task_customers.customer_id = customers.id WHERE tasks.id = task_customers.task_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))));

DROP POLICY IF EXISTS "Users can delete task customers" ON task_customers;
CREATE POLICY "Users can delete task customers" ON task_customers FOR DELETE TO authenticated USING (public.current_user_is_admin() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_customers.task_id AND tasks.assigned_by = (select auth.uid())));

DROP INDEX IF EXISTS idx_task_customers_status;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_loan_disbursements_status;
DROP INDEX IF EXISTS idx_customer_payments_status;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_document_templates_created_by;
DROP INDEX IF EXISTS idx_customer_expenses_created_by;
DROP INDEX IF EXISTS idx_customers_quotation_number;
DROP INDEX IF EXISTS idx_customers_lead_generated_by;
DROP INDEX IF EXISTS idx_customers_verified_by;
DROP INDEX IF EXISTS idx_customers_aadhar;
DROP INDEX IF EXISTS idx_customers_pan;
DROP INDEX IF EXISTS idx_customers_payment_method;
DROP INDEX IF EXISTS idx_customers_district_name;
DROP INDEX IF EXISTS idx_customers_overall_status;
DROP INDEX IF EXISTS idx_customer_notes_user_id;
DROP INDEX IF EXISTS idx_customer_notes_created_at;
DROP INDEX IF EXISTS idx_customer_notes_note_type;
DROP INDEX IF EXISTS idx_customer_notes_is_pinned;
DROP INDEX IF EXISTS idx_task_notes_user_id;
DROP INDEX IF EXISTS idx_task_notes_created_at;
DROP INDEX IF EXISTS idx_activity_logs_user_id;
DROP INDEX IF EXISTS idx_activity_logs_created_at;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view profiles" ON profiles FOR SELECT TO authenticated USING (public.current_user_is_admin() OR id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update profiles" ON profiles FOR UPDATE TO authenticated USING (public.current_user_is_admin() OR id = (select auth.uid())) WITH CHECK (public.current_user_is_admin() OR id = (select auth.uid()));

DROP POLICY IF EXISTS "Admins can manage custom statuses" ON custom_statuses;
DROP POLICY IF EXISTS "All authenticated users can view active custom statuses" ON custom_statuses;
CREATE POLICY "Users can view custom statuses" ON custom_statuses FOR SELECT TO authenticated USING (public.current_user_is_admin() OR is_active = true);
CREATE POLICY "Admins can manage custom statuses" ON custom_statuses FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can manage all expenses" ON customer_expenses;
DROP POLICY IF EXISTS "Agents can view expenses for their customers" ON customer_expenses;
CREATE POLICY "Users can view customer expenses" ON customer_expenses FOR SELECT TO authenticated USING (public.current_user_is_admin() OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_expenses.customer_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))));
CREATE POLICY "Admins can manage customer expenses" ON customer_expenses FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can manage templates" ON document_templates;
DROP POLICY IF EXISTS "All users can view active templates" ON document_templates;
CREATE POLICY "Users can view document templates" ON document_templates FOR SELECT TO authenticated USING (public.current_user_is_admin() OR is_active = true);
CREATE POLICY "Admins can manage document templates" ON document_templates FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "Admins can view all customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Employees can view all customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Agents can view payments for their customers" ON customer_payments;
CREATE POLICY "Users can view customer payments" ON customer_payments FOR SELECT TO authenticated USING (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee') OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.customers WHERE customers.id = customer_payments.customer_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))));

DROP POLICY IF EXISTS "Admins can insert customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Employees can insert customer payments" ON customer_payments;
CREATE POLICY "Authorized users can insert customer payments" ON customer_payments FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee'));

DROP POLICY IF EXISTS "Admins can update customer payments" ON customer_payments;
DROP POLICY IF EXISTS "Employees can update customer payments" ON customer_payments;
CREATE POLICY "Authorized users can update customer payments" ON customer_payments FOR UPDATE TO authenticated USING (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee')) WITH CHECK (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee'));

DROP POLICY IF EXISTS "Admins can view all loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Employees can view all loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Agents can view disbursements for their customers" ON loan_disbursements;
CREATE POLICY "Users can view loan disbursements" ON loan_disbursements FOR SELECT TO authenticated USING (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee') OR (public.current_user_is_lead_generator() AND EXISTS (SELECT 1 FROM public.customers WHERE customers.id = loan_disbursements.customer_id AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid())))));

DROP POLICY IF EXISTS "Admins can insert loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Employees can insert loan disbursements" ON loan_disbursements;
CREATE POLICY "Authorized users can insert loan disbursements" ON loan_disbursements FOR INSERT TO authenticated WITH CHECK (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee'));

DROP POLICY IF EXISTS "Admins can update loan disbursements" ON loan_disbursements;
DROP POLICY IF EXISTS "Employees can update loan disbursements" ON loan_disbursements;
CREATE POLICY "Authorized users can update loan disbursements" ON loan_disbursements FOR UPDATE TO authenticated USING (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee')) WITH CHECK (public.current_user_is_admin() OR public.user_has_role((select auth.uid()), 'employee'));