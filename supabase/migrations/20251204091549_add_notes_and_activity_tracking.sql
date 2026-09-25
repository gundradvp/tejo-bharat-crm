/*
  # Add Notes and Activity Tracking System

  ## Overview
  This migration adds a comprehensive notes and activity tracking system for customers and tasks.

  ## New Tables
  
  ### 1. customer_notes
  Stores notes attached to customers with categorization and metadata
  - `id` (uuid, primary key) - Unique note identifier
  - `customer_id` (uuid, foreign key) - References customers table
  - `user_id` (uuid, foreign key) - User who created the note
  - `note_text` (text) - The actual note content
  - `note_type` (text) - Type of note (general, follow_up, phone_call, meeting, email, issue, resolution, document)
  - `is_pinned` (boolean) - Whether note is pinned to top
  - `is_private` (boolean) - Whether note is private (admin only)
  - `metadata` (jsonb) - Additional metadata (edit history, attachments, etc.)
  - `created_at` (timestamptz) - When note was created
  - `updated_at` (timestamptz) - When note was last updated

  ### 2. task_notes
  Stores notes attached to tasks
  - `id` (uuid, primary key) - Unique note identifier
  - `task_id` (uuid, foreign key) - References tasks table
  - `user_id` (uuid, foreign key) - User who created the note
  - `note_text` (text) - The actual note content
  - `note_type` (text) - Type of note
  - `metadata` (jsonb) - Additional metadata
  - `created_at` (timestamptz) - When note was created
  - `updated_at` (timestamptz) - When note was last updated

  ### 3. activity_logs
  Stores activity timeline for customers and tasks
  - `id` (uuid, primary key) - Unique activity identifier
  - `entity_type` (text) - Type of entity (customer, task)
  - `entity_id` (uuid) - ID of the entity
  - `user_id` (uuid, foreign key) - User who performed the action
  - `activity_type` (text) - Type of activity (note_added, status_change, task_assigned, etc.)
  - `description` (text) - Human-readable description
  - `metadata` (jsonb) - Additional activity data
  - `created_at` (timestamptz) - When activity occurred

  ## Security
  - Enable RLS on all new tables
  - customer_notes: Users can view non-private notes for customers they have access to
  - customer_notes: Only admins can view private notes
  - customer_notes: Users can create notes for customers they have access to
  - customer_notes: Users can update their own notes within 24 hours, admins can update any
  - customer_notes: Users can delete their own notes, admins can delete any
  - task_notes: Users can view notes for tasks they have access to
  - task_notes: Users can create notes for tasks they can view
  - task_notes: Users can update their own notes within 24 hours
  - task_notes: Users can delete their own notes
  - activity_logs: Users can view activities for entities they have access to
  - activity_logs: Only system can insert activity logs

  ## Indexes
  - customer_notes: customer_id, user_id, created_at, note_type, is_pinned
  - task_notes: task_id, user_id, created_at
  - activity_logs: entity_type + entity_id, user_id, created_at

  ## Important Notes
  - Cascading deletes ensure orphaned notes are cleaned up
  - updated_at is automatically updated via trigger
  - Activity logs are automatically created for certain actions
*/

-- Create customer_notes table
CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_text text NOT NULL CHECK (char_length(note_text) >= 5 AND char_length(note_text) <= 2000),
  note_type text NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'follow_up', 'phone_call', 'meeting', 'email', 'issue', 'resolution', 'document')),
  is_pinned boolean DEFAULT false,
  is_private boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_notes table
CREATE TABLE IF NOT EXISTS task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_text text NOT NULL CHECK (char_length(note_text) >= 5 AND char_length(note_text) <= 2000),
  note_type text NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'follow_up', 'phone_call', 'meeting', 'email', 'issue', 'resolution', 'document')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('customer', 'task')),
  entity_id uuid NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('note_added', 'status_change', 'task_assigned', 'task_completed', 'document_uploaded', 'payment_received', 'customer_created', 'customer_updated')),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_user_id ON customer_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notes_note_type ON customer_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_customer_notes_is_pinned ON customer_notes(is_pinned) WHERE is_pinned = true;

CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_user_id ON task_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_created_at ON task_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Create function to automatically update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_customer_notes_updated_at ON customer_notes;
CREATE TRIGGER update_customer_notes_updated_at
  BEFORE UPDATE ON customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_notes_updated_at ON task_notes;
CREATE TRIGGER update_task_notes_updated_at
  BEFORE UPDATE ON task_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_notes

-- SELECT: Users can view non-private notes for customers they have access to
CREATE POLICY "Users can view customer notes"
  ON customer_notes FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all notes including private ones
    current_user_is_admin()
    OR
    -- Non-admins can see non-private notes for customers they have access to
    (
      NOT is_private
      AND
      (
        -- Lead generators can see notes for their own customers
        (current_user_is_lead_generator() AND EXISTS (
          SELECT 1 FROM customers 
          WHERE customers.id = customer_notes.customer_id 
          AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
        ))
        OR
        -- Employees can see notes for customers with tasks assigned to them
        (user_has_role(auth.uid(), 'employee') AND EXISTS (
          SELECT 1 FROM tasks 
          WHERE tasks.customer_id = customer_notes.customer_id 
          AND tasks.assigned_to = auth.uid()
        ))
      )
    )
  );

