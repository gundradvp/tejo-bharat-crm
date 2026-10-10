import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  Download,
  IndianRupee,
  Phone,
  MessageSquare,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  Building2,
  MapPin,
  RefreshCw,
  Loader2,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

type TrancheCustomer = {
  id: string;
  customer_name: string;
  phone: string | null;
  consumer_number: string | null;
  district: string | null;
  mandal: string | null;
  village_name: string | null;
  installation_status: string | null;
  payment_method_type: string | null;
  bank_name: string | null;
  loan_sanctioned_amount: number;
  agreed_project_cost: number;
  system_capacity: string | null;
  loan_application_id: string | null;
  application_number: string | null;
  loan_status: string | null;
  disbursements: {
    id: string;
    disbursement_number: number;
    disbursement_amount: number;
    disbursement_date: string;
    disbursement_reference: string | null;
    received_in_account: boolean;
    notes: string | null;
  }[];
  tranche1Amount: number;
  tranche1Date: string | null;
  tranche1Received: boolean;
  tranche2Amount: number;
  tranche2Date: string | null;
  tranche2Received: boolean;
  tranche3Amount: number;
  tranche3Date: string | null;
  tranche3Received: boolean;
  totalDisbursed: number;
  pendingLoanAmount: number;
  expectedTranche2Pending: number;
  trancheStage: 'no_tranche' | 'tranche_1_pending' | 'tranche_2_pending' | 'tranche_3_pending' | 'fully_disbursed';
};

type TabType = 'tranche_2_pending' | 'tranche_1_pending' | 'tranche_3_pending' | 'fully_disbursed' | 'all';

