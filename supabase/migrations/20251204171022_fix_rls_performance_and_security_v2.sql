/*
  # Fix RLS Performance and Security Issues

  ## Overview
  This migration addresses critical performance and security issues identified in the database:
  
  1. **RLS Performance Optimization**: Replaces direct `auth.uid()` calls with `(select auth.uid())` 
     to prevent re-evaluation for each row, significantly improving query performance at scale.
  
  2. **Function Security Hardening**: Adds `SET search_path = ''` to all security-definer functions
     to prevent search path injection attacks.

  ## Changes

  ### 1. Fixed RLS Policies
  Updated policies for these tables:
  - `user_roles` (1 policy)
  - `customer_notes` (4 policies)
  - `task_notes` (4 policies)
  - `activity_logs` (2 policies)
  - `task_customers` (4 policies)

  ### 2. Fixed Security Definer Functions
  Added immutable search_path to:
  - `user_has_role()`
  - `user_has_any_role()`
  - `get_user_roles()`
  - `current_user_is_admin()`
  - `current_user_is_lead_generator()`
  - `is_admin()`
  - `log_note_activity()`
  - `set_task_customer_completed_at()`
  - `log_task_customer_status_change()`
  - `update_updated_at_column()`

  ## Security Impact
  - Prevents performance degradation on large datasets
  - Protects against search path injection vulnerabilities
  - Maintains existing access control logic
*/

-- ============================================================================
-- Part 1: Fix Helper Functions - Add SET search_path = ''
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_has_role.user_id 
    AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION user_has_any_role(user_id uuid, role_names text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_has_any_role.user_id 
    AND r.name = ANY(role_names)
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
  -- Get user's full name
  SELECT full_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Determine entity type and ID
  IF TG_TABLE_NAME = 'customer_notes' THEN
    entity_type_val := 'customer';
    entity_id_val := NEW.customer_id;
  ELSIF TG_TABLE_NAME = 'task_notes' THEN
    entity_type_val := 'task';
    entity_id_val := NEW.task_id;
  END IF;
  
  -- Insert activity log
  INSERT INTO public.activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
  VALUES (
    entity_type_val,
    entity_id_val,
    NEW.user_id,
    'note_added',
    user_name || ' added a ' || NEW.note_type || ' note',
    jsonb_build_object('note_id', NEW.id, 'note_type', NEW.note_type)
  );
  
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
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) OR TG_OP = 'INSERT' THEN
    -- Get relevant names
    SELECT full_name INTO user_name FROM public.profiles WHERE id = auth.uid();
    SELECT customers.customer_name INTO cust_name FROM public.customers WHERE customers.id = NEW.customer_id;
    SELECT title INTO task_title FROM public.tasks WHERE id = NEW.task_id;
    
    -- Insert activity log for the task
    INSERT INTO public.activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
    VALUES (
      'task',
      NEW.task_id,
      auth.uid(),
      'status_change',
      user_name || ' changed ' || cust_name || ' subtask status to ' || NEW.status,
      jsonb_build_object(
        'task_customer_id', NEW.id,
        'customer_id', NEW.customer_id,
        'customer_name', cust_name,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
    
    -- Also log to customer activity
    INSERT INTO public.activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
    VALUES (
      'customer',
      NEW.customer_id,
      auth.uid(),
      'status_change',
      user_name || ' changed task "' || task_title || '" status to ' || NEW.status,
      jsonb_build_object(
        'task_id', NEW.task_id,
        'task_customer_id', NEW.id,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- Part 2: Fix RLS Policies - Wrap auth.uid() with (select auth.uid())
-- ============================================================================

-- user_roles policies
DROP POLICY IF EXISTS "Users can view own role assignments" ON user_roles;
CREATE POLICY "Users can view own role assignments"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR public.current_user_is_admin());

-- customer_notes policies
DROP POLICY IF EXISTS "Users can view customer notes" ON customer_notes;
CREATE POLICY "Users can view customer notes"
  ON customer_notes FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    (
      NOT is_private
      AND
      (
        (public.current_user_is_lead_generator() AND EXISTS (
          SELECT 1 FROM public.customers 
          WHERE customers.id = customer_notes.customer_id 
          AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
        ))
        OR
        (public.user_has_role((select auth.uid()), 'employee') AND EXISTS (
          SELECT 1 FROM public.tasks 
          WHERE tasks.customer_id = customer_notes.customer_id 
          AND tasks.assigned_to = (select auth.uid())
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Users can create customer notes" ON customer_notes;
CREATE POLICY "Users can create customer notes"
  ON customer_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND
    (
      (public.current_user_is_lead_generator() AND EXISTS (
        SELECT 1 FROM public.customers 
        WHERE customers.id = customer_notes.customer_id 
        AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
      ))
      OR
      (public.user_has_role((select auth.uid()), 'employee') AND EXISTS (
        SELECT 1 FROM public.tasks 
        WHERE tasks.customer_id = customer_notes.customer_id 
        AND tasks.assigned_to = (select auth.uid())
      ))
      OR
      public.current_user_is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can update own customer notes" ON customer_notes;
CREATE POLICY "Users can update own customer notes"
  ON customer_notes FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours')
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR
    (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours')
  );

DROP POLICY IF EXISTS "Users can delete own customer notes" ON customer_notes;
CREATE POLICY "Users can delete own customer notes"
  ON customer_notes FOR DELETE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    user_id = (select auth.uid())
  );

-- task_notes policies
DROP POLICY IF EXISTS "Users can view task notes" ON task_notes;
CREATE POLICY "Users can view task notes"
  ON task_notes FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_notes.task_id 
      AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))
    )
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.tasks 
      JOIN public.customers ON tasks.customer_id = customers.id
      WHERE tasks.id = task_notes.task_id 
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  );

DROP POLICY IF EXISTS "Users can create task notes" ON task_notes;
CREATE POLICY "Users can create task notes"
  ON task_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND
    (
      public.current_user_is_admin()
      OR
      EXISTS (
        SELECT 1 FROM public.tasks 
        WHERE tasks.id = task_notes.task_id 
        AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))
      )
      OR
      (public.current_user_is_lead_generator() AND EXISTS (
        SELECT 1 FROM public.tasks 
        JOIN public.customers ON tasks.customer_id = customers.id
        WHERE tasks.id = task_notes.task_id 
        AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
      ))
    )
  );

