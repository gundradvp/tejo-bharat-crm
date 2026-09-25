import { useState, useRef } from 'react';
import { Upload, XCircle, FileText, ArrowLeft, Loader2, Database } from 'lucide-react';
import { parseEBExcel, EBCustomerRow } from '../../lib/ebParser';
import { useEBImport } from '../../contexts/EBImportContext';
import { useNavigate } from 'react-router-dom';

export default function EBCustomerImport() {
  const navigate = useNavigate();
  const { startImport, activeJob } = useEBImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<EBCustomerRow[] | null>(null);
  const [preview, setPreview] = useState<EBCustomerRow[] | null>(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isExcel =
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls') ||
      selectedFile.name.endsWith('.csv');

    if (!isExcel) {
      setError('Please select an Excel (.xlsx), .xls, or CSV file');
      setFile(null);
      setPreview(null);
      return;
    }

    setError('');
    setFile(selectedFile);

    try {
      setParsing(true);
      const buffer = await selectedFile.arrayBuffer();
      const rows = parseEBExcel(buffer);

      if (rows.length === 0) {
        setError(
          'No valid rows found. Make sure the file has headers like "ERO Name", "Section Name", "SCNO", "Name", "Mobile No", etc.'
        );
        setPreview(null);
        setParsedRows(null);
        return;
      }

      setParsedRows(rows);
      setPreview(rows.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to read the file');
      setPreview(null);
      setParsedRows(null);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    if (!file || !parsedRows) return;
    startImport(file.name, parsedRows);
    setFile(null);
    setPreview(null);
    setParsedRows(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    navigate('/eb-customers');
  };

  const isImporting = activeJob?.status === 'running';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/eb-customers')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import EB Customers</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload an Excel or CSV file with EB consumer data — import runs in the background
          </p>
        </div>
      </div>

      {isImporting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Importing {activeJob!.current.toLocaleString('en-IN')} of{' '}
              {activeJob!.total.toLocaleString('en-IN')} rows from {activeJob!.fileName}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{
                  width: `${activeJob!.total > 0 ? (activeJob!.current / activeJob!.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
            id="eb-upload"
            ref={fileInputRef}
            disabled={isImporting}
          />
          <label htmlFor="eb-upload" className="cursor-pointer">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {file ? file.name : 'Click to upload Excel or CSV file'}
            </p>
            <p className="text-xs text-gray-500">
              Expected columns: ERO Name, Section Name, SCNO, Name, Address, Contracted Load,
              Mobile No, Meter No, Status, and more
            </p>
          </label>
        </div>

        {parsing && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            <span className="text-sm text-gray-600">Reading file...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {preview && parsedRows && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Preview (first {preview.length} rows of {parsedRows.length.toLocaleString('en-IN')} total)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">ERO</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Section</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">SC Number</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Mobile</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Category</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{row.ero_name ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.section_name ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700 font-mono">{row.sc_number ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.customer_name ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.mobile_number ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.category ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.status ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Database className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                {parsedRows.length.toLocaleString('en-IN')} records will be imported. Duplicate SC
                numbers will be updated automatically.
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Import {parsedRows.length.toLocaleString('en-IN')} EB Customers
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
          <ul className="text-xs text-blue-700 space-y-1.5">
            <li>1. Upload an Excel or CSV file exported from the EB system</li>
            <li>2. Import runs in the background — you can navigate to other pages while it works</li>
            <li>3. Records are inserted in parallel batches of 500 for speed</li>
            <li>4. Duplicate SC numbers (within your tenant) are automatically updated</li>
            <li>5. All 45 EB data columns are stored and searchable in the CRM</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
