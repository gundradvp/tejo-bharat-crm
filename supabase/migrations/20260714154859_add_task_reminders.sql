/*
# Add Task Reminders Table

## Summary
Creates a `task_reminders` table for scheduling WhatsApp/notification reminders tied to tasks or customers.

## New Tables
- `task_reminders`
  - `id` (uuid, primary key)
  - `task_id` (uuid, nullable FK to tasks) — which task this reminder belongs to
  - `customer_id` (uuid, nullable FK to customers) — direct customer reminder (optional)
  - `tenant_id` (uuid, FK to tenants) — tenant isolation
  - `created_by` (uuid, FK to profiles) — who set the reminder
  - `remind_at` (timestamptz, not null) — when to fire the reminder
  - `phone` (text, not null) — recipient phone number (e.g. employee or customer)
  - `message` (text, not null) — message text to send
  - `status` (text, default 'pending') — pending / sent / failed / cancelled
  - `sent_at` (timestamptz) — when it was actually sent
  - `created_at` (timestamptz)

## Security
- RLS enabled with tenant-scoped authenticated policies.
*/

CREATE TABLE IF NOT EXISTS task_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  remind_at timestamptz NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_reminders_tenant ON task_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_status_remind ON task_reminders(status, remind_at);

ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_task_reminders" ON task_reminders;
CREATE POLICY "select_task_reminders" ON task_reminders FOR SELECT
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_task_reminders" ON task_reminders;
CREATE POLICY "insert_task_reminders" ON task_reminders FOR INSERT
  TO authenticated WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "update_task_reminders" ON task_reminders;
CREATE POLICY "update_task_reminders" ON task_reminders FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "delete_task_reminders" ON task_reminders;
CREATE POLICY "delete_task_reminders" ON task_reminders FOR DELETE
  TO authenticated USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));
