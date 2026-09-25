-- Drop conflicting policies before creating new ones
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

DROP POLICY IF EXISTS "Lead generators can view all customers" ON customers;
DROP POLICY IF EXISTS "Admins can view all customers" ON customers;
DROP POLICY IF EXISTS "Employees can view their assigned customers" ON customers;
DROP POLICY IF EXISTS "Lead generators can insert customers" ON customers;
DROP POLICY IF EXISTS "Admins can insert customers" ON customers;
DROP POLICY IF EXISTS "Lead generators can update customers" ON customers;
DROP POLICY IF EXISTS "Admins can update customers" ON customers;
DROP POLICY IF EXISTS "Employees can update assigned customers" ON customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;

DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view relevant tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view notes for accessible customers" ON customer_notes;
DROP POLICY IF EXISTS "Users can insert notes for accessible customers" ON customer_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON customer_notes;
DROP POLICY IF EXISTS "Admins can delete notes" ON customer_notes;
DROP POLICY IF EXISTS "Users can view customer notes" ON customer_notes;
DROP POLICY IF EXISTS "Users can create customer notes" ON customer_notes;
DROP POLICY IF EXISTS "Users can update own customer notes" ON customer_notes;
DROP POLICY IF EXISTS "Users can delete own customer notes" ON customer_notes;

DROP POLICY IF EXISTS "Users can view activity logs for accessible customers" ON activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;

DROP POLICY IF EXISTS "Users can view documents for accessible customers" ON customer_documents;
DROP POLICY IF EXISTS "Users can insert documents for accessible customers" ON customer_documents;
DROP POLICY IF EXISTS "Users can update documents for accessible customers" ON customer_documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON customer_documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can view documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can update documents" ON customer_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON customer_documents;

DROP POLICY IF EXISTS "Users can view custom statuses" ON custom_statuses;
DROP POLICY IF EXISTS "Admins can manage custom statuses" ON custom_statuses;

DROP POLICY IF EXISTS "Users can view task customer relationships" ON task_customers;
DROP POLICY IF EXISTS "Admins can manage task customer relationships" ON task_customers;
DROP POLICY IF EXISTS "Users can view task customers" ON task_customers;
DROP POLICY IF EXISTS "Users can add task customers" ON task_customers;
DROP POLICY IF EXISTS "Users can update task customers" ON task_customers;
DROP POLICY IF EXISTS "Users can delete task customers" ON task_customers;

DROP POLICY IF EXISTS "Users can view workflow steps for accessible customers" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Users can update workflow steps" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Admins can manage all workflow steps" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Lead generators can manage their customer workflow steps" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Employees can view their assigned workflow steps" ON customer_workflow_steps;
DROP POLICY IF EXISTS "Employees can update their assigned workflow steps" ON customer_workflow_steps;

-- Profiles policies
CREATE POLICY "Super admins read all profiles" ON profiles FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users read profiles in tenant" ON profiles FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) OR id = auth.uid());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins insert profiles in tenant" ON profiles FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin'))));
CREATE POLICY "Admins update profiles in tenant" ON profiles FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin')))) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'admin'))));
CREATE POLICY "Super admins manage all profiles" ON profiles FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Customers policies
CREATE POLICY "Super admins view all customers" ON customers FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view customers in tenant" ON customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator'))));
CREATE POLICY "Admins insert customers in tenant" ON customers FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator')));
CREATE POLICY "Users update customers in tenant" ON customers FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND (agent_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator')))) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins delete customers in tenant" ON customers FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tasks policies
CREATE POLICY "Super admins view all tasks" ON tasks FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view tasks in tenant" ON tasks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator'))));
CREATE POLICY "Admins insert tasks in tenant" ON tasks FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator')));
CREATE POLICY "Users update tasks in tenant" ON tasks FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator')))) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins delete tasks in tenant" ON tasks FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator')));

-- Customer notes policies
CREATE POLICY "Super admins view all notes" ON customer_notes FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view notes in tenant" ON customer_notes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_notes.customer_id AND customers.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Users insert notes in tenant" ON customer_notes FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM customers WHERE customers.id = customer_notes.customer_id AND customers.tenant_id = get_user_tenant_id(auth.uid())));
CREATE POLICY "Users update own notes in tenant" ON customer_notes FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND user_id = auth.uid()) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Admins delete notes in tenant" ON customer_notes FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Activity logs policies
CREATE POLICY "Super admins view all activity" ON activity_logs FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view activity in tenant" ON activity_logs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "System insert activity in tenant" ON activity_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Customer documents policies
CREATE POLICY "Super admins view all documents" ON customer_documents FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view documents in tenant" ON customer_documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users insert documents in tenant" ON customer_documents FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users update documents in tenant" ON customer_documents FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins delete documents in tenant" ON customer_documents FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Custom statuses policies
CREATE POLICY "Super admins view all statuses" ON custom_statuses FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view statuses in tenant" ON custom_statuses FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage statuses in tenant" ON custom_statuses FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Task customers policies
CREATE POLICY "Super admins view all task customers" ON task_customers FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view task customers in tenant" ON task_customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Admins manage task customers in tenant" ON task_customers FOR ALL TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator'))) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'lead_generator')));

-- Customer workflow steps policies
CREATE POLICY "Super admins view all workflow steps" ON customer_workflow_steps FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users view workflow steps in tenant" ON customer_workflow_steps FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Users update workflow steps in tenant" ON customer_workflow_steps FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));