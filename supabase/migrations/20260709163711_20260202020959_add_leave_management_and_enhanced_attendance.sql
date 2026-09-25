-- Leave Applications Table
CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('casual', 'sick', 'vacation', 'unpaid', 'maternity', 'paternity', 'bereavement', 'compensatory')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  number_of_days numeric NOT NULL DEFAULT 1,
  is_half_day boolean DEFAULT false,
  reason text NOT NULL CHECK (char_length(reason) >= 10 AND char_length(reason) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  applied_date timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamp with time zone,
  reviewer_comments text,
  supporting_document_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_days CHECK (number_of_days > 0),
  CONSTRAINT tenant_id_not_null CHECK (tenant_id IS NOT NULL)
);

-- Daily Task Entries Table
CREATE TABLE IF NOT EXISTS daily_task_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  attendance_record_id uuid NOT NULL REFERENCES attendance_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_name text NOT NULL CHECK (char_length(task_name) >= 3 AND char_length(task_name) <= 200),
  task_description text,
  task_category text DEFAULT 'general' CHECK (task_category IN ('project_work', 'meeting', 'admin', 'travel', 'training', 'support', 'general')),
  estimated_hours numeric DEFAULT 0 CHECK (estimated_hours >= 0),
  actual_hours numeric DEFAULT 0 CHECK (actual_hours >= 0),
  completion_status text DEFAULT 'in_progress' CHECK (completion_status IN ('pending', 'in_progress', 'completed', 'blocked')),
  linked_task_id uuid REFERENCES tasks(id),
  linked_customer_id uuid REFERENCES customers(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenant_id_not_null CHECK (tenant_id IS NOT NULL)
);

-- Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type text NOT NULL CHECK (leave_type IN ('casual', 'sick', 'vacation', 'unpaid', 'maternity', 'paternity', 'bereavement', 'compensatory')),
  year integer NOT NULL,
  total_days numeric NOT NULL DEFAULT 0 CHECK (total_days >= 0),
  used_days numeric NOT NULL DEFAULT 0 CHECK (used_days >= 0),
  remaining_days numeric NOT NULL DEFAULT 0 CHECK (remaining_days >= 0),
  carried_forward_days numeric DEFAULT 0 CHECK (carried_forward_days >= 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, user_id, leave_type, year),
  CONSTRAINT tenant_id_not_null CHECK (tenant_id IS NOT NULL)
);

-- Attendance Validation Rules Table
CREATE TABLE IF NOT EXISTS attendance_validation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  late_threshold_minutes integer DEFAULT 15 CHECK (late_threshold_minutes >= 0),
  grace_period_minutes integer DEFAULT 5 CHECK (grace_period_minutes >= 0),
  min_work_hours numeric DEFAULT 8 CHECK (min_work_hours >= 0),
  max_work_hours numeric DEFAULT 12 CHECK (max_work_hours >= min_work_hours),
  standard_work_start_time time DEFAULT '09:00:00',
  standard_work_end_time time DEFAULT '18:00:00',
  geo_fence_enabled boolean DEFAULT false,
  geo_fence_locations jsonb DEFAULT '[]',
  geo_fence_radius_meters numeric DEFAULT 100 CHECK (geo_fence_radius_meters >= 0),
  is_active boolean DEFAULT true,
  applies_to_roles text[] DEFAULT ARRAY['employee'],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tenant_id_not_null CHECK (tenant_id IS NOT NULL)
);

-- Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  holiday_name text NOT NULL,
  holiday_date date NOT NULL,
  is_optional boolean DEFAULT false,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, holiday_date),
  CONSTRAINT tenant_id_not_null CHECK (tenant_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_tenant_id ON leave_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON leave_applications(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_daily_task_entries_attendance_record ON daily_task_entries(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_daily_task_entries_user_id ON daily_task_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_task_entries_tenant_id ON daily_task_entries(tenant_id);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_balances_tenant_id ON leave_balances(tenant_id);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_id ON holidays(tenant_id);

-- Enable RLS on all tables
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_task_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_applications
CREATE POLICY "Users can view own leave applications"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can view all leave applications in tenant"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create own leave applications"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own pending leave applications"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'pending'
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any leave application in tenant"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for daily_task_entries
CREATE POLICY "Users can view own task entries"
  ON daily_task_entries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can view all task entries in tenant"
  ON daily_task_entries FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create own task entries"
  ON daily_task_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own task entries"
  ON daily_task_entries FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policies for leave_balances
CREATE POLICY "Users can view own leave balances"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can view all leave balances in tenant"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage leave balances in tenant"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for attendance_validation_rules
CREATE POLICY "All authenticated users can view validation rules"
  ON attendance_validation_rules FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage validation rules in tenant"
  ON attendance_validation_rules FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for holidays
CREATE POLICY "All authenticated users can view holidays"
  ON holidays FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage holidays in tenant"
  ON holidays FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Function to automatically update leave balance when leave is approved
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO leave_balances (tenant_id, user_id, leave_type, year, total_days, used_days, remaining_days)
    VALUES (
      NEW.tenant_id,
      NEW.user_id,
      NEW.leave_type,
      EXTRACT(YEAR FROM NEW.start_date)::integer,
      0,
      NEW.number_of_days,
      -NEW.number_of_days
    )
    ON CONFLICT (tenant_id, user_id, leave_type, year)
    DO UPDATE SET
      used_days = leave_balances.used_days + NEW.number_of_days,
      remaining_days = leave_balances.remaining_days - NEW.number_of_days,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_applications;
CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_approval();

CREATE OR REPLACE FUNCTION calculate_working_days(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_include_half_day boolean DEFAULT false
)
RETURNS numeric AS $$
DECLARE
  v_working_days numeric := 0;
  v_current_date date;
  v_day_of_week integer;
  v_is_holiday boolean;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    SELECT EXISTS(
      SELECT 1 FROM holidays 
      WHERE tenant_id = p_tenant_id 
      AND holiday_date = v_current_date 
      AND is_optional = false
    ) INTO v_is_holiday;
    
    IF v_day_of_week NOT IN (0, 6) AND NOT v_is_holiday THEN
      v_working_days := v_working_days + 1;
    END IF;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  IF p_include_half_day AND v_working_days > 0 THEN
    v_working_days := v_working_days - 0.5;
  END IF;
  
  RETURN v_working_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
