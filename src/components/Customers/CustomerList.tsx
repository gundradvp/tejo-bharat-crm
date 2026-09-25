import { useState, useEffect } from 'react';
import { supabase, Customer, canImportSuryaGharLeads, isNagarjunaUser, type Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Search, Plus, Phone, Mail, MapPin, CreditCard as Edit2, Loader2, Printer, Grid3x3, List, MessageCircle, Settings, Paperclip, Copy, Check, Download, Hash, Zap, Sun, ClipboardCopy, IndianRupee, Bookmark, RotateCcw, AlertCircle, Upload, Clock, Flame, TrendingUp, FolderOpen, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerForm from './CustomerForm';
import CustomerTechnicalDetailsModal from './CustomerTechnicalDetailsModal';
import CustomerQuickViewModal from './CustomerQuickViewModal';
import CascadingLocationSelector from '../Common/CascadingLocationSelector';

const formatLostDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const statusColors = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  pending_docs: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-gray-100 text-gray-700',
};

const statusLabels = {
  new: 'New',
  in_progress: 'In Progress',
  pending_docs: 'Pending Docs',
  completed: 'Completed',
  on_hold: 'On Hold',
};

export default function CustomerList() {
  const { profile } = useAuth();
  const { license, usage, canAddCustomer, getCustomersRemaining, getCustomersPercentage } = useTenant();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [financialFilter, setFinancialFilter] = useState<string>('all');
  const [discomFilter, setDiscomFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [discoms, setDiscoms] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [disbursementData, setDisbursementData] = useState<Record<string, { total: number; pending: number }>>({});
  const [notesCount, setNotesCount] = useState<Record<string, number>>({});
  const [documentsCount, setDocumentsCount] = useState<Record<string, number>>({});
  const [technicalDetailsCustomer, setTechnicalDetailsCustomer] = useState<Customer | null>(null);
  const [quickViewCustomer, setQuickViewCustomer] = useState<Customer | null>(null);
  const [quickViewTab, setQuickViewTab] = useState<'notes' | 'documents' | 'drive'>('notes');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedConsumer, setCopiedConsumer] = useState<string | null>(null);
  const [copiedCustomerJSON, setCopiedCustomerJSON] = useState<string | null>(null);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [locationFilter, setLocationFilter] = useState<{
    stateId?: number;
    districtId?: number;
    constituencyId?: number;
    mandalId?: number;
    villageId?: number;
  }>({});
  const [workflowStageFilter, setWorkflowStageFilter] = useState<string>('all');
  const [workflowStages, setWorkflowStages] = useState<any[]>([]);
  const [importSourceFilter, setImportSourceFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [portalStageFilter, setPortalStageFilter] = useState<string>('all');
  const [daysInStageFilter, setDaysInStageFilter] = useState<string>('all');
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('all');
  const [highUsageFilter, setHighUsageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [billSummaries, setBillSummaries] = useState<Record<string, { billAmount: number; billedUnits: number; billMonth: string; isHighUsage: boolean }>>({});
  const [billsLoading, setBillsLoading] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  useEffect(() => {
    loadCustomers();
    loadWorkflowStages();
    if (profile?.role === 'admin') {
      loadAgents();
      loadDisbursementData();
    }
    loadDiscoms();
  }, [profile]);

  // Load saved filter preferences on mount
  useEffect(() => {
    loadSavedFilters();
  }, [profile]);

  // Auto-save filters when they change (debounced)
  useEffect(() => {
    if (!preferencesLoaded || !profile?.id) return;
    const timer = setTimeout(() => {
      saveFilters();
    }, 1000);
    return () => clearTimeout(timer);
  }, [statusFilter, agentFilter, financialFilter, discomFilter, workflowStageFilter, importSourceFilter, lifecycleFilter, loanStatusFilter, highUsageFilter, sortBy, viewMode, locationFilter, preferencesLoaded, profile]);

  const loadSavedFilters = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', profile.id)
        .maybeSingle();

      if (error || !data?.preferences) {
        setPreferencesLoaded(true);
        return;
      }

      const prefs = data.preferences as any;
      if (prefs.customerFilters) {
        const f = prefs.customerFilters;
        if (f.statusFilter) setStatusFilter(f.statusFilter);
        if (f.agentFilter) setAgentFilter(f.agentFilter);
        if (f.financialFilter) setFinancialFilter(f.financialFilter);
        if (f.discomFilter) setDiscomFilter(f.discomFilter);
        if (f.workflowStageFilter) setWorkflowStageFilter(f.workflowStageFilter);
        if (f.importSourceFilter) setImportSourceFilter(f.importSourceFilter);
        if (f.lifecycleFilter) setLifecycleFilter(f.lifecycleFilter);
        if (f.loanStatusFilter) setLoanStatusFilter(f.loanStatusFilter);
        if (f.highUsageFilter) setHighUsageFilter(f.highUsageFilter);
        if (f.sortBy) setSortBy(f.sortBy);
        if (f.viewMode) setViewMode(f.viewMode);
        if (f.locationFilter) setLocationFilter(f.locationFilter);
      }
      setPreferencesLoaded(true);
    } catch (err) {
      console.error('Error loading saved filters:', err);
      setPreferencesLoaded(true);
    }
  };

  const saveFilters = async () => {
    if (!profile?.id) return;
    try {
      const filters = {
        statusFilter,
        agentFilter,
        financialFilter,
        discomFilter,
        workflowStageFilter,
        importSourceFilter,
        lifecycleFilter,
        loanStatusFilter,
        highUsageFilter,
        sortBy,
        viewMode,
        locationFilter,
      };

      const { data: current, error: fetchErr } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', profile.id)
        .maybeSingle();

      if (fetchErr) return;
      const currentPrefs = (current?.preferences as any) || {};
      currentPrefs.customerFilters = filters;

      await supabase
        .from('profiles')
        .update({ preferences: currentPrefs })
        .eq('id', profile.id);

      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2000);
    } catch (err) {
      console.error('Error saving filters:', err);
    }
  };

  const resetFilters = async () => {
    setStatusFilter('all');
    setAgentFilter('all');
    setFinancialFilter('all');
    setDiscomFilter('all');
    setWorkflowStageFilter('all');
    setImportSourceFilter('all');
    setLifecycleFilter('all');
    setPortalStageFilter('all');
    setDaysInStageFilter('all');
    setLoanStatusFilter('all');
    setHighUsageFilter('all');
    setSortBy('newest');
    setViewMode('grid');
    setLocationFilter({});
    await saveFilters();
  };

  useEffect(() => {
    if (customers.length > 0) {
      loadNotesCount();
      loadDocumentsCount();
      loadBillSummaries();
    }
  }, [customers]);

  const loadBillSummaries = async () => {
    const consumerNumbers = customers
      .map(c => (c as any).consumer_number)
      .filter(Boolean);
    if (consumerNumbers.length === 0) return;
    setBillsLoading(true);
    try {
      const summaries: Record<string, { billAmount: number; billedUnits: number; billMonth: string; isHighUsage: boolean }> = {};
      const batchSize = 200;
      for (let i = 0; i < consumerNumbers.length; i += batchSize) {
        const batch = consumerNumbers.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('eb_customer_bills')
          .select('sc_number, bill_amount, billed_units, bill_month, bill_year, bill_month_index')
          .in('sc_number', batch)
          .order('bill_year', { ascending: false })
          .order('bill_month_index', { ascending: false });
        if (error) {
          console.error('Error loading bill summaries:', error);
          continue;
        }
        const latestBySc: Record<string, any> = {};
        data?.forEach((bill: any) => {
          if (!latestBySc[bill.sc_number] ||
            (bill.bill_year > latestBySc[bill.sc_number].bill_year) ||
            (bill.bill_year === latestBySc[bill.sc_number].bill_year && bill.bill_month_index > latestBySc[bill.sc_number].bill_month_index)) {
            latestBySc[bill.sc_number] = bill;
          }
        });
        customers.forEach((c: any) => {
          const sc = c.consumer_number;
          if (sc && latestBySc[sc]) {
            const bill = latestBySc[sc];
            const units = parseFloat(bill.billed_units) || 0;
            const amount = parseFloat(bill.bill_amount) || 0;
            summaries[c.id] = {
              billAmount: amount,
              billedUnits: units,
              billMonth: bill.bill_month || '',
              isHighUsage: units > 500,
            };
          }
        });
      }
      setBillSummaries(summaries);
    } catch (error) {
      console.error('Error loading bill summaries:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      console.log('Loading customers, profile:', profile);

      let query = supabase
        .from('customers')
        .select('*, assigned_agent:profiles!customers_assigned_agent_id_fkey(id, full_name)')
        .order('created_at', { ascending: false });

      const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);
      console.log('User roles:', userRoles);

      if (userRoles.includes('lead_generator') && !userRoles.includes('admin') && !userRoles.includes('employee')) {
        console.log('Filtering for lead_generator only, assigned to:', profile.id);
        query = query.eq('assigned_agent_id', profile.id);
      } else {
        console.log('No filtering - showing all customers in tenant (admin/employee/mixed roles)');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Customers loaded:', data?.length || 0);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true);

      const { data, error } = await query.order('full_name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadNotesCount = async () => {
    try {
      const customerIds = customers.map(c => c.id);
      const { data, error } = await supabase
        .from('customer_notes')
        .select('customer_id')
        .in('customer_id', customerIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((note: any) => {
        counts[note.customer_id] = (counts[note.customer_id] || 0) + 1;
      });
      setNotesCount(counts);
    } catch (error) {
      console.error('Error loading notes count:', error);
    }
  };

  const loadDocumentsCount = async () => {
    try {
      const customerIds = customers.map(c => c.id);
      const { data, error } = await supabase
        .from('customer_documents')
        .select('customer_id')
        .in('customer_id', customerIds)
        .eq('processing_status', 'extracted');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((doc: any) => {
        counts[doc.customer_id] = (counts[doc.customer_id] || 0) + 1;
      });
      setDocumentsCount(counts);
    } catch (error) {
      console.error('Error loading documents count:', error);
    }
  };

  const loadDiscoms = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('discom_name')
        .not('discom_name', 'is', null);

      if (error) throw error;

      const uniqueDiscoms = [...new Set(data?.map(d => d.discom_name).filter(Boolean) || [])];
      setDiscoms(uniqueDiscoms.sort());
    } catch (error) {
      console.error('Error loading discoms:', error);
    }
  };

  const loadWorkflowStages = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_stages')
        .select('*')
        .eq('is_active', true)
        .order('stage_order');

      if (error) throw error;
      setWorkflowStages(data || []);
    } catch (error) {
      console.error('Error loading workflow stages:', error);
    }
  };

  const loadDisbursementData = async () => {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, loan_sanctioned_amount, installation_status');

      if (customersError) throw customersError;

      const { data: disbursements, error: disbursementsError } = await supabase
        .from('loan_disbursements')
        .select('customer_id, disbursement_amount, disbursement_status');

      if (disbursementsError) throw disbursementsError;

      const disbursementMap: Record<string, { total: number; pending: number }> = {};

      customersData?.forEach(customer => {
        const sanctionedAmount = customer.loan_sanctioned_amount || 0;
        const customerDisbursements = disbursements?.filter(
          d => d.customer_id === customer.id && d.disbursement_status === 'received'
        ) || [];
        const totalDisbursed = customerDisbursements.reduce((sum, d) => sum + d.disbursement_amount, 0);
        const pending = sanctionedAmount - totalDisbursed;

        disbursementMap[customer.id] = {
          total: sanctionedAmount,
          pending: pending > 0 ? pending : 0
        };
      });

      setDisbursementData(disbursementMap);
    } catch (error) {
      console.error('Error loading disbursement data:', error);
    }
  };

  const [exporting, setExporting] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);

  const handleExportJSON = async () => {
    try {
      setExporting(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const exportData = {
        _meta: {
          format: 'tejobharat-crm-export',
          version: '1',
          exported_at: new Date().toISOString(),
          count: data?.length ?? 0,
        },
        customers: (data || []).map((c: any) => ({
          id: c.id,
          customer_name: c.customer_name,
          phone: c.phone,
          email: c.email ?? null,
          address: c.address ?? null,
          application_ref_no: c.application_ref_no ?? null,
          consumer_number: c.consumer_number ?? null,
          discom_name: c.discom_name ?? null,
          district_name: c.district_name ?? null,
          loan_status: c.loan_status,
          document_status: c.document_status,
          installation_status: c.installation_status,
          subsidy_status: c.subsidy_status,
          overall_status: c.overall_status,
          current_workflow_stage: c.current_workflow_stage ?? null,
          remarks: c.remarks ?? null,
          state_id: c.state_id ?? null,
          district_id: c.district_id ?? null,
          constituency_id: c.constituency_id ?? null,
          mandal_id: c.mandal_id ?? null,
          village_id: c.village_id ?? null,
          created_at: c.created_at,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyJSON = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const exportData = {
        _meta: { format: 'tejobharat-crm-export', version: '1', exported_at: new Date().toISOString(), count: data?.length ?? 0 },
        customers: (data || []).map((c: any) => ({
          id: c.id, customer_name: c.customer_name, phone: c.phone, email: c.email ?? null,
          address: c.address ?? null, application_ref_no: c.application_ref_no ?? null,
          consumer_number: c.consumer_number ?? null, discom_name: c.discom_name ?? null,
          district_name: c.district_name ?? null, loan_status: c.loan_status,
          document_status: c.document_status, installation_status: c.installation_status,
          subsidy_status: c.subsidy_status, overall_status: c.overall_status,
          current_workflow_stage: c.current_workflow_stage ?? null, remarks: c.remarks ?? null,
          state_id: c.state_id ?? null, district_id: c.district_id ?? null,
          constituency_id: c.constituency_id ?? null, mandal_id: c.mandal_id ?? null,
          village_id: c.village_id ?? null, created_at: c.created_at,
        })),
      };
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 2500);
    } catch (err) {
      console.error('Copy JSON failed:', err);
      alert('Failed to copy JSON. Please try again.');
    }
  };

  const handleAssignAgent = async (customerId: string, agentId: string) => {    try {
      const { error } = await supabase
        .from('customers')
        .update({ assigned_agent_id: agentId || null })
        .eq('id', customerId);

      if (error) throw error;

      setCustomers(prevCustomers =>
        prevCustomers.map(customer =>
          customer.id === customerId
            ? { ...customer, assigned_agent_id: agentId || null }
            : customer
        )
      );
    } catch (error) {
      console.error('Error assigning agent:', error);
      alert('Failed to assign agent');
    }
  };

  const filteredCustomers = customers.filter((customer: any) => {
    const matchesSearch =
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = statusFilter === 'all' || customer.overall_status === statusFilter;

    const matchesAgent = agentFilter === 'all' ||
      (agentFilter === 'unassigned' && !customer.assigned_agent_id) ||
      customer.assigned_agent_id === agentFilter;

    const matchesDiscom = discomFilter === 'all' || customer.discom_name === discomFilter;

    const matchesFinancial = (() => {
      if (financialFilter === 'all') return true;
      if (financialFilter === 'pending_disbursement') {
        const data = disbursementData[customer.id];
        return data && data.pending > 0 && customer.installation_status === 'completed';
      }
      if (financialFilter === 'disbursement_incomplete') {
        const data = disbursementData[customer.id];
        return data && data.pending > 0;
      }
      return true;
    })();

    const matchesLocation = (() => {
      if (!locationFilter.stateId && !locationFilter.districtId && !locationFilter.constituencyId && !locationFilter.mandalId && !locationFilter.villageId) {
        return true;
      }
      if (locationFilter.villageId && customer.village_id !== locationFilter.villageId) return false;
      if (locationFilter.mandalId && customer.mandal_id !== locationFilter.mandalId) return false;
      if (locationFilter.constituencyId && customer.constituency_id !== locationFilter.constituencyId) return false;
      if (locationFilter.districtId && customer.district_id !== locationFilter.districtId) return false;
      if (locationFilter.stateId && customer.state_id !== locationFilter.stateId) return false;
      return true;
    })();

    const matchesWorkflowStage = workflowStageFilter === 'all' || customer.current_workflow_stage === workflowStageFilter;

    const matchesImportSource = importSourceFilter === 'all' ||
      (importSourceFilter === 'manual' && (customer as any).import_source === 'manual') ||
      (importSourceFilter === 'pm_surya_ghar' && (customer as any).import_source === 'pm_surya_ghar') ||
      (importSourceFilter === 'pm_surya_ghar_detailed' && (customer as any).import_source === 'pm_surya_ghar_detailed') ||
      (importSourceFilter === 'native_crm_import' && (customer as any).import_source === 'native_crm_import') ||
      (importSourceFilter === 'unknown' && !(customer as any).import_source);

    const matchesLifecycle = lifecycleFilter === 'all' ||
      (lifecycleFilter === 'active' && (customer as any).customer_lifecycle_status === 'active') ||
      (lifecycleFilter === 'lost' && (customer as any).customer_lifecycle_status === 'lost');

    const matchesPortalStage = portalStageFilter === 'all' ||
      (customer as any).portal_current_step_name === portalStageFilter;

    const matchesDaysInStage = (() => {
      if (daysInStageFilter === 'all') return true;
      const stepDate = (customer as any).portal_current_step_date;
      if (!stepDate) return false;
      const days = Math.floor((Date.now() - new Date(stepDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysInStageFilter === '30') return days >= 30;
      if (daysInStageFilter === '60') return days >= 60;
      return true;
    })();

    const customerLoanStatus = (customer as any).current_loan_status || (customer as any).loan_status || '';
    const matchesLoanStatus = loanStatusFilter === 'all' || customerLoanStatus === loanStatusFilter;

    const billSummary = billSummaries[customer.id];
    const matchesHighUsage = highUsageFilter === 'all' ||
      (highUsageFilter === 'high' && billSummary?.isHighUsage) ||
      (highUsageFilter === 'normal' && billSummary && !billSummary.isHighUsage);

    return matchesSearch && matchesStatus && matchesAgent && matchesDiscom && matchesFinancial && matchesLocation && matchesWorkflowStage && matchesImportSource && matchesLifecycle && matchesPortalStage && matchesDaysInStage && matchesLoanStatus && matchesHighUsage;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortBy === 'newest') return 0;
    if (sortBy === 'churn_date_desc') {
      const getLostTime = (c: any) => {
        const d = c.lost_at || (c.customer_lifecycle_status === 'lost' ? c.updated_at : null);
        return d ? new Date(d).getTime() : 0;
      };
      return getLostTime(b) - getLostTime(a);
    }
    if (sortBy === 'churn_date_asc') {
      const getLostTime = (c: any) => {
        const d = c.lost_at || (c.customer_lifecycle_status === 'lost' ? c.updated_at : null);
        return d ? new Date(d).getTime() : Infinity;
      };
      return getLostTime(a) - getLostTime(b);
    }
    const billA = billSummaries[a.id];
    const billB = billSummaries[b.id];
    if (sortBy === 'amount_desc') {
      const amtA = billA?.billAmount ?? -1;
      const amtB = billB?.billAmount ?? -1;
      return amtB - amtA;
    }
    if (sortBy === 'amount_asc') {
      const amtA = billA?.billAmount ?? Infinity;
      const amtB = billB?.billAmount ?? Infinity;
      return amtA - amtB;
    }
    if (sortBy === 'units_desc') {
      const unitsA = billA?.billedUnits ?? -1;
      const unitsB = billB?.billedUnits ?? -1;
      return unitsB - unitsA;
    }
    return 0;
  });

  const loanStatusOptions = [...new Set(
    customers
      .map((c: any) => c.current_loan_status || c.loan_status)
      .filter(Boolean)
  )].sort();

  const loanStatusBadgeColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s === 'disbursed') return 'bg-green-100 text-green-700';
    if (s === 'sanctioned') return 'bg-blue-100 text-blue-700';
    if (s === 'pending' || s === 'applied') return 'bg-amber-100 text-amber-700';
    if (s === 'rejected') return 'bg-red-100 text-red-700';
    if (s === 'not_applicable' || s === 'not applicable' || s === 'not_required' || s === 'not required') return 'bg-gray-100 text-gray-500';
    return 'bg-gray-100 text-gray-600';
  };

  const formatLoanStatus = (status: string): string => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCustomer(null);
    loadCustomers();
  };

  const openQuickView = (customer: Customer, tab: 'notes' | 'documents' | 'drive') => {
    setQuickViewCustomer(customer);
    setQuickViewTab(tab);
  };

  const handleNotesCountChange = (customerId: string, count: number) => {
    setNotesCount(prev => ({ ...prev, [customerId]: count }));
  };

  const handleDocumentsCountChange = (customerId: string, count: number) => {
    setDocumentsCount(prev => ({ ...prev, [customerId]: count }));
  };

  const handleCopyPhone = async (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (error) {
      console.error('Failed to copy phone number:', error);
    }
  };

  const handleCopyConsumer = async (consumerNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(consumerNo);
      setCopiedConsumer(consumerNo);
      setTimeout(() => setCopiedConsumer(null), 2000);
    } catch (error) {
      console.error('Failed to copy consumer number:', error);
    }
  };

  const handleCopyCustomerJSON = async (customer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const capacity = customer.system_capacity ? parseFloat(String(customer.system_capacity)) : 0;
      const projectData = {
        customer_name: customer.customer_name || '',
        consumer_no: customer.consumer_number || '',
        address: customer.address || '',
        application_ref: customer.application_ref_no || '',
        capacity: customer.system_capacity || '',
        project_capacity_kw: capacity,
        total_watts: capacity * 1000,
        panel_number: customer.panel_quantity || 0,
        panel_make: customer.panel_make || '',
        panel_serial_numbers: customer.panel_serial_numbers || '',
        eb_distribution: customer.eb_distribution || '',
        eb_section: customer.eb_section || '',
        latitude: customer.latitude || '',
        longitude: customer.longitude || '',
        mobile_number: customer.phone || '',
        inverter_make: customer.inverter_make || '',
        inverter_serial_number: customer.inverter_serial_number || '',
        inverter_capacity: customer.inverter_capacity || '',
        module_make: customer.panel_make || '',
        module_type: customer.panel_type || '',
        module_capacity: customer.panel_wattage || '',
        number_of_modules: customer.panel_quantity || 0,
        plant_capacity: capacity * 1000,
        plant_capacity_in_kw: capacity,
        aadhar_number: customer.aadhar_number || '',
      };
      await navigator.clipboard.writeText(JSON.stringify(projectData, null, 2));
      setCopiedCustomerJSON(customer.id);
      setTimeout(() => setCopiedCustomerJSON(null), 2000);
    } catch (error) {
      console.error('Failed to copy customer JSON:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-gray-500 text-sm mt-0.5">{sortedCustomers.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="Grid View"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {(profile?.role === 'admin' || isNagarjunaUser(profile as Profile | null)) && (
            <>
              <button
                onClick={() => navigate('/customers/import-detailed')}
                className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                title="Import detailed PM Surya Ghar portal export"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Detailed Import</span>
              </button>
              <button
                onClick={handleExportJSON}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download customers as JSON file"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline text-sm">Export</span>
              </button>
              <button
                onClick={handleCopyJSON}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                title="Copy customers JSON to clipboard"
              >
                {copiedJSON ? <Check className="w-4 h-4 text-green-600" /> : <ClipboardCopy className="w-4 h-4" />}
                <span className="hidden sm:inline text-sm">{copiedJSON ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </>
          )}
          {(profile?.role === 'admin' || profile?.role === 'lead_generator') && (
            <button
              onClick={() => setShowForm(true)}
              disabled={!canAddCustomer()}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title={!canAddCustomer() ? 'Customer limit reached' : 'Add a new customer'}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Add Customer</span>
            </button>
          )}
        </div>
      </div>


      <div className="bg-white rounded-xl border border-gray-200 p-3">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowLocationFilter(!showLocationFilter)}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg transition-colors text-sm flex-shrink-0 ${
              showLocationFilter || Object.keys(locationFilter).some(k => locationFilter[k as keyof typeof locationFilter])
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
            title="Filter by location"
          >
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Location</span>
            {Object.keys(locationFilter).some(k => locationFilter[k as keyof typeof locationFilter]) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_docs">Pending Docs</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
          <select
            value={workflowStageFilter}
            onChange={(e) => setWorkflowStageFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-purple-50 border-purple-200"
          >
            <option value="all">All Stages</option>
            {workflowStages.map((stage) => (
              <option key={stage.id} value={stage.stage_code}>{stage.stage_name}</option>
            ))}
          </select>
          <select
            value={discomFilter}
            onChange={(e) => setDiscomFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All DISCOMs</option>
            {discoms.map((discom) => (
              <option key={discom} value={discom}>{discom}</option>
            ))}
          </select>
          <select
            value={importSourceFilter}
            onChange={(e) => setImportSourceFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-cyan-50 border-cyan-200"
          >
            <option value="all">All Sources</option>
            <option value="pm_surya_ghar">PM Surya Ghar</option>
            <option value="pm_surya_ghar_detailed">PM Surya Ghar (Detailed)</option>
            <option value="manual">Manually Added</option>
            <option value="native_crm_import">CRM Import</option>
            <option value="unknown">Legacy/Unknown</option>
          </select>
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-red-50 border-red-200"
          >
            <option value="all">All Lifecycle</option>
            <option value="active">Active</option>
            <option value="lost">Lost/Churned</option>
          </select>
          <select
            value={portalStageFilter}
            onChange={(e) => setPortalStageFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-teal-50 border-teal-200"
          >
            <option value="all">All Portal Stages</option>
            <option value="Registration">Registration</option>
            <option value="Application">Application</option>
            <option value="Feasibility">Feasibility</option>
            <option value="Vendor Selection">Vendor Selection</option>
            <option value="Upload Agreement">Upload Agreement</option>
            <option value="Installation">Installation</option>
            <option value="Inspection">Inspection</option>
            <option value="Project Commissioning">Project Commissioning</option>
            <option value="Subsidy Request">Subsidy Request</option>
            <option value="Subsidy Disbursal">Subsidy Disbursal</option>
          </select>
          <select
            value={daysInStageFilter}
            onChange={(e) => setDaysInStageFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-orange-50 border-orange-200"
          >
            <option value="all">All Days in Stage</option>
            <option value="30">30+ Days</option>
            <option value="60">60+ Days</option>
          </select>
          <select
            value={loanStatusFilter}
            onChange={(e) => setLoanStatusFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-indigo-50 border-indigo-200"
          >
            <option value="all">All Loan Status</option>
            {loanStatusOptions.map((status) => (
              <option key={status} value={status}>{formatLoanStatus(status)}</option>
            ))}
          </select>
          <select
            value={highUsageFilter}
            onChange={(e) => setHighUsageFilter(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-red-50 border-red-200"
          >
            <option value="all">All Usage</option>
            <option value="high">High Usage (500+ units)</option>
            <option value="normal">Normal Usage</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 border-slate-200"
          >
            <option value="newest">Newest First</option>
            <option value="churn_date_desc">Lost/Churn Date: Recent First</option>
            <option value="churn_date_asc">Lost/Churn Date: Oldest First</option>
            <option value="amount_desc">Bill Amount: High to Low</option>
            <option value="amount_asc">Bill Amount: Low to High</option>
            <option value="units_desc">Bill Units: High to Low</option>
          </select>
          {savedIndicator && (
            <span className="px-2 py-1 text-xs text-green-600 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Filters saved
            </span>
          )}
          <button
            onClick={resetFilters}
            className="px-2 py-1.5 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          {profile?.role === 'admin' && (
            <>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Agents</option>
                <option value="unassigned">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                ))}
              </select>
              <select
                value={financialFilter}
                onChange={(e) => setFinancialFilter(e.target.value)}
                className="col-span-2 sm:col-span-1 px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-amber-50 border-amber-200"
              >
                <option value="all">All Financial</option>
                <option value="pending_disbursement">Pending Disbursement</option>
                <option value="disbursement_incomplete">Disbursement Incomplete</option>
              </select>
            </>
          )}
        </div>

        {showLocationFilter && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Filter by Location</h3>
              {Object.keys(locationFilter).some(k => locationFilter[k as keyof typeof locationFilter]) && (
                <button
                  onClick={() => setLocationFilter({})}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear Location Filter
                </button>
              )}
            </div>
            <CascadingLocationSelector
              stateId={locationFilter.stateId}
              districtId={locationFilter.districtId}
              constituencyId={locationFilter.constituencyId}
              mandalId={locationFilter.mandalId}
              villageId={locationFilter.villageId}
              onChange={setLocationFilter}
              showLabels={false}
              showHierarchy={true}
            />
          </div>
        )}
      </div>

      <div className={viewMode === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        : 'bg-white rounded-xl border border-gray-200 divide-y divide-gray-100'
      }>
        {sortedCustomers.map((customer) => {
          if (viewMode === 'list') {
            return (
              <div
                key={customer.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/customers/${customer.id}`)}
              >
                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 w-48 truncate flex-shrink-0">{customer.customer_name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusColors[customer.overall_status]}`}>
                    {statusLabels[customer.overall_status]}
                  </span>
                  {(customer as any).customer_lifecycle_status === 'lost' && (
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 bg-red-100 text-red-700 flex items-center gap-1 border border-red-200"
                      title={(customer as any).lost_at ? `Lost / Churned on ${new Date((customer as any).lost_at).toLocaleString('en-IN')}` : `Lost Customer (Updated: ${new Date(customer.updated_at).toLocaleDateString('en-IN')})`}
                    >
                      <UserX className="w-3 h-3 text-red-600" />
                      <span>Lost{(customer as any).lost_at ? ` • ${formatLostDate((customer as any).lost_at)}` : ''}</span>
                    </span>
                  )}
                  {(customer as any).import_source === 'pm_surya_ghar' && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-green-100 text-green-700">
                      PM Surya Ghar
                    </span>
                  )}
                  {(customer as any).import_source === 'pm_surya_ghar_detailed' && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-teal-100 text-teal-700">
                      Detailed
                    </span>
                  )}
                  {(customer as any).portal_current_step_name && (
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                      (customer as any).portal_current_step_status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {(customer as any).portal_current_step_name}
                    </span>
                  )}
                  {(customer as any).portal_current_step_date && (() => {
                    const days = Math.floor((Date.now() - new Date((customer as any).portal_current_step_date).getTime()) / (1000 * 60 * 60 * 24));
                    return days > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-gray-100 text-gray-600 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{days}d
                      </span>
                    ) : null;
                  })()}
                  {(() => {
                    const loanStatus = (customer as any).current_loan_status || (customer as any).loan_status;
                    return loanStatus ? (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${loanStatusBadgeColor(loanStatus)}`}>
                        {formatLoanStatus(loanStatus)}
                      </span>
                    ) : null;
                  })()}
                  {billSummaries[customer.id]?.isHighUsage && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-red-100 text-red-700 flex items-center gap-0.5">
                      <Flame className="w-2.5 h-2.5" /> High Usage
                    </span>
                  )}
                  {billSummaries[customer.id] && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 bg-emerald-50 text-emerald-700 flex items-center gap-0.5">
                      <IndianRupee className="w-2.5 h-2.5" />
                      {billSummaries[customer.id].billAmount.toLocaleString('en-IN')}
                      <span className="text-emerald-400 ml-0.5">{billSummaries[customer.id].billMonth}</span>
                    </span>
                  )}
                  {billsLoading && !billSummaries[customer.id] && (customer as any).consumer_number && (
                    <Loader2 className="w-3 h-3 text-gray-300 animate-spin flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0 group">
                    <Phone className="w-3 h-3" />
                    <span>{customer.phone}</span>
                    <button
                      onClick={(e) => handleCopyPhone(customer.phone, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 rounded p-0.5"
                      title="Copy phone"
                    >
                      {copiedPhone === customer.phone ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                  {(customer as any).consumer_number && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 group">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono">{(customer as any).consumer_number}</span>
                      <button
                        onClick={(e) => handleCopyConsumer((customer as any).consumer_number, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 rounded p-0.5"
                        title="Copy consumer no"
                      >
                        {copiedConsumer === (customer as any).consumer_number ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                      </button>
                    </div>
                  )}
                  {customer.address && (
                    <div className="hidden lg:flex items-center gap-1 text-xs text-gray-400 min-w-0">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{customer.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openQuickView(customer, 'notes'); }}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors relative"
                    title="Notes"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {notesCount[customer.id] > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold leading-none" style={{fontSize: '9px'}}>
                        {notesCount[customer.id]}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openQuickView(customer, 'documents'); }}
                    className="p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors relative"
                    title="Documents"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {documentsCount[customer.id] > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-green-600 text-white text-xs rounded-full w-3.5 h-3.5 flex items-center justify-center font-semibold leading-none" style={{fontSize: '9px'}}>
                        {documentsCount[customer.id]}
                      </span>
                    )}
                  </button>
                  {(profile?.role === 'admin' || profile?.role === 'employee') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openQuickView(customer, 'drive'); }}
                      className={`p-1.5 rounded transition-colors ${((customer as any).gdrive_folder_url) ? 'text-amber-600 hover:bg-amber-50' : 'text-gray-300 hover:bg-gray-100'}`}
                      title="Google Drive folder"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}/finance`); }}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Finance"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}/print`); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                    title="Print"
                  >
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setTechnicalDetailsCustomer(customer); }}
                    className="p-1.5 text-orange-400 hover:bg-orange-50 rounded transition-colors"
                    title="Technical Details"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={customer.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{customer.customer_name}</h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[customer.overall_status]}`}>
                      {statusLabels[customer.overall_status]}
                    </span>
                    {(customer as any).customer_lifecycle_status === 'lost' && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200"
                        title={(customer as any).lost_at ? `Lost / Churned on ${new Date((customer as any).lost_at).toLocaleString('en-IN')}` : `Lost Customer (Updated: ${new Date(customer.updated_at).toLocaleDateString('en-IN')})`}
                      >
                        <UserX className="w-3 h-3 text-red-600" />
                        <span>Lost{(customer as any).lost_at ? ` • ${formatLostDate((customer as any).lost_at)}` : ''}</span>
                      </span>
                    )}
                    {(customer as any).import_source === 'pm_surya_ghar' && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        PM Surya Ghar
                      </span>
                    )}
                    {(customer as any).import_source === 'pm_surya_ghar_detailed' && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">
                        Detailed
                      </span>
                    )}
                    {(customer as any).portal_current_step_name && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        (customer as any).portal_current_step_status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {(customer as any).portal_current_step_name}
                      </span>
                    )}
                    {(customer as any).portal_current_step_date && (() => {
                      const days = Math.floor((Date.now() - new Date((customer as any).portal_current_step_date).getTime()) / (1000 * 60 * 60 * 24));
                      return days > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{days}d
                        </span>
                      ) : null;
                    })()}
                    {(() => {
                      const loanStatus = (customer as any).current_loan_status || (customer as any).loan_status;
                      return loanStatus ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${loanStatusBadgeColor(loanStatus)}`}>
                          {formatLoanStatus(loanStatus)}
                        </span>
                      ) : null;
                    })()}
                    {billSummaries[customer.id]?.isHighUsage && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-0.5">
                        <Flame className="w-2.5 h-2.5" /> High Usage
                      </span>
                    )}
                    {billSummaries[customer.id] && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" />
                        {(billSummaries[customer.id].billAmount.toLocaleString('en-IN'))}
                        <span className="text-emerald-400 ml-0.5">{billSummaries[customer.id].billMonth}</span>
                      </span>
                    )}
                    {billsLoading && !billSummaries[customer.id] && (customer as any).consumer_number && (
                      <Loader2 className="w-3 h-3 text-gray-300 animate-spin" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openQuickView(customer, 'notes'); }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      title="View Notes"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {notesCount[customer.id] || 0}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openQuickView(customer, 'documents'); }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      title="View Documents"
                    >
                      <Paperclip className="w-3 h-3" />
                      {documentsCount[customer.id] || 0}
                    </button>
                    {(profile?.role === 'admin' || profile?.role === 'employee') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openQuickView(customer, 'drive'); }}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${((customer as any).gdrive_folder_url) ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                        title="Google Drive folder"
                      >
                        <FolderOpen className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleCopyCustomerJSON(customer, e)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                    title="Copy customer JSON"
                  >
                    {copiedCustomerJSON === customer.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => navigate(`/customers/${customer.id}/finance`)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                    title="Finance"
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate(`/customers/${customer.id}/print`)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                    title="Print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setTechnicalDetailsCustomer(customer)}
                    className="p-1.5 text-orange-400 hover:bg-orange-50 rounded transition-colors"
                    title="Technical Details"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-gray-600 group">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{customer.phone}</span>
                  <button
                    onClick={(e) => handleCopyPhone(customer.phone, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded p-0.5 ml-auto"
                    title="Copy phone"
                  >
                    {copiedPhone === customer.phone ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                  </button>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {(customer as any).consumer_number && (
                  <div className="flex items-center gap-1.5 text-gray-500 group">
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono">{(customer as any).consumer_number}</span>
                    <button
                      onClick={(e) => handleCopyConsumer((customer as any).consumer_number, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 rounded p-0.5 ml-auto"
                      title="Copy consumer no"
                    >
                      {copiedConsumer === (customer as any).consumer_number ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                    </button>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-1.5 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{customer.address}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Loan</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium ${loanStatusBadgeColor((customer as any).current_loan_status || customer.loan_status || 'not_applicable')}`}>
                    {formatLoanStatus((customer as any).current_loan_status || customer.loan_status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Docs</span>
                  <span className="font-medium text-gray-700 capitalize">{customer.document_status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Install</span>
                  <span className="font-medium text-gray-700 capitalize">{customer.installation_status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Subsidy</span>
                  <span className="font-medium text-gray-700 capitalize">{customer.subsidy_status.replace('_', ' ')}</span>
                </div>
              </div>

              {billSummaries[customer.id] && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="font-medium text-gray-700">{billSummaries[customer.id].billedUnits} units</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IndianRupee className="w-3 h-3 text-emerald-500" />
                    <span className="font-medium text-gray-700">{billSummaries[customer.id].billAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-gray-400 ml-auto">{billSummaries[customer.id].billMonth}</span>
                </div>
              )}

              {((customer as any).total_capacity_kw || (customer as any).inverter_brand || (customer as any).panel_brand) && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
                  {(customer as any).total_capacity_kw && (
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <span className="font-medium text-gray-700">{(customer as any).total_capacity_kw} kW</span>
                    </div>
                  )}
                  {(customer as any).inverter_brand && (
                    <span className="truncate">{(customer as any).inverter_brand}</span>
                  )}
                  {(customer as any).panel_brand && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Sun className="w-3 h-3 text-orange-400" />
                      <span className="truncate">{(customer as any).panel_brand}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No customers found</p>
        </div>
      )}

      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onClose={handleFormClose}
        />
      )}

      {technicalDetailsCustomer && (
        <CustomerTechnicalDetailsModal
          customer={technicalDetailsCustomer}
          onClose={() => setTechnicalDetailsCustomer(null)}
          onUpdate={loadCustomers}
        />
      )}

      {quickViewCustomer && (
        <CustomerQuickViewModal
          customer={quickViewCustomer}
          onClose={() => setQuickViewCustomer(null)}
          initialTab={quickViewTab}
          onNotesCountChange={handleNotesCountChange}
          onDocumentsCountChange={handleDocumentsCountChange}
        />
      )}
    </div>
  );
}
