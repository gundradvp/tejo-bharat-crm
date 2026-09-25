import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, Copy, Check, MapPin, Zap, Calendar, Clock, MessageSquare, MessageCircle, User, Save, Loader2, FileText, Hash, Gauge, Home, Tag, Activity, Receipt, IndianRupee, ClipboardList, Sun as SunIcon, ExternalLink } from 'lucide-react';
import {
  EBCustomer,
  EBCustomerCall,
  EBBillRecord,
  CALL_STATUSES,
  CALL_STATUS_LABELS,
  CALL_STATUS_COLORS,
  updateEBCustomerCallStatus,
  updateEBSolarFlag,
  fetchEBCallHistory,
  fetchEBBillsForCustomer,
  JSPMemberLink,
  fetchJSPMembersForEBCustomers,
} from '../../lib/ebApi';
import { extractAreaCode, findVillagesForCode } from '../../lib/areaCodeCatalog';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  customer: EBCustomer | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EBCustomerDetailModal({ customer, onClose, onUpdate }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';
  const areaCode = customer ? extractAreaCode(customer.sc_number) : null;
  const areaVillages = useMemo(() => (areaCode ? findVillagesForCode(areaCode) : []), [areaCode]);
  const [callStatus, setCallStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [callHistory, setCallHistory] = useState<EBCustomerCall[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [bills, setBills] = useState<EBBillRecord[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [solarInstalled, setSolarInstalled] = useState(false);
  const [solarSaving, setSolarSaving] = useState(false);
  const [jspMember, setJspMember] = useState<JSPMemberLink | null>(null);
  const [loadingJsp, setLoadingJsp] = useState(false);

  useEffect(() => {
    if (customer) {
      setCallStatus(customer.call_status || 'not_called');
      setRemark(customer.remark || '');
      setFollowUpDate(customer.follow_up_date || '');
      setSolarInstalled(customer.solar_already_installed || false);
      loadCallHistory(customer.id);
      loadBills(customer.id);

      const cleanMobile = (customer.mobile_number || customer.phone || '').replace(/\D/g, '').slice(-10);
      if (isAdmin && cleanMobile && cleanMobile.length === 10) {
        setLoadingJsp(true);
        fetchJSPMembersForEBCustomers([cleanMobile])
          .then((map) => {
            setJspMember(map[cleanMobile] || null);
          })
          .catch((err) => console.error('Error fetching JSP member:', err))
          .finally(() => setLoadingJsp(false));
        setJspMember(null);
      }
    }
  }, [customer, isAdmin]);

  const loadBills = async (customerId: string) => {
    setLoadingBills(true);
    try {
      const billData = await fetchEBBillsForCustomer(customerId);
      setBills(billData);
    } catch (err) {
      console.error('Error loading bills:', err);
    } finally {
      setLoadingBills(false);
    }
  };

  const loadCallHistory = async (customerId: string) => {
    setLoadingHistory(true);
    try {
      const history = await fetchEBCallHistory(customerId);
      setCallHistory(history);
    } catch (err) {
      console.error('Error loading call history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!customer) return null;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    if (!customer || !user) return;
    setSaving(true);
    try {
      await updateEBCustomerCallStatus(
        customer.id,
        callStatus,
        remark,
        followUpDate,
        user.id
      );

      loadCallHistory(customer.id);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
      onUpdate();
    } catch (err: any) {
      console.error('Error saving call log:', err);
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Converts English uppercase letters to Blue Unicode regional indicator letters (BlueWords / Stylish Text style)
  const toBlueLetters = (str: string): string => {
    return str.split('').map((char) => {
      const code = char.toUpperCase().charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCodePoint(0x1F1E6 + (code - 65)) + '\u200B';
      }
      return char;
    }).join('');
  };

  // Converts digits to math bold unicode characters (𝟏 𝟐 𝟑...)
  const toMathBoldDigits = (str: string): string => {
    return str.split('').map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 48 && code <= 57) {
        return String.fromCodePoint(0x1D7CE + (code - 48));
      }
      return char;
    }).join('');
  };

  const maxBilledUnits = useMemo(() => {
    if (!bills || bills.length === 0) return 0;
    return Math.max(...bills.map((b) => (b.billed_units != null ? Number(b.billed_units) : 0)));
  }, [bills]);

  const formatBillRecordForCopy = (b: EBBillRecord, isWhatsApp = false): string => {
    const month = b.bill_month || (b.bill_month_index ? `${MONTH_NAMES[b.bill_month_index - 1]} ${b.bill_year || ''}`.trim() : '-');
    const rawUnits = b.billed_units != null ? Number(b.billed_units) : null;
    const isMax = rawUnits != null && rawUnits > 0 && rawUnits === maxBilledUnits;
    const amount = b.bill_amount != null ? `₹${Number(b.bill_amount).toLocaleString('en-IN')}` : null;

    if (isWhatsApp) {
      if (isMax) {
        const blueMaxBadge = toBlueLetters('MAX UNITS');
        const boldUnits = toMathBoldDigits(rawUnits.toLocaleString('en-IN'));
        const parts = [`🔥 🔵 *[${blueMaxBadge}] ${month}* - *${boldUnits} units*`];
        if (amount) parts.push(`*${amount}* ⚡`);
        return parts.join(' - ');
      }
      const units = rawUnits != null ? `${rawUnits.toLocaleString('en-IN')} units` : null;
      const parts = [`• ${month}`];
      if (units) parts.push(units);
      if (amount) parts.push(amount);
      return parts.join(' - ');
    }

    // Standard plain-text
    const units = rawUnits != null ? `${rawUnits.toLocaleString('en-IN')} units` : null;
    const billParts = [month];
    if (units) billParts.push(units);
    if (amount) billParts.push(amount);
    if (isMax) billParts.push('⭐ (MAX UNITS)');
    return billParts.join(' - ');
  };

  const fullAddress = [customer.address1, customer.address2, customer.address3, customer.address4]
    .filter(Boolean)
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(', ') || [
      customer.colony_name,
      customer.panchayath_name,
      customer.mandal_name,
      customer.area_name,
      customer.section_name,
      customer.ero_name,
    ]
      .filter(Boolean)
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(', ');

  const handleCopyWhatsApp = () => {
    const parts = [
      `👤 *Customer:* ${customer.customer_name || '-'}`,
      `⚡ *SC Number:* ${customer.sc_number || '-'}`,
      areaCode ? `🏢 *Area Code:* ${areaCode}${areaVillages.length > 0 ? ` (${areaVillages[0]})` : ''}` : null,
      `📱 *Mobile:* ${customer.mobile_number || customer.phone || '-'}`,
      customer.contracted_load ? `🔌 *Sanctioned Load:* ${customer.contracted_load} ${customer.load_unit || 'KW'}` : null,
      fullAddress ? `📍 *Address:* ${fullAddress}` : null,
    ].filter(Boolean);

    const billLines = bills.map((b) => formatBillRecordForCopy(b, true));
    if (billLines.length > 0) {
      parts.push('', '📊 *BILL HISTORY:*', ...billLines);
    }

    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedField('whatsapp');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    const parts = [
      `Name: ${customer.customer_name || '-'}`,
      `SC Number: ${customer.sc_number || '-'}`,
      areaCode ? `Area Code: ${areaCode}${areaVillages.length > 0 ? ` (${areaVillages[0]})` : ''}` : null,
      `Mobile: ${customer.mobile_number || customer.phone || '-'}`,
      fullAddress ? `Address: ${fullAddress}` : null,
    ].filter(Boolean);

    const billLines = bills.map((b) => formatBillRecordForCopy(b, false));
    if (billLines.length > 0) {
      parts.push('Bill History:', ...billLines);
    }

    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {customer.customer_name || 'EB Customer'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500 font-mono">{customer.sc_number}</p>
                {areaCode && (
                  <span
                    className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200"
                    title={areaVillages.length > 0 ? areaVillages.join(', ') : `Area Code: ${areaCode}`}
                  >
                    Area: {areaCode}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                copiedField === 'whatsapp'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Copy customer info formatted for WhatsApp with colored/styled Max Units"
            >
              {copiedField === 'whatsapp' ? <Check className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {copiedField === 'whatsapp' ? 'Copied for WhatsApp!' : 'Copy for WhatsApp'}
            </button>
            <button
              onClick={handleCopyAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                copiedField === 'all'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
              title="Copy name, SC number, mobile, address and bill history (plain text)"
            >
              {copiedField === 'all' ? <Check className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
              {copiedField === 'all' ? 'Copied!' : 'Copy All'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="ERO" value={customer.ero_name} />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Section" value={customer.section_name} />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Area" value={customer.area_name} />
              {customer.mandal_name && (
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Mandal" value={customer.mandal_name} />
              )}
              {customer.panchayath_name && (
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Panchayath" value={customer.panchayath_name} />
              )}
            </div>
            <div className="space-y-2">
              {/* Mobile with call/copy actions */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Mobile</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {customer.mobile_number || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {customer.mobile_number && (
                    <>
                      <a
                        href={`tel:${customer.mobile_number}`}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        title="Click to Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(customer.mobile_number!, 'mobile')}
                        className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                        title="Copy"
                      >
                        {copiedField === 'mobile' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {customer.phone && (
                <InfoItem icon={<Phone className="w-4 h-4" />} label="Phone" value={customer.phone} />
              )}

              <CopyField label="SC Number" value={customer.sc_number} copied={copiedField === 'sc'} onCopy={() => copyToClipboard(customer.sc_number, 'sc')} />

              {areaCode && (
                <InfoItem
                  icon={<MapPin className="w-4 h-4 text-purple-600" />}
                  label="Area Code / Village"
                  value={areaVillages.length > 0 ? `${areaCode} (${areaVillages[0]})` : areaCode}
                />
              )}

              {customer.uksc_number && (
                <InfoItem icon={<Hash className="w-4 h-4" />} label="UKSC No" value={customer.uksc_number} />
              )}
              {customer.aadhaar_number && (
                <InfoItem icon={<FileText className="w-4 h-4" />} label="Aadhaar" value={customer.aadhaar_number} />
              )}
            </div>
          </div>

          {/* Address */}
          {fullAddress && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                Address
              </p>
              <p className="text-sm font-medium text-gray-900">{fullAddress}</p>
            </div>
          )}

          {/* Load & Category stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Contracted Load" value={customer.contracted_load != null ? `${customer.contracted_load} ${customer.load_unit || ''}` : '-'} icon={<Zap className="w-4 h-4 text-yellow-500" />} />
            <StatBox label="Connected Load" value={customer.connected_load != null ? `${customer.connected_load}` : '-'} icon={<Gauge className="w-4 h-4 text-orange-500" />} />
            <StatBox label="Phase" value={customer.phase || '-'} icon={<Activity className="w-4 h-4 text-blue-500" />} />
            <StatBox label="Category" value={customer.category || '-'} icon={<Tag className="w-4 h-4 text-purple-500" />} />
          </div>

          {/* Meter & Service details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoItem icon={<FileText className="w-4 h-4" />} label="Meter No" value={customer.meter_no} />
            <InfoItem icon={<FileText className="w-4 h-4" />} label="Meter Make" value={customer.meter_make} />
            <InfoItem icon={<Calendar className="w-4 h-4" />} label="Supply Release Date" value={formatDate(customer.supply_release_date)} />
            <InfoItem icon={<Activity className="w-4 h-4" />} label="Status" value={customer.status} />
            <InfoItem icon={<FileText className="w-4 h-4" />} label="Service Type" value={customer.service_type} />
            <InfoItem icon={<FileText className="w-4 h-4" />} label="Sub Group" value={customer.sub_group} />
            {customer.feeder_name && (
              <InfoItem icon={<Zap className="w-4 h-4" />} label="Feeder" value={`${customer.feeder_name}${customer.feeder_no ? ` (${customer.feeder_no})` : ''}`} />
            )}
            {customer.sub_station_name && (
              <InfoItem icon={<Zap className="w-4 h-4" />} label="Sub Station" value={customer.sub_station_name} />
            )}
            {customer.sd_amount != null && (
              <InfoItem icon={<FileText className="w-4 h-4" />} label="SD Amount" value={`₹${Number(customer.sd_amount).toLocaleString('en-IN')}`} />
            )}
            {customer.sc_st_flag && (
              <InfoItem icon={<Tag className="w-4 h-4" />} label="SC/ST Flag" value={customer.sc_st_flag} />
            )}
            {customer.ir_flag && (
              <InfoItem icon={<Tag className="w-4 h-4" />} label="IR Flag" value={customer.ir_flag} />
            )}
          </div>

          {/* Solar flag toggle */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <SunIcon className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Solar Already Installed</p>
                  <p className="text-xs text-gray-500">Mark this customer as having solar installed</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!customer) return;
                  setSolarSaving(true);
                  const newVal = !solarInstalled;
                  setSolarInstalled(newVal);
                  try {
                    await updateEBSolarFlag(customer.id, newVal);
                    onUpdate();
                  } catch (err: any) {
                    setSolarInstalled(!newVal);
                    alert('Failed to update solar flag: ' + (err.message || 'Unknown error'));
                  } finally {
                    setSolarSaving(false);
                  }
                }}
                disabled={solarSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  solarInstalled ? 'bg-amber-500' : 'bg-gray-300'
                } disabled:opacity-50`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    solarInstalled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
              </button>
            </div>
          </div>

          {/* JSP Political Membership Details - Admin Only */}
          {isAdmin && (
            loadingJsp ? (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-red-50 p-3 rounded-xl border border-red-100">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  Checking JSP Membership status...
                </div>
              </div>
            ) : jspMember ? (
              <div className="border-t border-gray-200 pt-4">
                <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-xl p-4 border border-red-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
                      <h3 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                        JSP Political Membership Record
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/jsp/members?search=${encodeURIComponent(jspMember.mobile || jspMember.jsp_id || customer.mobile_number || '')}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View JSP Profile
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white/80 rounded-lg p-2 border border-red-100">
                      <span className="text-gray-500 block">JSP ID</span>
                      <span className="font-semibold font-mono text-gray-900">{jspMember.jsp_id || '-'}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-red-100">
                      <span className="text-gray-500 block">Member Name</span>
                      <span className="font-semibold text-gray-900">{jspMember.name || '-'}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-red-100">
                      <span className="text-gray-500 block">Constituency</span>
                      <span className="font-semibold text-gray-900">{jspMember.constituency_name || '-'}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-red-100">
                      <span className="text-gray-500 block">Mandal</span>
                      <span className="font-semibold text-gray-900">{jspMember.mandal_name || '-'}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-red-100">
                      <span className="text-gray-500 block">Panchayat</span>
                      <span className="font-semibold text-gray-900">{jspMember.panchayat_name || '-'}</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-2 border border-red-100">
                      <span className="text-gray-500 block">Volunteer</span>
                      <span className="font-semibold text-gray-900">{jspMember.volunteername || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          )}

          {/* Call Log & Follow-up */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Call Log & Follow-up
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Call Outcome</label>
                <select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CALL_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remark / Notes</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  placeholder="Write down what the customer said..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : showSaveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Call Log
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bill History */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Bill History ({bills.length})
            </h3>
            {loadingBills ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : bills.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No bill data imported yet</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {bills.map((bill) => {
                  const isMax = bill.billed_units != null && Number(bill.billed_units) === maxBilledUnits && maxBilledUnits > 0;
                  return (
                    <div
                      key={bill.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isMax ? 'bg-blue-50/80 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900">{bill.bill_month || '-'}</p>
                          {isMax && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              MAX
                            </span>
                          )}
                        </div>
                        {bill.bill_status && (
                          <p className="text-xs text-gray-500">{bill.bill_status}</p>
                        )}
                      </div>
                      {bill.bill_amount != null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500 flex items-center gap-0.5">
                            <IndianRupee className="w-3 h-3" /> Amount
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {Number(bill.bill_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {bill.billed_units != null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500 flex items-center gap-0.5">
                            <Gauge className="w-3 h-3" /> Units
                          </p>
                          <p className={`text-sm font-semibold ${isMax ? 'text-blue-900 font-bold' : 'text-gray-900'}`}>
                            {Number(bill.billed_units).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Call History */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Call History ({callHistory.length})
            </h3>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : callHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No calls logged yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {callHistory.map((call) => (
                  <div key={call.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${CALL_STATUS_COLORS[call.call_status] || 'bg-gray-100 text-gray-600'}`}>
                      {CALL_STATUS_LABELS[call.call_status] || call.call_status}
                    </span>
                    <div className="flex-1 min-w-0">
                      {call.remark && <p className="text-sm text-gray-700 break-words">{call.remark}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{formatDateTime(call.called_at)}</span>
                        {call.called_by_profile?.full_name && (
                          <span className="text-xs text-gray-500">by {call.called_by_profile.full_name}</span>
                        )}
                        {call.follow_up_date && (
                          <span className="text-xs text-blue-600">Follow-up: {formatDate(call.follow_up_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value || '-'}</p>
      </div>
    </div>
  );
}

function CopyField({ label, value, copied, onCopy }: { label: string; value?: string | null; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate font-mono">{value || '-'}</p>
      </div>
      {value && (
        <button
          onClick={onCopy}
          className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors flex-shrink-0"
          title="Copy"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
