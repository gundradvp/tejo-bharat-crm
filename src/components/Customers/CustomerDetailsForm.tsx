import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  Save, ArrowLeft, TrendingUp, Layers, CreditCard, FileText,
  MessageSquare, Info, Loader2, Zap, Sun, MapPin, ShieldCheck, Wrench, Receipt, ArrowRight, UserX
} from 'lucide-react';
import ExpenseTracking from './ExpenseTracking';
import FinancialOverview from './FinancialOverview';
import LoanDisbursementTracking from './LoanDisbursementTracking';
import CustomerPaymentTracking from './CustomerPaymentTracking';
import CustomerNotes from '../Notes/CustomerNotes';
import ActivityTimeline from '../Activity/ActivityTimeline';
import CustomerWorkflowChecklist from './CustomerWorkflowChecklist';
import WorkflowProgressView from '../Workflow/WorkflowProgressView';
import WorkflowStageChanger from '../Workflow/WorkflowStageChanger';
import { useAuth } from '../../contexts/AuthContext';

interface CustomerDetails {
  id: string;
  customer_name: string;
  consumer_number: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
  customer_lifecycle_status?: 'active' | 'lost';
  lost_at?: string | null;
  inverter_brand?: string;
  inverter_serial_number?: string;
  inverter_capacity?: number;
  panel_brand?: string;
  panel_serial_numbers?: string[];
  panel_quantity?: number;
  panel_wattage?: number;
  total_capacity_kw?: number;
  latitude?: number;
  longitude?: number;
  site_type?: string;
  roof_type?: string;
  shadow_free_area?: boolean;
  aadhar_number?: string;
  pan_number?: string;
  electricity_bill_number?: string;
  grounding_certificate_number?: string;
  grounding_certificate_date?: string;
  sync_certificate_number?: string;
  sync_certificate_date?: string;
  commissioning_date?: string;
  agreement_number?: string;
  agreement_date?: string;
  agreement_signed?: boolean;
  terms_accepted?: boolean;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  inspection_date?: string;
  inspector_name?: string;
  inspection_remarks?: string;
  verification_date?: string;
  agreed_project_cost?: number;
  structure_height?: number;
  lead_generated_by?: string;
  employee_commission_amount?: number;
  employee_commission_percentage?: number;
  payment_method_type?: string;
  loan_sanctioned_amount?: number;
  loan_sanctioned_date?: string;
  loan_reference_number?: string;
  output_gst_amount?: number;
  installation_status?: string;
  introduced_by_lead_generator_id?: string;
  introduction_date?: string;
  introduction_notes?: string;
  commission_amount?: number;
  commission_paid?: boolean;
  commission_paid_date?: string;
  current_workflow_stage?: string;
  workflow_stage_updated_at?: string;
  quotation_number?: string;
  quotation_date?: string;
  quotation_valid_until?: string;
  system_cost?: number;
  subsidy_amount?: number;
  net_payable?: number;
  gst_amount?: number;
  total_amount?: number;
  payment_terms?: string;
  installation_timeline?: string;
  warranty_details?: string;
  special_terms?: string;
  application_ref_no?: string;
}

type Tab = 'timeline' | 'site' | 'payments' | 'documents' | 'notes' | 'details';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'timeline', label: 'Timeline', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'site', label: 'Site & Equipment', icon: <Layers className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'details', label: 'Details', icon: <Info className="w-4 h-4" /> },
];

const STAGE_LABELS: Record<string, string> = {
  site_survey: 'Site Survey', documentation: 'Documentation', application: 'Application',
  approval: 'Approval', procurement: 'Procurement', installation: 'Installation',
  inspection: 'Inspection', commissioning: 'Commissioning', net_metering: 'Net Metering',
  subsidy: 'Subsidy', completed: 'Completed',
};
const ALL_STAGES = Object.keys(STAGE_LABELS);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm";
const INPUT_DISABLED = "w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm cursor-not-allowed";
const CARD = "bg-white rounded-xl border border-gray-200 p-5";
const CARD_TITLE = "text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2";

