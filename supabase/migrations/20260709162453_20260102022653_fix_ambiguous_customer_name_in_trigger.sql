CREATE OR REPLACE FUNCTION log_task_customer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  v_customer_name text;
  task_title text;
  user_tenant_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) OR TG_OP = 'INSERT' THEN
    SELECT p.full_name, p.tenant_id INTO user_name, user_tenant_id FROM profiles p WHERE p.id = auth.uid();
    SELECT c.customer_name INTO v_customer_name FROM customers c WHERE c.id = NEW.customer_id;
    SELECT t.title INTO task_title FROM tasks t WHERE t.id = NEW.task_id;
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata, tenant_id)
    VALUES ('task', NEW.task_id, auth.uid(), 'status_change', user_name || ' changed ' || v_customer_name || ' subtask status to ' || NEW.status, jsonb_build_object('task_customer_id', NEW.id, 'customer_id', NEW.customer_id, 'customer_name', v_customer_name, 'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, 'new_status', NEW.status), user_tenant_id);
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata, tenant_id)
    VALUES ('customer', NEW.customer_id, auth.uid(), 'status_change', user_name || ' changed task "' || task_title || '" status to ' || NEW.status, jsonb_build_object('task_id', NEW.task_id, 'task_customer_id', NEW.id, 'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, 'new_status', NEW.status), user_tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;