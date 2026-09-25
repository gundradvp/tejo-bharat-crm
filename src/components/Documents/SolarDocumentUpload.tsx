import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import {
  extractDCRData,
  extractFeasibilityData,
  extractPowerBillData,
  mergeDocumentData,
  SolarCustomerData
} from '../../lib/solarDocumentExtractor';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

interface DocumentFile {
  file: File;
  type: 'dcr' | 'feasibility' | 'power_bill';
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export default function SolarDocumentUpload() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [documents, setDocuments] = useState<{
    dcr?: DocumentFile;
    feasibility?: DocumentFile;
    power_bill?: DocumentFile;
  }>({});
  const [extractedData, setExtractedData] = useState<SolarCustomerData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileUpload = (type: 'dcr' | 'feasibility' | 'power_bill', file: File) => {
    setDocuments(prev => ({
      ...prev,
      [type]: {
        file,
        type,
        status: 'pending'
      }
    }));
    setError('');
    setSuccess('');
  };

  const updateDocumentStatus = (
    type: 'dcr' | 'feasibility' | 'power_bill',
    status: 'pending' | 'processing' | 'success' | 'error',
    error?: string
  ) => {
    setDocuments(prev => ({
      ...prev,
      [type]: prev[type] ? { ...prev[type]!, status, error } : undefined
    }));
  };

