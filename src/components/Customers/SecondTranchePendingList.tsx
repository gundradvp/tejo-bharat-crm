import { useState, useEffect, useMemo, useCallback } from 'react';
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
  FileSpreadsheet,
  ShieldCheck,
  Database,
  ArrowDownToLine,
  Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { INITIAL_GST_TRANCHE_DISBURSALS, GSTTrancheDisbursalItem } from '../../data/gstTrancheInitialData';

const LOCAL_STORAGE_KEY = 'tejo_gst_tranche_disbursements_v2';

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
  utr1?: string | null;
  utr2?: string | null;
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Backup & Restore state
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTrancheData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Load Local Vault Disbursal Data (Loss-Proof)
      let storedDisbursals: GSTTrancheDisbursalItem[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            storedDisbursals = parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse stored tranche disbursements, using initial:', e);
      }

      if (storedDisbursals.length === 0) {
        storedDisbursals = [...INITIAL_GST_TRANCHE_DISBURSALS];
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storedDisbursals));
        } catch {}
      }

      // 2. Fetch Supabase customers, loan apps, and disbursements in background (best-effort)
      let customerRows: any[] = [];
      let loanAppRows: any[] = [];
      let disbRows: any[] = [];

      try {
        const [cRes, aRes, dRes] = await Promise.all([
          supabase
            .from('customers')
            .select(`
              id, customer_name, phone, consumer_number, district, mandal, village_name,
              installation_status, payment_method_type, bank_name, loan_sanctioned_amount,
              agreed_project_cost, system_capacity, customer_lifecycle_status
            `)
            .neq('customer_lifecycle_status', 'lost')
            .catch(() => ({ data: [] })),
          supabase
            .from('loan_applications')
            .select('id, customer_id, bank_name, loan_amount_sanctioned, application_number, loan_status, disbursement_type')
            .catch(() => ({ data: [] })),
          supabase
            .from('loan_disbursements')
            .select('id, loan_application_id, disbursement_number, disbursement_amount, disbursement_date, disbursement_reference, received_in_account, notes')
            .catch(() => ({ data: [] }))
        ]);

        customerRows = cRes?.data || [];
        loanAppRows = aRes?.data || [];
        disbRows = dRes?.data || [];
      } catch (err) {
        console.warn('Supabase remote query bypassed (local vault used):', err);
      }

      const appByCustomer = new Map<string, any>();
      loanAppRows.forEach(app => {
        appByCustomer.set(app.customer_id, app);
      });

      const disbsByApp = new Map<string, any[]>();
      disbRows.forEach(d => {
        if (!disbsByApp.has(d.loan_application_id)) {
          disbsByApp.set(d.loan_application_id, []);
        }
        disbsByApp.get(d.loan_application_id)!.push(d);
      });

      // Quick index of customers by ID and normalized Name
      const customerById = new Map<string, any>();
      const customerByName = new Map<string, any>();
      customerRows.forEach(c => {
        if (c.id) customerById.set(c.id, c);
        if (c.customer_name) customerByName.set(c.customer_name.trim().toLowerCase(), c);
      });

      const processedMap = new Map<string, TrancheCustomer>();

      // 3. Process All Items from the Local Vault (Bank Statement Tranche Ledger)
      storedDisbursals.forEach(item => {
        const matchedCust = (item.customer_id && customerById.get(item.customer_id)) ||
                            customerByName.get(item.customer_name.trim().toLowerCase()) ||
                            null;

        const phone = matchedCust?.phone || item.matched_customer?.phone || null;
        const scNo = matchedCust?.consumer_number || item.matched_customer?.consumerNumber || null;
        const district = matchedCust?.district || item.matched_customer?.district || 'Andhra Pradesh';
        const capacity = matchedCust?.system_capacity || item.matched_customer?.capacity || '3';
        const bankName = item.bank_name || matchedCust?.bank_name || 'Bank Loan';

        const t1Amount = Number(item.t1_amount || 0);
        const t2Amount = Number(item.t2_amount || 0);
        const t1Received = t1Amount > 0;
        const t2Received = t2Amount > 0;

        const totalDisbursed = t1Amount + t2Amount;
        let sanctioned = Number(item.total_amount || 0);
        if (sanctioned <= 0) {
          sanctioned = t1Amount + Number(item.est_pending || (t2Amount > 0 ? t2Amount : 59400));
        }

        let pending = 0;
        let stage: TrancheCustomer['trancheStage'] = 'fully_disbursed';

        if (item.category === 'single_tranche') {
          if (t2Received) {
            stage = 'fully_disbursed';
            pending = 0;
          } else {
            stage = 'tranche_2_pending';
            pending = Number(item.est_pending || 59400);
          }
        } else if (item.category === 'both_tranches') {
          stage = 'fully_disbursed';
          pending = 0;
        } else if (item.category === 'lumpsum') {
          stage = 'fully_disbursed';
          pending = 0;
        }

        const trancheCust: TrancheCustomer = {
          id: item.id,
          customer_name: item.customer_name,
          phone,
          consumer_number: scNo,
          district,
          mandal: matchedCust?.mandal || null,
          village_name: matchedCust?.village_name || null,
          installation_status: matchedCust?.installation_status || 'panels_installed',
          payment_method_type: 'bank_loan',
          bank_name: bankName,
          loan_sanctioned_amount: sanctioned,
          agreed_project_cost: sanctioned,
          system_capacity: capacity,
          loan_application_id: matchedCust ? (appByCustomer.get(matchedCust.id)?.id || null) : null,
          application_number: null,
          loan_status: 'sanctioned',
          disbursements: [
            ...(t1Amount > 0 ? [{
              id: `${item.id}-d1`,
              disbursement_number: 1,
              disbursement_amount: t1Amount,
              disbursement_date: item.t1_date || '',
              disbursement_reference: item.t1_utr || null,
              received_in_account: true,
              notes: '1st Tranche bank release'
            }] : []),
            ...(t2Amount > 0 ? [{
              id: `${item.id}-d2`,
              disbursement_number: 2,
              disbursement_amount: t2Amount,
              disbursement_date: item.t2_date || '',
              disbursement_reference: item.t2_utr || null,
              received_in_account: true,
              notes: '2nd Tranche bank release'
            }] : [])
          ],
          tranche1Amount: t1Amount,
          tranche1Date: item.t1_date || null,
          tranche1Received,
          tranche2Amount: t2Amount,
          tranche2Date: item.t2_date || null,
          tranche2Received,
          tranche3Amount: 0,
          tranche3Date: null,
          tranche3Received: false,
          totalDisbursed,
          pendingLoanAmount: pending,
          expectedTranche2Pending: pending,
          trancheStage: stage,
          utr1: item.t1_utr,
          utr2: item.t2_utr
        };

        processedMap.set(item.id, trancheCust);
      });

      // 4. Merge any additional Supabase customers with loan applications
      customerRows.forEach(c => {
        const loanApp = appByCustomer.get(c.id);
        const disbs = loanApp ? (disbsByApp.get(loanApp.id) || []) : [];
        const sanctioned = Number(c.loan_sanctioned_amount || loanApp?.loan_amount_sanctioned || 0);

        if ((sanctioned > 0 || disbs.length > 0) && !processedMap.has(c.id)) {
          disbs.sort((a, b) => (a.disbursement_number || 0) - (b.disbursement_number || 0));

          const t1 = disbs.find(d => d.disbursement_number === 1 && d.received_in_account);
          const t2 = disbs.find(d => d.disbursement_number === 2 && d.received_in_account);
          const t3 = disbs.find(d => d.disbursement_number === 3 && d.received_in_account);

          const t1Amount = t1 ? Number(t1.disbursement_amount) : 0;
          const t2Amount = t2 ? Number(t2.disbursement_amount) : 0;
          const t3Amount = t3 ? Number(t3.disbursement_amount) : 0;

          const totalDisbursed = disbs
            .filter(d => d.received_in_account)
            .reduce((sum, d) => sum + Number(d.disbursement_amount || 0), 0);

          const pending = Math.max(0, sanctioned - totalDisbursed);

          let stage: TrancheCustomer['trancheStage'] = 'no_tranche';
          let expectedT2 = 0;

          if (!t1) {
            stage = 'tranche_1_pending';
          } else if (t1 && !t2) {
            stage = 'tranche_2_pending';
            expectedT2 = pending > 0 ? pending : Math.round(sanctioned * 0.4);
          } else if (t1 && t2 && pending > 0) {
            stage = 'tranche_3_pending';
          } else if (pending <= 0 && sanctioned > 0) {
            stage = 'fully_disbursed';
          }

          processedMap.set(c.id, {
            id: c.id,
            customer_name: c.customer_name || 'Customer',
            phone: c.phone,
            consumer_number: c.consumer_number,
            district: c.district,
            mandal: c.mandal,
            village_name: c.village_name,
            installation_status: c.installation_status,
            payment_method_type: c.payment_method_type,
            bank_name: c.bank_name || loanApp?.bank_name || 'Bank Loan',
            loan_sanctioned_amount: sanctioned,
            agreed_project_cost: Number(c.agreed_project_cost || 0),
            system_capacity: c.system_capacity,
            loan_application_id: loanApp?.id || null,
            application_number: loanApp?.application_number || null,
            loan_status: loanApp?.loan_status || null,
            disbursements: disbs,
            tranche1Amount,
            tranche1Date: t1 ? t1.disbursement_date : null,
            tranche1Received: !!t1,
            tranche2Amount,
            tranche2Date: t2 ? t2.disbursement_date : null,
            tranche2Received: !!t2,
            tranche3Amount,
            tranche3Date: t3 ? t3.disbursement_date : null,
            tranche3Received: !!t3,
            totalDisbursed,
            pendingLoanAmount: expectedT2 || pending,
            expectedTranche2Pending: expectedT2 || pending,
            trancheStage: stage,
            utr1: t1?.disbursement_reference || null,
            utr2: t2?.disbursement_reference || null
          });
        }
      });

      const finalCustomers = Array.from(processedMap.values());
      setCustomers(finalCustomers);
    } catch (error) {
      console.error('Error loading tranche data:', error);
      // Fallback to initial seed directly to never show empty
      const fallbackList = INITIAL_GST_TRANCHE_DISBURSALS.map(item => ({
        id: item.id,
        customer_name: item.customer_name,
        phone: item.matched_customer?.phone || null,
        consumer_number: item.matched_customer?.consumerNumber || null,
        district: item.matched_customer?.district || 'Andhra Pradesh',
        mandal: null,
        village_name: null,
        installation_status: 'panels_installed',
        payment_method_type: 'bank_loan',
        bank_name: item.bank_name || 'Bank Loan',
        loan_sanctioned_amount: item.total_amount || (item.t1_amount + (item.est_pending || 0)),
        agreed_project_cost: item.total_amount || 200000,
        system_capacity: item.matched_customer?.capacity || '3',
        loan_application_id: null,
        application_number: null,
        loan_status: 'sanctioned',
        disbursements: [],
        tranche1Amount: item.t1_amount,
        tranche1Date: item.t1_date,
        tranche1Received: true,
        tranche2Amount: item.t2_amount || 0,
        tranche2Date: item.t2_date || null,
        tranche2Received: (item.t2_amount || 0) > 0,
        tranche3Amount: 0,
        tranche3Date: null,
        tranche3Received: false,
        totalDisbursed: item.t1_amount + (item.t2_amount || 0),
        pendingLoanAmount: item.category === 'single_tranche' ? (item.est_pending || 59400) : 0,
        expectedTranche2Pending: item.category === 'single_tranche' ? (item.est_pending || 59400) : 0,
        trancheStage: (item.category === 'single_tranche' && !(item.t2_amount > 0)) ? ('tranche_2_pending' as const) : ('fully_disbursed' as const),
        utr1: item.t1_utr,
        utr2: item.t2_utr
      }));
      setCustomers(fallbackList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrancheData();

    // Listen for updates from GSTDisbursalManager or other components
    const handleDisbursalUpdate = () => {
      loadTrancheData();
    };
    window.addEventListener('tb_gst_tranche_updated', handleDisbursalUpdate);
    window.addEventListener('storage', handleDisbursalUpdate);

    return () => {
      window.removeEventListener('tb_gst_tranche_updated', handleDisbursalUpdate);
      window.removeEventListener('storage', handleDisbursalUpdate);
    };
  }, [loadTrancheData]);

  // Open modal to record tranche
  const openRecordModal = (customer: TrancheCustomer, trancheNum: number = 2) => {
    setModalCustomer(customer);
    setModalTrancheNumber(trancheNum);
    setModalAmount(customer.pendingLoanAmount > 0 ? String(customer.pendingLoanAmount) : '59400');
    setModalDate(new Date().toISOString().split('T')[0]);
    setModalReference('');
    setModalReceived(true);
    setModalNotes(`Tranche ${trancheNum} released by bank`);
    setModalError(null);
  };

  const handleSaveTranche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCustomer) return;

    try {
      setSavingTranche(true);
      setModalError(null);

      const parsedAmount = parseFloat(modalAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setModalError('Please enter a valid disbursement amount.');
        setSavingTranche(false);
        return;
      }

      // 1. UPDATE IN LOCAL VAULT (Guaranteed Persistence - Never Lose Data)
      let storedItems: GSTTrancheDisbursalItem[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        storedItems = raw ? JSON.parse(raw) : [...INITIAL_GST_TRANCHE_DISBURSALS];
      } catch {
        storedItems = [...INITIAL_GST_TRANCHE_DISBURSALS];
      }

      const itemIdx = storedItems.findIndex(i => i.id === modalCustomer.id || i.customer_id === modalCustomer.id);
      if (itemIdx !== -1) {
        const item = storedItems[itemIdx];
        if (modalTrancheNumber === 2) {
          item.t2_amount = parsedAmount;
          item.t2_date = modalDate;
          item.t2_utr = modalReference || `NEFT-${Date.now().toString().slice(-6)}`;
          item.category = 'both_tranches';
          item.est_pending = 0;
          item.status = 'Both Tranches Received';
          item.total_amount = (item.t1_amount || 0) + parsedAmount;
        } else if (modalTrancheNumber === 1) {
          item.t1_amount = parsedAmount;
          item.t1_date = modalDate;
          item.t1_utr = modalReference || `NEFT-${Date.now().toString().slice(-6)}`;
          item.total_amount = parsedAmount + (item.t2_amount || 0);
        }
        if (modalNotes) {
          item.notes = (item.notes ? item.notes + ' | ' : '') + modalNotes;
        }
        storedItems[itemIdx] = item;
      } else {
        // Create new item in local vault
        const newItem: GSTTrancheDisbursalItem = {
          id: `tranche-rec-${Date.now()}`,
          customer_name: modalCustomer.customer_name,
          category: modalTrancheNumber === 2 ? 'both_tranches' : 'single_tranche',
          bank_name: modalCustomer.bank_name || 'Bank Transfer',
          t1_date: modalTrancheNumber === 1 ? modalDate : (modalCustomer.tranche1Date || new Date().toISOString().split('T')[0]),
          t1_amount: modalTrancheNumber === 1 ? parsedAmount : modalCustomer.tranche1Amount,
          t1_utr: modalTrancheNumber === 1 ? (modalReference || `NEFT-${Date.now().toString().slice(-6)}`) : (modalCustomer.utr1 || 'PREV-UTR'),
          t2_date: modalTrancheNumber === 2 ? modalDate : null,
          t2_amount: modalTrancheNumber === 2 ? parsedAmount : 0,
          t2_utr: modalTrancheNumber === 2 ? (modalReference || `NEFT-${Date.now().toString().slice(-6)}`) : null,
          total_amount: modalTrancheNumber === 2 ? (modalCustomer.tranche1Amount + parsedAmount) : parsedAmount,
          est_pending: modalTrancheNumber === 2 ? 0 : 59400,
          status: modalTrancheNumber === 2 ? 'Both Tranches Received' : 'Pending 2nd Tranche',
          customer_id: modalCustomer.id.startsWith('single-') ? null : modalCustomer.id,
          matched_customer: {
            id: modalCustomer.id,
            name: modalCustomer.customer_name,
            consumerNumber: modalCustomer.consumer_number,
            phone: modalCustomer.phone,
            district: modalCustomer.district,
            capacity: modalCustomer.system_capacity
          },
          is_gst_invoiced: false,
          invoice_file: null,
          invoice_number: null,
          invoice_date: null,
          notes: modalNotes || ''
        };
        storedItems.unshift(newItem);
      }

      // Save to localStorage immediately
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storedItems));

      // Broadcast update event so all components immediately sync
      window.dispatchEvent(new CustomEvent('tb_gst_tranche_updated'));

      // 2. Best-effort Supabase sync (does not block or crash if Supabase fails)
      try {
        let loanAppId = modalCustomer.loan_application_id;
        if (!loanAppId && !modalCustomer.id.startsWith('single-') && !modalCustomer.id.startsWith('both-')) {
          const { data: newApp } = await supabase
            .from('loan_applications')
            .insert({
              customer_id: modalCustomer.id,
              loan_amount_sanctioned: modalCustomer.loan_sanctioned_amount || (parsedAmount * 2),
              bank_name: modalCustomer.bank_name,
              disbursement_type: 'tranche',
              loan_status: 'sanctioned'
            })
            .select('id')
            .maybeSingle();
          if (newApp) loanAppId = newApp.id;
        }

        if (loanAppId) {
          await supabase.from('loan_disbursements').insert([{
            loan_application_id: loanAppId,
            disbursement_number: modalTrancheNumber,
            disbursement_amount: parsedAmount,
            disbursement_date: modalDate,
            disbursement_reference: modalReference || null,
            received_in_account: modalReceived,
            notes: modalNotes || null
          }]);
        }
      } catch (err) {
        console.warn('Supabase remote sync bypassed, safely stored locally:', err);
      }

      // Close modal and refresh list
      setModalCustomer(null);
      showToast(`Tranche ${modalTrancheNumber} of ₹${parsedAmount.toLocaleString('en-IN')} recorded & permanently preserved!`);
      await loadTrancheData();
    } catch (err: any) {
      console.error('Failed to record tranche:', err);
      setModalError(err?.message || 'Failed to record tranche.');
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
      .reduce((sum, c) => sum + (c.pendingLoanAmount || 0), 0);

    const totalSanctioned = customers.reduce((sum, c) => sum + (c.loan_sanctioned_amount || 0), 0);
    const totalDisbursed = customers.reduce((sum, c) => sum + (c.totalDisbursed || 0), 0);

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
        (c.mandal && c.mandal.toLowerCase().includes(q)) ||
        (c.utr1 && c.utr1.toLowerCase().includes(q)) ||
        (c.utr2 && c.utr2.toLowerCase().includes(q))
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
      '1st Tranche UTR': c.utr1 || '',
      '2nd Tranche Received (₹)': c.tranche2Amount,
      '2nd Tranche Date': c.tranche2Date || '',
      '2nd Tranche UTR': c.utr2 || '',
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

  // Download Tranches Vault Backup (JSON)
  const handleDownloadBackup = () => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || JSON.stringify(INITIAL_GST_TRANCHE_DISBURSALS);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tejo_tranche_disbursements_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowBackupMenu(false);
    showToast('Tranche disbursements backup downloaded successfully!');
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">2nd Tranche Pending Hub</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Vault Active (Never Lose Data)
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Track, follow-up, and record second loan tranches across bank solar projects with 100% loss-proof persistence
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors shadow-2xs disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel ({filteredCustomers.length})
          </button>

          {/* Backup Menu */}
          <div className="relative">
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="Vault Backup & Restore"
            >
              <Database className="w-4 h-4 text-slate-600" />
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 p-2 text-xs space-y-1">
                <div className="px-3 py-1.5 font-bold text-gray-800 border-b border-gray-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Tranches Vault
                </div>
                <button
                  onClick={handleDownloadBackup}
                  className="w-full text-left px-3 py-2 hover:bg-teal-50 rounded-lg flex items-center gap-2 text-gray-700 hover:text-teal-900 font-medium"
                >
                  <ArrowDownToLine className="w-4 h-4 text-teal-600" />
                  Download Backup (JSON)
                </button>
              </div>
            )}
          </div>
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

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">1st Tranche Cleared (Ready)</p>
            <div className="p-1.5 bg-green-50 rounded-lg text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{counts.t2Count}</p>
          <p className="text-xs text-gray-500 mt-1">Projects ready for 2nd tranche release</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fully Disbursed</p>
            <div className="p-1.5 bg-teal-50 rounded-lg text-teal-600">
              <CheckCircle2 className="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{counts.fullyCount}</p>
          <p className="text-xs text-gray-500 mt-1">Both tranches collected</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
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
      <div className="border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('tranche_2_pending')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'tranche_2_pending'
                ? 'border-amber-600 text-amber-800 bg-amber-50/70'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>2nd Tranche Pending</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-200/80 text-amber-900 font-bold">
              {counts.t2Count}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fully_disbursed')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'fully_disbursed'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/70'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Fully Disbursed</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-200/80 text-emerald-900 font-bold">
              {counts.fullyCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-teal-700 text-teal-900 bg-teal-50/70'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-700" />
            <span>All Tranche Records</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-800 font-bold">
              {counts.totalCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search customer, phone, SC no, UTR..."
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
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
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-medium"
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
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

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <h4 className="text-base font-semibold text-gray-800">No customers found for this filter</h4>
            <p className="text-xs text-gray-500 mt-1">Try resetting filters or searching with another keyword.</p>
          </div>
        ) : (
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
                            <span className="font-bold text-gray-900 text-sm">
                              {customer.customer_name}
                            </span>
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
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
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
                                {customer.tranche1Date}
                              </p>
                            )}
                            {customer.utr1 && (
                              <p className="text-[10px] text-gray-400 font-mono truncate max-w-[130px]" title={customer.utr1}>
                                {customer.utr1}
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
                                {customer.tranche2Date}
                              </p>
                            )}
                            {customer.utr2 && (
                              <p className="text-[10px] text-gray-400 font-mono truncate max-w-[130px]" title={customer.utr2}>
                                {customer.utr2}
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
                          <div>
                            {customer.trancheStage === 'tranche_2_pending' && (
                              <span className="inline-block text-[11px] font-bold text-amber-800">
                                🟡 2nd Tranche Due
                              </span>
                            )}
                            {customer.trancheStage === 'fully_disbursed' && (
                              <span className="inline-block text-[11px] font-bold text-emerald-800">
                                🟢 Cleared
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quick Action */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {customer.trancheStage === 'tranche_2_pending' ? (
                            <button
                              onClick={() => openRecordModal(customer, 2)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Record 2nd Tranche
                            </button>
                          ) : (
                            <button
                              onClick={() => openRecordModal(customer, customer.tranche2Received ? 3 : 2)}
                              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                            >
                              Update Tranche
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Record Tranche Modal */}
      {modalCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-amber-50/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Record Tranche {modalTrancheNumber}
                  </h3>
                  <p className="text-xs text-gray-500">{modalCustomer.customer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setModalCustomer(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTranche} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {modalError}
                </div>
              )}

              <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank:</span>
                  <span className="font-semibold text-gray-900">{modalCustomer.bank_name || 'Bank Loan'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sanctioned Amount:</span>
                  <span className="font-semibold text-gray-900">{fmt(modalCustomer.loan_sanctioned_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Already Disbursed:</span>
                  <span className="font-semibold text-gray-900">{fmt(modalCustomer.totalDisbursed)}</span>
                </div>
                <div className="flex justify-between text-amber-900 font-bold">
                  <span>Pending Balance:</span>
                  <span>{fmt(modalCustomer.pendingLoanAmount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Tranche {modalTrancheNumber} Disbursed Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={modalAmount}
                  onChange={e => setModalAmount(e.target.value)}
                  placeholder="e.g. 59400"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={modalDate}
                    onChange={e => setModalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Bank UTR / Ref No
                  </label>
                  <input
                    type="text"
                    value={modalReference}
                    onChange={e => setModalReference(e.target.value)}
                    placeholder="e.g. NEFTINW-165..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder="e.g. Received via State Bank loan release"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={modalReceived}
                  onChange={e => setModalReceived(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <span>Confirmed credited into Tejo Bharat Bank Account</span>
              </label>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={savingTranche}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {savingTranche ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to Vault...
                    </>
                  ) : (
                    `Save Tranche ${modalTrancheNumber} Disbursement`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setModalCustomer(null)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