DROP POLICY IF EXISTS "Users can update own task notes" ON task_notes;
CREATE POLICY "Users can update own task notes"
  ON task_notes FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours')
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR
    (user_id = (select auth.uid()) AND created_at > now() - interval '24 hours')
  );

DROP POLICY IF EXISTS "Users can delete own task notes" ON task_notes;
CREATE POLICY "Users can delete own task notes"
  ON task_notes FOR DELETE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    user_id = (select auth.uid())
  );

-- activity_logs policies
DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    (
      entity_type = 'customer'
      AND
      (
        (public.current_user_is_lead_generator() AND EXISTS (
          SELECT 1 FROM public.customers 
          WHERE customers.id = activity_logs.entity_id 
          AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
        ))
        OR
        (public.user_has_role((select auth.uid()), 'employee') AND EXISTS (
          SELECT 1 FROM public.tasks 
          WHERE tasks.customer_id = activity_logs.entity_id 
          AND tasks.assigned_to = (select auth.uid())
        ))
      )
    )
    OR
    (
      entity_type = 'task'
      AND
      (
        EXISTS (
          SELECT 1 FROM public.tasks 
          WHERE tasks.id = activity_logs.entity_id 
          AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))
        )
        OR
        (public.current_user_is_lead_generator() AND EXISTS (
          SELECT 1 FROM public.tasks 
          JOIN public.customers ON tasks.customer_id = customers.id
          WHERE tasks.id = activity_logs.entity_id 
          AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON activity_logs;
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- task_customers policies
DROP POLICY IF EXISTS "Users can view task customers" ON task_customers;
CREATE POLICY "Users can view task customers"
  ON task_customers FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))
    )
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.customers ON task_customers.customer_id = customers.id
      WHERE tasks.id = task_customers.task_id
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  );

DROP POLICY IF EXISTS "Users can add task customers" ON task_customers;
CREATE POLICY "Users can add task customers"
  ON task_customers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_by = (select auth.uid()) OR public.current_user_is_lead_generator())
    )
  );

DROP POLICY IF EXISTS "Users can update task customers" ON task_customers;
CREATE POLICY "Users can update task customers"
  ON task_customers FOR UPDATE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))
    )
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.customers ON task_customers.customer_id = customers.id
      WHERE tasks.id = task_customers.task_id
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_customers.task_id
      AND (tasks.assigned_to = (select auth.uid()) OR tasks.assigned_by = (select auth.uid()))
    )
    OR
    (public.current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.customers ON task_customers.customer_id = customers.id
      WHERE tasks.id = task_customers.task_id
      AND (customers.agent_id = (select auth.uid()) OR customers.lead_generated_by = (select auth.uid()))
    ))
  );

DROP POLICY IF EXISTS "Users can delete task customers" ON task_customers;
CREATE POLICY "Users can delete task customers"
  ON task_customers FOR DELETE
  TO authenticated
  USING (
    public.current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_customers.task_id
      AND tasks.assigned_by = (select auth.uid())
    )
  );