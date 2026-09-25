import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isNagarjunaUser } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  status: 'active' | 'suspended' | 'inactive';
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
}

interface TenantLicense {
  id: string;
  tenant_id: string;
  tier_name: string;
  max_users: number;
  max_customers: number;
  license_start_date: string;
  license_expiry_date: string | null;
  features: Record<string, any>;
}

interface TenantUsage {
  id: string;
  tenant_id: string;
  current_users: number;
  current_customers: number;
  updated_at: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  currentTenant: Tenant | null;
  license: TenantLicense | null;
  usage: TenantUsage | null;
  isSuperAdmin: boolean;
  isLoading: boolean;
  refreshTenant: () => Promise<void>;
  canAddUser: () => boolean;
  canAddCustomer: () => boolean;
  isLicenseExpired: () => boolean;
  getUsersRemaining: () => number;
  getCustomersRemaining: () => number;
  getUsersPercentage: () => number;
  getCustomersPercentage: () => number;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const DEFAULT_TENANT: Tenant = {
  id: 'tenant-tejo-bharat',
  name: 'Tejo Bharat Global Energy',
  slug: 'tejobharat',
  logo_url: null,
  primary_color: '#0f766e',
  status: 'active',
  business_name: 'Tejo Bharat Global Energy LLP',
  business_address: 'N V Homes, Moosapet, Hyderabad, Telangana',
  business_phone: '+91 94797 97947',
  business_email: 'admin@tejobharat.com',
};

export const DEFAULT_LICENSE: TenantLicense = {
  id: 'lic-tejo-master',
  tenant_id: 'tenant-tejo-bharat',
  tier_name: 'Enterprise / Master License',
  max_users: 1000,
  max_customers: 100000,
  license_start_date: '2024-01-01',
  license_expiry_date: '2036-12-31',
  features: { all: true, whatsapp: true, jsp: true, solar: true },
};

export const DEFAULT_USAGE: TenantUsage = {
  id: 'usage-tejo-master',
  tenant_id: 'tenant-tejo-bharat',
  current_users: 2,
  current_customers: 45,
  updated_at: new Date().toISOString(),
};

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(DEFAULT_TENANT);
  const [license, setLicense] = useState<TenantLicense | null>(DEFAULT_LICENSE);
  const [usage, setUsage] = useState<TenantUsage | null>(DEFAULT_USAGE);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadTenantData = async () => {
    if (!user || !profile) {
      setTenant(DEFAULT_TENANT);
      setLicense(DEFAULT_LICENSE);
      setUsage(DEFAULT_USAGE);
      setIsSuperAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const isNagarjuna = isNagarjunaUser(profile);
      let isSuper = false;

      // Nagarjuna or non-admins are never super admins
      if (!isNagarjuna && profile.role === 'admin') {
        const { data: superAdminData } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        const isOwnerAdmin =
          profile.email === 'admin@tejobharat.com' ||
          profile.email === 'durga@tejobharat.com';

        isSuper = !!superAdminData || isOwnerAdmin;
      }

      setIsSuperAdmin(isSuper);

      const tenantId = profile.tenant_id || 'tenant-tejo-bharat';

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .maybeSingle();

      if (tenantError || !tenantData) {
        setTenant(DEFAULT_TENANT);
      } else {
        setTenant(tenantData);
      }

      const { data: licenseData, error: licenseError } = await supabase
        .from('tenant_licenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (licenseError || !licenseData) {
        setLicense(DEFAULT_LICENSE);
      } else {
        setLicense(licenseData);
      }

      const { data: usageData, error: usageError } = await supabase
        .from('tenant_usage')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (usageError || !usageData) {
        setUsage(DEFAULT_USAGE);
      } else {
        setUsage(usageData);
      }
    } catch (error) {
      console.error('Error loading tenant data, using default Tejo Bharat tenant:', error);
      setTenant(DEFAULT_TENANT);
      setLicense(DEFAULT_LICENSE);
      setUsage(DEFAULT_USAGE);
      setIsSuperAdmin(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, [user, profile]);

  const refreshTenant = async () => {
    await loadTenantData();
  };

  const isLicenseExpired = (): boolean => {
    if (!license) return true;
    if (!license.license_expiry_date) return false;
    return new Date(license.license_expiry_date) < new Date();
  };

  const canAddUser = (): boolean => {
    if (isSuperAdmin) return true;
    if (!license || !usage) return false;
    if (isLicenseExpired()) return false;
    return usage.current_users < license.max_users;
  };

  const canAddCustomer = (): boolean => {
    if (isSuperAdmin) return true;
    if (!license || !usage) return false;
    if (isLicenseExpired()) return false;
    return usage.current_customers < license.max_customers;
  };

  const getUsersRemaining = (): number => {
    if (!license || !usage) return 0;
    return Math.max(0, license.max_users - usage.current_users);
  };

  const getCustomersRemaining = (): number => {
    if (!license || !usage) return 0;
    return Math.max(0, license.max_customers - usage.current_customers);
  };

  const getUsersPercentage = (): number => {
    if (!license || !usage || license.max_users === 0) return 0;
    return Math.min(100, (usage.current_users / license.max_users) * 100);
  };

  const getCustomersPercentage = (): number => {
    if (!license || !usage || license.max_customers === 0) return 0;
    return Math.min(100, (usage.current_customers / license.max_customers) * 100);
  };

  const value: TenantContextType = {
    tenant,
    currentTenant: tenant,
    license,
    usage,
    isSuperAdmin,
    isLoading,
    refreshTenant,
    canAddUser,
    canAddCustomer,
    isLicenseExpired,
    getUsersRemaining,
    getCustomersRemaining,
    getUsersPercentage,
    getCustomersPercentage,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
