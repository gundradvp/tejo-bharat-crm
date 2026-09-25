import { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, FileText, ArrowLeft, Loader2, RefreshCw, Sun, ExternalLink, Globe, MapPin, FileCode } from 'lucide-react';
import { parseProspectExcel, ProspectRow } from '../../lib/prospectParser';
import { useProspectImport } from '../../contexts/ProspectImportContext';
import { useNavigate } from 'react-router-dom';
import { runWebPMSuryaSync, WebSyncProgress, APEPDCL_CIRCLES } from '../../lib/pmsuryaWebSync';

export default function ProspectImport() {
  const navigate = useNavigate();
  const { startImport, activeJob } = useProspectImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ProspectRow[] | null>(null);
  const [preview, setPreview] = useState<ProspectRow[] | null>(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState('ALL');
  const [isWebSyncing, setIsWebSyncing] = useState(false);
  const [webSyncProgress, setWebSyncProgress] = useState<WebSyncProgress | null>(null);
  const [webSyncResult, setWebSyncResult] = useState<{ total: number; newCount: number; updatedCount: number } | null>(null);
  const [webSyncError, setWebSyncError] = useState('');

  const handleStartWebSync = async (htmlFile?: File) => {
    setIsWebSyncing(true);
    setWebSyncError('');
    setWebSyncResult(null);
    try {
      let htmlContent: string | undefined;
      if (htmlFile) {
        htmlContent = await htmlFile.text();
      }
      const result = await runWebPMSuryaSync(
        { circle: selectedCircle, htmlContent, fileName: htmlFile?.name },
        (progress) => {
          setWebSyncProgress(progress);
        }
      );
      setWebSyncResult(result);
    } catch (err: any) {
      setWebSyncError(err.message || 'Failed to sync with APEPDCL portal');
    } finally {
      setIsWebSyncing(false);
    }
  };

  const handleHtmlFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.html') && !selectedFile.name.endsWith('.htm')) {
      setWebSyncError('Please select a valid .html file exported from APEPDCL');
      return;
    }
    const nameLower = selectedFile.name.toLowerCase();
    if (nameLower.includes('all')) {
      setSelectedCircle('ALL');
    }
    await handleStartWebSync(selectedFile);
    if (htmlFileInputRef.current) htmlFileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm')) {
      await handleStartWebSync(selectedFile);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isExcel =
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls') ||
      selectedFile.name.endsWith('.csv');

    if (!isExcel) {
      setError('Please select an Excel (.xlsx, .xls), CSV (.csv), or APEPDCL HTML export (.html) file');
      setFile(null);
      setPreview(null);
      return;
    }

    setError('');
    setFile(selectedFile);

    try {
      setParsing(true);
      const buffer = await selectedFile.arrayBuffer();
      const rows = parseProspectExcel(buffer);

      if (rows.length === 0) {
        setError('No valid rows found. Make sure the file has headers like "Sno", "Circle Name", "Scno", "Mobile Number", etc.');
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
    navigate('/prospects');
  };

  const isImporting = activeJob?.status === 'running';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/prospects')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Lead Prospects</h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload an Excel file with prospect data — import runs in the background so you can navigate away
          </p>
        </div>
      </div>

      {isImporting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Importing {activeJob!.current} of {activeJob!.total} rows from {activeJob!.fileName}
            </p>
            <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${activeJob!.total > 0 ? (activeJob!.current / activeJob!.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live APEPDCL Portal Sync Card */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">
                  Live APEPDCL PM Surya Ghar Portal Sync
                </h2>
                <span className="text-[10px] uppercase font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  All Circles & Individuals
                </span>
                <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Auto-Enrich Active
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                Fetch live registrations directly from APEPDCL for all 11 circles at once or any individual district. Automatically stamps today's import date, enriches from EB database, and updates installation statuses.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <select
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              disabled={isWebSyncing}
              className="px-3.5 py-2.5 rounded-lg border border-amber-300 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm flex-1 sm:flex-none cursor-pointer"
            >
              <optgroup label="Entire Discom (All Districts)">
                <option value="ALL">🌐 ALL Circles (Entire APEPDCL - 11 Districts)</option>
              </optgroup>
              <optgroup label="Individual Districts / Circles">
                {APEPDCL_CIRCLES.filter((c) => !c.isAll).map((c) => (
                  <option key={c.id} value={c.id}>
                    📍 {c.name}
                  </option>
                ))}
              </optgroup>
            </select>

            <button
              onClick={() => handleStartWebSync()}
              disabled={isWebSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-semibold text-sm transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {isWebSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isWebSyncing ? 'Syncing...' : selectedCircle === 'ALL' ? 'Sync All Circles' : 'Sync from Portal'}
            </button>

            <input
              ref={htmlFileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleHtmlFileSelected}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => htmlFileInputRef.current?.click()}
              disabled={isWebSyncing}
              title="Upload previously downloaded pmsurya_all_circles.html or circle HTML file"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              <FileCode className="w-4 h-4 text-amber-600" />
              Upload .html File
            </button>
          </div>
        </div>

        {/* Quick Circle Filter / Selector Chips */}
        <div className="pt-2 border-t border-amber-200/70">
          <div className="text-[11px] font-semibold text-amber-900/80 mb-2 flex items-center gap-1.5">
            <span>Quick Circle Selection:</span>
            <span className="text-[10px] font-normal text-amber-700">(Click to switch target)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {APEPDCL_CIRCLES.map((c) => {
              const isSelected = selectedCircle === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCircle(c.id)}
                  disabled={isWebSyncing}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-sm font-semibold ring-2 ring-amber-400/50'
                      : 'bg-white/80 hover:bg-white text-gray-700 border border-amber-200 hover:border-amber-300'
                  }`}
                >
                  {c.isAll ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3 text-amber-600" />}
                  {c.shortName}
                  {c.isAll && (
                    <span className="text-[9px] bg-amber-500 text-white px-1 rounded-full font-bold ml-0.5">
                      11
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Information Banner for Chosen Circle */}
        <div className="p-3 bg-amber-100/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
          {selectedCircle === 'ALL' ? (
            <>
              <Globe className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">ALL Circles Mode (Entire Discom):</span> Fetches live PM Surya Ghar registrations across all 11 districts (~140,000+ total rows). Each customer is automatically categorized into their own circle (Kakinada, Konaseema, Vizag, East/West Godavari, etc.) and stamped with today's import date.
              </div>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Individual Circle Mode ({APEPDCL_CIRCLES.find((c) => c.id === selectedCircle)?.name || selectedCircle}):</span> Fetches registrations specifically for this district. Any new customer is stamped with today's import date and enriched with EB data.
              </div>
            </>
          )}
        </div>

        {/* Progress Bar & Status */}
        {isWebSyncing && webSyncProgress && (
          <div className="pt-3 border-t border-amber-200">
            <div className="flex items-center justify-between text-xs text-amber-900 font-medium mb-1.5">
              <span>{webSyncProgress.message}</span>
              <span>{webSyncProgress.percent}%</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-600 h-full transition-all duration-300"
                style={{ width: `${webSyncProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Sync Success Card */}
        {webSyncResult && (
          <div className="pt-3 border-t border-amber-200 bg-white/80 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Portal Sync Successful!
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-3">
              <div className="bg-gray-50 border border-gray-200 rounded p-2.5">
                <span className="text-gray-500 block">Total Portal Records:</span>
                <span className="text-base font-bold text-gray-800">{webSyncResult.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-2.5">
                <span className="text-blue-600 block">New Prospects Added Today:</span>
                <span className="text-base font-bold text-blue-900">{webSyncResult.newCount.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5">
                <span className="text-emerald-600 block">Status Changes Updated:</span>
                <span className="text-base font-bold text-emerald-900">{webSyncResult.updatedCount.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  navigate(`/prospects?dateFrom=${today}&dateTo=${today}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                View Today's New Prospects ({webSyncResult.newCount})
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Sync Error */}
        {webSyncError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{webSyncError}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.html,.htm"
            onChange={handleFileChange}
            className="hidden"
            id="prospect-upload"
            ref={fileInputRef}
            disabled={isImporting}
          />
          <label htmlFor="prospect-upload" className="cursor-pointer">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              {file ? file.name : 'Click to upload Excel, CSV, or APEPDCL HTML export'}
            </p>
            <p className="text-xs text-gray-500">
              Supports Excel/CSV columns (Sno, Circle Name, Scno...) or raw portal HTML exports (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">pmsurya_all_circles.html</code>, etc.)
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
              Preview (first {preview.length} rows of {parsedRows.length} total)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Sno</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Circle</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Division</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">SC Number</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Mobile</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">NP Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">EPDCL Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{row.serial_number ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.circle_name ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.division_name ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700 font-mono">{row.sc_number ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.mobile_number ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.national_portal_status ?? '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{row.epdcl_portal_status ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Import {parsedRows.length} Prospects
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
          <ul className="text-xs text-blue-700 space-y-1.5">
            <li>1. Upload an Excel file with the exact columns from your EPDCL/complaint report</li>
            <li>2. Import runs in the background — you can navigate to other pages while it works</li>
            <li>3. Rows are inserted in parallel batches of 500 for speed</li>
            <li>4. The SC Number is cross-checked against your existing Surya Ghar customers</li>
            <li>5. Re-uploading the same file updates existing prospects (no duplicates)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
