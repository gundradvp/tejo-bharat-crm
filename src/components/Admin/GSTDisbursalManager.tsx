import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Link2,
  ExternalLink,
  Download,
  Copy,
  Check,
  Building2,
  Layers,
  FileText,
  User,
  Phone,
  Hash,
  Database,
  RefreshCw,
  X,
  Edit2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { INITIAL_GST_TRANCHE_DISBURSALS, GSTTrancheDisbursalItem } from '../../data/gstTrancheInitialData';

type CategoryFilter = 'all' | 'both_tranches' | 'single_tranche' | 'lumpsum';
type StatusFilter = 'all' | 'pending' | 'invoiced';
type SortField = 'date' | 'amount' | 'name' | 'status';
type SortOrder = 'desc' | 'asc';

const LOCAL_STORAGE_KEY = 'tejo_gst_tranche_disbursements_v1';

// Helper to parse DD-MM-YYYY dates
function parseDateValue(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    // DD-MM-YYYY
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
}

export default function GSTDisbursalManager() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';

  const [items, setItems] = useState<GSTTrancheDisbursalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbSynced, setDbSynced] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Customer Linking Modal
  const [linkingItem, setLinkingItem] = useState<GSTTrancheDisbursalItem | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);

  // Invoice Edit Modal
  const [editingInvoiceItem, setEditingInvoiceItem] = useState<GSTTrancheDisbursalItem | null>(null);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [editInvoiceDate, setEditInvoiceDate] = useState('');
  const [editInvoiceNotes, setEditInvoiceNotes] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // 1. Initial Load from Supabase or LocalStorage / Initial Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Try fetching from Supabase table
      const { data: dbData, error } = await supabase
        .from('gst_tranche_disbursements')
        .select(`
          *,
          customer:customers (
            id,
            customer_name,
            consumer_number,
            phone,
            district_name,
            system_capacity
          )
        `);

      if (!error && dbData && dbData.length > 0) {
        const mapped: GSTTrancheDisbursalItem[] = dbData.map((d: any) => ({
          id: d.id,
          customer_name: d.customer_name,
          category: d.category,
          bank_name: d.bank_name || 'Bank Transfer',
          t1_date: d.t1_date || '',
          t1_amount: Number(d.t1_amount || 0),
          t1_utr: d.t1_utr || '',
          t2_date: d.t2_date || null,
          t2_amount: Number(d.t2_amount || 0),
          t2_utr: d.t2_utr || null,
          total_amount: Number(d.total_amount || 0),
          est_pending: Number(d.est_pending || 0),
          status: d.status || '',
          customer_id: d.customer_id || null,
          matched_customer: d.customer
            ? {
                id: d.customer.id,
                name: d.customer.customer_name,
                consumerNumber: d.customer.consumer_number,
                phone: d.customer.phone,
                district: d.customer.district_name,
                capacity: d.customer.system_capacity,
              }
            : null,
          is_gst_invoiced: Boolean(d.is_gst_invoiced),
          invoice_file: d.invoice_file || null,
          invoice_number: d.invoice_number || null,
          invoice_date: d.invoice_date || null,
          notes: d.notes || '',
        }));
        setItems(mapped);
        setDbSynced(true);
      } else {
        // Fallback to LocalStorage overlaid on INITIAL_GST_TRANCHE_DISBURSALS
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setItems(parsed);
          } catch {
            setItems(INITIAL_GST_TRANCHE_DISBURSALS);
          }
        } else {
          setItems(INITIAL_GST_TRANCHE_DISBURSALS);
        }
        setDbSynced(false);
      }
    } catch {
      setItems(INITIAL_GST_TRANCHE_DISBURSALS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save changes locally and to Supabase if available
  const persistItems = useCallback(async (updated: GSTTrancheDisbursalItem[]) => {
    setItems(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    // Best-effort push to Supabase
    try {
      for (const item of updated) {
        await supabase
          .from('gst_tranche_disbursements')
          .upsert({
            id: item.id,
            customer_name: item.customer_name,
            category: item.category,
            bank_name: item.bank_name,
            t1_date: item.t1_date,
            t1_amount: item.t1_amount,
            t1_utr: item.t1_utr,
            t2_date: item.t2_date,
            t2_amount: item.t2_amount,
            t2_utr: item.t2_utr,
            total_amount: item.total_amount,
            est_pending: item.est_pending,
            status: item.status,
            customer_id: item.customer_id,
            is_gst_invoiced: item.is_gst_invoiced,
            invoice_file: item.invoice_file,
            invoice_number: item.invoice_number,
            invoice_date: item.invoice_date,
            notes: item.notes || '',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      }
    } catch {}
  }, []);

  // Sync / Initialize All to Database
  const handleBulkSyncToDatabase = async () => {
    setSyncingDb(true);
    try {
      const recordsToInsert = items.map((item) => ({
        id: item.id,
        customer_name: item.customer_name,
        category: item.category,
        bank_name: item.bank_name,
        t1_date: item.t1_date,
        t1_amount: item.t1_amount,
        t1_utr: item.t1_utr,
        t2_date: item.t2_date,
        t2_amount: item.t2_amount,
        t2_utr: item.t2_utr,
        total_amount: item.total_amount,
        est_pending: item.est_pending,
        status: item.status,
        customer_id: item.customer_id,
        is_gst_invoiced: item.is_gst_invoiced,
        invoice_file: item.invoice_file,
        invoice_number: item.invoice_number,
        invoice_date: item.invoice_date,
        notes: item.notes || '',
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('gst_tranche_disbursements')
        .upsert(recordsToInsert, { onConflict: 'id' });

      if (error) throw error;
      setDbSynced(true);
      showToast('✅ All 137 records successfully synced to Supabase database!');
    } catch (err: any) {
      console.error('Sync failed:', err);
      showToast(`⚠️ Sync notice: ${err?.message || 'Database table not created yet. Changes saved locally.'}`);
    } finally {
      setSyncingDb(false);
    }
  };

  // Toggle GST Invoiced Status
  const handleToggleInvoice = (itemId: string) => {
    const updated = items.map((it) => {
      if (it.id === itemId) {
        const nextState = !it.is_gst_invoiced;
        return {
          ...it,
          is_gst_invoiced: nextState,
          invoice_date: nextState ? (it.invoice_date || new Date().toISOString().split('T')[0]) : null,
        };
      }
      return it;
    });
    persistItems(updated);
    showToast('Updated GST Invoice status');
  };

  // Save Custom Invoice Details
  const handleSaveInvoiceDetails = () => {
    if (!editingInvoiceItem) return;
    const updated = items.map((it) => {
      if (it.id === editingInvoiceItem.id) {
        return {
          ...it,
          is_gst_invoiced: true,
          invoice_number: editInvoiceNumber.trim() || null,
          invoice_date: editInvoiceDate || null,
          notes: editInvoiceNotes.trim() || undefined,
        };
      }
      return it;
    });
    persistItems(updated);
    setEditingInvoiceItem(null);
    showToast('Saved GST invoice details');
  };

  // Search CRM Customers for Linking
  const searchCRMCustomers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCustomerOptions([]);
      return;
    }
    setSearchingCustomers(true);
    try {
      const q = query.trim();
      const { data } = await supabase
        .from('customers')
        .select('id, customer_name, consumer_number, phone, district_name, system_capacity')
        .or(`customer_name.ilike.%${q}%,consumer_number.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(20);
      setCustomerOptions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingCustomers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearch) searchCRMCustomers(customerSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, searchCRMCustomers]);

  const handleLinkCustomer = (selectedCust: any) => {
    if (!linkingItem) return;
    const updated = items.map((it) => {
      if (it.id === linkingItem.id) {
        return {
          ...it,
          customer_id: selectedCust.id,
          matched_customer: {
            id: selectedCust.id,
            name: selectedCust.customer_name,
            consumerNumber: selectedCust.consumer_number,
            phone: selectedCust.phone,
            district: selectedCust.district_name,
            capacity: selectedCust.system_capacity,
          },
        };
      }
      return it;
    });
    persistItems(updated);
    setLinkingItem(null);
    showToast(`Linked ${selectedCust.customer_name} successfully!`);
  };

  const handleUnlinkCustomer = (itemId: string) => {
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          customer_id: null,
          matched_customer: null,
        };
      }
      return it;
    });
    persistItems(updated);
    showToast('Customer unlinked');
  };

  // Filtered & Sorted Data
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Status filter
      if (statusFilter === 'pending' && item.is_gst_invoiced) return false;
      if (statusFilter === 'invoiced' && !item.is_gst_invoiced) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.customer_name.toLowerCase().includes(q);
        const matchBank = item.bank_name.toLowerCase().includes(q);
        const matchUtr = (item.t1_utr || '').toLowerCase().includes(q) || (item.t2_utr || '').toLowerCase().includes(q);
        const matchCust = item.matched_customer?.name.toLowerCase().includes(q) ||
          (item.matched_customer?.consumerNumber || '').includes(q) ||
          (item.matched_customer?.phone || '').includes(q);
        const matchInv = (item.invoice_number || '').toLowerCase().includes(q);
        return matchName || matchBank || matchUtr || matchCust || matchInv;
      }

      return true;
    });
  }, [items, categoryFilter, statusFilter, searchQuery]);

  // Sort filtered items (date sorting is primary requirement!)
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (sortField === 'date') {
        // Most recent date: compare t2_date if exists, else t1_date
        const dateA = parseDateValue(a.t2_date || a.t1_date);
        const dateB = parseDateValue(b.t2_date || b.t1_date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      if (sortField === 'amount') {
        return sortOrder === 'desc' ? b.total_amount - a.total_amount : a.total_amount - b.total_amount;
      }
      if (sortField === 'name') {
        return sortOrder === 'desc'
          ? b.customer_name.localeCompare(a.customer_name)
          : a.customer_name.localeCompare(b.customer_name);
      }
      if (sortField === 'status') {
        const aVal = a.is_gst_invoiced ? 1 : 0;
        const bVal = b.is_gst_invoiced ? 1 : 0;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });
  }, [filteredItems, sortField, sortOrder]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = items.length;
    const pendingCount = items.filter((x) => !x.is_gst_invoiced).length;
    const invoicedCount = items.filter((x) => x.is_gst_invoiced).length;

    const totalDisbursed = items.reduce((sum, x) => sum + x.total_amount, 0);
    const pendingDisbursed = items
      .filter((x) => !x.is_gst_invoiced)
      .reduce((sum, x) => sum + x.total_amount, 0);
    const invoicedDisbursed = items
      .filter((x) => x.is_gst_invoiced)
      .reduce((sum, x) => sum + x.total_amount, 0);

    const estGstPending = pendingDisbursed * 0.089;

    return {
      totalCount,
      pendingCount,
      invoicedCount,
      totalDisbursed,
      pendingDisbursed,
      invoicedDisbursed,
      estGstPending,
    };
  }, [items]);

  // Export to Excel
  const exportToExcel = () => {
    const rows = sortedItems.map((item, idx) => ({
      'S.No': idx + 1,
      'Customer Name (Statement)': item.customer_name,
      'Category':
        item.category === 'both_tranches'
          ? 'Both Tranches Received'
          : item.category === 'single_tranche'
          ? 'Single Tranche (2nd Pending)'
          : 'Full Lump-Sum Disbursal',
      'Bank': item.bank_name,
      '1st Tranche Date': item.t1_date || '-',
      '1st Tranche Amount (₹)': item.t1_amount,
      '1st Tranche UTR': item.t1_utr || '-',
      '2nd Tranche Date': item.t2_date || '-',
      '2nd Tranche Amount (₹)': item.t2_amount || 0,
      '2nd Tranche UTR': item.t2_utr || '-',
      'Total Received (₹)': item.total_amount,
      'Est. 2nd Tranche Pending (₹)': item.est_pending || 0,
      'GST Invoice Status': item.is_gst_invoiced ? 'Invoice Raised' : 'GST Pending',
      'Invoice Number': item.invoice_number || '-',
      'Linked CRM Customer': item.matched_customer?.name || 'Unlinked',
      'Consumer Number': item.matched_customer?.consumerNumber || '-',
      'Phone': item.matched_customer?.phone || '-',
      'District': item.matched_customer?.district || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GST Tranche Disbursals');
    XLSX.writeFile(wb, `GST_Tranche_Disbursals_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Exported to Excel!');
  };

  // Copy as TSV (Excel paste friendly)
  const copyAsTSV = () => {
    const headers = [
      'Customer Name',
      'Category',
      '1st Tranche Date',
      '1st Tranche Amount',
      '2nd Tranche Date',
      '2nd Tranche Amount',
      'Total Disbursed',
      'GST Status',
      'Linked Consumer No'
    ];
    const lines = [headers.join('\t')];
    sortedItems.forEach((item) => {
      lines.push([
        item.customer_name,
        item.category,
        item.t1_date,
        item.t1_amount,
        item.t2_date || '-',
        item.t2_amount || '0',
        item.total_amount,
        item.is_gst_invoiced ? 'Invoice Raised' : 'GST Pending',
        item.matched_customer?.consumerNumber || '-'
      ].join('\t'));
    });
    navigator.clipboard.writeText(lines.join('\n'));
    showToast(`Copied ${sortedItems.length} rows to clipboard!`);
  };

  // Check Admin Role
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-1">Administrator Access Required</h2>
          <p className="text-sm text-gray-600 mb-5">
            This GST loan disbursals reconciliation tool is restricted to administrators only.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">GST Loan Disbursals & Tranche Reconciliation</h1>
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                Admin Only
              </span>
              {dbSynced ? (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3" /> Synced to DB
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full">
                  Local Mode
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Reconcile 1st & 2nd bank loan tranches, link to CRM customers, and track GST tax invoices.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!dbSynced && (
            <button
              onClick={handleBulkSyncToDatabase}
              disabled={syncingDb}
              className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Save all records to Supabase table"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingDb ? 'animate-spin' : ''}`} />
              {syncingDb ? 'Syncing...' : 'Sync to Supabase'}
            </button>
          )}
          <button
            onClick={copyAsTSV}
            className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy (Excel TSV)
          </button>
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Disbursed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Total Loan Disbursed</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            ₹{metrics.totalDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Across {metrics.totalCount} statement records
          </div>
        </div>

        {/* Pending GST Invoices */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium mb-1">
            <span>GST Pending Invoices</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-900 font-mono">
            ₹{metrics.pendingDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {metrics.pendingCount} customers need GST invoice
          </div>
        </div>

        {/* GST Invoices Raised */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-medium mb-1">
            <span>GST Invoiced & Billed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-900 font-mono">
            ₹{metrics.invoicedDisbursed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {metrics.invoicedCount} invoices already raised
          </div>
        </div>

        {/* Est 8.9% GST Output */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-medium mb-1">
            <span>Est. 8.9% GST to be Billed</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-blue-900 font-mono">
            ₹{metrics.estGstPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-blue-700 mt-1">
            HSN 85414011 (CGST 4.45% + SGST 4.45%)
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, bank, UTR, consumer number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              ⏳ GST Pending ({metrics.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('invoiced')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'invoiced' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              ✅ Invoiced ({metrics.invoicedCount})
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-2 text-xs font-semibold bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Disbursal Categories</option>
            <option value="both_tranches">Both Tranches (55)</option>
            <option value="single_tranche">Single Tranche - 2nd Pending (35)</option>
            <option value="lumpsum">Full Lump-sum (22)</option>
          </select>

          {/* Sort Controls (DATE IS DEFAULT!) */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none pr-1 cursor-pointer"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="name">Sort by Name</option>
                <option value="status">Sort by GST Status</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl transition"
              title={`Currently ${sortOrder === 'desc' ? 'Newest / Highest First' : 'Oldest / Lowest First'} (Click to toggle)`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Active Criteria Indicator */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>
            Showing <strong className="text-gray-800">{sortedItems.length}</strong> of{' '}
            <strong className="text-gray-800">{items.length}</strong> disbursals
          </span>
          <span className="font-mono text-emerald-700 font-semibold">
            Filtered Total: ₹{sortedItems.reduce((s, x) => s + x.total_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4">Statement Customer Name</th>
                <th className="py-3 px-3">Linked CRM Customer</th>
                <th className="py-3 px-3">Category / Bank</th>
                <th className="py-3 px-3 text-center">1st Tranche</th>
                <th className="py-3 px-3 text-center">2nd Tranche</th>
                <th className="py-3 px-4 text-right">Total Disbursed</th>
                <th className="py-3 px-4 text-center">GST Invoice Status</th>
                <th className="py-3 px-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    Loading statement disbursals...
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    No disbursals matching the selected filters.
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition group">
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-gray-400 text-[11px] font-mono">
                      {idx + 1}
                    </td>

                    {/* Statement Customer Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <span>{item.customer_name}</span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">{item.notes}</p>
                      )}
                    </td>

                    {/* Linked CRM Customer */}
                    <td className="py-3 px-3">
                      {item.matched_customer ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-800 hover:text-blue-600 cursor-pointer"
                              onClick={() => window.open(`/customers/${item.matched_customer?.id}`, '_blank')}
                            >
                              {item.matched_customer.name}
                            </span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            SC: {item.matched_customer.consumerNumber || '—'}
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-2">
                            <span>{item.matched_customer.district || '—'}</span>
                            <button
                              onClick={() => setLinkingItem(item)}
                              className="text-blue-600 hover:underline text-[10px]"
                            >
                              change
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setLinkingItem(item);
                            setCustomerSearch(item.customer_name);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" />
                          Link Customer
                        </button>
                      )}
                    </td>

                    {/* Category & Bank */}
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.category === 'both_tranches'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.category === 'single_tranche'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {item.category === 'both_tranches'
                          ? 'Both Tranches'
                          : item.category === 'single_tranche'
                          ? '2nd Pending'
                          : 'Lump-sum'}
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{item.bank_name}</p>
                    </td>

                    {/* 1st Tranche */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-mono font-semibold text-gray-900">
                        ₹{item.t1_amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">{item.t1_date || '—'}</div>
                      {item.t1_utr && (
                        <div className="text-[9px] text-gray-400 font-mono truncate max-w-[120px] mx-auto" title={item.t1_utr}>
                          {item.t1_utr}
                        </div>
                      )}
                    </td>

                    {/* 2nd Tranche */}
                    <td className="py-3 px-3 text-center">
                      {item.category === 'both_tranches' ? (
                        <>
                          <div className="font-mono font-semibold text-emerald-700">
                            ₹{item.t2_amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">{item.t2_date || '—'}</div>
                          {item.t2_utr && (
                            <div className="text-[9px] text-gray-400 font-mono truncate max-w-[120px] mx-auto" title={item.t2_utr}>
                              {item.t2_utr}
                            </div>
                          )}
                        </>
                      ) : item.category === 'single_tranche' ? (
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            Pending Bank
                          </span>
                          <div className="text-[11px] font-mono text-amber-800 font-medium">
                            ~₹{item.est_pending.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Total Disbursed */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-gray-900 text-sm">
                        ₹{item.total_amount.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        GST: ₹{(item.total_amount * 0.089).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </td>

                    {/* GST Invoice Status */}
                    <td className="py-3 px-4 text-center">
                      {item.is_gst_invoiced ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Invoice Raised
                          </span>
                          {item.invoice_number && (
                            <p className="text-[10px] font-mono text-gray-600 truncate max-w-[130px] mx-auto">
                              {item.invoice_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          GST Pending
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleInvoice(item.id)}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition border ${
                            item.is_gst_invoiced
                              ? 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-800 border-gray-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={item.is_gst_invoiced ? 'Click to mark as Pending' : 'Click to mark as Invoiced'}
                        >
                          {item.is_gst_invoiced ? 'Mark Pending' : 'Mark Invoiced'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingInvoiceItem(item);
                            setEditInvoiceNumber(item.invoice_number || '');
                            setEditInvoiceDate(item.invoice_date || '');
                            setEditInvoiceNotes(item.notes || '');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                          title="Edit Invoice Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Link Modal */}
      {linkingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Link Statement to CRM Customer</h3>
                <p className="text-xs text-gray-500">Statement Name: <strong>{linkingItem.customer_name}</strong></p>
              </div>
              <button
                onClick={() => setLinkingItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search CRM customer by name, consumer number, phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
              {searchingCustomers ? (
                <div className="p-4 text-center text-xs text-gray-400">Searching CRM customers...</div>
              ) : customerOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  {customerSearch ? 'No matching customers found.' : 'Type to search customers...'}
                </div>
              ) : (
                customerOptions.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleLinkCustomer(c)}
                    className="p-3 hover:bg-blue-50/70 transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900">{c.customer_name}</p>
                      <p className="text-[11px] text-gray-500 font-mono">SC: {c.consumer_number || '—'} | Phone: {c.phone || '—'}</p>
                    </div>
                    <span className="text-[11px] text-blue-600 font-semibold px-2 py-1 bg-blue-50 rounded-lg">
                      Link
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {linkingItem.matched_customer && (
                <button
                  onClick={() => {
                    handleUnlinkCustomer(linkingItem.id);
                    setLinkingItem(null);
                  }}
                  className="text-xs text-red-600 hover:underline font-semibold"
                >
                  Unlink current customer
                </button>
              )}
              <div className="ml-auto">
                <button
                  onClick={() => setLinkingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Edit Modal */}
      {editingInvoiceItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Record GST Tax Invoice</h3>
                <p className="text-xs text-gray-500">{editingInvoiceItem.customer_name}</p>
              </div>
              <button
                onClick={() => setEditingInvoiceItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  placeholder="e.g. TB/26-27/1004001"
                  value={editInvoiceNumber}
                  onChange={(e) => setEditInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={editInvoiceDate}
                  onChange={(e) => setEditInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Remarks / Notes</label>
                <textarea
                  placeholder="Any details or payment references..."
                  value={editInvoiceNotes}
                  onChange={(e) => setEditInvoiceNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setEditingInvoiceItem(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveInvoiceDetails}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm"
              >
                Save as Invoiced
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
