import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Database, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import { VendorItem } from '../../types/vendorCRM';

interface ExportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: VendorItem[];
  districtName: string;
}

export const ExportBackupModal: React.FC<ExportBackupModalProps> = ({
  isOpen,
  onClose,
  vendors,
  districtName
}) => {
  const [downloadedType, setDownloadedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    const rows = vendors.map(v => ({
      'Vendor ID': v.vendorId,
      'Vendor Name': v.vendorName,
      'District': v.district,
      'Contact Person': v.contactPersonName,
      'Mobile': v.contactPersonMobile,
      'Email': v.contactPersonEmail,
      'Address': v.address,
      'Pipeline Stage': v.pipelineStage,
      'Priority': v.priority,
      'Last Outcome': v.lastCallOutcome || '',
      'Next Follow-Up': v.nextFollowUpDate || '',
      'Last Contacted': v.lastContactedAt ? new Date(v.lastContactedAt).toLocaleString() : '',
      'National Capacity (kW)': v.nationalCapacityKW || 0,
      'National Installs': v.nationalInstallations || 0,
      'DCR Tracked': v.dcrTracked ? 'YES' : 'NO',
      'DCR Inbound Panels': v.dcrInboundPanels || 0,
      'DCR Outbound Panels': v.dcrOutboundPanels || 0,
      'Total Call Notes': (v.notes || []).length,
      'Latest Note': v.notes?.[0]?.content || '',
      'Website': v.websiteUrl || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solar Vendors');
    XLSX.writeFile(wb, `TejoBharat_Solar_Vendors_${districtName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);

    setDownloadedType('excel');
    setTimeout(() => setDownloadedType(null), 3000);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vendors, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TejoBharat_Vendors_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadedType('json');
    setTimeout(() => setDownloadedType(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Export & Backup Leads</h2>
              <p className="text-xs text-slate-500">{vendors.length} vendors ready</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-3">
          
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                  Export to Microsoft Excel (.xlsx)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Includes call notes, dates, phone numbers, and DCR stats
                </p>
              </div>
            </div>

            {downloadedType === 'excel' ? (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Exported!
              </span>
            ) : (
              <span className="text-xs text-slate-400 group-hover:text-emerald-700 font-bold">
                Download
              </span>
            )}
          </button>

          {/* JSON Full Database Backup */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800">
                  Full Database Backup (.json)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Raw JSON containing complete timeline and requirements
                </p>
              </div>
            </div>

            {downloadedType === 'json' ? (
              <span className="text-xs text-teal-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> Exported!
              </span>
            ) : (
              <span className="text-xs text-slate-400 group-hover:text-teal-700 font-bold">
                Download
              </span>
            )}
          </button>

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