  const processDocuments = async () => {
    if (!documents.dcr && !documents.feasibility && !documents.power_bill) {
      setError('Please upload at least one document');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      let dcrData: Partial<SolarCustomerData> | undefined;
      let feasibilityData: Partial<SolarCustomerData> | undefined;
      let powerBillData: Partial<SolarCustomerData> | undefined;

      if (documents.dcr) {
        updateDocumentStatus('dcr', 'processing');
        try {
          dcrData = await extractDCRData(documents.dcr.file);
          updateDocumentStatus('dcr', 'success');
        } catch (err) {
          console.error('DCR extraction error:', err);
          const errorMsg = err instanceof Error ? err.message : 'Failed to extract DCR data';
          updateDocumentStatus('dcr', 'error', errorMsg);
        }
      }

      if (documents.feasibility) {
        updateDocumentStatus('feasibility', 'processing');
        try {
          feasibilityData = await extractFeasibilityData(documents.feasibility.file);
          updateDocumentStatus('feasibility', 'success');
        } catch (err) {
          console.error('Feasibility extraction error:', err);
          const errorMsg = err instanceof Error ? err.message : 'Failed to extract feasibility data';
          updateDocumentStatus('feasibility', 'error', errorMsg);
        }
      }

      if (documents.power_bill) {
        updateDocumentStatus('power_bill', 'processing');
        try {
          powerBillData = await extractPowerBillData(documents.power_bill.file);
          updateDocumentStatus('power_bill', 'success');
        } catch (err) {
          console.error('Power bill extraction error:', err);
          const errorMsg = err instanceof Error ? err.message : 'Failed to extract power bill data';
          updateDocumentStatus('power_bill', 'error', errorMsg);
        }
      }

      const merged = await mergeDocumentData(dcrData, feasibilityData, powerBillData);
      setExtractedData(merged);
      setSuccess('Documents processed successfully! Review the extracted data below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process documents');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveToDatabase = async () => {
    if (!extractedData || !user || !currentTenant) {
      setError('Missing required data');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('application_ref_no', extractedData.application_ref)
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (existingCustomer) {
        setError(`Customer with application reference ${extractedData.application_ref} already exists`);
        setIsProcessing(false);
        return;
      }

      // Helper function to parse numeric values
      const parseNumeric = (value: string | number | undefined): number | null => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      };

      // Helper function to parse array values
      const parseArray = (value: string | string[] | undefined): string[] | null => {
        if (!value || value === '') return null;
        if (Array.isArray(value)) return value.length > 0 ? value : null;
        // Split by newlines or commas and filter out empty strings
        const arr = value.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
        return arr.length > 0 ? arr : null;
      };

      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          tenant_id: currentTenant.id,
          name: extractedData.customer_name,
          consumer_number: extractedData.consumer_no,
          address: extractedData.address,
          application_ref_no: extractedData.application_ref,
          phone: extractedData.mobile_number,
          email: extractedData.email || '',
          project_capacity_kw: extractedData.project_capacity_kw || null,
          panel_make: extractedData.panel_make,
          panel_serial_numbers: parseArray(extractedData.panel_serial_numbers),
          number_of_panels: extractedData.panel_number || null,
          module_capacity: extractedData.module_capacity,
          total_watts: extractedData.total_watts || null,
          inverter_make: extractedData.inverter_make,
          inverter_capacity: parseNumeric(extractedData.inverter_capacity),
          latitude: parseNumeric(extractedData.latitude),
          longitude: parseNumeric(extractedData.longitude),
          discom_name: 'Eastern Power Distribution',
          eb_distribution: extractedData.eb_distribution,
          eb_section: extractedData.eb_section,
          status: 'New Lead',
          assigned_agent_id: user.id,
          created_by: user.id
        });

      if (insertError) throw insertError;

      setSuccess('Customer created successfully!');
      setExtractedData(null);
      setDocuments({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status?: 'pending' | 'processing' | 'success' | 'error') => {
    switch (status) {
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Solar Documents</h2>
        <p className="text-sm text-gray-600 mb-6">
          Upload DCR certificate, feasibility report, and power bill to automatically extract customer information.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
            <label className="flex flex-col items-center cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(documents.dcr?.status)}
                <span className="text-sm font-medium text-gray-700">DCR Certificate</span>
              </div>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500 text-center">
                {documents.dcr ? documents.dcr.file.name : 'Click to upload PDF'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files?.[0] && handleFileUpload('dcr', e.target.files[0])}
                className="hidden"
              />
            </label>
            {documents.dcr?.error && (
              <p className="text-xs text-red-600 mt-2">{documents.dcr.error}</p>
            )}
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
            <label className="flex flex-col items-center cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(documents.feasibility?.status)}
                <span className="text-sm font-medium text-gray-700">Feasibility Report</span>
              </div>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500 text-center">
                {documents.feasibility ? documents.feasibility.file.name : 'Click to upload PDF'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => e.target.files?.[0] && handleFileUpload('feasibility', e.target.files[0])}
                className="hidden"
              />
            </label>
            {documents.feasibility?.error && (
              <p className="text-xs text-red-600 mt-2">{documents.feasibility.error}</p>
            )}
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
            <label className="flex flex-col items-center cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(documents.power_bill?.status)}
                <span className="text-sm font-medium text-gray-700">Power Bill</span>
              </div>
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-xs text-gray-500 text-center">
                {documents.power_bill ? documents.power_bill.file.name : 'Click to upload (PDF/Image)'}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload('power_bill', e.target.files[0])}
                className="hidden"
              />
            </label>
            {documents.power_bill?.error && (
              <p className="text-xs text-red-600 mt-2">{documents.power_bill.error}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={processDocuments}
            disabled={isProcessing || (!documents.dcr && !documents.feasibility && !documents.power_bill)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Extract Data'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}
      </div>

      {extractedData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Customer Data</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                value={extractedData.customer_name}
                onChange={(e) => setExtractedData({ ...extractedData, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Number</label>
              <input
                type="text"
                value={extractedData.consumer_no}
                onChange={(e) => setExtractedData({ ...extractedData, consumer_no: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Reference</label>
              <input
                type="text"
                value={extractedData.application_ref}
                onChange={(e) => setExtractedData({ ...extractedData, application_ref: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="text"
                value={extractedData.mobile_number}
                onChange={(e) => setExtractedData({ ...extractedData, mobile_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number</label>
              <input
                type="text"
                value={extractedData.aadhar_number || ''}
                onChange={(e) => setExtractedData({ ...extractedData, aadhar_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={extractedData.address}
                onChange={(e) => setExtractedData({ ...extractedData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-3 border-t pt-4 mt-2">
              <h4 className="text-md font-medium text-gray-800 mb-3">Project Details</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="text"
                value={extractedData.capacity}
                onChange={(e) => setExtractedData({ ...extractedData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Capacity (kW)</label>
              <input
                type="number"
                value={extractedData.project_capacity_kw}
                onChange={(e) => setExtractedData({ ...extractedData, project_capacity_kw: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Watts</label>
              <input
                type="number"
                value={extractedData.total_watts}
                onChange={(e) => setExtractedData({ ...extractedData, total_watts: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plant Capacity</label>
              <input
                type="text"
                value={extractedData.plant_capacity}
                onChange={(e) => setExtractedData({ ...extractedData, plant_capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plant Capacity (kW)</label>
              <input
                type="number"
                value={extractedData.plant_capacity_in_kw}
                onChange={(e) => setExtractedData({ ...extractedData, plant_capacity_in_kw: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-3 border-t pt-4 mt-2">
              <h4 className="text-md font-medium text-gray-800 mb-3">Panel Details</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Panel Make</label>
              <input
                type="text"
                value={extractedData.panel_make}
                onChange={(e) => setExtractedData({ ...extractedData, panel_make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Panels</label>
              <input
                type="number"
                value={extractedData.panel_number}
                onChange={(e) => setExtractedData({ ...extractedData, panel_number: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Panel Serial Numbers</label>
              <textarea
                value={extractedData.panel_serial_numbers}
                onChange={(e) => setExtractedData({ ...extractedData, panel_serial_numbers: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Comma or line-separated serial numbers"
              />
            </div>

            <div className="md:col-span-3 border-t pt-4 mt-2">
              <h4 className="text-md font-medium text-gray-800 mb-3">Module Details</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Make</label>
              <input
                type="text"
                value={extractedData.module_make}
                onChange={(e) => setExtractedData({ ...extractedData, module_make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Type</label>
              <input
                type="text"
                value={extractedData.module_type}
                onChange={(e) => setExtractedData({ ...extractedData, module_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module Capacity</label>
              <input
                type="text"
                value={extractedData.module_capacity}
                onChange={(e) => setExtractedData({ ...extractedData, module_capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Modules</label>
              <input
                type="text"
                value={extractedData.number_of_modules}
                onChange={(e) => setExtractedData({ ...extractedData, number_of_modules: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-3 border-t pt-4 mt-2">
              <h4 className="text-md font-medium text-gray-800 mb-3">Inverter Details</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inverter Make</label>
              <input
                type="text"
                value={extractedData.inverter_make}
                onChange={(e) => setExtractedData({ ...extractedData, inverter_make: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inverter Serial Number</label>
              <input
                type="text"
                value={extractedData.inverter_serial_number}
                onChange={(e) => setExtractedData({ ...extractedData, inverter_serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inverter Capacity</label>
              <input
                type="text"
                value={extractedData.inverter_capacity}
                onChange={(e) => setExtractedData({ ...extractedData, inverter_capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="md:col-span-3 border-t pt-4 mt-2">
              <h4 className="text-md font-medium text-gray-800 mb-3">Location & EB Details</h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">EB Distribution</label>
              <input
                type="text"
                value={extractedData.eb_distribution}
                onChange={(e) => setExtractedData({ ...extractedData, eb_distribution: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">EB Section</label>
              <input
                type="text"
                value={extractedData.eb_section}
                onChange={(e) => setExtractedData({ ...extractedData, eb_section: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                type="text"
                value={extractedData.latitude}
                onChange={(e) => setExtractedData({ ...extractedData, latitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                type="text"
                value={extractedData.longitude}
                onChange={(e) => setExtractedData({ ...extractedData, longitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={saveToDatabase}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Saving...' : 'Save Customer'}
            </button>
            <button
              onClick={() => {
                const filteredData = {
                  customer_name: extractedData.customer_name,
                  consumer_no: extractedData.consumer_no,
                  address: extractedData.address,
                  application_ref: extractedData.application_ref,
                  capacity: extractedData.capacity,
                  project_capacity_kw: extractedData.project_capacity_kw,
                  total_watts: extractedData.total_watts,
                  panel_number: extractedData.panel_number,
                  panel_make: extractedData.panel_make,
                  panel_serial_numbers: extractedData.panel_serial_numbers,
                  eb_distribution: extractedData.eb_distribution,
                  eb_section: extractedData.eb_section,
                  latitude: extractedData.latitude,
                  longitude: extractedData.longitude,
                  mobile_number: extractedData.mobile_number,
                  inverter_make: extractedData.inverter_make,
                  inverter_serial_number: extractedData.inverter_serial_number,
                  inverter_capacity: extractedData.inverter_capacity,
                  module_make: extractedData.module_make,
                  module_type: extractedData.module_type,
                  module_capacity: extractedData.module_capacity,
                  number_of_modules: extractedData.number_of_modules,
                  plant_capacity: extractedData.plant_capacity,
                  plant_capacity_in_kw: extractedData.plant_capacity_in_kw,
                  aadhar_number: extractedData.aadhar_number
                };
                const jsonData = JSON.stringify(filteredData, null, 2);
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `customer-data-${extractedData.application_ref || 'export'}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Export JSON
            </button>
            <button
              onClick={() => {
                const filteredData = {
                  customer_name: extractedData.customer_name,
                  consumer_no: extractedData.consumer_no,
                  address: extractedData.address,
                  application_ref: extractedData.application_ref,
                  capacity: extractedData.capacity,
                  project_capacity_kw: extractedData.project_capacity_kw,
                  total_watts: extractedData.total_watts,
                  panel_number: extractedData.panel_number,
                  panel_make: extractedData.panel_make,
                  panel_serial_numbers: extractedData.panel_serial_numbers,
                  eb_distribution: extractedData.eb_distribution,
                  eb_section: extractedData.eb_section,
                  latitude: extractedData.latitude,
                  longitude: extractedData.longitude,
                  mobile_number: extractedData.mobile_number,
                  inverter_make: extractedData.inverter_make,
                  inverter_serial_number: extractedData.inverter_serial_number,
                  inverter_capacity: extractedData.inverter_capacity,
                  module_make: extractedData.module_make,
                  module_type: extractedData.module_type,
                  module_capacity: extractedData.module_capacity,
                  number_of_modules: extractedData.number_of_modules,
                  plant_capacity: extractedData.plant_capacity,
                  plant_capacity_in_kw: extractedData.plant_capacity_in_kw,
                  aadhar_number: extractedData.aadhar_number
                };
                navigator.clipboard.writeText(JSON.stringify(filteredData, null, 2));
                alert('JSON copied to clipboard!');
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Copy JSON
            </button>
            <button
              onClick={() => {
                setExtractedData(null);
                setDocuments({});
                setError('');
                setSuccess('');
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
