import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, CreditCard as Edit2, Printer, Phone, Mail, MapPin, Hash, Copy, Check, Zap, Sun, Calendar, FileText, User, Loader2, AlertCircle, ChevronRight, MessageCircle, Clock, ExternalLink, ClipboardCopy, Users, Receipt, UserX, UserCheck } from 'lucide-react';
import { fetchBillsByScNumber } from '../../lib/ebApi';
import { getActivityLogs, getCustomerNotes } from '../../lib/notesApi';
import type { ActivityLog, CustomerNote } from '../../lib/supabase';
import { formatRelativeTime } from '../../lib/notesApi';

interface CustomerData {
  id: string;
  customer_name: string;
  consumer_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  district?: string;
  application_ref_no?: string;
  total_capacity_kw?: number;
  inverter_brand?: string;
  inverter_capacity?: number;
  panel_brand?: string;
  panel_quantity?: number;
  panel_wattage?: number;
  site_type?: string;
  commissioning_date?: string;
  current_workflow_stage?: string;
  workflow_stage_updated_at?: string;
  agreed_project_cost?: number;
  installation_status?: string;
  customer_lifecycle_status?: 'active' | 'lost';
  lost_at?: string | null;
  updated_at?: string;
  introduced_by_lead_generator_id?: string | null;
  introduction_date?: string | null;
  commission_amount?: number | null;
  commission_paid?: boolean | null;
  portal_workflow_steps?: any;
  portal_current_step_name?: string;
  portal_current_step_status?: string;
  portal_current_step_date?: string;
  portal_inverter_list?: any;
  portal_module_list?: any;
  feasibility_status?: string;
  feasibility_date?: string;
  vendor_name?: string;
  loan_application_number?: string;
  current_loan_status?: string;
  scheme_name?: string;
  approved_capacity?: string;
  applied_capacity?: string;
}

const STAGE_LABELS: Record<string, string> = {
  site_survey: 'Site Survey',
  documentation: 'Documentation',
  application: 'Application',
  approval: 'Approval',
  procurement: 'Procurement',
  installation: 'Installation',
  inspection: 'Inspection',
  commissioning: 'Commissioning',
  net_metering: 'Net Metering',
  subsidy: 'Subsidy',
  completed: 'Completed',
};

const STAGE_COLORS: Record<string, string> = {
  site_survey: 'bg-blue-100 text-blue-800',
  documentation: 'bg-yellow-100 text-yellow-800',
  application: 'bg-orange-100 text-orange-800',
  approval: 'bg-purple-100 text-purple-800',
  procurement: 'bg-indigo-100 text-indigo-800',
  installation: 'bg-amber-100 text-amber-800',
  inspection: 'bg-teal-100 text-teal-800',
  commissioning: 'bg-cyan-100 text-cyan-800',
  net_metering: 'bg-emerald-100 text-emerald-800',
  subsidy: 'bg-lime-100 text-lime-800',
  completed: 'bg-green-100 text-green-800',
};

const activityIcons: Record<string, any> = {
  note_added: MessageCircle,
  status_change: Edit2,
  task_assigned: User,
  task_completed: Check,
  document_uploaded: FileText,
  payment_received: Zap,
  customer_created: User,
  customer_updated: Edit2,
};

