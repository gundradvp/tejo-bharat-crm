import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Save, Upload, AlertCircle, CheckCircle, AlertTriangle, FolderOpen, ExternalLink } from 'lucide-react';
import { buildEmbedUrl } from '../../lib/googleDrive';

export default function TenantSettings() {
  const { tenant, license, usage, refreshTenant } = useTenant();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    business_address: '',
    business_phone: '',
    business_email: '',
    primary_color: '#3B82F6',
  });

  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_logo_url: '',
    header_background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    pan_number: '',
    gstin: '',
    company_phone: '',
    company_email: '',
    company_address: '',
    company_website: '',
    bank_name: '',
    bank_branch: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    cgst_rate: 4.45,
    sgst_rate: 4.45,
    igst_rate: 9.00,
    terms_and_conditions: 'Payment Terms: 50% advance, 50% on delivery\nDelivery: Within 30 days\nWarranty: As per manufacturer terms',
    gdrive_customers_folder_url: '',
    gdrive_picker_api_key: '',
    gdrive_picker_client_id: '',
  });

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
      return;
    }

    if (tenant) {
      setFormData({
        name: tenant.name || '',
        business_name: tenant.business_name || '',
        business_address: tenant.business_address || '',
        business_phone: tenant.business_phone || '',
        business_email: tenant.business_email || '',
        primary_color: tenant.primary_color || '#3B82F6',
      });

      loadCompanySettings();
    }
  }, [tenant, profile, navigate]);

  const loadCompanySettings = async () => {
    if (!tenant) return;

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanySettings({
          company_name: data.company_name || '',
          company_logo_url: data.company_logo_url || '',
          header_background_color: data.header_background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          pan_number: data.pan_number || '',
          gstin: data.gstin || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          company_address: data.company_address || '',
          company_website: data.company_website || '',
          bank_name: data.bank_name || '',
          bank_branch: data.bank_branch || '',
          bank_account_number: data.bank_account_number || '',
          bank_ifsc_code: data.bank_ifsc_code || '',
          cgst_rate: Number(data.cgst_rate) || 4.45,
          sgst_rate: Number(data.sgst_rate) || 4.45,
          igst_rate: Number(data.igst_rate) || 9.00,
          terms_and_conditions: data.terms_and_conditions || 'Payment Terms: 50% advance, 50% on delivery\nDelivery: Within 30 days\nWarranty: As per manufacturer terms',
          gdrive_customers_folder_url: data.gdrive_customers_folder_url || '',
          gdrive_picker_api_key: data.gdrive_picker_api_key || '',
          gdrive_picker_client_id: data.gdrive_picker_client_id || '',
        });
      }
    } catch (error: any) {
      console.error('Error loading company settings:', error.message);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents-central')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents-central')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      await refreshTenant();
      setSuccess('Logo uploaded successfully');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    setError('');
    setSuccess('');

    if (!formData.name) {
      setError('Organization name is required');
      return;
    }

    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          business_name: formData.business_name,
          business_address: formData.business_address,
          business_phone: formData.business_phone,
          business_email: formData.business_email,
          primary_color: formData.primary_color,
        })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      await refreshTenant();
      setSuccess('Settings updated successfully');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    if (!tenant) return;

    setError('');
    setSuccess('');

    if (!companySettings.company_name) {
      setError('Company name is required');
      return;
    }

    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from('company_settings')
        .select('id')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('company_settings')
          .update({
            ...companySettings,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenant.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('company_settings')
          .insert({
            tenant_id: tenant.id,
            ...companySettings,
          });

        if (insertError) throw insertError;
      }

      setSuccess('Company settings saved successfully. You can now print quotations with your company details!');
      await loadCompanySettings();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const gdriveEmbedUrl = companySettings.gdrive_customers_folder_url
    ? buildEmbedUrl(companySettings.gdrive_customers_folder_url)
    : null;

  const getLicenseStatusColor = () => {
    if (!license || !license.license_expiry_date) return 'text-green-600';
    const daysUntilExpiry = Math.ceil(
      (new Date(license.license_expiry_date).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) return 'text-red-600';
    if (daysUntilExpiry <= 30) return 'text-yellow-600';
    return 'text-green-600';
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

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="text-gray-600 mt-1">Manage your organization details and branding</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            License Information
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {license && usage ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">License Tier</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{license.tier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">License Status</p>
                  <p className={`text-lg font-semibold mt-1 ${getLicenseStatusColor()}`}>
                    {!license.license_expiry_date
                      ? 'Unlimited'
                      : new Date(license.license_expiry_date) < new Date()
                      ? 'Expired'
                      : 'Active'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expires On</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {license.license_expiry_date
                      ? new Date(license.license_expiry_date).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">User Licenses</span>
                    <span className="text-sm text-gray-600">
                      {usage.current_users} / {license.max_users} used
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getUsageColor(
                        getUsagePercentage(usage.current_users, license.max_users)
                      )}`}
                      style={{
                        width: `${getUsagePercentage(usage.current_users, license.max_users)}%`,
                      }}
                    />
                  </div>
                  {getUsagePercentage(usage.current_users, license.max_users) >= 90 && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      You are approaching your user limit. Contact support to upgrade.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Customer Licenses</span>
                    <span className="text-sm text-gray-600">
                      {usage.current_customers} / {license.max_customers} used
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getUsageColor(
                        getUsagePercentage(usage.current_customers, license.max_customers)
                      )}`}
                      style={{
                        width: `${getUsagePercentage(
                          usage.current_customers,
                          license.max_customers
                        )}%`,
                      }}
                    />
                  </div>
                  {getUsagePercentage(usage.current_customers, license.max_customers) >= 90 && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      You are approaching your customer limit. Contact support to upgrade.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500">No license information available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Organization Logo</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6">
            {tenant?.logo_url ? (
              <div className="w-32 h-32 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={tenant.logo_url}
                  alt="Organization Logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement!;
                    parent.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                  }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer w-fit">
                <Upload className="w-5 h-5" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-sm text-gray-600 mt-2">
                Upload a logo for your organization. Maximum size: 2MB. Supported formats: JPG, PNG,
                SVG.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <textarea
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
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
                value={formData.business_phone}
                onChange={(e) => setFormData({ ...formData, business_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Email
              </label>
              <input
                type="email"
                value={formData.business_email}
                onChange={(e) => setFormData({ ...formData, business_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Brand Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-16 h-10 px-1 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Company Settings for Quotations</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure your company details for printing professional quotations
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companySettings.company_name}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, company_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Company Name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will appear in the quotation header (e.g., "Tejo Bharat Global Energy")
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Logo URL
              </label>
              <input
                type="url"
                value={companySettings.company_logo_url}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, company_logo_url: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the full URL of your company logo to display in quotation headers
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header Background Color
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={companySettings.header_background_color}
                    onChange={(e) =>
                      setCompanySettings({ ...companySettings, header_background_color: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  />
                </div>
                <div
                  className="h-10 rounded-lg border border-gray-300"
                  style={{ background: companySettings.header_background_color }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use a solid color (#3B82F6) or gradient (linear-gradient(135deg, #667eea 0%, #764ba2 100%))
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setCompanySettings({ ...companySettings, header_background_color: '#3B82F6' })}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Blue
                </button>
                <button
                  type="button"
                  onClick={() => setCompanySettings({ ...companySettings, header_background_color: '#059669' })}
                  className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Green
                </button>
                <button
                  type="button"
                  onClick={() => setCompanySettings({ ...companySettings, header_background_color: '#DC2626' })}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Red
                </button>
                <button
                  type="button"
                  onClick={() => setCompanySettings({ ...companySettings, header_background_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' })}
                  className="px-3 py-1 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded hover:opacity-90"
                >
                  Purple Gradient
                </button>
                <button
                  type="button"
                  onClick={() => setCompanySettings({ ...companySettings, header_background_color: 'linear-gradient(135deg, #3B82F6 0%, #1E3A8A 100%)' })}
                  className="px-3 py-1 text-xs bg-gradient-to-r from-blue-600 to-blue-900 text-white rounded hover:opacity-90"
                >
                  Blue Gradient
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={companySettings.pan_number}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, pan_number: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABCDE1234F"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={companySettings.gstin}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, gstin: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="22ABCDE1234F1Z5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={companySettings.company_phone}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, company_phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+91 1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={companySettings.company_email}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, company_email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="info@company.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={companySettings.company_address}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, company_address: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Company Address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="text"
                value={companySettings.company_website}
                onChange={(e) =>
                  setCompanySettings({ ...companySettings, company_website: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="www.company.com"
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={companySettings.bank_name}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, bank_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="State Bank of India"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={companySettings.bank_branch}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, bank_branch: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Main Branch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={companySettings.bank_account_number}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, bank_account_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={companySettings.bank_ifsc_code}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, bank_ifsc_code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="SBIN0001234"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Tax Rates (%)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CGST Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={companySettings.cgst_rate}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, cgst_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4.45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SGST Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={companySettings.sgst_rate}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, sgst_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4.45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IGST Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={companySettings.igst_rate}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, igst_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="9.00"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              Default Terms & Conditions
            </h3>
            <textarea
              value={companySettings.terms_and_conditions}
              onChange={(e) =>
                setCompanySettings({ ...companySettings, terms_and_conditions: e.target.value })
              }
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter default terms and conditions for quotations..."
            />
            <p className="text-xs text-gray-500 mt-1">
              These terms will be automatically included in new quotations
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveCompanySettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Company Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Google Drive Documents
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Link your main "Customers" Google Drive folder and configure the Picker API for folder mapping
          </p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Main Customers Folder URL
            </label>
            <input
              type="url"
              value={companySettings.gdrive_customers_folder_url}
              onChange={(e) =>
                setCompanySettings({ ...companySettings, gdrive_customers_folder_url: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://drive.google.com/drive/folders/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste the Google Drive URL of your main "Customers" folder. Make sure it is shared as "Anyone with the link can view".
            </p>
            {companySettings.gdrive_customers_folder_url && (
              <a
                href={companySettings.gdrive_customers_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Drive
              </a>
            )}
          </div>

          {gdriveEmbedUrl && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={gdriveEmbedUrl}
                  className="w-full"
                  style={{ height: '300px' }}
                  title="Customers folder preview"
                />
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-2">Google Picker API Configuration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Required for the Drive Folder Mapping screen where admins browse and select folders.
              Create a project in <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>, enable the Google Picker API, create an API key and an OAuth 2.0 Client ID, then paste them below.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <input
                  type="text"
                  value={companySettings.gdrive_picker_api_key}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, gdrive_picker_api_key: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AIza..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OAuth Client ID</label>
                <input
                  type="text"
                  value={companySettings.gdrive_picker_client_id}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, gdrive_picker_client_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="xxxx.apps.googleusercontent.com"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              In the OAuth Client ID settings, add this app's domain to "Authorized JavaScript origins".
            </p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveCompanySettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Drive Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