export default function SecondTranchePendingList() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<TrancheCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('tranche_2_pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [bankFilter, setBankFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [installationFilter, setInstallationFilter] = useState('all');
  const [sortField, setSortField] = useState<'pending' | 'name' | 'sanctioned' | 't1Date'>('pending');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modal State for Quick Record Tranche
  const [modalCustomer, setModalCustomer] = useState<TrancheCustomer | null>(null);
  const [modalTrancheNumber, setModalTrancheNumber] = useState<number>(2);
  const [modalAmount, setModalAmount] = useState<string>('');
  const [modalDate, setModalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [modalReference, setModalReference] = useState<string>('');
  const [modalReceived, setModalReceived] = useState<boolean>(true);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [savingTranche, setSavingTranche] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadTrancheData();
  }, []);

  const loadTrancheData = async () => {
    try {
      setLoading(true);

      // Fetch customers with loan/sanctioned info
      const { data: customerRows, error: custError } = await supabase
        .from('customers')
        .select(`
          id,
          customer_name,
          phone,
          consumer_number,
          district,
          mandal,
          village_name,
          installation_status,
          payment_method_type,
          bank_name,
          loan_sanctioned_amount,
          agreed_project_cost,
          system_capacity,
          customer_lifecycle_status
        `)
        .neq('customer_lifecycle_status', 'lost')
        .order('customer_name', { ascending: true });

      if (custError) throw custError;

      // Fetch all loan applications
      const { data: loanAppRows, error: appError } = await supabase
        .from('loan_applications')
        .select('id, customer_id, bank_name, loan_amount_sanctioned, application_number, loan_status, disbursement_type');

      if (appError) throw appError;

      // Fetch all loan disbursements
      const { data: disbRows, error: disbError } = await supabase
        .from('loan_disbursements')
        .select('id, loan_application_id, disbursement_number, disbursement_amount, disbursement_date, disbursement_reference, received_in_account, notes');

      if (disbError) throw disbError;

      const appByCustomer = new Map<string, any>();
      loanAppRows?.forEach(app => {
        appByCustomer.set(app.customer_id, app);
      });

      const disbsByApp = new Map<string, any[]>();
      disbRows?.forEach(d => {
        if (!disbsByApp.has(d.loan_application_id)) {
          disbsByApp.set(d.loan_application_id, []);
        }
        disbsByApp.get(d.loan_application_id)!.push(d);
      });

      const processed: TrancheCustomer[] = (customerRows || [])
        .map(c => {
          const loanApp = appByCustomer.get(c.id);
          const disbs = loanApp ? (disbsByApp.get(loanApp.id) || []) : [];

          // Sort disbursements by number ascending
          disbs.sort((a, b) => (a.disbursement_number || 0) - (b.disbursement_number || 0));

          const sanctioned = Number(c.loan_sanctioned_amount || loanApp?.loan_amount_sanctioned || 0);
          const agreedCost = Number(c.agreed_project_cost || 0);

          const t1 = disbs.find(d => d.disbursement_number === 1 && d.received_in_account);
          const t2 = disbs.find(d => d.disbursement_number === 2 && d.received_in_account);
          const t3 = disbs.find(d => d.disbursement_number === 3 && d.received_in_account);

          const t1Amount = t1 ? Number(t1.disbursement_amount) : 0;
          const t2Amount = t2 ? Number(t2.disbursement_amount) : 0;
          const t3Amount = t3 ? Number(t3.disbursement_amount) : 0;

          const totalDisbursed = disbs
            .filter(d => d.received_in_account)
            .reduce((sum, d) => sum + Number(d.disbursement_amount || 0), 0);

          const pendingLoanAmount = Math.max(0, sanctioned - totalDisbursed);

          // Calculate tranche stage
          let trancheStage: TrancheCustomer['trancheStage'] = 'no_tranche';
          let expectedTranche2Pending = 0;

          if (sanctioned > 0 || disbs.length > 0) {
            if (!t1) {
              trancheStage = 'tranche_1_pending';
            } else if (t1 && !t2) {
              trancheStage = 'tranche_2_pending';
              // 2nd tranche pending is remaining pending loan amount (or 40% of sanctioned if not specified)
              expectedTranche2Pending = pendingLoanAmount;
            } else if (t1 && t2 && pendingLoanAmount > 0) {
              trancheStage = 'tranche_3_pending';
            } else if (pendingLoanAmount <= 0 && sanctioned > 0) {
              trancheStage = 'fully_disbursed';
            }
          }

          return {
            id: c.id,
            customer_name: c.customer_name || 'Unnamed Customer',
            phone: c.phone,
            consumer_number: c.consumer_number,
            district: c.district,
            mandal: c.mandal,
            village_name: c.village_name,
            installation_status: c.installation_status,
            payment_method_type: c.payment_method_type,
            bank_name: c.bank_name || loanApp?.bank_name || 'Bank Loan',
            loan_sanctioned_amount: sanctioned,
            agreed_project_cost: agreedCost,
            system_capacity: c.system_capacity,
            loan_application_id: loanApp?.id || null,
            application_number: loanApp?.application_number || null,
            loan_status: loanApp?.loan_status || null,
            disbursements: disbs,
            tranche1Amount: t1Amount,
            tranche1Date: t1 ? t1.disbursement_date : null,
            tranche1Received: !!t1,
            tranche2Amount: t2Amount,
            tranche2Date: t2 ? t2.disbursement_date : null,
            tranche2Received: !!t2,
            tranche3Amount: t3Amount,
            tranche3Date: t3 ? t3.disbursement_date : null,
            tranche3Received: !!t3,
            totalDisbursed,
            pendingLoanAmount,
            expectedTranche2Pending,
            trancheStage
          };
        })
        .filter(c => c.loan_sanctioned_amount > 0 || c.disbursements.length > 0 || c.bank_name);

      setCustomers(processed);
    } catch (error) {
      console.error('Error loading tranche data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open modal to record tranche
  const openRecordModal = (customer: TrancheCustomer, trancheNum: number = 2) => {
    setModalCustomer(customer);
    setModalTrancheNumber(trancheNum);
    setModalAmount(customer.pendingLoanAmount > 0 ? String(customer.pendingLoanAmount) : '');
    setModalDate(new Date().toISOString().split('T')[0]);
    setModalReference('');
    setModalReceived(true);
    setModalNotes(`Tranche ${trancheNum} received`);
    setModalError(null);
  };

  const handleSaveTranche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCustomer) return;

    try {
      setSavingTranche(true);
      setModalError(null);

      // Ensure loan application exists
      let loanAppId = modalCustomer.loan_application_id;
      if (!loanAppId) {
        const { data: newApp, error: createAppError } = await supabase
          .from('loan_applications')
          .insert({
            customer_id: modalCustomer.id,
            loan_amount_sanctioned: modalCustomer.loan_sanctioned_amount,
            bank_name: modalCustomer.bank_name,
            disbursement_type: 'tranche',
            loan_status: 'sanctioned'
          })
          .select('id')
          .single();

        if (createAppError) throw createAppError;
        loanAppId = newApp.id;
      }

      const parsedAmount = parseFloat(modalAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setModalError('Please enter a valid disbursement amount.');
        setSavingTranche(false);
        return;
      }

      // Insert loan disbursement record
      const { error: disbInsertError } = await supabase
        .from('loan_disbursements')
        .insert([{
          loan_application_id: loanAppId,
          disbursement_number: modalTrancheNumber,
          disbursement_amount: parsedAmount,
          disbursement_date: modalDate,
          disbursement_reference: modalReference || null,
          received_in_account: modalReceived,
          notes: modalNotes || null
        }]);

      if (disbInsertError) throw disbInsertError;

      // Close modal and refresh list
      setModalCustomer(null);
      await loadTrancheData();
    } catch (err: any) {
      console.error('Failed to record tranche:', err);
      setModalError(err?.message || 'Failed to record tranche. Please try again.');
    } finally {
      setSavingTranche(false);
    }
  };

  // Distinct banks & districts for filtering
  const distinctBanks = useMemo(() => {
    const banks = new Set<string>();
    customers.forEach(c => {
      if (c.bank_name && c.bank_name.trim()) banks.add(c.bank_name.trim());
    });
    return Array.from(banks).sort();
  }, [customers]);

  const distinctDistricts = useMemo(() => {
    const districts = new Set<string>();
    customers.forEach(c => {
      if (c.district && c.district.trim()) districts.add(c.district.trim());
    });
    return Array.from(districts).sort();
  }, [customers]);

  // Tab Filtering & Counts
  const counts = useMemo(() => {
    const t2Count = customers.filter(c => c.trancheStage === 'tranche_2_pending').length;
    const t1Count = customers.filter(c => c.trancheStage === 'tranche_1_pending').length;
    const t3Count = customers.filter(c => c.trancheStage === 'tranche_3_pending').length;
    const fullyCount = customers.filter(c => c.trancheStage === 'fully_disbursed').length;

    const t2TotalPending = customers
      .filter(c => c.trancheStage === 'tranche_2_pending')
      .reduce((sum, c) => sum + c.pendingLoanAmount, 0);

    const totalSanctioned = customers.reduce((sum, c) => sum + c.loan_sanctioned_amount, 0);
    const totalDisbursed = customers.reduce((sum, c) => sum + c.totalDisbursed, 0);

    return {
      t2Count,
      t1Count,
      t3Count,
      fullyCount,
      totalCount: customers.length,
      t2TotalPending,
      totalSanctioned,
      totalDisbursed
    };
  }, [customers]);

  // Filtered and Sorted list
  const filteredCustomers = useMemo(() => {
    let list = customers;

    // Tab Filter
    if (activeTab === 'tranche_2_pending') {
      list = list.filter(c => c.trancheStage === 'tranche_2_pending');
    } else if (activeTab === 'tranche_1_pending') {
      list = list.filter(c => c.trancheStage === 'tranche_1_pending');
    } else if (activeTab === 'tranche_3_pending') {
      list = list.filter(c => c.trancheStage === 'tranche_3_pending');
    } else if (activeTab === 'fully_disbursed') {
      list = list.filter(c => c.trancheStage === 'fully_disbursed');
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.customer_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.consumer_number && c.consumer_number.toLowerCase().includes(q)) ||
        (c.bank_name && c.bank_name.toLowerCase().includes(q)) ||
        (c.village_name && c.village_name.toLowerCase().includes(q)) ||
        (c.mandal && c.mandal.toLowerCase().includes(q))
      );
    }

    // Bank Filter
    if (bankFilter !== 'all') {
      list = list.filter(c => c.bank_name === bankFilter);
    }

    // District Filter
    if (districtFilter !== 'all') {
      list = list.filter(c => c.district === districtFilter);
    }

    // Installation Status Filter
    if (installationFilter !== 'all') {
      list = list.filter(c => c.installation_status === installationFilter);
    }

    // Sorting
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'pending') {
        cmp = a.pendingLoanAmount - b.pendingLoanAmount;
      } else if (sortField === 'name') {
        cmp = a.customer_name.localeCompare(b.customer_name);
      } else if (sortField === 'sanctioned') {
        cmp = a.loan_sanctioned_amount - b.loan_sanctioned_amount;
      } else if (sortField === 't1Date') {
        const dA = a.tranche1Date ? new Date(a.tranche1Date).getTime() : 0;
        const dB = b.tranche1Date ? new Date(b.tranche1Date).getTime() : 0;
        cmp = dA - dB;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [customers, activeTab, searchQuery, bankFilter, districtFilter, installationFilter, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredCustomers.map((c, index) => ({
      'S.No': index + 1,
      'Customer Name': c.customer_name,
      'Phone': c.phone || '',
      'Consumer / SC No': c.consumer_number || '',
      'District': c.district || '',
      'Mandal': c.mandal || '',
      'Village': c.village_name || '',
      'Bank Name': c.bank_name || '',
      'Sanctioned Loan (₹)': c.loan_sanctioned_amount,
      '1st Tranche Received (₹)': c.tranche1Amount,
      '1st Tranche Date': c.tranche1Date || '',
      '2nd Tranche Received (₹)': c.tranche2Amount,
      '2nd Tranche Date': c.tranche2Date || '',
      'Total Disbursed (₹)': c.totalDisbursed,
      'Pending Amount (₹)': c.pendingLoanAmount,
      'Installation Status': c.installation_status || 'New',
      'Tranche Stage': c.trancheStage.replace(/_/g, ' ').toUpperCase()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '2nd_Tranche_Pending');

    const fileName = `Second_Tranche_Pending_List_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const fmt = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
        <p className="text-gray-500 font-medium text-sm">Loading Tranche & Loan records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">2nd Tranche Pending Hub</h1>
              <p className="text-sm text-gray-500">
                Track, follow-up, and collect second & subsequent loan tranches across bank solar projects
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTrancheData}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredCustomers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel ({filteredCustomers.length})
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">2nd Tranche Pending</p>
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-2">{fmt(counts.t2TotalPending)}</p>
          <p className="text-xs text-amber-100 mt-1">
            Across <span className="font-bold underline">{counts.t2Count} customers</span> with 1st Tranche cleared
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">1st Tranche Cleared (Ready)</p>
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{counts.t2Count}</p>
          <p className="text-xs text-gray-500 mt-1">Projects ready for 2nd tranche release</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">1st Tranche Pending</p>
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{counts.t1Count}</p>
          <p className="text-xs text-gray-500 mt-1">Sanctioned loans awaiting initial release</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Disbursed vs Sanctioned</p>
            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-teal-900 mt-2">{fmt(counts.totalDisbursed)}</p>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>Sanctioned: {fmt(counts.totalSanctioned)}</span>
            <span className="font-semibold text-teal-700">
              {counts.totalSanctioned > 0
                ? `${((counts.totalDisbursed / counts.totalSanctioned) * 100).toFixed(0)}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setActiveTab('tranche_2_pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tranche_2_pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2nd Tranche Pending</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'tranche_2_pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {counts.t2Count}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tranche_1_pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tranche_1_pending'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>1st Tranche Pending</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'tranche_1_pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {counts.t1Count}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tranche_3_pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tranche_3_pending'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3rd / Final Tranche</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'tranche_3_pending'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {counts.t3Count}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fully_disbursed')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'fully_disbursed'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Fully Disbursed</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'fully_disbursed'
                  ? 'bg-white/20 text-white'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {counts.fullyCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>All Projects</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {counts.totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customer, phone, SC no..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Bank Filter */}
          <div>
            <select
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">🏦 All Banks ({distinctBanks.length})</option>
              {distinctBanks.map(bank => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div>
            <select
              value={districtFilter}
              onChange={e => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">📍 All Districts ({distinctDistricts.length})</option>
              {distinctDistricts.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Installation Status Filter */}
          <div>
            <select
              value={installationFilter}
              onChange={e => setInstallationFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">⚙️ All Installation Stages</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="structure_completed">Structure Completed</option>
              <option value="panels_installed">Panels Installed</option>
              <option value="net_meter_pending">Net Meter Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <span>Customer Tranche List</span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
                {filteredCustomers.length} records
              </span>
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            Click <span className="font-semibold text-teal-700">"Record Tranche"</span> to enter bank payment details
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-semibold">
                <th
                  className="text-left px-4 py-3 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('name')}
                >
                  <span className="flex items-center gap-1">
                    Customer Details <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Bank & Sanction</th>
                <th
                  className="text-left px-4 py-3 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('t1Date')}
                >
                  <span className="flex items-center gap-1">
                    1st Tranche <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </span>
                </th>
                <th
                  className="text-left px-4 py-3 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('pending')}
                >
                  <span className="flex items-center gap-1 text-amber-800">
                    2nd Tranche (Pending) <ArrowUpDown className="w-3 h-3 text-amber-600" />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wide">Stage</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wide">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map(customer => {
                const whatsappMessage = `Hello ${customer.customer_name}, regards from Tejo Bharat Global Energy. Regarding your rooftop solar installation: your 1st loan tranche is cleared. We are processing the 2nd tranche disbursement of ₹${customer.pendingLoanAmount.toLocaleString('en-IN')}. Please contact us if you need any assistance.`;
                const whatsappUrl = customer.phone
                  ? `https://wa.me/91${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`
                  : null;

                return (
                  <tr key={customer.id} className="hover:bg-amber-50/30 transition-colors">
                    {/* Customer details */}
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/customers/${customer.id}`)}
                            className="font-bold text-gray-900 hover:text-teal-700 hover:underline text-sm"
                          >
                            {customer.customer_name}
                          </button>
                          {customer.system_capacity && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-semibold">
                              {customer.system_capacity}kW
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                          {customer.phone && (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={`tel:${customer.phone}`}
                                className="font-mono text-gray-700 hover:text-teal-700 flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3 text-gray-400" />
                                {customer.phone}
                              </a>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  title="Send WhatsApp update"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}
                          {customer.consumer_number && (
                            <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded">
                              SC: {customer.consumer_number}
                            </span>
                          )}
                        </div>

                        {(customer.village_name || customer.mandal || customer.district) && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span>
                              {[customer.village_name, customer.mandal, customer.district]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Bank & Sanctioned Amount */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-medium text-gray-800 text-xs">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>{customer.bank_name || 'Bank Loan'}</span>
                        </div>
                        <p className="font-bold text-gray-900 text-sm">
                          {fmt(customer.loan_sanctioned_amount)}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Disbursed: {fmt(customer.totalDisbursed)}
                        </p>
                      </div>
                    </td>

                    {/* 1st Tranche Status */}
                    <td className="px-4 py-3">
                      {customer.tranche1Received ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3" /> Received
                          </span>
                          <p className="font-bold text-gray-900 text-xs mt-1">
                            {fmt(customer.tranche1Amount)}
                          </p>
                          {customer.tranche1Date && (
                            <p className="text-[10px] text-gray-500">
                              {new Date(customer.tranche1Date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                          <button
                            onClick={() => openRecordModal(customer, 1)}
                            className="block text-[11px] text-blue-600 font-semibold hover:underline mt-1 cursor-pointer"
                          >
                            + Record 1st Tranche
                          </button>
                        </div>
                      )}
                    </td>

                    {/* 2nd Tranche (Pending / Received) */}
                    <td className="px-4 py-3">
                      {customer.tranche2Received ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3" /> Received
                          </span>
                          <p className="font-bold text-gray-900 text-xs mt-1">
                            {fmt(customer.tranche2Amount)}
                          </p>
                          {customer.tranche2Date && (
                            <p className="text-[10px] text-gray-500">
                              {new Date(customer.tranche2Date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Pending {fmt(customer.pendingLoanAmount)}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {customer.tranche1Received ? 'Ready for release' : 'Awaiting 1st Tranche'}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Installation / Workflow Stage */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 capitalize">
                          {(customer.installation_status || 'New').replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!customer.tranche2Received && customer.tranche1Received && (
                          <button
                            onClick={() => openRecordModal(customer, 2)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Record 2nd Tranche Payment from Bank"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Record 2nd Tranche</span>
                          </button>
                        )}

                        {!customer.tranche1Received && (
                          <button
                            onClick={() => openRecordModal(customer, 1)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Record 1st Tranche Payment"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Record 1st Tranche</span>
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/customers/${customer.id}/finance?tab=loan`)}
                          className="p-1.5 text-gray-600 hover:text-teal-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Full Customer Loan & Finance"
                        >
                          <IndianRupee className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Customer Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-10 h-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No customers found in this tranche category</p>
                      <p className="text-xs text-gray-400">Try adjusting your filters or search terms</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Tranche Modal */}
      {modalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Record Tranche #{modalTrancheNumber} Received
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modalCustomer.customer_name} · Bank: {modalCustomer.bank_name || 'Bank Loan'}
                </p>
              </div>
              <button
                onClick={() => setModalCustomer(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between">
                <span>Sanctioned Amount:</span>
                <span className="font-bold">{fmt(modalCustomer.loan_sanctioned_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Disbursed:</span>
                <span className="font-bold text-green-700">{fmt(modalCustomer.totalDisbursed)}</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-1">
                <span>Remaining Pending:</span>
                <span className="font-bold text-amber-800">{fmt(modalCustomer.pendingLoanAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveTranche} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tranche Number *
                  </label>
                  <select
                    value={modalTrancheNumber}
                    onChange={e => setModalTrancheNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value={1}>1st Tranche</option>
                    <option value={2}>2nd Tranche</option>
                    <option value={3}>3rd Tranche</option>
                    <option value={4}>4th Tranche</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Disbursement Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Bank Reference / UTR No.
                  </label>
                  <input
                    type="text"
                    value={modalReference}
                    onChange={e => setModalReference(e.target.value)}
                    placeholder="e.g. UTR12345678"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={modalReceived ? 'yes' : 'no'}
                    onChange={e => setModalReceived(e.target.value === 'yes')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="yes">Received in Bank Account</option>
                    <option value="no">Pending Clearance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
                <textarea
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder="Add any notes about this tranche..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalCustomer(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTranche}
                  className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingTranche ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Tranche #{modalTrancheNumber}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
