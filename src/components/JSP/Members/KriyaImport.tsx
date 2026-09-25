import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Upload, FileJson, CheckCircle2, XCircle, Loader2, AlertTriangle, Database, Trash2, FileUp } from 'lucide-react';

interface RawMember {
  id: number;
  jsp_id?: string;
  name?: string;
  mobile?: string;
  age?: number | string;
  dob?: string;
  gender?: string;
  aadhar_number?: string;
  address?: string;
  photo?: string;
  membership_type?: string;
  phase?: string;
  status?: string;
  payment_id?: string;
  payment_status?: string;
  payment_verified?: string;
  payment_completed_date?: string;
  parliament_constituency_id?: number;
  parliament_constituency_name?: string;
  assembly_id?: number;
  constituency_name?: string;
  mandal_name?: string;
  panchayat_name?: string;
  polling_booth_number?: string;
  ward_no?: string;
  volunteername?: string;
  volunteer_mobile?: string;
  added_by?: number;
  created_date?: string;
  nominee_name?: string;
  nominee_aadhar_number?: string;
  y2021_present?: number;
  y2022_present?: number;
  y2023_present?: number;
  y2024_present?: number;
  y2026_present?: number;
  remarks?: string;
}

interface FileParsed {
  fileName: string;
  totalRecords: number;
  validRecords: number;
  skippedRecords: number;
  records: RawMember[];
  error?: string;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error';

const BATCH_SIZE = 1000;
const CONCURRENCY = 4;

function extractRecords(json: any): RawMember[] {
  if (json?.serviceResult?.results && Array.isArray(json.serviceResult.results)) {
    return json.serviceResult.results;
  }
  if (Array.isArray(json)) {
    return json;
  }
  if (json?.results && Array.isArray(json.results)) {
    return json.results;
  }
  throw new Error('Unrecognized JSON structure. Expected { serviceResult: { results: [...] } } or a top-level array.');
}

export default function KriyaImport() {
  const { profile } = useAuth();
  const [assemblyId, setAssemblyId] = useState('');
  const [assemblyName, setAssemblyName] = useState('');
  const [files, setFiles] = useState<FileParsed[]>([]);
  const [state, setState] = useState<ImportState>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tenantId = profile?.tenant_id;

  const allValidRecords = files.flatMap((f) => f.records);
  const totalValid = allValidRecords.length;
  const totalSkipped = files.reduce((sum, f) => sum + f.skippedRecords, 0);
  const totalRaw = files.reduce((sum, f) => sum + f.totalRecords, 0);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setState('parsing');
    await new Promise((resolve) => setTimeout(resolve, 10));

    const parsed: FileParsed[] = [];
    for (const file of Array.from(selected)) {
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const results = extractRecords(json);
        const valid = results.filter((r) => r.name && r.name.trim().length > 0);
        parsed.push({
          fileName: file.name,
          totalRecords: results.length,
          validRecords: valid.length,
          skippedRecords: results.length - valid.length,
          records: valid,
        });
      } catch (err) {
        parsed.push({
          fileName: file.name,
          totalRecords: 0,
          validRecords: 0,
          skippedRecords: 0,
          records: [],
          error: err instanceof Error ? err.message : 'Failed to parse JSON file',
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    setFiles((prev) => [...prev, ...parsed]);
    setState('preview');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length <= 1) {
      setState('idle');
      setResult(null);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setState('idle');
    setResult(null);
    setProgress({ done: 0, total: 0 });
  };

  const handleImport = useCallback(async () => {
    if (totalValid === 0 || !tenantId) return;

    setState('importing');
    setProgress({ done: 0, total: totalValid });
    setResult(null);

    const asmId = assemblyId ? parseInt(assemblyId) : null;
    let successCount = 0;
    const errors: string[] = [];

    const records = allValidRecords.map((r) => ({
      id: r.id,
      tenant_id: tenantId,
      jsp_id: r.jsp_id || null,
      name: r.name || null,
      mobile: r.mobile || null,
      age: r.age != null ? Number(r.age) : null,
      dob: r.dob || null,
      gender: r.gender || null,
      aadhar_number: r.aadhar_number || null,
      address: r.address || null,
      photo_url: r.photo || null,
      membership_type: r.membership_type || null,
      phase: r.phase || null,
      status: r.status || null,
      payment_id: r.payment_id || null,
      payment_status: r.payment_status || null,
      payment_verified: r.payment_verified || null,
      payment_completed_date: r.payment_completed_date || null,
      parliament_constituency_id: r.parliament_constituency_id ?? null,
      parliament_constituency_name: r.parliament_constituency_name || null,
      assembly_id: asmId ?? r.assembly_id ?? null,
      constituency_name: r.constituency_name || assemblyName || null,
      mandal_name: r.mandal_name || null,
      panchayat_name: r.panchayat_name || null,
      polling_booth_number: r.polling_booth_number || null,
      ward_no: r.ward_no || null,
      volunteername: r.volunteername || null,
      volunteer_mobile: r.volunteer_mobile || null,
      added_by: r.added_by ?? null,
      created_date: r.created_date || null,
      nominee_name: r.nominee_name || null,
      nominee_aadhar_number: r.nominee_aadhar_number || null,
      y2021_present: r.y2021_present ?? 0,
      y2022_present: r.y2022_present ?? 0,
      y2023_present: r.y2023_present ?? 0,
      y2024_present: r.y2024_present ?? 0,
      y2026_present: r.y2026_present ?? 0,
      remarks: r.remarks || null,
    }));

    const batches: (typeof records)[] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const chunk = batches.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (batch, chunkIdx) => {
          const batchIndex = i + chunkIdx;
          try {
            const { error } = await supabase
              .from('jsp_kriya_members')
              .upsert(batch, { onConflict: 'id' });

            if (error) {
              errors.push(`Batch ${batchIndex + 1}: ${error.message}`);
            } else {
              successCount += batch.length;
            }
          } catch (err) {
            errors.push(`Batch ${batchIndex + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        })
      );
      const doneCount = Math.min((i + CONCURRENCY) * BATCH_SIZE, records.length);
      setProgress({ done: doneCount, total: records.length });
    }

    // Sync imported Sadhaks into lookup_values table for instant dropdown loading
    if (successCount > 0) {
      try {
        const sadhakMap = new Map<string, Set<string>>();
        records.forEach((r) => {
          const vName = r.volunteername?.trim();
          const cName = (r.constituency_name || assemblyName)?.trim();
          if (vName && cName) {
            const catKey = `jsp_sadhaks:${cName.toLowerCase()}`;
            if (!sadhakMap.has(catKey)) sadhakMap.set(catKey, new Set());
            sadhakMap.get(catKey)!.add(vName);
          }
        });

        const lookupRecords: any[] = [];
        sadhakMap.forEach((sadhakSet, catKey) => {
          const constituency = catKey.replace('jsp_sadhaks:', '');
          Array.from(sadhakSet).forEach((name, idx) => {
            lookupRecords.push({
              tenant_id: tenantId,
              category: catKey,
              value: name,
              display_label: name,
              description: constituency,
              sort_order: idx + 1,
              is_active: true
            });
          });
        });

        for (let i = 0; i < lookupRecords.length; i += 100) {
          const batch = lookupRecords.slice(i, i + 100);
          await supabase.from('lookup_values').upsert(batch, {
            onConflict: 'tenant_id,category,value'
          });
        }
      } catch (err) {
        console.error('Error syncing Sadhak lookup records:', err);
      }
    }

    setResult({ success: successCount, errors });
    setState('done');
  }, [allValidRecords, totalValid, tenantId, assemblyId, assemblyName]);

  const canImport = totalValid > 0 && tenantId && state === 'preview';
  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const hasFiles = files.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
          <Database className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import Kriya Members</h1>
          <p className="text-sm text-gray-500">Upload one or more JSON files to bulk import member records</p>
        </div>
      </div>

      {/* Config card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Import Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Assembly ID <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={assemblyId}
              onChange={(e) => setAssemblyId(e.target.value)}
              placeholder="e.g. 37"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
            <p className="text-xs text-gray-400 mt-1">Overrides the assembly ID in all imported records. If left blank, the file's own value is used.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Assembly Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={assemblyName}
              onChange={(e) => setAssemblyName(e.target.value)}
              placeholder="e.g. Pithapuram"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
            <p className="text-xs text-gray-400 mt-1">Used when records don't include constituency_name</p>
          </div>
        </div>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="kriya-file-input"
        />
        <label
          htmlFor="kriya-file-input"
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-12 cursor-pointer transition-colors ${
            state === 'importing' || state === 'parsing'
              ? 'border-gray-200 cursor-wait opacity-60'
              : 'border-amber-300 hover:border-amber-400 hover:bg-amber-50/50'
          }`}
        >
          {state === 'parsing' ? (
            <>
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-600">Parsing files...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                <FileUp className="w-6 h-6 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Click to select one or more JSON files</p>
              <p className="text-xs text-gray-400 mt-1">You can select multiple files at once</p>
            </>
          )}
        </label>
      </div>

      {/* Parsed files list */}
      {hasFiles && state !== 'importing' && state !== 'done' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-amber-500" />
              <p className="text-sm font-semibold text-gray-900">
                {files.length} file{files.length !== 1 ? 's' : ''} loaded
              </p>
            </div>
            <button
              onClick={clearAll}
              className="text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Combined summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{totalRaw.toLocaleString()}</p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">Total Records</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{totalValid.toLocaleString()}</p>
              <p className="text-xs text-green-600 font-medium mt-0.5">Valid</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{totalSkipped.toLocaleString()}</p>
              <p className="text-xs text-orange-600 font-medium mt-0.5">Skipped</p>
            </div>
          </div>

          {/* Per-file breakdown */}
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  f.error ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {f.error ? (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <FileJson className="w-5 h-5 text-amber-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.fileName}</p>
                  {f.error ? (
                    <p className="text-xs text-red-600 mt-0.5">{f.error}</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {f.validRecords.toLocaleString()} valid
                      {f.skippedRecords > 0 && ` · ${f.skippedRecords} skipped (no name)`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add more files */}
          <label
            htmlFor="kriya-file-input"
            className="flex items-center justify-center gap-2 py-2.5 border border-dashed border-amber-300 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50/50 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            Add more files
          </label>

          {/* Preview table */}
          {totalValid > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                First 3 records preview
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-500">ID</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-500">Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-500">Mobile</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-500">Mandal</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-500">Phase</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allValidRecords.slice(0, 3).map((r) => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-2 px-3 text-gray-400">{r.id}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{r.name}</td>
                        <td className="py-2 px-3 text-gray-600">{r.mobile || '—'}</td>
                        <td className="py-2 px-3 text-gray-600">{r.mandal_name || '—'}</td>
                        <td className="py-2 px-3 text-gray-600 capitalize">{r.phase || '—'}</td>
                        <td className="py-2 px-3 text-gray-600">{r.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import {totalValid.toLocaleString()} records
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {!assemblyId && (
              <span className="text-xs text-gray-400">Assembly ID is optional — file values will be used if left blank</span>
            )}
          </div>
        </div>
      )}

      {/* Import progress */}
      {state === 'importing' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <p className="text-sm font-semibold text-gray-700">Importing records...</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {progress.done.toLocaleString()} / {progress.total.toLocaleString()} ({progressPct}%)
          </p>
        </div>
      )}

      {/* Result */}
      {state === 'done' && result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Import Complete</p>
              <p className="text-xs text-gray-500">
                {result.success.toLocaleString()} records imported successfully
                {result.errors.length > 0 && ` · ${result.errors.length} batch errors`}
              </p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}

          <button
            onClick={clearAll}
            className="px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            Import more files
          </button>
        </div>
      )}

      {/* Skipped warning */}
      {hasFiles && totalSkipped > 0 && state === 'preview' && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {totalSkipped} records were skipped because they have no name.
        </div>
      )}
    </div>
  );
}
