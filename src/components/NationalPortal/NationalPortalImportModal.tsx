import React, { useCallback, useRef, useState } from 'react';
import {
  X,
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Trash2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import {
  invalidateNationalPortalCache,
  fetchNationalPortalSummary,
} from '../../lib/nationalPortalApi';

interface ParsedRecord {
  fileName: string;
  appId: string;
  appNum: string;
  name: string;
  step: string;
  vendor: string;
  cap: number;
  panelCount: number;
  inverterCount: number;
  status: 'ok' | 'error' | 'duplicate';
  errorMsg?: string;
  raw: any;
}

interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  total: number;
  prospectsUpdated?: number;
  customersUpdated?: number;
}

interface Props {
  existingIds: Set<string>;
  onClose: () => void;
  onImportComplete: () => void;
}

function extractSerialCount(list: any[]): number {
  if (!Array.isArray(list)) return 0;
  let count = 0;
  for (const item of list) {
    if (!item) continue;
    if (Array.isArray(item.serialNumbers)) count += item.serialNumbers.length;
    else if (item.serialNumber) count += 1;
  }
  return count;
}

function parseRawRecord(raw: any, fileName: string): ParsedRecord {
  if (!raw || typeof raw !== 'object') {
    return {
      fileName,
      appId: '',
      appNum: '',
      name: '',
      step: '',
      vendor: '',
      cap: 0,
      panelCount: 0,
      inverterCount: 0,
      status: 'error',
      errorMsg: 'Invalid JSON structure',
      raw,
    };
  }

  if (raw.error || raw.isError) {
    return {
      fileName,
      appId: String(raw.appId || ''),
      appNum: '',
      name: '',
      step: '',
      vendor: '',
      cap: 0,
      panelCount: 0,
      inverterCount: 0,
      status: 'error',
      errorMsg: raw.statusText || 'API error record',
      raw,
    };
  }

  if (!raw.appId) {
    return {
      fileName,
      appId: '',
      appNum: '',
      name: '',
      step: '',
      vendor: '',
      cap: 0,
      panelCount: 0,
      inverterCount: 0,
      status: 'error',
      errorMsg: 'Missing appId field',
      raw,
    };
  }

  return {
    fileName,
    appId: String(raw.appId),
    appNum: raw.applicationNumber || raw.registrationNumber || '',
    name: raw.consumerName || raw.applicantName || 'Unknown',
    step: raw.stepName || '',
    vendor: raw.vendorName || '',
    cap: Number(raw.appliedCapacity) || Number(raw.pvCapacity) || 0,
    panelCount: extractSerialCount(raw.moduleList),
    inverterCount: extractSerialCount(raw.inverterList),
    status: 'ok',
    raw,
  };
}

