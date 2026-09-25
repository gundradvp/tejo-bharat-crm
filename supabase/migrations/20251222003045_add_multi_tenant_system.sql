/*
  # Multi-Tenant System with License Management

  ## Overview
  This migration creates a comprehensive multi-tenant system with license-based user and customer limits.
  The system supports super admins who can manage multiple tenants, each with their own isolated data,
  branding, and license restrictions.

  ## 1. New Tables

  ### tenants
  Stores organization/tenant information with branding and business details

  ### tenant_licenses
  Tracks license limits and subscription details per tenant

  ### tenant_usage
  Tracks current resource usage per tenant (automatically updated via triggers)

  ### super_admins
  Tracks platform super administrators who can manage all tenants

  ### tenant_invitations
  Manages invitation codes for new users to join specific tenants

  ## 2. Security
  - Enable RLS on all new tables
  - Super admins can view and manage all tenants
  - Tenant admins can only view/edit their own tenant
  - Regular users can only view their tenant (read-only)

  ## 3. Helper Functions
  - is_super_admin - Checks if user is a super admin
  - get_user_tenant_id - Gets tenant_id for a user
  - check_license_limit - Validates if tenant can add more resources
  - update_tenant_usage - Trigger function to automatically update usage counts
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#3B82F6',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  business_name text,
  business_address text,
  business_phone text,
  business_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tenant_licenses table
CREATE TABLE IF NOT EXISTS tenant_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tier_name text NOT NULL DEFAULT 'Basic',
  max_users integer NOT NULL DEFAULT 10,
  max_customers integer NOT NULL DEFAULT 100,
  license_start_date date NOT NULL DEFAULT CURRENT_DATE,
  license_expiry_date date,
  features jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create tenant_usage table
CREATE TABLE IF NOT EXISTS tenant_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  current_users integer NOT NULL DEFAULT 0,
  current_customers integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create tenant_invitations table
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  invitation_code uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_licenses_tenant_id ON tenant_licenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_id ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_code ON tenant_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email ON tenant_invitations(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id ON tenant_invitations(tenant_id);

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_uuid uuid)
RETURNS uuid AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM profiles
  WHERE id = user_uuid;
  
  RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check license limits
CREATE OR REPLACE FUNCTION check_license_limit(tenant_uuid uuid, resource_type text)
RETURNS boolean AS $$
DECLARE
  current_count integer;
  max_count integer;
  license_expired boolean;
BEGIN
  -- Check if license is expired
  SELECT 
    CASE 
      WHEN license_expiry_date IS NULL THEN false
      WHEN license_expiry_date < CURRENT_DATE THEN true
      ELSE false
    END INTO license_expired
  FROM tenant_licenses
  WHERE tenant_id = tenant_uuid;
  
  IF license_expired THEN
    RETURN false;
  END IF;
  
  -- Check resource limits
  IF resource_type = 'users' THEN
    SELECT current_users, tl.max_users INTO current_count, max_count
    FROM tenant_usage tu
    JOIN tenant_licenses tl ON tu.tenant_id = tl.tenant_id
    WHERE tu.tenant_id = tenant_uuid;
    
    RETURN current_count < max_count;
  ELSIF resource_type = 'customers' THEN
    SELECT current_customers, tl.max_customers INTO current_count, max_count
    FROM tenant_usage tu
    JOIN tenant_licenses tl ON tu.tenant_id = tl.tenant_id
    WHERE tu.tenant_id = tenant_uuid;
    
    RETURN current_count < max_count;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to update tenant usage counts
CREATE OR REPLACE FUNCTION update_tenant_usage_count()
RETURNS trigger AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  -- Determine tenant_id based on the table
  IF TG_TABLE_NAME = 'profiles' THEN
    tenant_uuid := COALESCE(NEW.tenant_id, OLD.tenant_id);
  ELSIF TG_TABLE_NAME = 'customers' THEN
    tenant_uuid := COALESCE(NEW.tenant_id, OLD.tenant_id);
  END IF;
  
  IF tenant_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Ensure tenant_usage record exists
  INSERT INTO tenant_usage (tenant_id, current_users, current_customers)
  VALUES (tenant_uuid, 0, 0)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Update counts
  IF TG_TABLE_NAME = 'profiles' THEN
    UPDATE tenant_usage
    SET 
      current_users = (
        SELECT COUNT(*) FROM profiles WHERE tenant_id = tenant_uuid
      ),
      updated_at = now()
    WHERE tenant_id = tenant_uuid;
  ELSIF TG_TABLE_NAME = 'customers' THEN
    UPDATE tenant_usage
    SET 
      current_customers = (
        SELECT COUNT(*) FROM customers WHERE tenant_id = tenant_uuid
      ),
      updated_at = now()
    WHERE tenant_id = tenant_uuid;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
CREATE POLICY "Super admins can view all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can update their own tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for tenant_licenses table
CREATE POLICY "Super admins can manage all licenses"
  ON tenant_licenses FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their tenant license"
  ON tenant_licenses FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS Policies for tenant_usage table
CREATE POLICY "Super admins can view all usage"
  ON tenant_usage FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their tenant usage"
  ON tenant_usage FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "System can update usage"
  ON tenant_usage FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for super_admins table
CREATE POLICY "Super admins can view all super admins"
  ON super_admins FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage super admins"
  ON super_admins FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for tenant_invitations table
CREATE POLICY "Super admins can manage all invitations"
  ON tenant_invitations FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can view their tenant invitations"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Tenant admins can create invitations"
  ON tenant_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid()) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can view invitation by code"
  ON tenant_invitations FOR SELECT
  TO authenticated
  USING (invitation_code IS NOT NULL);

-- Create updated_at trigger for tenants
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_licenses_updated_at
  BEFORE UPDATE ON tenant_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();