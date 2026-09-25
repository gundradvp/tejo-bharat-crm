/*
  # Attendance and Task Time Tracking System

  ## Overview
  This migration adds comprehensive attendance tracking and task time logging capabilities to the system.

  ## New Tables

  ### 1. `attendance_records`
  Daily employee attendance tracking with check-in/check-out
  - `id` (uuid, primary key) - Unique attendance record identifier
  - `user_id` (uuid, FK to profiles) - Employee who checked in
  - `tenant_id` (uuid, FK to tenants) - Tenant isolation
  - `check_in_time` (timestamptz) - When user checked in
  - `check_out_time` (timestamptz, nullable) - When user checked out
  - `check_in_location` (jsonb, nullable) - GPS coordinates on check-in
  - `check_out_location` (jsonb, nullable) - GPS coordinates on check-out
  - `status` (text) - present, absent, late, half_day, on_leave
  - `notes` (text, nullable) - Additional notes
  - `total_hours` (numeric, nullable) - Calculated work hours
  - `date` (date) - Attendance date for easy querying
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last modification time

  ### 2. `task_time_logs`
  Time tracking entries for tasks
  - `id` (uuid, primary key) - Unique time log identifier
  - `task_id` (uuid, FK to tasks) - Associated task
  - `user_id` (uuid, FK to profiles) - User who logged time
  - `tenant_id` (uuid, FK to tenants) - Tenant isolation
  - `start_time` (timestamptz) - When timer started
  - `end_time` (timestamptz, nullable) - When timer stopped
  - `duration_minutes` (numeric, nullable) - Calculated duration in minutes
  - `notes` (text, nullable) - What was done during this time
  - `is_active` (boolean) - Whether timer is currently running
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last modification time

  ## Modified Tables

  ### `tasks`
  - Added `started_at` (timestamptz, nullable) - When task work actually began
  - Added `estimated_duration_minutes` (integer, nullable) - Estimated time to complete

  ## Security
  - RLS enabled on all new tables
  - Users can view and manage their own attendance records
  - Users can view and manage time logs for tasks assigned to them
  - Admins can view all attendance and time tracking data
  - All tables enforce tenant isolation

  ## Indexes
  - Performance indexes on user_id, date, task_id for fast queries
  - Composite indexes for common filter combinations

  ## Important Notes
  1. Attendance records are unique per user per date
  2. Only one active time log allowed per user at a time
  3. Total hours calculated automatically on check-out
  4. Duration calculated automatically when timer stops
  5. Tenant isolation enforced on all tables
*/

-- Add new columns to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'estimated_duration_minutes'
  ) THEN
    ALTER TABLE tasks ADD COLUMN estimated_duration_minutes integer;
  END IF;
END $$;

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  check_in_time timestamptz NOT NULL DEFAULT now(),
  check_out_time timestamptz,
  check_in_location jsonb,
  check_out_location jsonb,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  notes text DEFAULT '',
  total_hours numeric(5, 2),
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, tenant_id)
);

-- Create task_time_logs table
CREATE TABLE IF NOT EXISTS task_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes numeric(10, 2),
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant_id ON attendance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_tenant_id ON task_time_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_is_active ON task_time_logs(is_active);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_start_time ON task_time_logs(start_time DESC);

-- Create function to calculate total hours on check-out
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL AND NEW.check_in_time IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate duration when timer stops
CREATE OR REPLACE FUNCTION calculate_time_log_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to ensure only one active timer per user
CREATE OR REPLACE FUNCTION check_active_timer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Stop any other active timers for this user
    UPDATE task_time_logs
    SET is_active = false,
        end_time = now(),
        updated_at = now()
    WHERE user_id = NEW.user_id
      AND is_active = true
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER calculate_attendance_hours_trigger
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION calculate_attendance_hours();

CREATE TRIGGER calculate_time_log_duration_trigger
  BEFORE INSERT OR UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_log_duration();

CREATE TRIGGER check_active_timer_trigger
  BEFORE INSERT OR UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_active_timer();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_time_logs_updated_at
  BEFORE UPDATE ON task_time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_records

-- Users can view their own attendance records
CREATE POLICY "Users can view own attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can view all attendance records in their tenant
CREATE POLICY "Admins can view all attendance"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Users can insert their own attendance records
CREATE POLICY "Users can insert own attendance"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Users can update their own attendance records
CREATE POLICY "Users can update own attendance"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can update all attendance records in their tenant
CREATE POLICY "Admins can update all attendance"
  ON attendance_records FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- RLS Policies for task_time_logs

-- Users can view time logs for their assigned tasks
CREATE POLICY "Users can view own task time logs"
  ON task_time_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can view all time logs in their tenant
CREATE POLICY "Admins can view all time logs"
  ON task_time_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Users can insert time logs for their assigned tasks
CREATE POLICY "Users can insert own time logs"
  ON task_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id
      AND tasks.assigned_to = auth.uid()
    )
  );

-- Users can update their own time logs
CREATE POLICY "Users can update own time logs"
  ON task_time_logs FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can update all time logs in their tenant
CREATE POLICY "Admins can update all time logs"
  ON task_time_logs FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Users can delete their own time logs
CREATE POLICY "Users can delete own time logs"
  ON task_time_logs FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can delete all time logs in their tenant
CREATE POLICY "Admins can delete all time logs"
  ON task_time_logs FOR DELETE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );