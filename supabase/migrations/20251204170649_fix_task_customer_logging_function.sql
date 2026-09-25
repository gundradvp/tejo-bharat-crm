/*
  # Fix Task Customer Logging Function

  ## Overview
  Fixes the ambiguous column reference error in the log_task_customer_status_change function
  by renaming the local variable to avoid conflict with the column name.

  ## Changes
  - Recreate the log_task_customer_status_change function with proper variable naming
  - Change `customer_name` variable to `cust_name` to avoid ambiguity with the customers.customer_name column
*/

-- Function to log task customer status changes (fixed version)
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
    SELECT full_name INTO user_name FROM profiles WHERE id = auth.uid();
    SELECT customers.customer_name INTO cust_name FROM customers WHERE customers.id = NEW.customer_id;
    SELECT title INTO task_title FROM tasks WHERE id = NEW.task_id;
    
    -- Insert activity log for the task
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
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
    INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;