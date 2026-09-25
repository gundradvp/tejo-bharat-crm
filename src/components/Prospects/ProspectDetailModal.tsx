import { useState, useEffect, useMemo } from 'react';
import {
  X, Phone, Copy, Check, Link2, MapPin, Zap, Calendar, Mail,
  Phone as PhoneIcon, Clock, MessageSquare, MessageCircle, User, Save, Loader2, FileText,
  Receipt, Gauge, IndianRupee, ClipboardList, Home,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LeadProspect, LeadProspectCall, CALL_STATUSES, CALL_STATUS_LABELS, CALL_STATUS_COLORS, ProspectBillRecord, fetchProspectBillHistory, extractAreaCode } from '../../lib/prospectApi';
import { findVillagesForCode } from '../../lib/areaCodeCatalog';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface Props {
  prospect: LeadProspect | null;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProspectDetailModal({ prospect, onClose, onUpdate }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callStatus, setCallStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [callHistory, setCallHistory] = useState<LeadProspectCall[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [billHistory, setBillHistory] = useState<ProspectBillRecord[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    if (prospect) {
      setCallStatus(prospect.call_status || 'not_called');
      setRemark(prospect.remark || '');
      setFollowUpDate(prospect.follow_up_date || '');
      loadCallHistory(prospect.id);
      loadBillHistory(prospect.id);
      loadAddress(prospect);
    }
  }, [prospect]);

  const loadAddress = async (p: LeadProspect) => {
    const locParts = [
      p.village_name,
      p.panchayath_name,
      p.mandal_name,
      p.section_name,
      p.subdiv_name,
      p.division_name,
      p.circle_name,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter(Boolean);

    const initialFallback = locParts
      .filter((item, index) => locParts.indexOf(item) === index)
      .join(', ');

    if (initialFallback) {
      setAddress(initialFallback);
    } else {
      setAddress(null);
    }

    if (p.sc_number) {
      try {
        const { data: ebData } = await supabase
          .from('eb_customers')
          .select('address1, address2, address3, address4')
          .eq('sc_number', p.sc_number)
          .maybeSingle();

        if (ebData) {
          const addr = [ebData.address1, ebData.address2, ebData.address3, ebData.address4]
            .filter(Boolean)
            .map((s: string) => s?.trim())
            .filter(Boolean)
            .join(', ');
          if (addr) {
            setAddress(addr);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading eb address for prospect:', err);
      }
    }

    if (p.linked_customer_id) {
      try {
        const { data: custData } = await supabase
          .from('customers')
          .select('address')
          .eq('id', p.linked_customer_id)
          .maybeSingle();

        if (custData?.address?.trim()) {
          setAddress(custData.address.trim());
          return;
        }
      } catch (err) {
        console.error('Error loading customer address for prospect:', err);
      }
    }
  };

  const loadCallHistory = async (prospectId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('lead_prospect_calls')
        .select('*, called_by_profile:profiles!lead_prospect_calls_called_by_fkey(id, full_name)')
        .eq('prospect_id', prospectId)
        .order('called_at', { ascending: false });

      if (error) throw error;
      setCallHistory(data || []);
    } catch (err) {
      console.error('Error loading call history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadBillHistory = async (prospectId: string) => {
    setLoadingBills(true);
    try {
      const bills = await fetchProspectBillHistory(prospectId);
      setBillHistory(bills);
    } catch (err) {
      console.error('Error loading bill history:', err);
      setBillHistory([]);
    } finally {
      setLoadingBills(false);
    }
  };

  if (!prospect) return null;

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    if (!prospect || !user) return;
    setSaving(true);
    try {
      const statusChanged = callStatus !== prospect.call_status;
      const remarkChanged = remark !== (prospect.remark || '');

      if (statusChanged || remarkChanged || followUpDate !== (prospect.follow_up_date || '')) {
        const updatePayload: any = {
          call_status: callStatus,
          remark: remark || null,
          follow_up_date: followUpDate || null,
        };

        if (callStatus !== 'not_called') {
          updatePayload.last_called_at = new Date().toISOString();
          updatePayload.called_by = user.id;
        }

        const { error: updateError } = await supabase
          .from('lead_prospects')
          .update(updatePayload)
          .eq('id', prospect.id);

        if (updateError) throw updateError;

        if (statusChanged || remarkChanged) {
          await supabase.from('lead_prospect_calls').insert({
            prospect_id: prospect.id,
            call_status: callStatus,
            remark: remark || null,
            called_by: user.id,
            follow_up_date: followUpDate || null,
          });

          loadCallHistory(prospect.id);
        }

        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000);
        onUpdate();
      }
    } catch (err: any) {
      console.error('Error saving call log:', err);
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const bills = [
    { amount: prospect.bill_amount_1, month: prospect.bill_month_1, label: 'Month 1' },
    { amount: prospect.bill_amount_2, month: prospect.bill_month_2, label: 'Month 2' },
    { amount: prospect.bill_amount_3, month: prospect.bill_month_3, label: 'Month 3' },
  ].filter((b) => b.amount !== undefined && b.amount !== null);

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
    if (!billHistory || billHistory.length === 0) return 0;
    return Math.max(...billHistory.map((b) => (b.billed_units != null ? Number(b.billed_units) : 0)));
  }, [billHistory]);

  const formatBillRecordForCopy = (b: ProspectBillRecord, isWhatsApp = false): string => {
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

  const handleCopyWhatsApp = () => {
    const area = extractAreaCode(prospect.sc_number);
    const villages = area ? findVillagesForCode(area) : [];
    const parts = [
      `👤 *Prospect:* ${prospect.customer_name || '-'}`,
      `⚡ *SC Number:* ${prospect.sc_number || '-'}`,
      area ? `🏷️ *Area Code:* ${area}${villages.length > 0 ? ` (${villages[0]})` : ''}` : null,
      `📱 *Mobile:* ${prospect.mobile_number || '-'}`,
      prospect.contracted_load ? `🔌 *Sanctioned Load:* ${prospect.contracted_load} ${prospect.load_unit || 'KW'}` : null,
      address ? `📍 *Address:* ${address}` : null,
    ].filter(Boolean);

    let billLines: string[] = [];
    if (billHistory.length > 0) {
      billLines = billHistory.map((b) => formatBillRecordForCopy(b, true));
    } else if (bills.length > 0) {
      billLines = bills.map((b) => {
        const month = b.month || b.label;
        const amount = b.amount != null ? `₹${Number(b.amount).toLocaleString('en-IN')}` : null;
        return amount ? `• ${month} - *${amount}*` : `• ${month}`;
      });
    }

    if (billLines.length > 0) {
      parts.push('', '📊 *BILL HISTORY:*', ...billLines);
    }

    navigator.clipboard.writeText(parts.join('\n'));
    setCopiedField('whatsapp');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCopyAll = () => {
    let billLines: string[] = [];
    if (billHistory.length > 0) {
      billLines = billHistory.map((b) => formatBillRecordForCopy(b, false));
    } else if (bills.length > 0) {
      billLines = bills.map((b) => {
        const month = b.month || b.label;
        const amount = b.amount != null ? `₹${Number(b.amount).toLocaleString('en-IN')}` : null;
        return amount ? `${month} - ${amount}` : month;
      });
    }

    const area = extractAreaCode(prospect.sc_number);
    const villages = area ? findVillagesForCode(area) : [];
    const parts = [
      `Name: ${prospect.customer_name || '-'}`,
      `SC Number: ${prospect.sc_number || '-'}`,
      area ? `Area Code: ${area}${villages.length > 0 ? ` (${villages[0]})` : ''}` : null,
      `Mobile: ${prospect.mobile_number || '-'}`,
      address ? `Address: ${address}` : null,
    ].filter(Boolean);

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
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Prospect Details</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 font-mono">{prospect.sc_number || 'No SC Number'}</p>
                {(() => {
                  const area = extractAreaCode(prospect.sc_number);
                  if (!area) return null;
                  const villages = findVillagesForCode(area);
                  return (
                    <span
                      className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-purple-100 text-purple-800 border border-purple-200"
                      title={villages.length > 0 ? villages.join(', ') : `Area Code: ${area}`}
                    >
                      Area: {area}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {prospect.mobile_number && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/whatsapp?tab=inbox`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
                title="Open WhatsApp Live Chat for this Prospect"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Chat</span>
              </button>
            )}
            <button
              onClick={handleCopyWhatsApp}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                copiedField === 'whatsapp'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Copy prospect info formatted for WhatsApp with colored/styled Max Units"
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
          {prospect.is_existing_customer && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Link2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Existing Surya Ghar Customer</p>
                <p className="text-xs text-green-700">This prospect is already in your customer list</p>
              </div>
              {prospect.linked_customer_id && (
                <button
                  onClick={() => navigate(`/customers/${prospect.linked_customer_id}`)}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Customer
                </button>
              )}
            </div>
          )}

          {/* Address */}
          {address && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                <Home className="w-3.5 h-3.5" />
                Address
              </p>
              <p className="text-sm font-medium text-gray-900">{address}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Circle" value={prospect.circle_name} />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Division" value={prospect.division_name} />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Subdiv" value={prospect.subdiv_name} />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Section" value={prospect.section_name} />
              {prospect.village_name && (
                <InfoItem icon={<MapPin className="w-4 h-4" />} label="Village" value={prospect.village_name} />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PhoneIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Mobile</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{prospect.mobile_number || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {prospect.mobile_number && (
                    <>
                      <a
                        href={`tel:${prospect.mobile_number}`}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        title="Click to Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(prospect.mobile_number!, 'mobile')}
                        className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                        title="Copy"
                      >
                        {copiedField === 'mobile' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <CopyField label="SC / Service Number" value={prospect.sc_number} copied={copiedField === 'sc'} onCopy={() => copyToClipboard(prospect.sc_number!, 'sc')} />
              {(() => {
                const area = extractAreaCode(prospect.sc_number);
                if (!area) return null;
                const villages = findVillagesForCode(area);
                return (
                  <CopyField
                    label={`Area / Service Code${villages.length > 0 ? ` (${villages[0]})` : ''}`}
                    value={area}
                    copied={copiedField === 'area'}
                    onCopy={() => copyToClipboard(area, 'area')}
                  />
                );
              })()}

              {prospect.email && (
                <InfoItem icon={<Mail className="w-4 h-4" />} label="Email" value={prospect.email} />
              )}
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Complaint Date" value={formatDate(prospect.complaint_date)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox label="CL (KW)" value={prospect.existing_load_kw != null ? `${prospect.existing_load_kw}` : '-'} icon={<Zap className="w-4 h-4 text-yellow-500" />} />
            <StatBox label="Existing Solar (KW)" value={prospect.existing_solar_load_kw != null ? `${prospect.existing_solar_load_kw}` : '-'} icon={<Zap className="w-4 h-4 text-orange-500" />} />
            <StatBox label="Applied Solar (KW)" value={prospect.applied_solar_load_kw != null ? `${prospect.applied_solar_load_kw}` : '-'} icon={<Zap className="w-4 h-4 text-green-500" />} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoItem icon={<FileText className="w-4 h-4" />} label="NP Registration No" value={prospect.np_registration_number} />
            <InfoItem icon={<FileText className="w-4 h-4" />} label="EP Registration No" value={prospect.ep_registration_number} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-0.5">National Portal Status</p>
              <p className="text-sm font-medium text-gray-900">{prospect.national_portal_status || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 mb-0.5">EPDCL Portal Status</p>
              <p className="text-sm font-medium text-gray-900">{prospect.epdcl_portal_status || '-'}</p>
            </div>
          </div>

          {bills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Monthly Bill History (Imported)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {bills.map((bill, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">{bill.month || bill.label}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {bill.amount != null ? `₹${Number(bill.amount).toLocaleString('en-IN')}` : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EB-enriched info */}
          {(prospect.ero_name || prospect.sub_station_name || prospect.mandal_name || prospect.category || prospect.eb_status || prospect.contracted_load != null) && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                EB Customer Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prospect.ero_name && <InfoItem icon={<MapPin className="w-4 h-4" />} label="ERO" value={prospect.ero_name} />}
                {prospect.section_name && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Section Office" value={prospect.section_name} />}
                {prospect.sub_station_name && <InfoItem icon={<Zap className="w-4 h-4" />} label="Sub Station" value={prospect.sub_station_name} />}
                {prospect.mandal_name && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Mandal" value={prospect.mandal_name} />}
                {prospect.category && <InfoItem icon={<FileText className="w-4 h-4" />} label="Category" value={prospect.category} />}
                {prospect.eb_status && <InfoItem icon={<Zap className="w-4 h-4" />} label="EB Status" value={prospect.eb_status} />}
                {prospect.contracted_load != null && (
                  <StatBox label="Contracted Load" value={`${prospect.contracted_load} ${prospect.load_unit || 'KW'}`} icon={<Zap className="w-4 h-4 text-yellow-500" />} />
                )}
                {prospect.connected_load != null && (
                  <StatBox label="Connected Load" value={`${prospect.connected_load} ${prospect.load_unit || 'KW'}`} icon={<Zap className="w-4 h-4 text-green-500" />} />
                )}
                {prospect.meter_no && <CopyField label="Meter No" value={prospect.meter_no} copied={copiedField === 'meter'} onCopy={() => copyToClipboard(prospect.meter_no!, 'meter')} />}
                {prospect.feeder_name && <InfoItem icon={<Zap className="w-4 h-4" />} label="Feeder" value={prospect.feeder_name} />}
                {prospect.panchayath_name && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Panchayath" value={prospect.panchayath_name} />}
                {prospect.assembly_constituency && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Assembly Constituency" value={prospect.assembly_constituency} />}
              </div>
            </div>
          )}

          {/* EB Bill History from eb_customer_bills */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              EB Billing History ({billHistory.length})
            </h3>
            {loadingBills ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : billHistory.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No EB billing history available for this SC number.
                {prospect.sc_number && (
                  <button
                    onClick={() => navigate('/eb-customers/import-bills')}
                    className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Import bills here
                  </button>
                )}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-500 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <span>Bill Month</span>
                  <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Units</span>
                  <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Amount</span>
                  <span>Status</span>
                </div>
                {billHistory.map((bill, idx) => {
                  const isMax = bill.billed_units != null && Number(bill.billed_units) === maxBilledUnits && maxBilledUnits > 0;
                  return (
                    <div
                      key={idx}
                      className={`grid grid-cols-4 gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
                        isMax ? 'bg-blue-50/80 border border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-gray-700 font-medium flex items-center gap-1.5">
                        {bill.bill_month || '-'}
                        {isMax && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            MAX
                          </span>
                        )}
                      </span>
                      <span className={isMax ? 'text-blue-900 font-bold' : 'text-gray-700'}>
                        {bill.billed_units != null ? Number(bill.billed_units).toLocaleString('en-IN') : '-'}
                      </span>
                      <span className="text-gray-700 font-semibold">
                        {bill.bill_amount != null ? `₹${Number(bill.bill_amount).toLocaleString('en-IN')}` : '-'}
                      </span>
                      <span className="text-gray-600">{bill.bill_status || '-'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
                <label className="block text-xs font-medium text-gray-600 mb-1">Remark / Reason</label>
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

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
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

function CopyField({ label, value, copied, onCopy }: { label: string; value?: string; copied: boolean; onCopy: () => void }) {
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
