import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { pickDriveFolder, buildDriveUrl } from '../../lib/googleDrive';
import {
  FolderOpen,
  Search,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  FolderPlus,
  CheckCircle2,
  Circle,
  Copy,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface CustomerRow {
  id: string;
  customer_name: string;
  consumer_number?: string | null;
  phone?: string;
  gdrive_folder_url?: string | null;
}

export default function DriveFolderMapping() {
  const { profile } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerConfig, setPickerConfig] = useState<{
    apiKey: string;
    clientId: string;
    mainFolderUrl: string;
  }>({ apiKey: '', clientId: '', mainFolderUrl: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pickerCustomerId, setPickerCustomerId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOnlyUnmapped, setShowOnlyUnmapped] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/');
      return;
    }
    loadPickerConfig();
    loadCustomers();
  }, [profile, navigate]);

  const loadPickerConfig = async () => {
    if (!tenant) return;
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('gdrive_picker_api_key, gdrive_picker_client_id, gdrive_customers_folder_url')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) throw error;

      setPickerConfig({
        apiKey: data?.gdrive_picker_api_key || '',
        clientId: data?.gdrive_picker_client_id || '',
        mainFolderUrl: data?.gdrive_customers_folder_url || '',
      });
    } catch (err: any) {
      console.error('Error loading picker config:', err.message);
    }
  };

  const loadCustomers = useCallback(async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_name, consumer_number, phone, gdrive_folder_url')
        .eq('tenant_id', tenant.id)
        .order('customer_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  const handleSelectFolder = async (customerId: string) => {
    setError('');
    setSuccess('');
    setPickerCustomerId(customerId);

    try {
      const result = await pickDriveFolder(pickerConfig.apiKey, pickerConfig.clientId);

      setSavingId(customerId);
      const { error: updateError } = await supabase
        .from('customers')
        .update({ gdrive_folder_url: result.folderUrl })
        .eq('id', customerId);

      if (updateError) throw updateError;

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, gdrive_folder_url: result.folderUrl } : c))
      );
      setSuccess(`Linked "${result.folderName}" to customer`);
    } catch (err: any) {
      if (err.message !== 'Picker cancelled') {
        setError(err.message);
      }
    } finally {
      setPickerCustomerId(null);
      setSavingId(null);
    }
  };

  const handleClearFolder = async (customerId: string) => {
    setError('');
    setSuccess('');
    setSavingId(customerId);
    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ gdrive_folder_url: null })
        .eq('id', customerId);

      if (updateError) throw updateError;

      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, gdrive_folder_url: null } : c))
      );
      setSuccess('Folder link removed');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.consumer_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm);
    const matchesFilter = showOnlyUnmapped ? !c.gdrive_folder_url : true;
    return matchesSearch && matchesFilter;
  });

  const mappedCount = customers.filter((c) => c.gdrive_folder_url).length;
  const unmappedCount = customers.length - mappedCount;

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drive Folder Mapping</h1>
        <p className="text-gray-600 mt-1">
          Map each customer to their Google Drive sub-folder
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Main folder link + stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-600" />
              Main Customers Folder
            </h2>
            {pickerConfig.mainFolderUrl ? (
              <a
                href={pickerConfig.mainFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Google Drive
              </a>
            ) : (
              <p className="text-sm text-gray-500 mt-2">
                Not configured. Set it in Organization Settings.
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{mappedCount}</p>
              <p className="text-xs text-gray-600">Mapped</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-400">{unmappedCount}</p>
              <p className="text-xs text-gray-600">Unmapped</p>
            </div>
          </div>
        </div>

        {!pickerConfig.apiKey || !pickerConfig.clientId ? (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Google Picker API not configured</p>
              <p className="text-sm text-amber-700 mt-1">
                You can still map folders by pasting URLs manually. To enable folder browsing,
                configure the API key and Client ID in{' '}
                <button
                  onClick={() => navigate('/settings/tenant')}
                  className="underline font-medium hover:text-amber-900"
                >
                  Organization Settings
                </button>
                .
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, service no, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowOnlyUnmapped(!showOnlyUnmapped)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
            showOnlyUnmapped
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {showOnlyUnmapped ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
          {showOnlyUnmapped ? 'Showing Unmapped' : 'Show Unmapped Only'}
        </button>
      </div>

      {/* Customer table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Service No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => {
                  const driveUrl = customer.gdrive_folder_url
                    ? buildDriveUrl(customer.gdrive_folder_url)
                    : null;
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        {customer.gdrive_folder_url ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">
                          {customer.customer_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <CopyableText text={customer.consumer_number} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm text-gray-600">{customer.phone || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {driveUrl && (
                            <a
                              href={driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {customer.gdrive_folder_url && (
                            <button
                              onClick={() => handleClearFolder(customer.id)}
                              disabled={savingId === customer.id}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            >
                              Unlink
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectFolder(customer.id)}
                            disabled={
                              pickerCustomerId === customer.id ||
                              savingId === customer.id ||
                              !pickerConfig.apiKey ||
                              !pickerConfig.clientId
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {pickerCustomerId === customer.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FolderPlus className="w-3.5 h-3.5" />
                            )}
                            {customer.gdrive_folder_url ? 'Change' : 'Select Folder'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyableText({ text }: { text?: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!text) {
    return <span className="text-sm text-gray-400">-</span>;
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
      title="Click to copy"
    >
      <span className="font-mono">{text}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
      )}
    </button>
  );
}
