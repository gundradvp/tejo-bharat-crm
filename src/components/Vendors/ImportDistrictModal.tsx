import React, { useState } from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { importDistrictJSON } from '../../lib/vendorCRMStorage';
import { VendorItem } from '../../types/vendorCRM';

interface ImportDistrictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (districtName: string, newVendors: VendorItem[]) => void;
}

export const ImportDistrictModal: React.FC<ImportDistrictModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [districtName, setDistrictName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Auto deduce district name from filename (e.g. "kakinada.json" -> "Kakinada")
    const inferred = selectedFile.name.replace(/\.json$/i, '').replace(/[-_]/g, ' ');
    const formattedInferred = inferred.charAt(0).toUpperCase() + inferred.slice(1);
    if (!districtName) {
      setDistrictName(formattedInferred);
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setParsedData(json);
          setPreviewCount(json.length);
        } else {
          setError('Invalid JSON format: file must contain an array of vendors.');
          setParsedData(null);
          setPreviewCount(null);
        }
      } catch (err) {
        setError('Failed to parse JSON file. Please ensure it is valid JSON.');
        setParsedData(null);
        setPreviewCount(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!districtName.trim()) {
      setError('Please specify a district name.');
      return;
    }
    if (!parsedData || parsedData.length === 0) {
      setError('No vendor records found in selected file.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imported = await importDistrictJSON(districtName.trim(), parsedData);
      onImportComplete(districtName.trim(), imported);
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      setError(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 space-y-4 p-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Import District Vendors</h2>
              <p className="text-xs text-slate-500">Upload Portal JSON file</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* District Name Input */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            District Name
          </label>
          <input
            type="text"
            placeholder="e.g. Kakinada, Visakhapatnam, East Godavari"
            value={districtName}
            onChange={(e) => setDistrictName(e.target.value)}
            className="w-full text-xs font-semibold rounded-xl border border-slate-300 px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* File Dropzone */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            Select JSON File
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="district-file-input"
            />
            <label htmlFor="district-file-input" className="cursor-pointer block space-y-2">
              <FileCode className="w-8 h-8 text-teal-600 mx-auto" />
              <div>
                <span className="text-xs font-bold text-teal-700 hover:underline">
                  {file ? file.name : 'Click to select JSON file'}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PM Surya Ghar / Vendor list JSON
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Validation / Preview Badge */}
        {previewCount !== null && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Validated! Found <strong>{previewCount.toLocaleString('en-IN')}</strong> vendors ready for import.
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!file || !districtName || loading || !parsedData}
            onClick={handleImport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{loading ? 'Importing...' : 'Import to Database'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
