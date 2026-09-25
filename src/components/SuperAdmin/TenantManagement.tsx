import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { ArrowLeft, Save, Trash2, AlertCircle, Eye, EyeOff, RefreshCw, UserPlus, Shield } from 'lucide-react';

interface TenantData {
  id?: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'inactive';
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  primary_color: string;
  logo_url: string;
}

interface LicenseData {
  tier_name: string;
  max_users: number;
  max_customers: number;
  license_start_date: string;
  license_expiry_date: string;
}

export default function TenantManagement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useTenant();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [tenantData, setTenantData] = useState<TenantData>({
    name: '',
    slug: '',
    status: 'active',
    business_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    primary_color: '#3B82F6',
    logo_url: '',
  });

  const [licenseData, setLicenseData] = useState<LicenseData>({
    tier_name: 'Basic',
    max_users: 10,
    max_customers: 100,
    license_start_date: new Date().toISOString().split('T')[0],
    license_expiry_date: '',
  });

  const [initialAdminEmail, setInitialAdminEmail] = useState('');
  const [initialAdminPassword, setInitialAdminPassword] = useState('');
  const [initialAdminName, setInitialAdminName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [createdTenantInfo, setCreatedTenantInfo] = useState<{
    tenantName: string;
    adminEmail: string;
    adminPassword: string;
    adminName: string;
  } | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: 'TejoBharat@2024',
    full_name: '',
    phone: '',
    roles: [] as ('admin' | 'lead_generator' | 'employee')[],
  });
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/');
      return;
    }

    if (id) {
      loadTenant();
    }
  }, [id, isSuperAdmin, navigate]);

  const loadTenant = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', id)
        .single();

      if (tenantError) throw tenantError;

      setTenantData({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        business_name: tenant.business_name || '',
        business_address: tenant.business_address || '',
        business_phone: tenant.business_phone || '',
        business_email: tenant.business_email || '',
        primary_color: tenant.primary_color || '#3B82F6',
        logo_url: tenant.logo_url || '',
      });

      const { data: license, error: licenseError } = await supabase
        .from('tenant_licenses')
        .select('*')
        .eq('tenant_id', id)
        .single();

      if (licenseError) throw licenseError;

      setLicenseData({
        tier_name: license.tier_name,
        max_users: license.max_users,
        max_customers: license.max_customers,
        license_start_date: license.license_start_date,
        license_expiry_date: license.license_expiry_date || '',
      });

      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('tenant_id', id)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setTenantUsers(users || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!tenantData.name || !tenantData.slug) {
      setError('Name and slug are required');
      return;
    }

    if (!id && (!initialAdminEmail || !initialAdminPassword || !initialAdminName)) {
      setError('Admin details are required for new tenants');
      return;
    }

    try {
      setSaving(true);

      if (id) {
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({
            name: tenantData.name,
            slug: tenantData.slug,
            status: tenantData.status,
            business_name: tenantData.business_name,
            business_address: tenantData.business_address,
            business_phone: tenantData.business_phone,
            business_email: tenantData.business_email,
            primary_color: tenantData.primary_color,
            logo_url: tenantData.logo_url,
          })
          .eq('id', id);

        if (tenantError) throw tenantError;

        const { error: licenseError } = await supabase
          .from('tenant_licenses')
          .update({
            tier_name: licenseData.tier_name,
            max_users: licenseData.max_users,
            max_customers: licenseData.max_customers,
            license_start_date: licenseData.license_start_date,
            license_expiry_date: licenseData.license_expiry_date || null,
          })
          .eq('tenant_id', id);

        if (licenseError) throw licenseError;

        setSuccess('Tenant updated successfully');
      } else {
        const { data: newTenant, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: tenantData.name,
            slug: tenantData.slug,
            status: tenantData.status,
            business_name: tenantData.business_name,
            business_address: tenantData.business_address,
            business_phone: tenantData.business_phone,
            business_email: tenantData.business_email,
            primary_color: tenantData.primary_color,
            logo_url: tenantData.logo_url,
          })
          .select()
          .single();

        if (tenantError) throw tenantError;

        const { error: licenseError } = await supabase.from('tenant_licenses').insert({
          tenant_id: newTenant.id,
          tier_name: licenseData.tier_name,
          max_users: licenseData.max_users,
          max_customers: licenseData.max_customers,
          license_start_date: licenseData.license_start_date,
          license_expiry_date: licenseData.license_expiry_date || null,
        });

        if (licenseError) throw licenseError;

        const { error: usageError } = await supabase.from('tenant_usage').insert({
          tenant_id: newTenant.id,
          current_users: 0,
          current_customers: 0,
        });

        if (usageError) throw usageError;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: initialAdminEmail,
              password: initialAdminPassword,
              full_name: initialAdminName,
              roles: ['admin'],
              tenantId: newTenant.id,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create admin user');
        }

        setCreatedTenantInfo({
          tenantName: tenantData.name,
          adminEmail: initialAdminEmail,
          adminPassword: initialAdminPassword,
          adminName: initialAdminName,
        });
        setSuccess('Tenant created successfully! Please save the admin credentials below.');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const length = 12;
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInitialAdminPassword(password);
    setGeneratedPassword(password);
    setShowPassword(true);
  };

  const resetUserPassword = async (userId: string, userName: string) => {
    const defaultPassword = 'TejoBharat@2024';

    if (!confirm(`Reset password for ${userName} to default password: ${defaultPassword}?`)) {
      return;
    }

    try {
      setResettingUserId(userId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            new_password: defaultPassword,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      alert(`Password reset successfully for ${userName}!\n\nNew password: ${defaultPassword}\n\nPlease save this password and provide it to the user.`);
    } catch (error: any) {
      setError(error.message);
      alert('Failed to reset password: ' + error.message);
    } finally {
      setResettingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newUserData.roles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    if (!id) {
      setError('No tenant selected');
      return;
    }

    setCreatingUser(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newUserData.email,
            password: newUserData.password,
            full_name: newUserData.full_name,
            phone: newUserData.phone,
            roles: newUserData.roles,
            tenantId: id,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      alert('User created successfully!');
      setShowAddUserForm(false);
      setNewUserData({
        email: '',
        password: 'TejoBharat@2024',
        full_name: '',
        phone: '',
        roles: [],
      });
      loadTenant();
    } catch (error: any) {
      setError(error.message);
      alert('Failed to create user: ' + error.message);
    } finally {
      setCreatingUser(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/super-admin')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Edit Tenant' : 'Create New Tenant'}
        </h1>
      </div>

      {createdTenantInfo && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 shadow-lg">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-2">
                Tenant Created Successfully!
              </h3>
              <p className="text-sm text-green-800 mb-4">
                Save these admin credentials securely. The admin will need these to log in.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-green-300 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tenant Name</p>
              <p className="text-lg font-semibold text-gray-900">{createdTenantInfo.tenantName}</p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Admin Login Credentials</p>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Full Name</p>
                  <div className="bg-gray-50 rounded px-3 py-2 font-medium text-gray-900">
                    {createdTenantInfo.adminName}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Email</p>
                  <div className="bg-gray-50 rounded px-3 py-2 font-mono text-sm text-gray-900">
                    {createdTenantInfo.adminEmail}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Password</p>
                  <div className="bg-gray-50 rounded px-3 py-2 font-mono text-sm text-gray-900 break-all">
                    {createdTenantInfo.adminPassword}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-600 mb-3">
                <strong>Important:</strong> Copy these credentials now. They won't be shown again.
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Tenant: ${createdTenantInfo.tenantName}\nAdmin Name: ${createdTenantInfo.adminName}\nEmail: ${createdTenantInfo.adminEmail}\nPassword: ${createdTenantInfo.adminPassword}`
                  );
                  alert('Credentials copied to clipboard!');
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Copy Credentials to Clipboard
              </button>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => navigate('/super-admin')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Done - Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {!createdTenantInfo && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!createdTenantInfo && success && !success.includes('credentials') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {!createdTenantInfo && (
        <>
        <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tenant Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={tenantData.name}
                onChange={(e) => setTenantData({ ...tenantData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL identifier)
              </label>
              <input
                type="text"
                value={tenantData.slug}
                onChange={(e) =>
                  setTenantData({
                    ...tenantData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!id}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={tenantData.status}
                onChange={(e) =>
                  setTenantData({
                    ...tenantData,
                    status: e.target.value as 'active' | 'suspended' | 'inactive',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                value={tenantData.primary_color}
                onChange={(e) =>
                  setTenantData({ ...tenantData, primary_color: e.target.value })
                }
                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={tenantData.business_name}
                onChange={(e) =>
                  setTenantData({ ...tenantData, business_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <textarea
                value={tenantData.business_address}
                onChange={(e) =>
                  setTenantData({ ...tenantData, business_address: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Phone
              </label>
              <input
                type="text"
                value={tenantData.business_phone}
                onChange={(e) =>
                  setTenantData({ ...tenantData, business_phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Email
              </label>
              <input
                type="email"
                value={tenantData.business_email}
                onChange={(e) =>
                  setTenantData({ ...tenantData, business_email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">License Configuration</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name</label>
              <input
                type="text"
                value={licenseData.tier_name}
                onChange={(e) => setLicenseData({ ...licenseData, tier_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
              <input
                type="number"
                value={licenseData.max_users}
                onChange={(e) =>
                  setLicenseData({ ...licenseData, max_users: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Customers
              </label>
              <input
                type="number"
                value={licenseData.max_customers}
                onChange={(e) =>
                  setLicenseData({
                    ...licenseData,
                    max_customers: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={licenseData.license_start_date}
                onChange={(e) =>
                  setLicenseData({ ...licenseData, license_start_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date (leave empty for unlimited)
              </label>
              <input
                type="date"
                value={licenseData.license_expiry_date}
                onChange={(e) =>
                  setLicenseData({ ...licenseData, license_expiry_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {!createdTenantInfo && !id && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Initial Admin User</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create an admin account for this tenant. Save these credentials securely.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {generatedPassword && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Password Generated Successfully
                </p>
                <div className="bg-white rounded p-3 font-mono text-sm border border-green-300">
                  {generatedPassword}
                </div>
                <p className="text-xs text-green-700 mt-2">
                  Save this password securely. The admin will need it to log in.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={initialAdminName}
                  onChange={(e) => setInitialAdminName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter admin's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={initialAdminEmail}
                  onChange={(e) => setInitialAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={initialAdminPassword}
                    onChange={(e) => setInitialAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Generate secure password"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Click the refresh icon to generate a secure password
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!createdTenantInfo && id && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tenant Users</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage user accounts for this tenant ({tenantUsers.length} users)
              </p>
            </div>
            <button
              onClick={() => setShowAddUserForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenantUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => resetUserPassword(user.id, user.full_name)}
                        disabled={resettingUserId === user.id}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Reset to default password"
                      >
                        {resettingUserId === user.id ? 'Resetting...' : 'Reset Password'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!createdTenantInfo && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/super-admin')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Tenant'}
          </button>
        </div>
      )}

      {showAddUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Add New User to Tenant
              </h3>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-600 mt-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                    Default password: <strong>TejoBharat@2024</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserData.full_name}
                    onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roles * (Select at least one)
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUserData.roles.includes('admin')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserData({ ...newUserData, roles: [...newUserData.roles, 'admin'] });
                          } else {
                            setNewUserData({ ...newUserData, roles: newUserData.roles.filter(r => r !== 'admin') });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <Shield className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-700">Admin</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUserData.roles.includes('lead_generator')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserData({ ...newUserData, roles: [...newUserData.roles, 'lead_generator'] });
                          } else {
                            setNewUserData({ ...newUserData, roles: newUserData.roles.filter(r => r !== 'lead_generator') });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">Lead Generator</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUserData.roles.includes('employee')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewUserData({ ...newUserData, roles: [...newUserData.roles, 'employee'] });
                          } else {
                            setNewUserData({ ...newUserData, roles: newUserData.roles.filter(r => r !== 'employee') });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">Employee</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserForm(false);
                      setNewUserData({
                        email: '',
                        password: 'TejoBharat@2024',
                        full_name: '',
                        phone: '',
                        roles: [],
                      });
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400"
                  >
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