export default function CustomerOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [recentNotes, setRecentNotes] = useState<CustomerNote[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeInteractionTab, setActiveInteractionTab] = useState<'activity' | 'notes'>('activity');
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [leadGenerators, setLeadGenerators] = useState<any[]>([]);
  const [selectedLeadGenerator, setSelectedLeadGenerator] = useState<string>('');
  const [savingLG, setSavingLG] = useState(false);
  const [lgSaved, setLgSaved] = useState(false);
  const [ebBills, setEbBills] = useState<any[]>([]);
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false);
  const [showMarkLostModal, setShowMarkLostModal] = useState(false);
  const [lostDateInput, setLostDateInput] = useState(new Date().toISOString().slice(0, 10));

  const handleMarkAsLost = async () => {
    if (!id || updatingLifecycle) return;
    setUpdatingLifecycle(true);
    const lostIso = lostDateInput ? new Date(lostDateInput).toISOString() : new Date().toISOString();
    try {
      let { error } = await supabase
        .from('customers')
        .update({
          customer_lifecycle_status: 'lost',
          lost_at: lostIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error && error.message?.toLowerCase().includes('lost_at')) {
        const retry = await supabase
          .from('customers')
          .update({
            customer_lifecycle_status: 'lost',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        error = retry.error;
      }

      if (error) throw error;
      setCustomer(c => c ? { ...c, customer_lifecycle_status: 'lost', lost_at: lostIso } : c);
      setShowMarkLostModal(false);
    } catch (err: any) {
      console.error('Error marking as lost:', err);
      alert('Failed to mark as lost: ' + err.message);
    } finally {
      setUpdatingLifecycle(false);
    }
  };

  const handleReactivateCustomer = async () => {
    if (!id || updatingLifecycle) return;
    if (!confirm('Are you sure you want to reactivate this customer?')) return;
    setUpdatingLifecycle(true);
    try {
      let { error } = await supabase
        .from('customers')
        .update({
          customer_lifecycle_status: 'active',
          lost_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error && error.message?.toLowerCase().includes('lost_at')) {
        const retry = await supabase
          .from('customers')
          .update({
            customer_lifecycle_status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        error = retry.error;
      }

      if (error) throw error;
      setCustomer(c => c ? { ...c, customer_lifecycle_status: 'active', lost_at: null } : c);
    } catch (err: any) {
      console.error('Error reactivating customer:', err);
      alert('Failed to reactivate customer: ' + err.message);
    } finally {
      setUpdatingLifecycle(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCustomer();
      fetchRecentData();
    }
    fetchLeadGenerators();
  }, [id]);

  useEffect(() => {
    if (customer?.consumer_number) {
      fetchBillsByScNumber(customer.consumer_number).then(setEbBills).catch(() => {});
    }
  }, [customer?.consumer_number]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setCustomer(data);
    } catch (err) {
      console.error('Failed to load customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadGenerators = async () => {
    try {
      const { data } = await supabase.from('lead_generators').select('id, full_name, phone').eq('status', 'active').order('full_name');
      setLeadGenerators(data || []);
    } catch (err) {
      console.error('Failed to load lead generators:', err);
    }
  };

  const handleAssignLeadGenerator = async () => {
    if (!id) return;
    setSavingLG(true);
    setLgSaved(false);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ introduced_by_lead_generator_id: selectedLeadGenerator || null })
        .eq('id', id);
      if (error) throw error;
      setCustomer(c => c ? { ...c, introduced_by_lead_generator_id: selectedLeadGenerator || null } : c);
      setLgSaved(true);
      setTimeout(() => setLgSaved(false), 2000);
    } catch (err) {
      console.error('Failed to assign lead generator:', err);
      alert('Failed to assign lead generator');
    } finally {
      setSavingLG(false);
    }
  };

  const fetchRecentData = async () => {
    try {
      const [activity, notes] = await Promise.all([
        getActivityLogs('customer', id!, 8),
        getCustomerNotes(id!),
      ]);
      setRecentActivity(activity || []);
      setRecentNotes((notes || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load recent data:', err);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {}
  };

  const handleCopyCustomerJSON = async () => {
    if (!customer) return;
    try {
      const c = customer as any;
      const capacity = c.system_capacity ? parseFloat(String(c.system_capacity)) : 0;
      const projectData = {
        customer_name: c.customer_name || '',
        consumer_no: c.consumer_number || '',
        address: c.address || '',
        application_ref: c.application_ref_no || '',
        capacity: c.system_capacity || '',
        project_capacity_kw: capacity,
        total_watts: capacity * 1000,
        panel_number: c.panel_quantity || 0,
        panel_make: c.panel_make || '',
        panel_serial_numbers: c.panel_serial_numbers || '',
        eb_distribution: c.eb_distribution || '',
        eb_section: c.eb_section || '',
        latitude: c.latitude || '',
        longitude: c.longitude || '',
        mobile_number: c.phone || '',
        inverter_make: c.inverter_make || '',
        inverter_serial_number: c.inverter_serial_number || '',
        inverter_capacity: c.inverter_capacity || '',
        module_make: c.panel_make || '',
        module_type: c.panel_type || '',
        module_capacity: c.panel_wattage || '',
        number_of_modules: c.panel_quantity || 0,
        plant_capacity: capacity * 1000,
        plant_capacity_in_kw: capacity,
        aadhar_number: c.aadhar_number || '',
      };
      await navigator.clipboard.writeText(JSON.stringify(projectData, null, 2));
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-600">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="text-teal-700 hover:underline">
          Back to Customers
        </button>
      </div>
    );
  }

  const assignedLeadGenerator = leadGenerators.find(lg => lg.id === customer.introduced_by_lead_generator_id);
  const stage = customer.current_workflow_stage || 'site_survey';
  const stageLabel = STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
  const stageColor = STAGE_COLORS[stage] || 'bg-gray-100 text-gray-800';
  const projectId = customer.application_ref_no ||
    customer.id.replace(/-/g, '').slice(0, 6).toUpperCase();

  const isAdmin = profile?.role === 'admin' ||
    (profile?.roles && profile.roles.includes('admin'));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{customer.customer_name}</h1>
            {customer.district && (
              <p className="text-sm text-gray-500 mt-0.5">{customer.district}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </button>
            {customer.customer_lifecycle_status !== 'lost' ? (
              <button
                onClick={() => setShowMarkLostModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                title="Mark this customer as lost or churned"
              >
                <UserX className="w-4 h-4" />
                Mark as Lost
              </button>
            ) : (
              <button
                onClick={handleReactivateCustomer}
                disabled={updatingLifecycle}
                className="flex items-center gap-1.5 px-3 py-2 border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title="Reactivate customer"
              >
                <UserCheck className="w-4 h-4" />
                {updatingLifecycle ? 'Activating...' : 'Reactivate'}
              </button>
            )}
            <button
              onClick={handleCopyCustomerJSON}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              title="Copy customer data as JSON"
            >
              {copiedJSON ? <Check className="w-4 h-4 text-green-600" /> : <ClipboardCopy className="w-4 h-4" />}
              {copiedJSON ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={() => navigate(`/customers/${id}/print`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={() => navigate(`/customers/${id}/details`)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-800 text-white rounded-lg text-sm hover:bg-teal-900 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Details
            </button>
          </div>
        </div>
      </div>

      {/* Lost / Churned Alert Banner */}
      {customer.customer_lifecycle_status === 'lost' && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-red-800">
              <UserX className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Customer Lost / Churned:</span> Marked as lost on{' '}
                <span className="font-semibold underline">
                  {(customer.lost_at || customer.updated_at)
                    ? new Date(customer.lost_at || customer.updated_at!).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Unknown date'}
                </span>
                {customer.lost_at && (
                  <span className="text-xs text-red-600 ml-1.5">
                    ({new Date(customer.lost_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleReactivateCustomer}
              disabled={updatingLifecycle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-100 rounded-lg transition-colors shadow-sm self-start sm:self-auto disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5 text-green-600" />
              {updatingLifecycle ? 'Updating...' : 'Reactivate Customer'}
            </button>
          </div>
        </div>
      )}

      {/* Mark As Lost Modal */}
      {showMarkLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600 font-semibold text-base">
                <UserX className="w-5 h-5" />
                <span>Mark Customer as Lost / Churned</span>
              </div>
              <button
                onClick={() => setShowMarkLostModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600">
              This will update <strong>{customer.customer_name}</strong>'s status to <strong>Lost</strong> and record their churn date.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Lost / Churned Date
              </label>
              <input
                type="date"
                value={lostDateInput}
                onChange={(e) => setLostDateInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowMarkLostModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsLost}
                disabled={updatingLifecycle}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updatingLifecycle ? 'Saving...' : 'Confirm Mark as Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          {/* Contact Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Information</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <ContactRow
                icon={<Phone className="w-4 h-4 text-gray-400" />}
                label="Primary Phone"
                value={customer.phone}
                onCopy={() => customer.phone && copyToClipboard(customer.phone, 'phone')}
                copied={copiedField === 'phone'}
              />
              <ContactRow
                icon={<Mail className="w-4 h-4 text-gray-400" />}
                label="Email Address"
                value={customer.email}
                onCopy={() => customer.email && copyToClipboard(customer.email, 'email')}
                copied={copiedField === 'email'}
              />
              <ContactRow
                icon={<MapPin className="w-4 h-4 text-gray-400" />}
                label="Address"
                value={customer.address}
              />
              {customer.consumer_number && (
                <ContactRow
                  icon={<Hash className="w-4 h-4 text-gray-400" />}
                  label="Consumer Number"
                  value={customer.consumer_number}
                  mono
                  onCopy={() => copyToClipboard(customer.consumer_number!, 'consumer')}
                  copied={copiedField === 'consumer'}
                />
              )}
              <ContactRow
                icon={<UserX className="w-4 h-4 text-gray-400" />}
                label="Lifecycle Status"
                value={
                  customer.customer_lifecycle_status === 'lost'
                    ? `Lost / Churned (${(customer.lost_at || customer.updated_at) ? new Date(customer.lost_at || customer.updated_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown date'})`
                    : 'Active'
                }
              />
            </div>
          </div>

          {/* Installation Summary Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Installation Summary</h2>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                <InfoField
                  icon={<Zap className="w-3.5 h-3.5 text-yellow-500" />}
                  label="Inverter"
                  value={customer.inverter_brand
                    ? `${customer.inverter_brand}${customer.inverter_capacity ? ` · ${customer.inverter_capacity}kW` : ''}`
                    : null}
                />
                <InfoField
                  icon={<Sun className="w-3.5 h-3.5 text-orange-400" />}
                  label="Panels"
                  value={customer.panel_brand
                    ? `${customer.panel_brand}${customer.panel_quantity ? ` · ${customer.panel_quantity} units` : ''}`
                    : null}
                />
                <InfoField
                  label="System Capacity"
                  value={customer.total_capacity_kw ? `${customer.total_capacity_kw} kW` : null}
                />
                <InfoField
                  label="Site Type"
                  value={customer.site_type
                    ? customer.site_type.charAt(0).toUpperCase() + customer.site_type.slice(1)
                    : null}
                />
                {customer.commissioning_date && (
                  <InfoField
                    icon={<Calendar className="w-3.5 h-3.5 text-teal-500" />}
                    label="Commissioned"
                    value={new Date(customer.commissioning_date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                    className="col-span-2"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Lead Generator Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Lead Generator
              </h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {assignedLeadGenerator ? (
                <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg">
                  <div className="w-9 h-9 rounded-full bg-teal-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{assignedLeadGenerator.full_name}</p>
                    {assignedLeadGenerator.phone && (
                      <p className="text-xs text-gray-500">{assignedLeadGenerator.phone}</p>
                    )}
                  </div>
                  {customer.commission_paid && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Commission Paid</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No lead generator assigned yet.</p>
              )}
              <div className="flex items-center gap-2">
                <select
                  value={selectedLeadGenerator}
                  onChange={e => setSelectedLeadGenerator(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">{assignedLeadGenerator ? 'Change lead generator...' : 'Select lead generator...'}</option>
                  {leadGenerators.map(lg => (
                    <option key={lg.id} value={lg.id}>{lg.full_name} — {lg.phone}</option>
                  ))}
                </select>
                <button
                  onClick={handleAssignLeadGenerator}
                  disabled={!selectedLeadGenerator || savingLG}
                  className="px-4 py-2 bg-teal-800 text-white rounded-lg text-sm hover:bg-teal-900 transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  {savingLG ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : lgSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  {savingLG ? 'Saving...' : lgSaved ? 'Saved!' : 'Assign'}
                </button>
              </div>
              {leadGenerators.length === 0 && (
                <p className="text-xs text-amber-600">No active lead generators found. Add one from Lead Generator Management.</p>
              )}
            </div>
          </div>

          {/* Stats Footer */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">1</p>
                <p className="text-xs text-gray-500 mt-0.5">Installation</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              {customer.total_capacity_kw ? (
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-700">{customer.total_capacity_kw}kW</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Capacity</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">—</p>
                  <p className="text-xs text-gray-500 mt-0.5">Capacity</p>
                </div>
              )}
              <div className="w-px h-10 bg-gray-200" />
              {isAdmin && customer.agreed_project_cost ? (
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">
                    ₹{(customer.agreed_project_cost / 100000).toFixed(1)}L
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Project Value</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">—</p>
                  <p className="text-xs text-gray-500 mt-0.5">Value</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 space-y-5">
          {/* Project Card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Solar Installation
              </h2>
              <button
                onClick={() => navigate(`/customers/${id}/details`)}
                className="text-xs text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                View full details <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project ID</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <button
                        onClick={() => navigate(`/customers/${id}/details`)}
                        className="font-mono text-teal-700 hover:text-teal-900 hover:underline font-medium"
                      >
                        {projectId}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {customer.total_capacity_kw ? `${customer.total_capacity_kw} kW` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${stageColor}`}>
                        {stageLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {customer.customer_lifecycle_status === 'lost' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                          <UserX className="w-3 h-3 text-red-600" />
                          Lost {(customer.lost_at || customer.updated_at) ? `(${new Date(customer.lost_at || customer.updated_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-teal-900 text-white">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {customer.workflow_stage_updated_at
                        ? new Date(customer.workflow_stage_updated_at).toLocaleDateString('en-IN')
                        : customer.updated_at
                          ? new Date(customer.updated_at).toLocaleDateString('en-IN')
                          : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => navigate(`/customers/${id}/details`)}
                        className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-gray-100 rounded transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickAction
              label="Workflow"
              icon={<Zap className="w-5 h-5" />}
              color="bg-teal-50 text-teal-700 hover:bg-teal-100"
              onClick={() => navigate(`/customers/${id}/details`)}
            />
            <QuickAction
              label="Documents"
              icon={<FileText className="w-5 h-5" />}
              color="bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={() => navigate(`/customers/${id}/print`)}
            />
            <QuickAction
              label="Quotation"
              icon={<FileText className="w-5 h-5" />}
              color="bg-amber-50 text-amber-700 hover:bg-amber-100"
              onClick={() => navigate(`/customers/${id}/quotation-manage`)}
            />
            <QuickAction
              label="Edit Details"
              icon={<Edit2 className="w-5 h-5" />}
              color="bg-gray-50 text-gray-700 hover:bg-gray-100"
              onClick={() => navigate(`/customers/${id}/details`)}
            />
          </div>

          {/* Portal Workflow Timeline */}
          {(() => {
            const steps = customer.portal_workflow_steps;
            let parsedSteps: any[] | null = null;
            try {
              parsedSteps = typeof steps === 'string' ? JSON.parse(steps) : steps;
            } catch {
              parsedSteps = null;
            }
            if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) return null;

            const currentStep = customer.portal_current_step_name;
            const currentStatus = customer.portal_current_step_status;
            const currentStepDate = customer.portal_current_step_date;
            const stageMs = currentStepDate ? new Date(currentStepDate).getTime() : NaN;
            const daysInStage = !isNaN(stageMs)
              ? Math.floor((Date.now() - stageMs) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Portal Workflow Timeline
                  </h2>
                  {currentStep && (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        currentStatus === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {currentStep}
                      </span>
                      {daysInStage !== null && daysInStage > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <Clock className="w-3 h-3" />{daysInStage}d
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 py-4">
                  <div className="space-y-3">
                    {parsedSteps.map((step: any, idx: number) => {
                      const isCompleted = step.isCompleted || step.completed;
                      const isCurrent = step.stepName === currentStep;
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted ? (
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-400">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : isCurrent ? 'text-amber-700' : 'text-gray-400'}`}>
                              {step.stepName || step.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs ${isCompleted ? 'text-green-600' : isCurrent ? 'text-amber-600' : 'text-gray-400'}`}>
                                {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                              </span>
                              {step.completionDate && (
                                <span className="text-xs text-gray-400">
                                  · {new Date(step.completionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                              {step.startDate && !step.completionDate && (
                                <span className="text-xs text-gray-400">
                                  · Started {new Date(step.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Portal Equipment Lists */}
          {(() => {
            const invList = customer.portal_inverter_list;
            const modList = customer.portal_module_list;
            let parsedInv: any[] | null = null;
            let parsedMod: any[] | null = null;
            try {
              parsedInv = typeof invList === 'string' ? JSON.parse(invList) : invList;
            } catch {
              parsedInv = null;
            }
            try {
              parsedMod = typeof modList === 'string' ? JSON.parse(modList) : modList;
            } catch {
              parsedMod = null;
            }
            if ((!Array.isArray(parsedInv) || parsedInv.length === 0) && (!Array.isArray(parsedMod) || parsedMod.length === 0)) return null;

            return (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Portal Equipment Details</h2>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {Array.isArray(parsedInv) && parsedInv.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Inverters</p>
                      <div className="space-y-1.5">
                        {parsedInv.map((inv: any, idx: number) => {
                          const invBrand = inv.manufacturerName || inv.brand || inv.inverterBrand || '—';
                          const invSns = Array.isArray(inv.serialNumbers)
                            ? inv.serialNumbers.map((s: any) => typeof s === 'string' ? s : s?.serialNumber).filter(Boolean)
                            : [];
                          return (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-xs">
                            <span className="font-medium text-gray-900">{invBrand}</span>
                            {inv.capacity && <span className="text-gray-600">{inv.capacity} kW</span>}
                            {invSns.length > 0 && <span className="font-mono text-gray-500 truncate max-w-[200px]">SN: {invSns.join(', ')}</span>}
                            {inv.qty && <span className="text-gray-500">Qty: {inv.qty}</span>}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {Array.isArray(parsedMod) && parsedMod.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Modules (Panels)</p>
                      <div className="space-y-1.5">
                        {parsedMod.map((mod: any, idx: number) => {
                          const modBrand = mod.manufacturerName || mod.brand || mod.moduleBrand || '—';
                          const modSns = Array.isArray(mod.serialNumbers)
                            ? mod.serialNumbers.map((s: any) => typeof s === 'string' ? s : s?.serialNumber).filter(Boolean)
                            : [];
                          return (
                          <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-xs">
                            <span className="font-medium text-gray-900">{modBrand}</span>
                            {mod.capacity && <span className="text-gray-600">{mod.capacity} W</span>}
                            {modSns.length > 0 && <span className="font-mono text-gray-500 truncate max-w-[200px]">SN: {modSns.join(', ')}</span>}
                            {mod.qty && <span className="text-gray-500">Qty: {mod.qty}</span>}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* EB Bill History */}
          {ebBills.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-teal-600" />
                  EB Bill History ({ebBills.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ebBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 text-gray-700">{bill.bill_month || '—'}</td>
                        <td className="px-5 py-3 text-right text-gray-700">{bill.billed_units != null ? Number(bill.billed_units).toLocaleString('en-IN') : '—'}</td>
                        <td className="px-5 py-3 text-right text-gray-700">{bill.bill_amount != null ? `₹${Number(bill.bill_amount).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{bill.bill_status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Interactions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Interactions</h2>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveInteractionTab('activity')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeInteractionTab === 'activity'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Activity
                </button>
                <button
                  onClick={() => setActiveInteractionTab('notes')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeInteractionTab === 'notes'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Notes {recentNotes.length > 0 && `(${recentNotes.length})`}
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              {activeInteractionTab === 'activity' ? (
                recentActivity.length === 0 ? (
                  <EmptyState icon={<Clock className="w-8 h-8" />} message="No activity yet. Updates will appear here." />
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((log) => {
                      const Icon = activityIcons[log.activity_type] || Edit2;
                      return (
                        <div key={log.id} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Icon className="w-3.5 h-3.5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">{log.description}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatRelativeTime(log.created_at)}
                              {log.profiles?.full_name && ` · ${log.profiles.full_name}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                recentNotes.length === 0 ? (
                  <EmptyState icon={<MessageCircle className="w-8 h-8" />} message="No notes yet." />
                ) : (
                  <div className="space-y-3">
                    {recentNotes.map((note) => (
                      <div key={note.id} className="border border-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-teal-700 capitalize">
                            {note.note_type?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(note.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{note.note_text}</p>
                        {note.profiles?.full_name && (
                          <p className="text-xs text-gray-400 mt-1">By {note.profiles.full_name}</p>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => navigate(`/customers/${id}/details`)}
                      className="text-xs text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      View all in details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon, label, value, mono, onCopy, copied,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-gray-900 ${mono ? 'font-mono text-sm' : ''} ${!value ? 'text-gray-400' : ''}`}>
          {value || 'Not provided'}
        </p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
      {onCopy && value && (
        <button
          onClick={onCopy}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 rounded-md"
          title={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
      )}
    </div>
  );
}

function InfoField({
  icon, label, value, className = '',
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      {icon && <div className="mb-0.5">{icon}</div>}
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${value ? 'text-gray-900' : 'text-gray-400'}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function QuickAction({
  icon, label, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-transparent hover:border-gray-200 transition-all text-center ${color}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3">
      {icon}
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}
