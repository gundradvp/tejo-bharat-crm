import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Sun, Cpu, Check, Copy, Phone, MapPin, Zap, Calendar, ShieldCheck,
  Building2, Hash, FileText, CheckCircle2, IndianRupee, Layers, ExternalLink, Network,
  MessageSquare, User
} from 'lucide-react';
import { APEGroundReport } from '../../lib/apepdclGroundReport';
import { 
  loadVendorContactsMaster, lookupVendorContact, formatPhoneDisplay, 
  getTelLink, getWhatsAppLink 
} from '../../lib/vendorContactsService';
import { ContactsMasterData } from '../../types/vendorCRM';

interface Props {
  report: APEGroundReport | null;
  onClose: () => void;
}

export default function SNumberDetailModal({ report, onClose }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [dcrChain, setDcrChain] = useState<any>(null);
  const [contactsMaster, setContactsMaster] = useState<ContactsMasterData | null>(null);

  useEffect(() => {
    loadVendorContactsMaster().then(cm => setContactsMaster(cm));
  }, []);

  const vendorContact = useMemo(() => {
    if (!report?.vendor_name || !contactsMaster) return null;
    return lookupVendorContact(report.vendor_name, contactsMaster);
  }, [report?.vendor_name, contactsMaster]);

  useEffect(() => {
    if (!report?.complain_no) {
      setDcrChain(null);
      return;
    }
    fetch('/dcr_supply_chain_master.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.snumber_dcr_map?.[report.complain_no]) {
          setDcrChain(data.snumber_dcr_map[report.complain_no]);
        } else {
          setDcrChain(null);
        }
      })
      .catch(() => setDcrChain(null));
  }, [report?.complain_no]);

  if (!report) return null;

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-6 py-5 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-amber-200">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">
                  {report.complain_no || 'S-Number Ground Report'}
                </h2>
                <span className="text-[10px] uppercase font-bold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                  APEPDCL Verified
                </span>
                {report.consumer_scno_id && (
                  <span className="text-xs font-mono text-amber-200">
                    ({report.consumer_scno_id})
                  </span>
                )}
              </div>
              <p className="text-sm text-amber-100 mt-1 font-medium">
                {report.consumer_name || 'Consumer Name Not Available'} • {report.section_name || 'Section'} • {report.district || 'District'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-amber-800 uppercase block">Solar Capacity</span>
              <span className="text-lg font-bold text-gray-900">
                {report.module_capacity_kw || report.approved_cap_kw || '-'} <span className="text-xs text-gray-500 font-normal">kWp</span>
              </span>
              <span className="text-[11px] text-gray-600 block mt-0.5">
                {report.solar_panel_quantity || 0} Modules × {report.solar_panel_capacity_wp || 0}W
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-blue-800 uppercase block">Inverter Rating</span>
              <span className="text-lg font-bold text-gray-900">
                {report.inverter_capacity_kw || '-'} <span className="text-xs text-gray-500 font-normal">kW</span>
              </span>
              <span className="text-[11px] text-gray-600 block mt-0.5">
                {report.inverter_manufacturer || 'Grid Tie'} ({report.phase || 1}-Ph)
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase block">CFA Subsidy</span>
              <span className="text-lg font-bold text-emerald-900">
                {report.total_cfa_amt != null ? `₹${report.total_cfa_amt.toLocaleString('en-IN')}` : '-'}
              </span>
              <span className="text-[11px] text-gray-600 block mt-0.5">
                Net: ₹{report.net_customer_amt != null ? report.net_customer_amt.toLocaleString('en-IN') : '-'}
              </span>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <span className="text-[11px] font-semibold text-purple-800 uppercase block">Net Meter No</span>
              <span className="text-base font-mono font-bold text-purple-950 truncate block">
                {report.new_mtr_sno || '-'}
              </span>
              <span className="text-[11px] text-gray-600 block mt-0.5">
                SC: {report.sc_number || '-'}
              </span>
            </div>
          </div>

          {/* Section 1: Solar Panel Serial Numbers */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Solar Panel Serial Numbers ({report.solar_panel_serials.length})
                </h3>
              </div>
              {report.panel_serials_text && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(report.panel_serials_text, 'serials_all')}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  {copiedField === 'serials_all' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'serials_all' ? 'Copied All Serials' : 'Copy All Serials'}
                </button>
              )}
            </div>

            <div className="text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2 border-b border-gray-100">
              <p><span className="font-medium text-gray-500">Manufacturer:</span> {report.solar_panel_manufacturer || 'N/A'}</p>
              <p><span className="font-medium text-gray-500">Per Module Rating:</span> {report.solar_panel_capacity_wp ? `${report.solar_panel_capacity_wp} Wp` : 'N/A'}</p>
            </div>

            {/* DCR Verified Supply Chain Banner */}
            {dcrChain && (
              <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 via-white to-amber-50/80 border border-indigo-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Verified DCR Supply Chain (National Portal Track)
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    App: {dcrChain.app_id || report.consumer_scno_id || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dcrChain.hops.map((hop: any, hIdx: number) => (
                    <React.Fragment key={hIdx}>
                      <span className="px-2 py-0.5 bg-white border border-indigo-200 rounded-md font-semibold text-gray-800 shadow-2xs">
                        {hop.name}
                        {hop.invoice && (
                          <span className="text-[10px] font-mono text-indigo-600 ml-1 font-normal">
                            ({hop.invoice})
                          </span>
                        )}
                      </span>
                      {hIdx < dcrChain.hops.length - 1 && (
                        <span className="text-gray-400 font-bold">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {report.solar_panel_serials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {report.solar_panel_serials.map((serial, idx) => (
                  <div
                    key={idx}
                    onClick={() => copyToClipboard(serial, `serial_${idx}`)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-200/70 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-xs font-semibold text-gray-900 truncate">
                        {serial}
                      </span>
                    </div>
                    {copiedField === `serial_${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-700 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-2">No panel serial numbers recorded in this report.</p>
            )}
          </div>

          {/* Section 2: Inverter & Electrical Equipment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Inverter Details</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Manufacturer / Make:</span>
                  <span className="font-semibold text-gray-900">{report.inverter_manufacturer || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Serial Number:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-900">{report.inverter_serial_number || '-'}</span>
                    {report.inverter_serial_number && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(report.inverter_serial_number!, 'inv_serial')}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        {copiedField === 'inv_serial' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Capacity / Phase:</span>
                  <span className="font-semibold text-gray-900">
                    {report.inverter_capacity_kw || '-'} kW • {report.phase || 1} Phase
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Inverter Quantity:</span>
                  <span className="font-semibold text-gray-900">{report.inverter_quantity || 1}</span>
                </div>
              </div>
            </div>

            {/* Vendor & Metering */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Vendor & Metering</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="py-1.5 border-b border-gray-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Installation Vendor:</span>
                    <span className="font-bold text-emerald-800">{report.vendor_name || '-'}</span>
                  </div>
                  {vendorContact && vendorContact.contactPersonMobile && (
                    <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 text-[11px] mt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-gray-800">{vendorContact.contactPersonName || 'Contact'}:</span>
                        <span className="font-mono font-bold text-emerald-900">{formatPhoneDisplay(vendorContact.contactPersonMobile)}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={getTelLink(vendorContact.contactPersonMobile)}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1"
                        >
                          <Phone className="w-2.5 h-2.5" /> Call
                        </a>
                        <a
                          href={getWhatsAppLink(vendorContact.contactPersonMobile, report.vendor_name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[10px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                        </a>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Net Meter Serial No:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-gray-900">{report.new_mtr_sno || '-'}</span>
                    {report.new_mtr_sno && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(report.new_mtr_sno!, 'meter_sno')}
                        className="text-gray-400 hover:text-emerald-600"
                      >
                        {copiedField === 'meter_sno' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500">Service Connection (SCNO):</span>
                  <span className="font-mono font-semibold text-gray-900">{report.sc_number || '-'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">Inspection Date:</span>
                  <span className="font-semibold text-gray-900">{report.inst_create_date || report.comp_date || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: PM Surya Ghar Subsidies & Financials */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-emerald-950 text-sm sm:text-base flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-700" />
              PM Surya Ghar Financial & Subsidy Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/90 border border-emerald-200/80 rounded-xl p-3">
                <span className="text-xs text-gray-500 block">Total Project Cost</span>
                <span className="text-lg font-bold text-gray-900">
                  ₹{report.total_installation_amt ? report.total_installation_amt.toLocaleString('en-IN') : '0'}
                </span>
              </div>
              <div className="bg-white/90 border border-emerald-200/80 rounded-xl p-3">
                <span className="text-xs text-emerald-700 font-semibold block">Central Subsidy (CFA)</span>
                <span className="text-lg font-bold text-emerald-900">
                  ₹{report.total_cfa_amt ? report.total_cfa_amt.toLocaleString('en-IN') : '0'}
                </span>
              </div>
              <div className="bg-white/90 border border-emerald-200/80 rounded-xl p-3">
                <span className="text-xs text-blue-700 font-semibold block">Net Payable by Customer</span>
                <span className="text-lg font-bold text-blue-900">
                  ₹{report.net_customer_amt ? report.net_customer_amt.toLocaleString('en-IN') : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Consumer & Installation Site Address */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-600" />
              Installation Site & Consumer Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <p><span className="text-gray-500">Consumer:</span> <strong className="text-gray-900">{report.consumer_name || '-'}</strong></p>
              <p><span className="text-gray-500">Mobile:</span> <strong className="font-mono text-gray-900">{report.mobile_number || '-'}</strong></p>
              <p><span className="text-gray-500">Address:</span> <span className="text-gray-800">{report.address_installation || '-'}</span></p>
              <p><span className="text-gray-500">PIN Code:</span> <span className="font-mono text-gray-800">{report.pin_installation || '-'}</span></p>
              <p><span className="text-gray-500">Section Office:</span> <span className="text-gray-800">{report.section_name || '-'} ({report.section_code || '-'})</span></p>
              <p><span className="text-gray-500">Sub-Division:</span> <span className="text-gray-800">{report.subdiv_name || '-'}</span></p>
            </div>
          </div>

          {/* Raw JSON toggle */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              {showRawJson ? 'Hide Raw APEPDCL Payload' : 'View Raw APEPDCL JSON Payload'}
            </button>
            <span className="text-[11px] text-gray-400 font-mono">
              COMP_NO: {report.complain_no}
            </span>
          </div>

          {showRawJson && (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60">
              {JSON.stringify(report.raw_json, null, 2)}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Source: APEPDCL RevisedSolarP3GroundReport
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
