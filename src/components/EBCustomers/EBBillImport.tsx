import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, XCircle, ArrowLeft, Loader2, Receipt,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { parseEBBills, EBBillRow } from '../../lib/ebBillParser';
import { importEBBills, EBBillImportResult } from '../../lib/ebApi';

export default function EBBillImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<EBBillRow[] | null>(null);
  const [preview, setPreview] = useState<EBBillRow[] | null>(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<EBBillImportResult | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isValid =
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls') ||
      selectedFile.name.endsWith('.csv');

    if (!isValid) {
      setError('Please select an Excel (.xlsx), .xls, or CSV file');
      setFile(null);
      setPreview(null);
      return;
    }

    setError('');
    setResult(null);
    setFile(selectedFile);

    try {
      setParsing(true);
      const buffer = await selectedFile.arrayBuffer();
      const rows = parseEBBills(buffer);

      if (rows.length === 0) {
        setError(
          'No valid rows found. Make sure the file has columns like "Scno", "Status", "Month_1", "Amount_1", "Units_1", etc.'
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

  const handleImport = async () => {
    if (!parsedRows) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const res = await importEBBills(parsedRows, (current, total) => {
        setProgress({ current, total });
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const totalBills = parsedRows?.reduce((sum, r) => sum + r.bills.length, 0) ?? 0;

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
          <h1 className="text-2xl font-bold text-gray-900">Import EB Bills</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload a bill file with monthly data — bills are matched to existing EB customers by SC number
          </p>
        </div>
      </div>

      {importing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Importing bills — {progress.current.toLocaleString('en-IN')} of {progress.total.toLocaleString('en-IN')} records processed
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {result && !importing && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-900">Import Complete</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultStat label="Total Rows" value={result.total} color="gray" />
            <ResultStat label="Matched" value={result.matched} color="green" />
            <ResultStat label="Unmatched" value={result.unmatched} color="orange" />
            <ResultStat label="Bills Stored" value={result.billsInserted} color="blue" />
          </div>
          {result.unmatched > 0 && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700">
                {result.unmatched.toLocaleString('en-IN')} SC numbers are not in EB customers. Their bills are still stored and will appear in Prospects and Surya Ghar customers if those SC numbers exist there.
              </p>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">{result.errors.length} error(s):</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <button
            onClick={() => navigate('/eb-customers')}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to EB Customers
          </button>
        </div>
      )}

      {!result && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-400 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="eb-bill-upload"
              ref={fileInputRef}
              disabled={importing}
            />
            <label htmlFor="eb-bill-upload" className="cursor-pointer">
              <Receipt className="w-12 h-12 text-teal-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                {file ? file.name : 'Click to upload bill file (Excel or CSV)'}
              </p>
              <p className="text-xs text-gray-500">
                Expected columns: Scno, Status, Month_1, Amount_1, Units_1, Month_2, Amount_2, Units_2, ...
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
                      <th className="px-3 py-2 text-left font-medium text-gray-600">SC Number</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Bills</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Sample Months</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700 font-mono">{row.sc_number}</td>
                        <td className="px-3 py-2 text-gray-700">{row.bill_status ?? '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{row.bills.length}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {row.bills.slice(0, 3).map((b, i) => (
                            <span key={i} className="inline-block mr-2">
                              {b.bill_month}: {b.bill_amount != null ? `Rs${b.bill_amount}` : '-'} / {b.billed_units ?? '-'}u
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-3 p-3 bg-teal-50 rounded-lg">
                <Receipt className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <p className="text-sm text-teal-700">
                  {parsedRows.length.toLocaleString('en-IN')} rows with{' '}
                  {totalBills.toLocaleString('en-IN')} bill records will be matched by SC number.
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="mt-4 w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Import {totalBills.toLocaleString('en-IN')} Bill Records
              </button>
            </div>
          )}

          <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h3 className="text-sm font-medium text-teal-900 mb-2">How it works:</h3>
            <ul className="text-xs text-teal-700 space-y-1.5">
              <li>1. Upload an Excel or CSV file with monthly bill data</li>
              <li>2. Each row should have an SC number and up to 5 months of bill data</li>
              <li>3. Bills are matched to existing EB customers by SC number</li>
              <li>4. Bills for SC numbers not in EB customers are still stored — they will appear in Prospects and Surya Ghar customers if those SC numbers exist there</li>
              <li>5. Duplicate bills for the same SC number + month are automatically updated</li>
              <li>6. Once imported, you can filter customers by bill amount or unit ranges</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 text-gray-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-lg p-3 ${colorMap[color]}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="text-xl font-bold">{value.toLocaleString('en-IN')}</p>
    </div>
  );
}
