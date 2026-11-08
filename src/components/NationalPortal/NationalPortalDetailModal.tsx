import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Copy,
  Check,
  Building2,
  MapPin,
  Cpu,
  Layers,
  FileText,
  IndianRupee,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  UserPlus,
  Loader2,
  Sun,
  Zap,
  Info
} from 'lucide-react';
import {
  NationalPortalSummary,
  NationalPortalFullDetail,
  fetchNationalPortalDetail,
  findMatchingCustomerInCRM,
  syncApplicationToCRMCustomer
} from '../../lib/nationalPortalApi';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  summary: NationalPortalSummary;
  onClose: () => void;
}

export default function NationalPortalDetailModal({ summary, onClose }: Props) {
  const { profile } = useAuth();
  const [detail, setDetail] = useState<NationalPortalFullDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'subsidy' | 'inspection' | 'documents' | 'crm'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // CRM Match state
  const [crmMatch, setCrmMatch] = useState<any | null>(null);
  const [crmChecking, setCrmChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const res = await fetchNationalPortalDetail(summary.id);
      if (isMounted) {
        setDetail(res);
        setLoading(false);
      }
    }
    loadData();

    // Check if customer exists in Tejo Bharat CRM
    async function checkCRM() {
      setCrmChecking(true);
      const match = await findMatchingCustomerInCRM(summary.appNum, summary.sc, summary.phone);
      if (isMounted) {
        setCrmMatch(match.customer);
        setCrmChecking(false);
      }
    }
    checkCRM();

    return () => {
      isMounted = false;
    };
  }, [summary]);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleWhatsApp = () => {
    if (!summary.phone) return;
    const cleanPhone = summary.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${summary.name},\nThis is Tejo Bharat Global Energy regarding your PM Surya Ghar Rooftop Solar Application #${summary.appNum || summary.id}. We can assist you with your installation, net-metering, and subsidy disbursal.`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${msg}`, '_blank');
  };

  const handleSyncToCRM = async () => {
    if (!profile?.tenant_id) {
      setSyncErrorMessage('Tenant ID not found. Please log in.');
      return;
    }
    setSyncing(true);
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);

    const payloadDetail: NationalPortalFullDetail = detail || {
      appId: summary.id,
      applicationNumber: summary.appNum,
      consumerName: summary.name,
      mobile: summary.phone,
      email: summary.email,
      consumerNo: summary.sc,
      appliedCapacity: summary.cap,
      sanctionLoad: summary.sanctionLoad,
      vendorName: summary.vendor,
      stepName: summary.step,
      subsidyAmount: summary.subsidyAmt,
      subsidyStatus: summary.subsidyStatus,
      districtName: summary.district,
      circleName: summary.circle,
      divisionName: summary.division,
      subDivisionName: summary.subdiv,
      villagePanchayatName: summary.village,
      address: summary.address,
      pinCode: summary.pincode
    };

    const res = await syncApplicationToCRMCustomer(payloadDetail, profile.tenant_id, crmMatch?.id);
    setSyncing(false);

    if (res.success) {
      setSyncSuccessMessage(crmMatch ? 'Successfully updated customer in CRM!' : 'Successfully added customer to Tejo Bharat CRM!');
      // Refresh match state
      const updatedMatch = await findMatchingCustomerInCRM(summary.appNum, summary.sc, summary.phone);
      setCrmMatch(updatedMatch.customer);
    } else {
      setSyncErrorMessage(res.error || 'Failed to sync with CRM');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-teal-200 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-950 flex items-center gap-1 shadow-sm">
              <Sun className="w-3.5 h-3.5 fill-amber-950" />
              {summary.cap ? `${summary.cap} kW Solar Plant` : 'Solar Application'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/20">
              App ID: #{summary.id}
            </span>
            {summary.step && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                {summary.step}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1">
            {summary.name}
          </h2>

          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-teal-100/90">
            {summary.appNum && (
              <span className="flex items-center gap-1">
                <span className="opacity-75">Reg No:</span>
                <span className="font-mono font-medium text-white">{summary.appNum}</span>
                <button
                  onClick={() => handleCopy(summary.appNum, 'appNum')}
                  className="hover:text-amber-300 ml-0.5"
                  title="Copy Reg No"
                >
                  {copiedKey === 'appNum' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>
            )}
            {summary.sc && (
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span className="opacity-75">SC No:</span>
                <span className="font-mono font-medium text-white">{summary.sc}</span>
                <button
                  onClick={() => handleCopy(summary.sc, 'sc')}
                  className="hover:text-amber-300 ml-0.5"
                  title="Copy SC No"
                >
                  {copiedKey === 'sc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </span>
            )}
            {summary.district && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-300" />
                <span>{summary.village ? `${summary.village}, ` : ''}{summary.district}</span>
              </span>
            )}
          </div>

          {/* Quick Actions Bar */}
          <div className="mt-4 pt-3 border-t border-teal-700/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {summary.phone && (
                <>
                  <a
                    href={`tel:${summary.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call {summary.phone}
                  </a>
                  <button
                    onClick={handleWhatsApp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </>
              )}
            </div>

            {/* CRM Status Indicator */}
            <div className="flex items-center gap-2">
              {crmChecking ? (
                <span className="text-xs text-teal-200 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking CRM...
                </span>
              ) : crmMatch ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                  <UserCheck className="w-3.5 h-3.5" /> Linked in Tejo Bharat CRM
                </span>
              ) : (
                <button
                  onClick={() => setActiveTab('crm')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Link / Promote to CRM
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-gray-200 px-4 bg-gray-50/80 overflow-x-auto text-sm">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'equipment', label: `Equipment (${(detail?.moduleList?.length || summary.modulesCount) + (detail?.inverterList?.length || summary.invertersCount)})`, icon: Cpu },
            { id: 'subsidy', label: 'Subsidy & Loan', icon: IndianRupee },
            { id: 'inspection', label: 'Inspection', icon: ShieldCheck },
            { id: 'documents', label: `Documents (${detail?.documentList?.length || summary.docsCount})`, icon: FileText },
            { id: 'crm', label: 'CRM Sync', icon: RefreshCw },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'border-teal-700 text-teal-800 bg-white shadow-sm'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-gray-800">
          {loading && !detail ? (
            <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
              <p className="text-sm">Hydrating full application details...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Grid cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Consumer & Address Card */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" /> Consumer & Address
                      </h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Applicant Name:</dt>
                          <dd className="font-semibold text-gray-900 text-right">{detail?.consumerName || summary.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Service Connection (SC):</dt>
                          <dd className="font-mono text-gray-900 font-medium">{detail?.consumerNo || summary.sc || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Mobile:</dt>
                          <dd className="font-medium text-gray-900">{detail?.mobile || summary.phone || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Email:</dt>
                          <dd className="text-gray-900">{detail?.email || summary.email || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Address:</dt>
                          <dd className="text-gray-900 text-right max-w-[240px] text-xs">{detail?.address || summary.address || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Pincode:</dt>
                          <dd className="text-gray-900">{detail?.pinCode || summary.pincode || '—'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* DISCOM & Hierarchy */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600" /> DISCOM Jurisdiction
                      </h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Circle:</dt>
                          <dd className="font-medium text-gray-900">{detail?.circleName || summary.circle || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Division:</dt>
                          <dd className="text-gray-900">{detail?.divisionName || summary.division || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Sub-Division:</dt>
                          <dd className="text-gray-900">{detail?.subDivisionName || summary.subdiv || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Panchayat / Village:</dt>
                          <dd className="text-gray-900">{detail?.villagePanchayatName || detail?.villageName || summary.village || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">District / State:</dt>
                          <dd className="text-gray-900">{detail?.districtName || summary.district || ''}, {detail?.stateName || summary.state || ''}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Vendor Organization:</dt>
                          <dd className="font-medium text-teal-800 text-right max-w-[220px] text-xs">{detail?.vendorName || summary.vendor || '—'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Capacity & Electrical */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Electrical & Load Specs
                      </h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Applied Solar Capacity:</dt>
                          <dd className="font-bold text-teal-700">{detail?.appliedCapacity || summary.cap} kW</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Existing Sanctioned Load:</dt>
                          <dd className="text-gray-900">{detail?.sanctionLoad || summary.sanctionLoad} kW</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Connection Type:</dt>
                          <dd className="text-gray-900">{detail?.connectionType || 'Single Phase'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Tariff Category:</dt>
                          <dd className="text-gray-900">{detail?.categoryName || 'Residential'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">DCR Type:</dt>
                          <dd className="font-medium text-purple-700">{detail?.dcrType || (summary.hasDcr ? 'With DCR' : 'Standard')}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Portal Timeline & Status */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" /> Portal Timeline
                      </h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Current Step:</dt>
                          <dd className="font-bold text-emerald-700">{detail?.stepName || summary.step || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Submitted On:</dt>
                          <dd className="text-gray-900 text-xs">{detail?.submittedDate || detail?.appSubmissionDate || summary.submissionDate || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Feasibility Approved Date:</dt>
                          <dd className="text-gray-900 text-xs">{detail?.feasibilityDate || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Net Metering Date:</dt>
                          <dd className="text-gray-900 text-xs">{detail?.netMeteringDate || summary.netMeterDate || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Auto Approved:</dt>
                          <dd className="text-gray-900">{detail?.isAutoApproved === 'Y' ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 2: EQUIPMENT */}
              {activeTab === 'equipment' && (() => {
                // Determine modules list: prefer detail.moduleList, fallback to summary.panelSerials / summary.moduleMfr
                const hasDetailModules = detail?.moduleList && detail.moduleList.length > 0;
                const hasSummaryPanels = summary.panelSerials && summary.panelSerials.length > 0;
                
                // Determine inverters list: prefer detail.inverterList, fallback to summary.invSerials / summary.invMfr
                const hasDetailInverters = detail?.inverterList && detail.inverterList.length > 0;
                const hasSummaryInverters = (summary.invSerials && summary.invSerials.length > 0) || Boolean(summary.invMfr);

                return (
                  <div className="space-y-6">
                    {/* Solar Modules Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-600" />
                          Solar PV Modules (DCR Serial Numbers)
                        </h3>
                        {(hasDetailModules || hasSummaryPanels) && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {hasDetailModules
                              ? `${detail!.moduleList!.reduce((acc, m) => acc + (m.serialNumbers?.length || m.qty || 1), 0)} Panels Registered`
                              : `${summary.panelSerials!.length} Panels Registered`}
                          </span>
                        )}
                      </div>

                      {hasDetailModules ? (
                        <div className="space-y-3">
                          {detail!.moduleList!.map((mod, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/70">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="font-bold text-gray-900">{mod.manufacturerName || summary.moduleMfr || 'Solar Module'}</span>
                                <div className="flex items-center gap-2">
                                  {mod.capacity && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                      {mod.capacity} Wp
                                    </span>
                                  )}
                                  <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                                    Qty: {mod.qty || (mod.serialNumbers ? mod.serialNumbers.length : 0)} panels
                                  </span>
                                </div>
                              </div>
                              
                              {/* Serial Numbers Pills */}
                              {mod.serialNumbers && mod.serialNumbers.length > 0 ? (
                                <div className="mt-3">
                                  <span className="text-xs text-gray-500 font-medium block mb-1.5">Registered Serial Numbers:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {mod.serialNumbers.map((rawSno, sIdx) => {
                                      const snoStr = typeof rawSno === 'string' ? rawSno : (rawSno?.serialNumber || String(rawSno));
                                      return (
                                        <span
                                          key={sIdx}
                                          onClick={() => handleCopy(snoStr, `sno-${sIdx}`)}
                                          className="inline-flex items-center gap-1 font-mono text-xs px-2 py-1 rounded bg-white border border-gray-300 text-gray-800 hover:border-teal-500 hover:bg-teal-50 cursor-pointer transition-colors shadow-2xs"
                                          title="Click to copy serial number"
                                        >
                                          {snoStr}
                                          {copiedKey === `sno-${sIdx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-400 opacity-60" />}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic mt-2">No individual serial numbers listed in portal record.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : hasSummaryPanels ? (
                        /* Fallback to summary panel serial numbers */
                        <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/40">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <span className="font-bold text-gray-900 block">{summary.moduleMfr || 'Waaree Energies / Solar Module'}</span>
                              <span className="text-xs text-gray-500">DCR Certified Rooftop Solar Modules</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {summary.cap && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                  {Math.round((summary.cap * 1000) / (summary.panelSerials?.length || 1))} Wp / module
                                </span>
                              )}
                              <span className="text-xs px-2.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
                                {summary.panelSerials!.length} Panels
                              </span>
                            </div>
                          </div>

                          <div className="mt-2">
                            <span className="text-xs text-gray-600 font-semibold block mb-2">Registered DCR Module Serial Numbers:</span>
                            <div className="flex flex-wrap gap-2">
                              {summary.panelSerials!.map((sno, sIdx) => (
                                <span
                                  key={sIdx}
                                  onClick={() => handleCopy(sno, `summary-sno-${sIdx}`)}
                                  className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 cursor-pointer transition-all shadow-2xs font-semibold"
                                  title="Click to copy serial number"
                                >
                                  <span className="text-gray-400 text-[10px] font-normal">#{sIdx + 1}</span>
                                  {sno}
                                  {copiedKey === `summary-sno-${sIdx}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-gray-400 opacity-60" />
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                          No module list recorded in this portal entry.
                        </div>
                      )}
                    </div>

                    {/* Inverters Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-teal-600" />
                          Inverter Equipment
                        </h3>
                        {(hasDetailInverters || hasSummaryInverters) && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-900 border border-teal-300">
                            {hasDetailInverters
                              ? `${detail!.inverterList!.length} Inverter Unit(s)`
                              : `${summary.invSerials?.length || 1} Inverter Unit(s)`}
                          </span>
                        )}
                      </div>

                      {hasDetailInverters ? (
                        <div className="space-y-3">
                          {detail!.inverterList!.map((inv, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50/70">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <span className="font-bold text-gray-900">{inv.manufacturerName || summary.invMfr || 'Solar Inverter'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                                    {inv.capacity || summary.cap} kW
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                                    Qty: {inv.qty || 1}
                                  </span>
                                </div>
                              </div>

                              {inv.serialNumbers && inv.serialNumbers.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500 font-medium block mb-1">Inverter Serial Numbers:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {inv.serialNumbers.map((rawSno, sIdx) => {
                                      const snoStr = typeof rawSno === 'string' ? rawSno : (rawSno?.serialNumber || String(rawSno));
                                      return (
                                        <span
                                          key={sIdx}
                                          onClick={() => handleCopy(snoStr, `inv-${sIdx}`)}
                                          className="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded bg-white border border-gray-300 text-gray-800 hover:border-teal-500 hover:bg-teal-50 cursor-pointer shadow-2xs"
                                          title="Click to copy serial number"
                                        >
                                          {snoStr}
                                          {copiedKey === `inv-${sIdx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-400 opacity-60" />}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : hasSummaryInverters ? (
                        /* Fallback to summary inverter info */
                        <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/40">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <span className="font-bold text-gray-900 block">{summary.invMfr || 'Grid-Tied Solar Inverter'}</span>
                              <span className="text-xs text-gray-500">Grid Connected Solar Inverter</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2.5 py-0.5 rounded bg-teal-100 text-teal-800 font-bold">
                                {summary.cap || 3} kW Capacity
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 font-medium">
                                Qty: {summary.invSerials?.length || 1}
                              </span>
                            </div>
                          </div>

                          {summary.invSerials && summary.invSerials.length > 0 && (
                            <div className="mt-3">
                              <span className="text-xs text-gray-600 font-semibold block mb-1.5">Inverter Serial Number(s):</span>
                              <div className="flex flex-wrap gap-2">
                                {summary.invSerials.map((sno, sIdx) => (
                                  <span
                                    key={sIdx}
                                    onClick={() => handleCopy(sno, `summary-inv-${sIdx}`)}
                                    className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-900 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-900 cursor-pointer transition-all shadow-2xs font-semibold"
                                    title="Click to copy serial number"
                                  >
                                    {sno}
                                    {copiedKey === `summary-inv-${sIdx}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5 text-gray-400 opacity-60" />
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                          No inverter equipment listed in this portal entry.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB 3: SUBSIDY & LOAN */}
              {activeTab === 'subsidy' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Subsidy Info */}
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-1.5">
                        <IndianRupee className="w-4 h-4 text-emerald-600" /> CFA Subsidy Status
                      </h3>
                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between items-center">
                          <dt className="text-gray-600">Total Subsidy Amount:</dt>
                          <dd className="text-lg font-bold text-emerald-700">
                            ₹{(detail?.subsidyAmount || summary.subsidyAmt || 0).toLocaleString('en-IN')}
                          </dd>
                        </div>
                        <div className="flex justify-between items-center">
                          <dt className="text-gray-600">Disbursal Status:</dt>
                          <dd>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {detail?.subsidyStatus || summary.subsidyStatus || 'Pending Disbursal'}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Bank Details */}
                    <div className="border border-gray-200 bg-gray-50 rounded-xl p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-teal-600" /> Beneficiary Bank Account
                      </h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Account Holder:</dt>
                          <dd className="font-semibold text-gray-900">{detail?.accountHolderName || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Bank Name:</dt>
                          <dd className="text-gray-900">{detail?.bankName || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Account Number:</dt>
                          <dd className="font-mono font-medium text-gray-900">{detail?.accountNumber || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">IFSC Code:</dt>
                          <dd className="font-mono text-gray-900">{detail?.ifscCode || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Verification Remark:</dt>
                          <dd className="text-xs text-gray-700">{detail?.bankRemark || '—'}</dd>
                        </div>
                      </dl>
                    </div>

                    {/* Bank Loan Details */}
                    <div className="border border-gray-200 bg-gray-50 rounded-xl p-4 md:col-span-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-600" /> Solar Bank Loan Application
                      </h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-gray-500 mb-0.5">Loan Application Number</dt>
                          <dd className="font-mono font-medium text-gray-900">{detail?.loanApplicationNumber || 'Not applied'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 mb-0.5">Sanctioned Amount</dt>
                          <dd className="font-semibold text-gray-900">
                            {detail?.sanctionAmount ? `₹${detail.sanctionAmount.toLocaleString('en-IN')}` : '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500 mb-0.5">Loan Status</dt>
                          <dd className="font-medium text-teal-800">{detail?.currentLoanStatus || '—'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: INSPECTION */}
              {activeTab === 'inspection' && (
                <div className="space-y-4">
                  <div className="border border-gray-200 bg-gray-50 rounded-xl p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" /> DISCOM Site Inspection & Net Metering
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-gray-500 mb-0.5">Inspection Officer</dt>
                        <dd className="font-medium text-gray-900">{detail?.inspectionByName || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500 mb-0.5">Officer Designation</dt>
                        <dd className="text-gray-900">{detail?.designation || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500 mb-0.5">Inspection Date</dt>
                        <dd className="text-gray-900">{detail?.inspectionDate || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500 mb-0.5">Net Metering Release Date</dt>
                        <dd className="font-semibold text-teal-800">{detail?.netMeteringDate || summary.netMeterDate || '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-500 mb-0.5">Inspection Remarks</dt>
                        <dd className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800">
                          {detail?.inspectionRemark || 'No specific remarks recorded.'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Checklist */}
                  {detail?.checklistFilledAtInspection && detail.checklistFilledAtInspection.length > 0 && (
                    <div className="border border-gray-200 rounded-xl p-4 bg-white">
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">On-Site Compliance Checklist</h4>
                      <div className="space-y-2">
                        {detail.checklistFilledAtInspection.map((chk, cIdx) => (
                          <div key={cIdx} className="flex items-start justify-between gap-3 text-xs p-2 rounded bg-gray-50 border border-gray-100">
                            <span className="text-gray-800">{chk.checklistName}</span>
                            <span className={`px-2 py-0.5 rounded font-bold uppercase ${chk.status === 'YES' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {chk.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-gray-500">
                      Uploaded Verification Documents ({detail?.documentList?.length || 0})
                    </span>
                    <span className="text-xs text-gray-400">Synced from National Portal</span>
                  </div>

                  {detail?.documentList && detail.documentList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detail.documentList.map((doc, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-xl p-3 bg-gray-50/70 hover:bg-white hover:border-teal-400 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-xs text-gray-900 line-clamp-1">{doc.documentType || 'Document'}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 uppercase font-mono">
                                {doc.docGroup || 'Upload'}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-gray-500 truncate" title={doc.fileName}>
                              {doc.fileName || 'Attachment'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                            <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}</span>
                            {doc.fileSize && <span>{doc.fileSize}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                      No document attachments recorded in this entry.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: CRM SYNC */}
              {activeTab === 'crm' && (
                <div className="space-y-5">
                  <div className="border border-teal-200 bg-teal-50/50 rounded-xl p-5">
                    <h3 className="text-base font-bold text-teal-900 mb-2 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-teal-700" />
                      Tejo Bharat Solar CRM Integration
                    </h3>
                    <p className="text-xs sm:text-sm text-teal-800/90 leading-relaxed mb-4">
                      Seamlessly link or import this PM Surya Ghar National Portal application into your active Tejo Bharat customer database. All technical specifications, inverter models, solar module serial numbers, and DISCOM hierarchy will be synchronized.
                    </p>

                    {/* Status Card */}
                    <div className="bg-white border border-teal-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">CRM Link Status</span>
                          <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                            {crmChecking ? (
                              <span className="flex items-center gap-1.5 text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> Checking CRM database...
                              </span>
                            ) : crmMatch ? (
                              <span className="text-emerald-700 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Matches Existing Customer: {crmMatch.customer_name}
                              </span>
                            ) : (
                              <span className="text-amber-700 flex items-center gap-1.5">
                                <Info className="w-4 h-4 text-amber-600" /> Not yet added to Tejo Bharat Customers
                              </span>
                            )}
                          </h4>
                          {crmMatch && (
                            <p className="text-xs text-gray-500 mt-1">
                              Status: <span className="font-semibold text-gray-700">{crmMatch.overall_status || 'In Progress'}</span> | Subsidy: {crmMatch.subsidy_status || 'Pending'}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={handleSyncToCRM}
                          disabled={syncing}
                          className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 ${
                            crmMatch
                              ? 'bg-teal-700 hover:bg-teal-800 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          } ${syncing ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {syncing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Syncing...
                            </>
                          ) : crmMatch ? (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Update Customer with Portal Data
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" />
                              Add as New Tejo Bharat Customer
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    {syncSuccessMessage && (
                      <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        {syncSuccessMessage}
                      </div>
                    )}
                    {syncErrorMessage && (
                      <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-lg text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        {syncErrorMessage}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>National Portal ID: #{summary.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
