import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Upload,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  FileJson,
  Trash2,
} from 'lucide-react';
import {
  DcrSerialHierarchy,
  parseDcrItemToHierarchy,
  importDcrHierarchiesToServer,
} from '../../lib/dcrHierarchyUtils';

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

function parseCsvRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] || '').trim();
    });
    return obj;
  });
}

export default function ImportDcrChainsModal({ onClose, onImportComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');
  const [parsedItems, setParsedItems] = useState<DcrSerialHierarchy[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    addedSerials: number;
    updatedSerials: number;
    mappedSNumbers: number;
    totalSerials: number;
    supabaseUpdatedApps?: number;
    supabaseLinkedPanels?: number;
    supabaseQueuedApps?: number;
    supabaseError?: string;
  } | null>(null);

  const parseRawInput = (rawObjects: any[]) => {
    const dedup = new Map<string, DcrSerialHierarchy>();
    let skipped = 0;

    for (const raw of rawObjects) {
      const parsed = parseDcrItemToHierarchy(raw);
      if (parsed && parsed.hops.length > 0) {
        dedup.set(parsed.serial, parsed);
      } else {
        skipped++;
      }
    }

    setParsedItems(Array.from(dedup.values()));
    setSkippedCount(skipped);
  };

  const handleParseText = (text: string) => {
    setPasteText(text);
    setParseError(null);
    setResult(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setParsedItems([]);
      setSkippedCount(0);
      return;
    }
    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        parseRawInput(list);
      } else {
        const csvObjects = parseCsvRows(trimmed);
        if (csvObjects.length === 0) {
          setParseError('Could not recognize JSON array or CSV rows.');
          return;
        }
        parseRawInput(csvObjects);
      }
    } catch (err: any) {
      setParseError(`Invalid JSON/CSV: ${err.message}`);
      setParsedItems([]);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setParseError(null);
    setResult(null);
    const combined: any[] = [];

    for (const file of Array.from(files)) {
      const txt = await file.text();
      if (file.name.toLowerCase().endsWith('.csv')) {
        combined.push(...parseCsvRows(txt));
      } else {
        try {
          const parsed = JSON.parse(txt);
          if (Array.isArray(parsed)) combined.push(...parsed);
          else combined.push(parsed);
        } catch (err: any) {
          setParseError(`Error reading ${file.name}: ${err.message}`);
        }
      }
    }

    if (combined.length > 0) {
      parseRawInput(combined);
    }
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;
    setImporting(true);
    setParseError(null);
    try {
      const res = await importDcrHierarchiesToServer(parsedItems);
      setResult(res);
      onImportComplete();
    } catch (err: any) {
      setParseError(err.message || 'Failed to save DCR chains');
    } finally {
      setImporting(false);
    }
  };

  const uniqueAppsCount = useMemo(
    () => new Set(parsedItems.map((p) => p.app_id).filter(Boolean)).size,
    [parsedItems]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Import DCR Supply Chain JSON / CSV</h2>
              <p className="text-xs text-gray-500">
                Links panel-level supply chain hierarchy to National Portal Apps &amp; S-Numbers Hub
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!result && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl p-5 text-center cursor-pointer flex flex-col items-center justify-center transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <FileJson className="w-8 h-8 text-indigo-500 mb-2" />
                  <p className="text-sm font-semibold text-gray-800">Upload Batch DCR Checker JSON / CSV</p>
                  <p className="text-xs text-gray-400 mt-1">Select one or more exported files</p>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                      Or Paste JSON directly:
                    </label>
                    {pasteText && (
                      <button
                        type="button"
                        onClick={() => handleParseText('')}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    value={pasteText}
                    onChange={(e) => handleParseText(e.target.value)}
                    placeholder='Paste JSON array here, e.g. [{"serial":"NSMP...","rawRemarks":"..."}]'
                    className="w-full h-28 rounded-xl border border-gray-300 p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {parseError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {parsedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      ✓ {parsedItems.length} Panels with DCR Hierarchy
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                      {uniqueAppsCount} Claimed NP Applications
                    </span>
                    {skippedCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {skippedCount} without chain skipped
                      </span>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="py-2 px-3">Serial Number</th>
                          <th className="py-2 px-3">Claimed NP</th>
                          <th className="py-2 px-3">Parsed Supply Chain Hops</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedItems.slice(0, 100).map((item) => (
                          <tr key={item.serial} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-mono font-semibold text-gray-900 whitespace-nowrap">
                              {item.serial}
                            </td>
                            <td className="py-2 px-3 font-mono text-indigo-700 whitespace-nowrap">
                              {item.app_id || '—'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {item.hops.map((hop, idx) => (
                                  <React.Fragment key={idx}>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-gray-800 font-medium text-[11px]">
                                      {hop.name}
                                      {hop.invoice && (
                                        <span className="text-indigo-600 font-mono text-[10px] ml-1">
                                          ({hop.invoice})
                                        </span>
                                      )}
                                    </span>
                                    {idx < item.hops.length - 1 && <span className="text-gray-400">→</span>}
                                  </React.Fragment>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-900">DCR Supply Chain Linked Successfully!</h3>
              <div className="flex flex-wrap justify-center gap-6 py-2">
                <div>
                  <div className="text-2xl font-bold text-emerald-700">{result.addedSerials}</div>
                  <div className="text-xs text-emerald-600">New Panels Linked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-700">{result.updatedSerials}</div>
                  <div className="text-xs text-indigo-600">Updated Panels</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-700">{result.mappedSNumbers}</div>
                  <div className="text-xs text-amber-600">S-Numbers Linked</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800">{result.totalSerials.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Total DCR Serials</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-700">
                    {(result.supabaseQueuedApps || result.supabaseUpdatedApps || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-teal-600">
                    {result.supabaseQueuedApps ? 'Supabase Sync Queued' : 'Supabase Apps Saved'}
                  </div>
                </div>
              </div>
              {result.supabaseError && (
                <div className="text-xs text-amber-800 bg-amber-100/80 border border-amber-300 rounded-lg px-3 py-1.5">
                  Saved locally to JSON, but Supabase sync reported: {result.supabaseError}
                </div>
              )}
              <p className="text-xs text-emerald-700">
                Hierarchy is now linked per panel in National Portal Apps, S-Numbers Hub, and Supabase.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || parsedItems.length === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Linking Panels…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Import &amp; Link {parsedItems.length} Panel(s)
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