-- INSERT: Users can create notes for customers they have access to
CREATE POLICY "Users can create customer notes"
  ON customer_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    (
      -- Lead generators can create notes for their customers
      (current_user_is_lead_generator() AND EXISTS (
        SELECT 1 FROM customers 
        WHERE customers.id = customer_notes.customer_id 
        AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
      ))
      OR
      -- Employees can create notes for customers with assigned tasks
      (user_has_role(auth.uid(), 'employee') AND EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.customer_id = customer_notes.customer_id 
        AND tasks.assigned_to = auth.uid()
      ))
      OR
      -- Admins can create notes for any customer
      current_user_is_admin()
    )
  );

-- UPDATE: Users can update their own notes within 24 hours, admins can update any
CREATE POLICY "Users can update own customer notes"
  ON customer_notes FOR UPDATE
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    (user_id = auth.uid() AND created_at > now() - interval '24 hours')
  )
  WITH CHECK (
    current_user_is_admin()
    OR
    (user_id = auth.uid() AND created_at > now() - interval '24 hours')
  );

-- DELETE: Users can delete their own notes, admins can delete any
CREATE POLICY "Users can delete own customer notes"
  ON customer_notes FOR DELETE
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    user_id = auth.uid()
  );

-- RLS Policies for task_notes

-- SELECT: Users can view notes for tasks they have access to
CREATE POLICY "Users can view task notes"
  ON task_notes FOR SELECT
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_notes.task_id 
      AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
    )
    OR
    -- Lead generators can view notes for tasks related to their customers
    (current_user_is_lead_generator() AND EXISTS (
      SELECT 1 FROM tasks 
      JOIN customers ON tasks.customer_id = customers.id
      WHERE tasks.id = task_notes.task_id 
      AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
    ))
  );

-- INSERT: Users can create notes for tasks they can view
CREATE POLICY "Users can create task notes"
  ON task_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    (
      current_user_is_admin()
      OR
      EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = task_notes.task_id 
        AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
      )
      OR
      (current_user_is_lead_generator() AND EXISTS (
        SELECT 1 FROM tasks 
        JOIN customers ON tasks.customer_id = customers.id
        WHERE tasks.id = task_notes.task_id 
        AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
      ))
    )
  );

-- UPDATE: Users can update their own notes within 24 hours
CREATE POLICY "Users can update own task notes"
  ON task_notes FOR UPDATE
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    (user_id = auth.uid() AND created_at > now() - interval '24 hours')
  )
  WITH CHECK (
    current_user_is_admin()
    OR
    (user_id = auth.uid() AND created_at > now() - interval '24 hours')
  );

-- DELETE: Users can delete their own notes
CREATE POLICY "Users can delete own task notes"
  ON task_notes FOR DELETE
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    user_id = auth.uid()
  );

-- RLS Policies for activity_logs

-- SELECT: Users can view activities for entities they have access to
CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    current_user_is_admin()
    OR
    (
      entity_type = 'customer'
      AND
      (
        (current_user_is_lead_generator() AND EXISTS (
          SELECT 1 FROM customers 
          WHERE customers.id = activity_logs.entity_id 
          AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
        ))
        OR
        (user_has_role(auth.uid(), 'employee') AND EXISTS (
          SELECT 1 FROM tasks 
          WHERE tasks.customer_id = activity_logs.entity_id 
          AND tasks.assigned_to = auth.uid()
        ))
      )
    )
    OR
    (
      entity_type = 'task'
      AND
      (
        EXISTS (
          SELECT 1 FROM tasks 
          WHERE tasks.id = activity_logs.entity_id 
          AND (tasks.assigned_to = auth.uid() OR tasks.assigned_by = auth.uid())
        )
        OR
        (current_user_is_lead_generator() AND EXISTS (
          SELECT 1 FROM tasks 
          JOIN customers ON tasks.customer_id = customers.id
          WHERE tasks.id = activity_logs.entity_id 
          AND (customers.agent_id = auth.uid() OR customers.lead_generated_by = auth.uid())
        ))
      )
    )
  );

-- INSERT: Only allow inserts from authenticated users (application logic)
CREATE POLICY "Authenticated users can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to create activity log when note is added
CREATE OR REPLACE FUNCTION log_note_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  entity_type_val text;
  entity_id_val uuid;
BEGIN
  -- Get user's full name
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;
  
  -- Determine entity type and ID
  IF TG_TABLE_NAME = 'customer_notes' THEN
    entity_type_val := 'customer';
    entity_id_val := NEW.customer_id;
  ELSIF TG_TABLE_NAME = 'task_notes' THEN
    entity_type_val := 'task';
    entity_id_val := NEW.task_id;
  END IF;
  
  -- Insert activity log
  INSERT INTO activity_logs (entity_type, entity_id, user_id, activity_type, description, metadata)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to log note additions
DROP TRIGGER IF EXISTS log_customer_note_activity ON customer_notes;
CREATE TRIGGER log_customer_note_activity
  AFTER INSERT ON customer_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_note_activity();

DROP TRIGGER IF EXISTS log_task_note_activity ON task_notes;
CREATE TRIGGER log_task_note_activity
  AFTER INSERT ON task_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_note_activity();