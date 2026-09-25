/*
  # Fix Task Customer Activity Log Tenant ID

  ## Overview
  This migration fixes the log_task_customer_status_change function to include tenant_id 
  when creating activity logs. This was causing "tenant_id cannot be null" errors.

  ## Changes
  1. Update log_task_customer_status_change function to retrieve and include tenant_id
  2. Ensures all activity logs from task_customer changes have proper tenant isolation

  ## Issue
  The trigger was inserting activity_logs without tenant_id, which violates the NOT NULL constraint.
*/

-- Drop and recreate the function with tenant_id support
CREATE OR REPLACE FUNCTION log_task_customer_status_change()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  customer_name text;
  task_title text;
  user_tenant_id uuid;
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) OR TG_OP = 'INSERT' THEN
    -- Get relevant names and tenant_id
    SELECT full_name, tenant_id INTO user_name, user_tenant_id 
    FROM profiles 
    WHERE id = auth.uid();
    
    SELECT customer_name INTO customer_name 
    FROM customers 
    WHERE id = NEW.customer_id;
    
    SELECT title INTO task_title 
    FROM tasks 
    WHERE id = NEW.task_id;
    
    -- Insert activity log for the task with tenant_id
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata, tenant_id)
    VALUES (
      'task',
      NEW.task_id,
      auth.uid(),
      'status_change',
      user_name || ' changed ' || customer_name || ' subtask status to ' || NEW.status,
      jsonb_build_object(
        'task_customer_id', NEW.id,
        'customer_id', NEW.customer_id,
        'customer_name', customer_name,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      ),
      user_tenant_id
    );
    
    -- Also log to customer activity with tenant_id
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata, tenant_id)
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
      ),
      user_tenant_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_task_customer_status_change() IS 
  'Logs task customer status changes to activity_logs table with proper tenant isolation';