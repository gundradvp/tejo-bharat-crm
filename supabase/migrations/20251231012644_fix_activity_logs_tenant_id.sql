/*
  # Fix Activity Logs Tenant ID

  ## Overview
  This migration fixes the log_note_activity function to include tenant_id when creating activity logs.

  ## Changes
  1. Update log_note_activity function to retrieve and insert tenant_id
  2. Ensures all activity logs have proper tenant isolation
*/

-- Drop and recreate the function with tenant_id support
CREATE OR REPLACE FUNCTION log_note_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  entity_type_val text;
  entity_id_val uuid;
  user_tenant_id uuid;
BEGIN
  -- Get user's full name and tenant_id
  SELECT full_name, tenant_id INTO user_name, user_tenant_id
  FROM profiles
  WHERE id = NEW.user_id;

  -- Determine entity type and ID
  IF TG_TABLE_NAME = 'customer_notes' THEN
    entity_type_val := 'customer';
    entity_id_val := NEW.customer_id;
  ELSIF TG_TABLE_NAME = 'task_notes' THEN
    entity_type_val := 'task';
    entity_id_val := NEW.task_id;
  END IF;

  -- Insert activity log with tenant_id
  INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata, tenant_id)
  VALUES (
    entity_type_val,
    entity_id_val,
    NEW.user_id,
    'note_added',
    user_name || ' added a ' || NEW.note_type || ' note',
    jsonb_build_object('note_id', NEW.id, 'note_type', NEW.note_type),
    user_tenant_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
