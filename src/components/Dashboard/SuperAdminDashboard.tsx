import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { Building2, Users, UserCheck, Calendar, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TenantWithStats {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'inactive';
  business_name: string | null;
  created_at: string;
  license: {
    tier_name: string;
    max_users: number;
    max_customers: number;
    license_expiry_date: string | null;
  } | null;
  usage: {
    current_users: number;
    current_customers: number;
  } | null;
}

export default function SuperAdminDashboard() {
  const { isSuperAdmin } = useTenant();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
      return;
    }
    loadTenants();
  }, [isSuperAdmin, navigate]);

  const loadTenants = async () => {
    try {
      setLoading(true);

      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      const tenantsWithStats: TenantWithStats[] = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const { data: license } = await supabase
            .from('tenant_licenses')
            .select('tier_name, max_users, max_customers, license_expiry_date')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          const { data: usage } = await supabase
            .from('tenant_usage')
            .select('current_users, current_customers')
            .eq('tenant_id', tenant.id)
            .maybeSingle();

          return {
            ...tenant,
            license,
            usage,
          };
        })
      );

      setTenants(tenantsWithStats);

      const totalUsers = tenantsWithStats.reduce(
        (sum, t) => sum + (t.usage?.current_users || 0),
        0
      );
      const totalCustomers = tenantsWithStats.reduce(
        (sum, t) => sum + (t.usage?.current_customers || 0),
        0
      );

      setStats({
        totalTenants: tenantsWithStats.length,
        activeTenants: tenantsWithStats.filter((t) => t.status === 'active').length,
        totalUsers,
        totalCustomers,
      });
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isLicenseExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isLicenseExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === 0) return 0;
    return Math.min(100, (current / max) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage all tenants and their licenses</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/tenants/create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tenants</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalTenants}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Tenants</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeTenants}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCustomers}</p>
            </div>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Tenants</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading tenants...</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tenants found</div>
          ) : (
            tenants.map((tenant) => (
              <div key={tenant.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{tenant.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          tenant.status
                        )}`}
                      >
                        {tenant.status}
                      </span>
                      {tenant.license &&
                        isLicenseExpired(tenant.license.license_expiry_date) && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            License Expired
                          </span>
                        )}
                      {tenant.license &&
                        isLicenseExpiringSoon(tenant.license.license_expiry_date) && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Expiring Soon
                          </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-600">Slug: {tenant.slug}</p>
                    <p className="text-sm text-gray-600">
                      Business: {tenant.business_name || 'Not set'}
                    </p>

                    {tenant.license && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">
                              Users: {tenant.usage?.current_users || 0} / {tenant.license.max_users}
                            </span>
                            <span className="text-sm text-gray-600">
                              {getUsagePercentage(
                                tenant.usage?.current_users || 0,
                                tenant.license.max_users
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getUsageColor(
                                getUsagePercentage(
                                  tenant.usage?.current_users || 0,
                                  tenant.license.max_users
                                )
                              )}`}
                              style={{
                                width: `${getUsagePercentage(
                                  tenant.usage?.current_users || 0,
                                  tenant.license.max_users
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">
                              Customers: {tenant.usage?.current_customers || 0} /{' '}
                              {tenant.license.max_customers}
                            </span>
                            <span className="text-sm text-gray-600">
                              {getUsagePercentage(
                                tenant.usage?.current_customers || 0,
                                tenant.license.max_customers
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getUsageColor(
                                getUsagePercentage(
                                  tenant.usage?.current_customers || 0,
                                  tenant.license.max_customers
                                )
                              )}`}
                              style={{
                                width: `${getUsagePercentage(
                                  tenant.usage?.current_customers || 0,
                                  tenant.license.max_customers
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Tier: {tenant.license.tier_name} |{' '}
                            {tenant.license.license_expiry_date
                              ? `Expires: ${new Date(
                                  tenant.license.license_expiry_date
                                ).toLocaleDateString()}`
                              : 'No Expiry'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
