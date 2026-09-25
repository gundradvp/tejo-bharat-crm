CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name text,
  company_address text,
  company_phone text,
  company_email text,
  company_website text,
  tax_number text,
  bank_name text,
  bank_account_number text,
  bank_ifsc_code text,
  bank_branch text,
  quotation_prefix text DEFAULT 'QUO',
  quotation_footer text,
  terms_and_conditions text,
  header_background_color text DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  company_logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant company settings"
  ON company_settings FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their tenant company settings"
  ON company_settings FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_company_settings_tenant_id ON company_settings(tenant_id);