export default function NationalPortalImportModal({ existingIds, onClose, onImportComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.name.endsWith('.json'));
    if (!fileArray.length) return;

    const newRecords: ParsedRecord[] = [];

    for (const file of fileArray) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Support 3 formats:
        //   1. Array of records  → [...records]
        //   2. Dict keyed by appId → { "12345": {...}, "67890": {...} }
        //   3. Single record object → { appId: ..., ... }
        let rawList: any[];
        if (Array.isArray(parsed)) {
          rawList = parsed;
        } else if (parsed && typeof parsed === 'object' && !parsed.appId) {
          // Dict keyed by appId (batch file format)
          rawList = Object.values(parsed);
        } else {
          rawList = [parsed];
        }

        for (let i = 0; i < rawList.length; i++) {
          const rec = parseRawRecord(
            rawList[i],
            rawList.length > 1 ? `${file.name}[${i}]` : file.name
          );
          // Mark duplicates that already exist
          if (rec.status === 'ok' && existingIds.has(rec.appId)) {
            rec.status = 'duplicate';
          }
          newRecords.push(rec);
        }
      } catch (e: any) {
        newRecords.push({
          fileName: file.name,
          appId: '',
          appNum: '',
          name: '',
          step: '',
          vendor: '',
          cap: 0,
          panelCount: 0,
          inverterCount: 0,
          status: 'error',
          errorMsg: `Parse error: ${e.message}`,
          raw: null,
        });
      }
    }

    setParsedRecords((prev) => {
      // Deduplicate by fileName + appId
      const existingKeys = new Set(prev.map((r) => `${r.fileName}::${r.appId}`));
      const toAdd = newRecords.filter((r) => !existingKeys.has(`${r.fileName}::${r.appId}`));
      return [...prev, ...toAdd];
    });
    setResult(null);
    setImportError(null);
  }, [existingIds]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeRecord = (idx: number) => {
    setParsedRecords((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    setParsedRecords([]);
    setResult(null);
    setImportError(null);
  };

  const okRecords = parsedRecords.filter((r) => r.status === 'ok');
  const duplicateRecords = parsedRecords.filter((r) => r.status === 'duplicate');
  const errorRecords = parsedRecords.filter((r) => r.status === 'error');

  const handleImport = async () => {
    // Import both new AND updated (duplicates) records
    const toImport = parsedRecords.filter((r) => r.status === 'ok' || r.status === 'duplicate');
    if (!toImport.length) return;

    setImporting(true);
    setImportError(null);
    setResult(null);

    try {
      const res = await fetch('/api/import-national-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: toImport.map((r) => r.raw) }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResult(data as ImportResult);
      invalidateNationalPortalCache();
      await fetchNationalPortalSummary(true);
      onImportComplete();
    } catch (e: any) {
      setImportError(e.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-xl">
              <Upload className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Import National Portal JSON Files</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select multiple JSON files from your fetcher output — single record or array supported</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <FolderOpen className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-teal-600' : 'text-gray-400'}`} />
              <p className="text-sm font-semibold text-gray-700">Drop JSON files here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supports multiple files • Single record or array • Files from pmsuryaghar-fetcher</p>
            </div>
          )}

          {/* Summary badges */}
          {parsedRecords.length > 0 && !result && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600">{parsedRecords.length} records loaded:</span>
              {okRecords.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {okRecords.length} new
                </span>
              )}
              {duplicateRecords.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                  <RefreshCw className="w-3.5 h-3.5" /> {duplicateRecords.length} will update
                </span>
              )}
              {errorRecords.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                  <XCircle className="w-3.5 h-3.5" /> {errorRecords.length} skipped (errors)
                </span>
              )}
              <button
                onClick={clearAll}
                className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            </div>
          )}

          {/* Records list */}
          {parsedRecords.length > 0 && !result && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {parsedRecords.map((rec, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-xs ${
                    rec.status === 'error' ? 'bg-red-50' : rec.status === 'duplicate' ? 'bg-amber-50' : 'bg-white'
                  }`}>
                    {/* Icon */}
                    <div className="shrink-0">
                      {rec.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {rec.status === 'duplicate' && <RefreshCw className="w-4 h-4 text-amber-500" />}
                      {rec.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                    </div>

                    {/* File name */}
                    <div className="shrink-0 flex items-center gap-1 text-gray-500 w-36 truncate">
                      <FileJson className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{rec.fileName}</span>
                    </div>

                    {/* Info */}
                    {rec.status !== 'error' ? (
                      <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-gray-800 truncate max-w-[180px]">{rec.name}</span>
                        {rec.appNum && <span className="text-gray-400">#{rec.appNum}</span>}
                        {rec.cap > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{rec.cap} kW</span>
                        )}
                        {rec.panelCount > 0 && (
                          <span className="text-gray-500">{rec.panelCount} panels</span>
                        )}
                        {rec.step && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{rec.step}</span>
                        )}
                        {rec.status === 'duplicate' && (
                          <span className="text-amber-600 font-medium">→ will update</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 text-red-500 italic truncate">{rec.errorMsg}</div>
                    )}

                    {/* Remove */}
                    <button
                      onClick={() => removeRecord(i)}
                      className="shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import error */}
          {importError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {/* Success result */}
          {result && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-emerald-800">Import Successful!</h3>
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-700">{result.added}</div>
                  <div className="text-xs text-emerald-600">New records added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{result.updated}</div>
                  <div className="text-xs text-amber-600">Records updated</div>
                </div>
                {result.skipped > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-500">{result.skipped}</div>
                    <div className="text-xs text-gray-500">Skipped (errors)</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-700">{result.total}</div>
                  <div className="text-xs text-gray-600">Total in catalog</div>
                </div>
              </div>
              {result.prospectsUpdated != null && result.prospectsUpdated > 0 && (
                <div className="text-center font-medium text-xs text-teal-800 bg-teal-100/70 border border-teal-300 rounded-lg py-1.5 px-3 inline-block">
                  ⚡ Connected & updated <strong>{result.prospectsUpdated}</strong> matching Lead Prospects in Supabase
                </div>
              )}
              <p className="text-xs text-emerald-700">
                Both <code>national_portal_summary.json</code> and <code>national_portal_catalog.json</code> have been updated.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          {!result ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                Add more files
              </button>

              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || (okRecords.length + duplicateRecords.length) === 0}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  ) : (
                    <><ArrowRight className="w-4 h-4" /> Import {okRecords.length + duplicateRecords.length} records</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <Upload className="w-4 h-4" /> Import more files
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