export default function CustomerDetailsForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [panelSerials, setPanelSerials] = useState('');
  const [leadGenerators, setLeadGenerators] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('timeline');

  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';

  useEffect(() => {
    if (id) fetchCustomer();
    fetchLeadGenerators();
  }, [id]);

  const fetchLeadGenerators = async () => {
    try {
      const { data } = await supabase.from('lead_generators').select('*').eq('status', 'active').order('full_name');
      setLeadGenerators(data || []);
    } catch (err) {
      console.error('Error fetching lead generators:', err);
    }
  };

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (data) {
        setCustomer(data);
        if (data.panel_serial_numbers) setPanelSerials(data.panel_serial_numbers.join('\n'));
      }
    } catch (err: any) {
      console.error('Error fetching customer:', err);
      alert('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!customer) return;
    setSaving(true);
    try {
      const n = (v: any): number | null => {
        if (v === undefined || v === null || v === '') return null;
        const p = typeof v === 'number' ? v : parseFloat(v);
        return isNaN(p) ? null : p;
      };

      const panelSerialsArray = panelSerials.split('\n').map(s => s.trim()).filter(Boolean);

      const updateData: Record<string, any> = {
        inverter_brand: customer.inverter_brand,
        inverter_serial_number: customer.inverter_serial_number,
        inverter_capacity: n(customer.inverter_capacity),
        panel_brand: customer.panel_brand,
        panel_serial_numbers: panelSerialsArray,
        panel_quantity: customer.panel_quantity || null,
        panel_wattage: n(customer.panel_wattage),
        total_capacity_kw: n(customer.total_capacity_kw),
        latitude: n(customer.latitude),
        longitude: n(customer.longitude),
        site_type: customer.site_type,
        roof_type: customer.roof_type,
        shadow_free_area: customer.shadow_free_area,
        aadhar_number: customer.aadhar_number,
        pan_number: customer.pan_number,
        electricity_bill_number: customer.electricity_bill_number,
        grounding_certificate_number: customer.grounding_certificate_number,
        grounding_certificate_date: customer.grounding_certificate_date,
        sync_certificate_number: customer.sync_certificate_number,
        sync_certificate_date: customer.sync_certificate_date,
        commissioning_date: customer.commissioning_date,
        agreement_number: customer.agreement_number,
        agreement_date: customer.agreement_date,
        agreement_signed: customer.agreement_signed,
        terms_accepted: customer.terms_accepted,
        bank_name: customer.bank_name,
        account_number: customer.account_number,
        ifsc_code: customer.ifsc_code,
        account_holder_name: customer.account_holder_name,
        inspection_date: customer.inspection_date,
        inspector_name: customer.inspector_name,
        inspection_remarks: customer.inspection_remarks,
        verification_date: customer.verification_date,
        quotation_number: customer.quotation_number,
        quotation_date: customer.quotation_date,
        quotation_valid_until: customer.quotation_valid_until,
        system_cost: n(customer.system_cost),
        subsidy_amount: n(customer.subsidy_amount),
        net_payable: n(customer.net_payable),
        gst_amount: n(customer.gst_amount),
        total_amount: n(customer.total_amount),
        payment_terms: customer.payment_terms,
        installation_timeline: customer.installation_timeline,
        warranty_details: customer.warranty_details,
        special_terms: customer.special_terms,
        agreed_project_cost: n(customer.agreed_project_cost),
        structure_height: n(customer.structure_height),
        employee_commission_percentage: n(customer.employee_commission_percentage),
        employee_commission_amount: n(customer.employee_commission_amount),
        payment_method_type: customer.payment_method_type,
        loan_sanctioned_amount: n(customer.loan_sanctioned_amount),
        loan_sanctioned_date: customer.loan_sanctioned_date,
        loan_reference_number: customer.loan_reference_number,
        output_gst_amount: n(customer.output_gst_amount),
        introduced_by_lead_generator_id: customer.introduced_by_lead_generator_id || null,
        introduction_date: customer.introduction_date,
        introduction_notes: customer.introduction_notes,
        commission_amount: n(customer.commission_amount),
        commission_paid: customer.commission_paid,
        commission_paid_date: customer.commission_paid_date || null,
        customer_lifecycle_status: customer.customer_lifecycle_status || 'active',
        lost_at: customer.customer_lifecycle_status === 'lost' ? (customer.lost_at || new Date().toISOString()) : null,
      };

      let { error } = await supabase.from('customers').update(updateData).eq('id', id);

      if (error && error.message?.toLowerCase().includes('lost_at')) {
        delete updateData.lost_at;
        const retry = await supabase.from('customers').update(updateData).eq('id', id);
        error = retry.error;
      }

      if (error) throw error;
      alert('Saved successfully');
    } catch (err: any) {
      console.error('Error updating customer:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!customer) {
    return <div className="flex items-center justify-center h-64 text-gray-600">Customer not found</div>;
  }

  const stage = customer.current_workflow_stage || 'site_survey';
  const stageLabel = STAGE_LABELS[stage] || stage.replace(/_/g, ' ');
  const stageIndex = ALL_STAGES.indexOf(stage);
  const progress = stageIndex >= 0 ? Math.round(((stageIndex) / (ALL_STAGES.length - 1)) * 100) : 0;
  const projectId = customer.application_ref_no || customer.id.replace(/-/g, '').slice(0, 6).toUpperCase();

  const set = (patch: Partial<CustomerDetails>) => setCustomer(c => c ? { ...c, ...patch } : c);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <button onClick={() => navigate('/customers')} className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to customers
            </button>
            <span>·</span>
            <button onClick={() => navigate(`/customers/${id}`)} className="hover:text-teal-700 text-teal-600">
              {customer.customer_name}
            </button>
            <span>·</span>
            <span>{customer.total_capacity_kw ? `${customer.total_capacity_kw}kW` : 'Details'}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            {/* Title */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {customer.customer_name}
                {customer.total_capacity_kw ? ` — ${customer.total_capacity_kw}kW` : ''}
                {customer.site_type ? ` ${customer.site_type.charAt(0).toUpperCase() + customer.site_type.slice(1)}` : ''}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Consumer No: {customer.consumer_number || '—'}
                {projectId && <> &nbsp;·&nbsp; Ref: {projectId}</>}
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate(`/customers/${id}`)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Customer
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-teal-800 text-white rounded-lg text-sm hover:bg-teal-900 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
            <StatChip label="Capacity" value={customer.total_capacity_kw ? `${customer.total_capacity_kw} kW` : '—'} icon={<Zap className="w-3.5 h-3.5 text-yellow-500" />} />
            <StatChip label="Stage" value={stageLabel} colored />
            <StatChip
              label="Lifecycle"
              value={customer.customer_lifecycle_status === 'lost' ? `Lost (${customer.lost_at ? new Date(customer.lost_at).toLocaleDateString('en-IN') : 'Churned'})` : 'Active'}
              colored={customer.customer_lifecycle_status === 'lost'}
              green={customer.customer_lifecycle_status !== 'lost'}
            />
            <StatChip label="Progress" value={`${progress}%`} />
            {customer.commissioning_date && (
              <StatChip label="Commissioned" value={new Date(customer.commissioning_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            )}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-teal-900 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-1 overflow-x-auto pb-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all rounded-t-lg mt-1 ${
                    activeTab === tab.id
                      ? 'bg-white text-teal-900'
                      : 'text-teal-200 hover:text-white hover:bg-teal-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <form onSubmit={handleSubmit}>
          {activeTab === 'timeline' && (
            <TabTimeline
              customerId={id!}
              currentStage={stage}
              onStageChanged={fetchCustomer}
              workflowUpdatedAt={customer.workflow_stage_updated_at}
              customer={customer}
              set={set}
            />
          )}

          {activeTab === 'site' && (
            <TabSiteEquipment customer={customer} panelSerials={panelSerials} set={set} setPanelSerials={setPanelSerials} />
          )}

          {activeTab === 'payments' && (
            <TabPayments customer={customer} set={set} isAdmin={isAdmin} />
          )}

          {activeTab === 'documents' && (
            <TabDocuments customer={customer} set={set} />
          )}

          {activeTab === 'notes' && (
            <div className={CARD}>
              <CustomerNotes customerId={id!} />
            </div>
          )}

          {activeTab === 'details' && (
            <TabDetails customer={customer} set={set} leadGenerators={leadGenerators} />
          )}

          {/* Floating save row on editable tabs */}
          {activeTab !== 'timeline' && activeTab !== 'notes' && (
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => navigate(`/customers/${id}`)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-teal-800 text-white rounded-lg hover:bg-teal-900 transition-colors text-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ── Stat Chip ──────────────────────────────────────────────────────────────────
function StatChip({ label, value, icon, colored, green }: {
  label: string; value: string; icon?: React.ReactNode; colored?: boolean; green?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-gray-400">{label}:</span>
      <span className={`font-medium ${colored ? 'text-teal-700' : green ? 'text-green-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

// ── Tab 1: Timeline ────────────────────────────────────────────────────────────
function TabTimeline({ customerId, currentStage, onStageChanged, workflowUpdatedAt, customer, set }: {
  customerId: string; currentStage: string; onStageChanged: () => void; workflowUpdatedAt?: string;
  customer: CustomerDetails; set: (patch: Partial<CustomerDetails>) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-5">
        {/* Customer Lifecycle & Lost/Churn Tracking Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-600" />
            Customer Lifecycle & Churn Tracking
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Lifecycle Status
              </label>
              <select
                value={customer.customer_lifecycle_status || 'active'}
                onChange={(e) => {
                  const val = e.target.value as 'active' | 'lost';
                  set({
                    customer_lifecycle_status: val,
                    lost_at: val === 'lost' ? (customer.lost_at || new Date().toISOString()) : null,
                  });
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-medium ${
                  customer.customer_lifecycle_status === 'lost'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-green-300 bg-green-50 text-green-700'
                }`}
              >
                <option value="active">Active Customer</option>
                <option value="lost">Lost / Churned</option>
              </select>
            </div>
            {customer.customer_lifecycle_status === 'lost' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Lost / Churned Date
                </label>
                <input
                  type="date"
                  value={customer.lost_at ? customer.lost_at.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set({ lost_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
          </div>
          {customer.customer_lifecycle_status === 'lost' && (
            <p className="text-xs text-red-600 mt-2">
              ⚠️ Marked as lost / churned. This churn date is displayed in the CRM customer directory, reports, and sorting filters.
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <WorkflowStageChanger
            customerId={customerId}
            currentStage={currentStage}
            onStageChanged={onStageChanged}
          />
          {workflowUpdatedAt && (
            <p className="text-xs text-gray-400 mt-3">
              Last updated: {new Date(workflowUpdatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <WorkflowProgressView customerId={customerId} />
        </div>
        <CustomerWorkflowChecklist customerId={customerId} />
      </div>
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Activity Log</h3>
          <ActivityTimeline entityType="customer" entityId={customerId} limit={10} />
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Site & Equipment ────────────────────────────────────────────────────
function TabSiteEquipment({ customer, panelSerials, set, setPanelSerials }: {
  customer: CustomerDetails;
  panelSerials: string;
  set: (p: Partial<CustomerDetails>) => void;
  setPanelSerials: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Inverter */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><Zap className="w-4 h-4 text-yellow-500" /> Inverter</h3>
        <div className="space-y-3">
          <Field label="Brand">
            <input type="text" value={customer.inverter_brand || ''} onChange={e => set({ inverter_brand: e.target.value })} className={INPUT} />
          </Field>
          <Field label="Serial Number">
            <input type="text" value={customer.inverter_serial_number || ''} onChange={e => set({ inverter_serial_number: e.target.value })} className={INPUT} />
          </Field>
          <Field label="Capacity (kW)">
            <input type="number" step="0.01" value={customer.inverter_capacity || ''} onChange={e => set({ inverter_capacity: parseFloat(e.target.value) })} className={INPUT} />
          </Field>
        </div>
      </div>

      {/* Solar Panels */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><Sun className="w-4 h-4 text-orange-400" /> Solar Panels</h3>
        <div className="space-y-3">
          <Field label="Brand">
            <input type="text" value={customer.panel_brand || ''} onChange={e => set({ panel_brand: e.target.value })} className={INPUT} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <input type="number" value={customer.panel_quantity || ''} onChange={e => set({ panel_quantity: parseInt(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="Wattage (W)">
              <input type="number" step="0.01" value={customer.panel_wattage || ''} onChange={e => set({ panel_wattage: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
          </div>
          <Field label="Total System Capacity (kW)">
            <input type="number" step="0.01" value={customer.total_capacity_kw || ''} onChange={e => set({ total_capacity_kw: parseFloat(e.target.value) })} className={INPUT} />
          </Field>
          <Field label="Panel Serial Numbers (one per line)">
            <textarea value={panelSerials} onChange={e => setPanelSerials(e.target.value)} rows={3} className={INPUT} />
          </Field>
        </div>
      </div>

      {/* Location & Site */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><MapPin className="w-4 h-4 text-blue-500" /> Location & Site</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input type="number" step="0.0000001" value={customer.latitude || ''} onChange={e => set({ latitude: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="Longitude">
              <input type="number" step="0.0000001" value={customer.longitude || ''} onChange={e => set({ longitude: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
          </div>
          <Field label="Site Type">
            <select value={customer.site_type || ''} onChange={e => set({ site_type: e.target.value })} className={INPUT}>
              <option value="">Select Type</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="agricultural">Agricultural</option>
            </select>
          </Field>
          <Field label="Roof Type">
            <select value={customer.roof_type || ''} onChange={e => set({ roof_type: e.target.value })} className={INPUT}>
              <option value="">Select Type</option>
              <option value="rcc">RCC</option>
              <option value="metal">Metal Sheet</option>
              <option value="asbestos">Asbestos</option>
              <option value="tile">Tile</option>
              <option value="ground">Ground Mounted</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={customer.shadow_free_area || false} onChange={e => set({ shadow_free_area: e.target.checked })} className="h-4 w-4 text-teal-600 rounded" />
            <span className="text-sm text-gray-700">Shadow Free Area</span>
          </label>
        </div>
      </div>

      {/* Technical Certificates */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><ShieldCheck className="w-4 h-4 text-teal-600" /> Technical Certificates</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grounding Cert. No">
              <input type="text" value={customer.grounding_certificate_number || ''} onChange={e => set({ grounding_certificate_number: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Grounding Cert. Date">
              <input type="date" value={customer.grounding_certificate_date || ''} onChange={e => set({ grounding_certificate_date: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Sync Cert. No">
              <input type="text" value={customer.sync_certificate_number || ''} onChange={e => set({ sync_certificate_number: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Sync Cert. Date">
              <input type="date" value={customer.sync_certificate_date || ''} onChange={e => set({ sync_certificate_date: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <Field label="Commissioning Date">
            <input type="date" value={customer.commissioning_date || ''} onChange={e => set({ commissioning_date: e.target.value })} className={INPUT} />
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Payments ────────────────────────────────────────────────────────────
function TabPayments({ customer, set, isAdmin }: {
  customer: CustomerDetails;
  set: (p: Partial<CustomerDetails>) => void;
  isAdmin: boolean;
}) {
  const isLoanOrHybrid = customer.payment_method_type === 'loan' || customer.payment_method_type === 'hybrid';

  return (
    <div className="space-y-5">
      {/* Project Financials */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><CreditCard className="w-4 h-4 text-teal-600" /> Project Financials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Agreed Project Cost (₹)">
            <input type="number" step="0.01" value={customer.agreed_project_cost || ''} onChange={e => set({ agreed_project_cost: parseFloat(e.target.value) || undefined })} className={INPUT} />
          </Field>
          {isAdmin && (
            <>
              <Field label="Payment Method">
                <select value={customer.payment_method_type || 'cash'} onChange={e => set({ payment_method_type: e.target.value })} className={INPUT}>
                  <option value="cash">Cash</option>
                  <option value="loan">Loan</option>
                  <option value="hybrid">Hybrid (Loan + Cash)</option>
                </select>
              </Field>
              <Field label="Output GST Amount (₹)">
                <input type="number" step="0.01" value={customer.output_gst_amount || ''} onChange={e => set({ output_gst_amount: parseFloat(e.target.value) || 0 })} className={INPUT} placeholder="GST charged to customer" />
              </Field>
              {isLoanOrHybrid && (
                <>
                  <Field label="Loan Reference Number">
                    <input type="text" value={customer.loan_reference_number || ''} onChange={e => set({ loan_reference_number: e.target.value })} className={INPUT} />
                  </Field>
                  <Field label="Loan Sanctioned Amount (₹)">
                    <input type="number" step="0.01" value={customer.loan_sanctioned_amount || ''} onChange={e => set({ loan_sanctioned_amount: parseFloat(e.target.value) || 0 })} className={INPUT} />
                  </Field>
                  <Field label="Loan Sanctioned Date">
                    <input type="date" value={customer.loan_sanctioned_date || ''} onChange={e => set({ loan_sanctioned_date: e.target.value })} className={INPUT} />
                  </Field>
                </>
              )}
            </>
          )}
        </div>

        {/* Payment breakdown info */}
        {isAdmin && customer.agreed_project_cost && customer.agreed_project_cost > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 text-sm">
            <div>
              <p className="text-gray-500">Project Cost</p>
              <p className="font-semibold text-gray-900">₹{customer.agreed_project_cost.toLocaleString()}</p>
            </div>
            {isLoanOrHybrid && (
              <div>
                <p className="text-gray-500">Loan Amount</p>
                <p className="font-semibold text-blue-700">₹{(customer.loan_sanctioned_amount || 0).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Customer Payment</p>
              <p className="font-semibold text-teal-700">
                ₹{(customer.agreed_project_cost - (isLoanOrHybrid ? (customer.loan_sanctioned_amount || 0) : 0)).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Financial tracking components — admin only */}
      {isAdmin && (
        <>
          <div className={CARD}>
            <FinancialOverview
              customerId={customer.id}
              loanSanctionedAmount={customer.loan_sanctioned_amount || 0}
              outputGSTAmount={customer.output_gst_amount || 0}
              agreedCost={customer.agreed_project_cost}
            />
          </div>

          {isLoanOrHybrid && (customer.loan_sanctioned_amount || 0) > 0 && (
            <div className={CARD}>
              <LoanDisbursementTracking
                customerId={customer.id}
                loanSanctionedAmount={customer.loan_sanctioned_amount!}
                installationStatus={customer.installation_status || ''}
              />
            </div>
          )}

          {(customer.agreed_project_cost || 0) > 0 && (
            <div className={CARD}>
              <CustomerPaymentTracking
                customerId={customer.id}
                expectedCustomerPayment={
                  customer.payment_method_type === 'cash'
                    ? customer.agreed_project_cost!
                    : (customer.agreed_project_cost || 0) - (customer.loan_sanctioned_amount || 0)
                }
              />
            </div>
          )}

          <div className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={CARD_TITLE}><Receipt className="w-4 h-4 text-rose-500" /> Expense Tracking</h3>
              <button
                onClick={() => navigate(`/customers/${customer.id}/finance?tab=expenses`)}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
              >
                Open in Finance Page <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ExpenseTracking customerId={customer.id} agreedCost={customer.agreed_project_cost} />
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
          Detailed financial tracking is visible to admins only. Contact your admin for payment details.
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Documents ───────────────────────────────────────────────────────────
function TabDocuments({ customer, set }: { customer: CustomerDetails; set: (p: Partial<CustomerDetails>) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Identification */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><FileText className="w-4 h-4 text-blue-500" /> Identification Documents</h3>
        <div className="space-y-3">
          <Field label="Aadhar Number">
            <input type="text" value={customer.aadhar_number || ''} onChange={e => set({ aadhar_number: e.target.value })} className={INPUT} maxLength={12} />
          </Field>
          <Field label="PAN Number">
            <input type="text" value={customer.pan_number || ''} onChange={e => set({ pan_number: e.target.value.toUpperCase() })} className={INPUT} maxLength={10} />
          </Field>
          <Field label="Electricity Bill Number">
            <input type="text" value={customer.electricity_bill_number || ''} onChange={e => set({ electricity_bill_number: e.target.value })} className={INPUT} />
          </Field>
        </div>
      </div>

      {/* Agreement */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><FileText className="w-4 h-4 text-teal-600" /> Agreement Details</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Agreement Number">
              <input type="text" value={customer.agreement_number || ''} onChange={e => set({ agreement_number: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Agreement Date">
              <input type="date" value={customer.agreement_date || ''} onChange={e => set({ agreement_date: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={customer.agreement_signed || false} onChange={e => set({ agreement_signed: e.target.checked })} className="h-4 w-4 text-teal-600 rounded" />
              <span className="text-sm text-gray-700">Agreement Signed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={customer.terms_accepted || false} onChange={e => set({ terms_accepted: e.target.checked })} className="h-4 w-4 text-teal-600 rounded" />
              <span className="text-sm text-gray-700">Terms Accepted</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><CreditCard className="w-4 h-4 text-green-600" /> Bank Details</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bank Name">
              <input type="text" value={customer.bank_name || ''} onChange={e => set({ bank_name: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Account Holder Name">
              <input type="text" value={customer.account_holder_name || ''} onChange={e => set({ account_holder_name: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Account Number">
              <input type="text" value={customer.account_number || ''} onChange={e => set({ account_number: e.target.value })} className={INPUT} />
            </Field>
            <Field label="IFSC Code">
              <input type="text" value={customer.ifsc_code || ''} onChange={e => set({ ifsc_code: e.target.value.toUpperCase() })} className={INPUT} maxLength={11} />
            </Field>
          </div>
        </div>
      </div>

      {/* Inspection */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><Wrench className="w-4 h-4 text-orange-500" /> Inspection & Verification</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inspection Date">
              <input type="date" value={customer.inspection_date || ''} onChange={e => set({ inspection_date: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Inspector Name">
              <input type="text" value={customer.inspector_name || ''} onChange={e => set({ inspector_name: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Verification Date">
              <input type="date" value={customer.verification_date || ''} onChange={e => set({ verification_date: e.target.value })} className={INPUT} />
            </Field>
          </div>
          <Field label="Inspection Remarks">
            <textarea value={customer.inspection_remarks || ''} onChange={e => set({ inspection_remarks: e.target.value })} rows={3} className={INPUT} />
          </Field>
        </div>
      </div>

      {/* Quotation */}
      <div className="lg:col-span-2">
        <div className={CARD}>
          <h3 className={CARD_TITLE}><FileText className="w-4 h-4 text-gray-500" /> Quotation Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Quotation Number">
              <input type="text" value={customer.quotation_number || ''} onChange={e => set({ quotation_number: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Quotation Date">
              <input type="date" value={customer.quotation_date || ''} onChange={e => set({ quotation_date: e.target.value })} className={INPUT} />
            </Field>
            <Field label="Valid Until">
              <input type="date" value={customer.quotation_valid_until || ''} onChange={e => set({ quotation_valid_until: e.target.value })} className={INPUT} />
            </Field>
            <Field label="System Cost (₹)">
              <input type="number" step="0.01" value={customer.system_cost || ''} onChange={e => set({ system_cost: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="Subsidy Amount (₹)">
              <input type="number" step="0.01" value={customer.subsidy_amount || ''} onChange={e => set({ subsidy_amount: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="Net Payable (₹)">
              <input type="number" step="0.01" value={customer.net_payable || ''} onChange={e => set({ net_payable: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="GST Amount (₹)">
              <input type="number" step="0.01" value={customer.gst_amount || ''} onChange={e => set({ gst_amount: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="Total Amount (₹)">
              <input type="number" step="0.01" value={customer.total_amount || ''} onChange={e => set({ total_amount: parseFloat(e.target.value) })} className={INPUT} />
            </Field>
            <Field label="Installation Timeline">
              <input type="text" value={customer.installation_timeline || ''} onChange={e => set({ installation_timeline: e.target.value })} className={INPUT} />
            </Field>
            <div className="md:col-span-3">
              <Field label="Payment Terms">
                <textarea value={customer.payment_terms || ''} onChange={e => set({ payment_terms: e.target.value })} rows={2} className={INPUT} />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field label="Warranty Details">
                <textarea value={customer.warranty_details || ''} onChange={e => set({ warranty_details: e.target.value })} rows={2} className={INPUT} />
              </Field>
            </div>
            <div className="md:col-span-3">
              <Field label="Special Terms & Conditions">
                <textarea value={customer.special_terms || ''} onChange={e => set({ special_terms: e.target.value })} rows={3} className={INPUT} />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab 6: Details ─────────────────────────────────────────────────────────────
function TabDetails({ customer, set, leadGenerators }: {
  customer: CustomerDetails;
  set: (p: Partial<CustomerDetails>) => void;
  leadGenerators: any[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Basic Info (read-only) */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><Info className="w-4 h-4 text-gray-400" /> Basic Information</h3>
        <div className="space-y-3">
          <Field label="Consumer Number"><input type="text" value={customer.consumer_number || ''} disabled className={INPUT_DISABLED} /></Field>
          <Field label="Phone"><input type="text" value={customer.phone || ''} disabled className={INPUT_DISABLED} /></Field>
          <Field label="Email"><input type="text" value={customer.email || ''} disabled className={INPUT_DISABLED} /></Field>
          <Field label="District"><input type="text" value={customer.district || ''} disabled className={INPUT_DISABLED} /></Field>
          <Field label="Address"><input type="text" value={customer.address || ''} disabled className={INPUT_DISABLED} /></Field>
        </div>
        <p className="text-xs text-gray-400 mt-3">Edit basic details from the Customer List.</p>
      </div>

      {/* Lead Generator */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><Info className="w-4 h-4 text-teal-500" /> Lead Generator</h3>
        <div className="space-y-3">
          <Field label="Introduced By">
            <select value={customer.introduced_by_lead_generator_id || ''} onChange={e => set({ introduced_by_lead_generator_id: e.target.value || undefined })} className={INPUT}>
              <option value="">Select Lead Generator</option>
              {leadGenerators.map(lg => (
                <option key={lg.id} value={lg.id}>{lg.full_name} — {lg.phone}</option>
              ))}
            </select>
          </Field>
          <Field label="Introduction Date">
            <input type="date" value={customer.introduction_date || ''} onChange={e => set({ introduction_date: e.target.value })} className={INPUT} />
          </Field>
          <Field label="Commission Amount (₹)">
            <input type="number" step="0.01" value={customer.commission_amount || ''} onChange={e => set({ commission_amount: parseFloat(e.target.value) || 0 })} className={INPUT} />
          </Field>
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={customer.commission_paid || false} onChange={e => set({ commission_paid: e.target.checked, commission_paid_date: e.target.checked ? new Date().toISOString().split('T')[0] : undefined })} className="h-4 w-4 text-teal-600 rounded" />
              <span className="text-sm text-gray-700">Commission Paid</span>
            </label>
            {customer.commission_paid && customer.commission_paid_date && (
              <span className="text-xs text-gray-500">Paid: {new Date(customer.commission_paid_date).toLocaleDateString()}</span>
            )}
          </div>
          <Field label="Introduction Notes">
            <textarea value={customer.introduction_notes || ''} onChange={e => set({ introduction_notes: e.target.value })} rows={3} className={INPUT} placeholder="Notes about how this lead was introduced..." />
          </Field>
        </div>
      </div>

      {/* Project Details */}
      <div className={CARD}>
        <h3 className={CARD_TITLE}><Wrench className="w-4 h-4 text-gray-500" /> Project Details</h3>
        <div className="space-y-3">
          <Field label="Structure Height (ft/m)">
            <input type="number" step="0.01" value={customer.structure_height || ''} onChange={e => set({ structure_height: parseFloat(e.target.value) || undefined })} className={INPUT} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee Commission (%)">
              <input type="number" step="0.01" value={customer.employee_commission_percentage || ''}
                onChange={e => {
                  const pct = parseFloat(e.target.value) || 0;
                  const amt = customer.agreed_project_cost ? (customer.agreed_project_cost * pct) / 100 : 0;
                  set({ employee_commission_percentage: pct, employee_commission_amount: amt });
                }} className={INPUT} />
            </Field>
            <Field label="Commission Amount (₹)">
              <input type="number" value={customer.employee_commission_amount || ''} readOnly className={INPUT_DISABLED} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
