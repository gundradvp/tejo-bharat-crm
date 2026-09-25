import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, XCircle, Loader2, FileText, FileJson } from 'lucide-react';
import { parseCustomerCSV } from '../../lib/csvParser';
import { parseCustomerJSON, isNativeCRMFormat, parseNativeCRMJSON } from '../../lib/jsonParser';
import { ImportType } from '../../lib/importCustomers';
import { useAuth } from '../../contexts/AuthContext';
import { useImportProgress } from '../../contexts/ImportProgressContext';

export default function BulkImport() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { activeJob, recentJobs, startImport } = useImportProgress();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const isImporting = activeJob?.status === 'running';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isCSV = selectedFile.name.endsWith('.csv');
      const isJSON = selectedFile.name.endsWith('.json');

      if (!isCSV && !isJSON) {
        setError('Please select a CSV or JSON file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    if (!file || !user) return;

    if (!profile?.tenant_id) {
      setError('Unable to determine your organization. Please refresh the page and try again.');
      return;
    }

    setError('');

    try {
      const text = await file.text();
      const isJSON = file.name.endsWith('.json');
      let type: ImportType;
      let customers: any[];
      let total: number;

      if (isJSON) {
        if (isNativeCRMFormat(text)) {
          customers = parseNativeCRMJSON(text);
          if (customers.length === 0) {
            setError('No valid customer records found in this export file');
            return;
          }
          type = 'native_crm';
        } else {
          customers = parseCustomerJSON(text);
          if (customers.length === 0) {
            setError('No valid customer data found in JSON');
            return;
          }
          type = 'json';
        }
      } else {
        customers = parseCustomerCSV(text);
        if (customers.length === 0) {
          setError('No valid customer data found in CSV');
          return;
        }
        type = 'csv';
      }

      total = customers.length;
      startImport({ type, fileName: file.name, total, customers, userId: user.id });
      setFile(null);
      // Reset the file input so the same file can be selected again
      const input = document.getElementById('csv-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import customers');
    }
  };

  const lastJob = activeJob || recentJobs[0];
  const showResult = lastJob && lastJob.status !== 'running';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Upload className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">PM Surya Ghar JSON & CSV Import</h2>
            <p className="text-sm text-gray-600">Upload PM Surya Ghar JSON or CSV export file</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/customers/import-detailed')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Import detailed PM Surya Ghar portal export with full workflow & equipment"
          >
            <FileJson className="w-3.5 h-3.5 text-teal-600" />
            <span>Detailed Portal JSON Import →</span>
          </button>
        </div>
      </div>

      {!profile?.tenant_id && !authLoading && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Debug Info:</strong> Profile not loaded properly. User: {user?.email || 'Not logged in'},
            Has Profile: {profile ? 'Yes' : 'No'},
            Has Tenant ID: {profile?.tenant_id || 'Missing'}
          </p>
        </div>
      )}

      {isImporting && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Import in progress: {activeJob!.current} of {activeJob!.total} processed
            </p>
            <p className="text-xs text-blue-700 mt-1">
              You can navigate to other pages — the import continues in the background.
              A progress indicator stays visible at the bottom-right corner of every page.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".csv,.json"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
            disabled={isImporting}
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {file ? file.name : 'Click to upload CSV or JSON file'}
            </p>
            <p className="text-xs text-gray-500">
              CSV / JSON from PM Surya Ghar portal, or a CRM export JSON
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Existing customers will be matched and updated — new ones will be created
            </p>
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {showResult && lastJob?.result && (
          <div className={`p-4 rounded-lg border ${
            lastJob.status === 'completed'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-2 mb-3">
              {lastJob.status === 'completed' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {lastJob.status === 'completed' ? 'Import Completed Successfully' : 'Import Failed'}
                </p>
                <div className="text-sm text-gray-700 mt-1 space-y-1">
                  {lastJob.result.created > 0 && (
                    <p>Created: <strong>{lastJob.result.created}</strong> new customers</p>
                  )}
                  {lastJob.result.updated > 0 && (
                    <p>Updated: <strong>{lastJob.result.updated}</strong> existing customers</p>
                  )}
                  {lastJob.result.restoredActive > 0 && (
                    <p className="text-blue-700">Restored: <strong>{lastJob.result.restoredActive}</strong> previously lost customers are now active again</p>
                  )}
                  {lastJob.result.markedLost > 0 && (
                    <p className="text-red-700">Lost/Churned: <strong>{lastJob.result.markedLost}</strong> customers not found in this import were marked as lost</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Total processed: {lastJob.result.created + lastJob.result.updated} records
                  </p>
                  {lastJob.result.errors.length > 0 && (
                    <p className="text-red-700 mt-2">Errors: {lastJob.result.errors.length}</p>
                  )}
                </div>
              </div>
            </div>

            {lastJob.result.errors.length > 0 && (
              <div className="mt-3 p-3 bg-white rounded border border-red-200">
                <p className="text-xs font-medium text-red-900 mb-2">Errors:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {lastJob.result.errors.map((err, idx) => (
                    <p key={idx} className="text-xs text-red-700">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || isImporting || authLoading || !profile?.tenant_id}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Importing... ({activeJob?.current}/{activeJob?.total})
            </>
          ) : authLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Import Customers
            </>
          )}
        </button>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Supported formats:</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>CRM Export JSON</strong> — use the Export JSON button on the Customers page (admin only). Preserves all fields including status, remarks, and location.</li>
            <li>• <strong>PM Surya Ghar JSON</strong> — exported from the government portal</li>
            <li>• <strong>CSV</strong> — standard format with consumer data</li>
            <li>• Matches on Application Ref No, Consumer Number, or Phone — updates existing records, creates new ones</li>
            <li>• <strong>Background import</strong> — you can navigate away while importing; a live progress indicator stays visible on every page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
