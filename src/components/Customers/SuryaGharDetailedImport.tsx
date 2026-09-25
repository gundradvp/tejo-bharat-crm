import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileJson, ArrowLeft, Info } from 'lucide-react';
import { isSuryaGharDetailedFormat, parseSuryaGharDetailedJSON } from '../../lib/jsonParser';
import { ImportType } from '../../lib/importCustomers';
import { useAuth } from '../../contexts/AuthContext';
import { useImportProgress } from '../../contexts/ImportProgressContext';
import { useNavigate } from 'react-router-dom';

export default function SuryaGharDetailedImport() {
  const { user, profile, loading: authLoading } = useAuth();
  const { activeJob, recentJobs, startImport } = useImportProgress();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  const isImporting = activeJob?.status === 'running';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.json')) {
        setError('Please select a JSON file');
        setFile(null);
        setParsedCount(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setParsedCount(null);

      // Preview the count
      selectedFile.text().then(text => {
        try {
          if (!isSuryaGharDetailedFormat(text)) {
            setError('This does not appear to be a detailed PM Surya Ghar export. The JSON should be an object keyed by application ID with viewMoreApplicationDetails, completionDetails, and getAllDetailsOfApplication sections.');
            setParsedCount(null);
            return;
          }
          const parsed = parseSuryaGharDetailedJSON(text);
          setParsedCount(parsed.length);
        } catch (err: any) {
          setError(err.message || 'Failed to parse file');
          setParsedCount(null);
        }
      }).catch(() => {
        setError('Failed to read file');
        setParsedCount(null);
      });
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

      if (!isSuryaGharDetailedFormat(text)) {
        setError('This file is not a valid detailed PM Surya Ghar export');
        return;
      }

      const customers = parseSuryaGharDetailedJSON(text);
      if (customers.length === 0) {
        setError('No valid application records found in this file');
        return;
      }

      const type: ImportType = 'surya_ghar_detailed';
      startImport({ type, fileName: file.name, total: customers.length, customers, userId: user.id });
      setFile(null);
      setParsedCount(null);
      const input = document.getElementById('detailed-upload') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import customers');
    }
  };

  const lastJob = activeJob || recentJobs[0];
  const showResult = lastJob && lastJob.type === 'surya_ghar_detailed' && lastJob.status !== 'running';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <FileJson className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Detailed Portal Import</h2>
            <p className="text-sm text-gray-600">Upload detailed PM Surya Ghar portal export to enrich existing customers</p>
          </div>
        </div>

        <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800 space-y-1">
            <p className="font-medium">How this import works:</p>
            <ul className="list-disc list-inside space-y-0.5 text-teal-700">
              <li>Matches existing customers by <strong>Application Number</strong></li>
              <li>Updates matched records with all portal data (workflow steps, feasibility, loan, equipment lists)</li>
              <li>Applications not found in your system are <strong>skipped</strong> (no new customers created)</li>
              <li>Inverter and module lists are stored as separate JSON data per customer</li>
              <li>The full 10-step workflow timeline is stored for each customer</li>
            </ul>
          </div>
        </div>

        {!profile?.tenant_id && !authLoading && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Organization not loaded properly. Please refresh the page.
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
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="detailed-upload"
              disabled={isImporting}
            />
            <label htmlFor="detailed-upload" className="cursor-pointer">
              <FileJson className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {file ? file.name : 'Click to upload detailed portal JSON file'}
              </p>
              <p className="text-xs text-gray-500">
                JSON export from PM Surya Ghar portal (detailed format with application details)
              </p>
            </label>
          </div>

          {parsedCount !== null && parsedCount > 0 && !error && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-1.5" />
                <strong>{parsedCount}</strong> application records detected in this file
              </p>
            </div>
          )}

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
                    {lastJob.result.updated > 0 && (
                      <p>Updated: <strong>{lastJob.result.updated}</strong> existing customers</p>
                    )}
                    {lastJob.result.skipped !== undefined && lastJob.result.skipped > 0 && (
                      <p className="text-gray-500">Skipped: <strong>{lastJob.result.skipped}</strong> applications not found in your system</p>
                    )}
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
            disabled={!file || isImporting || authLoading || !profile?.tenant_id || !!error}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                Import Detailed Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
