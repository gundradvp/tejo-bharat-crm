import React, { useState, useEffect } from 'react';
import { Quotation, DocumentType, PaymentInRecord } from '../types/quotation';
import { PaymentInDetailView } from './PaymentInDetailView';
import { supabase } from '../lib/supabase';
import historicalQuotations from '../data/historicalQuotations.json';
import { 
  Search, 
  Settings, 
  FileSpreadsheet, 
  Keyboard, 
  ChevronDown, 
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Trash2,
  Edit2,
  Receipt,
  FileText
} from 'lucide-react';

interface QuotationsListProps {
  onSelectQuotation: (q: Quotation) => void;
  onNewQuotation: (docType?: DocumentType) => void;
  activeDocFilter?: 'All' | DocumentType;
  paymentInRecords?: PaymentInRecord[];
  onOpenCreatePaymentIn?: () => void;
  onDeletePaymentInRecord?: (id: string) => void;
}

export const QuotationsList: React.FC<QuotationsListProps> = ({
  onSelectQuotation,
  onNewQuotation,
  activeDocFilter = 'Quotation',
  paymentInRecords = [],
  onOpenCreatePaymentIn,
  onDeletePaymentInRecord
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [docFilter, setDocFilter] = useState<'All' | DocumentType>(activeDocFilter);
  const [dateRange, setDateRange] = useState<string>('Last 365 Days');
  const [quotationFilterStatus, setQuotationFilterStatus] = useState<string>('Show All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPaymentInRecord, setSelectedPaymentInRecord] = useState<PaymentInRecord | null>(null);

  useEffect(() => {
    setDocFilter(activeDocFilter);
  }, [activeDocFilter]);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      // Build master list strictly seeded with TBGE quotations
      const masterHistorical = (historicalQuotations as Quotation[]).filter(q => 
        (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE')
      );
      let combined = [...masterHistorical];
      const local = localStorage.getItem('tb_quotations_history');
      if (local) {
        try {
          const parsed = JSON.parse(local) as Quotation[];
          const lookup = new Map<string, Quotation>();
          // Base defaults
          masterHistorical.forEach(q => lookup.set((q.quotation_no || '').trim().toUpperCase(), q));
          // User edits / new additions take precedence
          parsed.filter(q => (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE'))
                .forEach(q => {
                  const key = (q.quotation_no || '').trim().toUpperCase();
                  if (key === 'TBGE2627Q003' && q.total_amount === 1275000) {
                    return; // Keep 14.70L master version
                  }
                  lookup.set(key, q);
                });
          combined = Array.from(lookup.values()).filter(q => 
            (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE')
          );
        } catch (e) {
          console.warn('Error reading tb_quotations_history:', e);
        }
      }
      localStorage.setItem('tb_quotations_history', JSON.stringify(combined));
      setQuotations(combined);
    } catch (e) {
      console.error(e);
      setQuotations((historicalQuotations as Quotation[]).filter(q => (q.quotation_no || '').trim().toUpperCase().startsWith('TBGE')));
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotation_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer_location?.toLowerCase().includes(searchTerm.toLowerCase());

    const docType = q.document_type || 'Quotation';
    const matchesFilter = docFilter === 'All' || docType === docFilter || 
      (docFilter === 'Sales Invoice' && docType === 'Tax Invoice');

    return matchesSearch && matchesFilter;
  });

  const filteredPaymentInRecords = paymentInRecords.filter((p) => {
    return (
      p.party_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.payment_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Metric summary calculations for Sales Invoices view
  const totalSales = filteredQuotations.reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  const paidSales = filteredQuotations.reduce((acc, curr) => {
    if (curr.payment_status === 'Paid' || curr.is_fully_paid) {
      return acc + (curr.total_amount || 0);
    }
    return acc + (curr.amount_received || 0);
  }, 0);
  const unpaidSales = Math.max(0, totalSales - paidSales);

  const handleDelete = async (id?: string, quoteNo?: string) => {
    if (!quoteNo) return;

    // Check if there are linked Payment In records for this invoice
    const linkedPayments = paymentInRecords.filter((p) =>
      p.settled_invoices?.some((s) => s.invoice_no === quoteNo)
    );

    if (linkedPayments.length > 0) {
      const payRefs = linkedPayments.map((p) => `#${p.payment_number}`).join(', ');
      alert(
        `❌ CANNOT DELETE INVOICE #${quoteNo}\n\nThis invoice has ${linkedPayments.length} linked Payment In entry/entries (${payRefs}).\n\nPlease delete the linked Payment In entry from Payment In section first before deleting this invoice.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete ${quoteNo}?`)) return;

    if (id) {
      await supabase.from('quotations').delete().eq('id', id);
    }

    const updated = quotations.filter(q => q.id !== id && q.quotation_no !== quoteNo);
    setQuotations(updated);
    localStorage.setItem('tb_quotations_history', JSON.stringify(updated));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredQuotations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuotations.map(q => q.id || q.quotation_no));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Determine current page type
  const isSalesInvoicesView = docFilter === 'Sales Invoice' || docFilter === 'Tax Invoice' || docFilter === 'All';
  const isQuotationView = docFilter === 'Quotation';
  const isPaymentInView = docFilter === 'Payment In';
  const isProformaView = docFilter === 'Proforma Invoice';

  if (isPaymentInView && selectedPaymentInRecord) {
    return (
      <PaymentInDetailView
        record={selectedPaymentInRecord}
        onBack={() => setSelectedPaymentInRecord(null)}
        onDelete={(id) => {
          if (onDeletePaymentInRecord) onDeletePaymentInRecord(id);
          setSelectedPaymentInRecord(null);
        }}
      />
    );
  }

  const getPageTitle = () => {
    if (isQuotationView) return 'Quotation / Estimate';
    if (isPaymentInView) return 'Payment In';
    if (isProformaView) return 'Proforma Invoice';
    return 'Sales Invoices';
  };

  const getCreateButtonLabel = () => {
    if (isQuotationView) return 'Create Quotation';
    if (isPaymentInView) return 'Create Payment In';
    if (isProformaView) return 'Create Proforma Invoice';
    return 'Create Sales Invoice';
  };

  const handleCreateClick = () => {
    if (isPaymentInView && onOpenCreatePaymentIn) {
      onOpenCreatePaymentIn();
    } else {
      onNewQuotation(docFilter === 'All' ? 'Sales Invoice' : docFilter);
    }
  };

  return (
    <div className="space-y-4 font-sans text-slate-800">
      
      {/* TOP HEADER TITLE BAR */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          {getPageTitle()}
        </h1>

        <div className="flex items-center gap-2">
          {isSalesInvoicesView && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Reports</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          <button className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm">
            <Settings className="w-4 h-4" />
          </button>

          <button className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm">
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* QUICK DOCUMENT TYPE TABS */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
        <button
          onClick={() => setDocFilter('All')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            docFilter === 'All'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>All Documents</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            docFilter === 'All' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {quotations.length}
          </span>
        </button>

        <button
          onClick={() => setDocFilter('Quotation')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            docFilter === 'Quotation'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Quotations / Estimates</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            docFilter === 'Quotation' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'
          }`}>
            {quotations.filter(q => (q.document_type || 'Quotation') === 'Quotation').length}
          </span>
        </button>

        <button
          onClick={() => setDocFilter('Sales Invoice')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            docFilter === 'Sales Invoice'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Sales Invoices</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            docFilter === 'Sales Invoice' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700'
          }`}>
            {quotations.filter(q => q.document_type === 'Sales Invoice' || q.document_type === 'Tax Invoice').length}
          </span>
        </button>

        <button
          onClick={() => setDocFilter('Payment In')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            docFilter === 'Payment In'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Payment In</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            docFilter === 'Payment In' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {paymentInRecords.length}
          </span>
        </button>
      </div>

      {/* METRIC SUMMARY CARDS (Displayed strictly for Sales Invoices as per Screenshot 2) */}
      {isSalesInvoicesView && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#f0f4ff] p-4 rounded-xl border-2 border-indigo-500/80 shadow-sm">
            <div className="text-xs font-bold text-slate-600">Total Sales</div>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              ₹ {totalSales.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Paid</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              ₹ {paidSales.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <span>Unpaid</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              ₹ {unpaidSales.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-500">Cancelled</div>
            <div className="text-xl font-black text-slate-400 mt-1">–</div>
          </div>
        </div>
      )}

      {/* PAYMENT IN TAB (Displayed strictly for Payment In as per Screenshot 1) */}
      {isPaymentInView && (
        <div className="border-b border-slate-200 pb-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-indigo-700 border-b-2 border-indigo-600">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Payment Received</span>
          </button>
        </div>
      )}

      {/* CONTROLS & SEARCH BAR */}
      <div className="flex items-center justify-between gap-3 pt-1">
        
        {/* Left Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Picker Dropdown */}
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{dateRange}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Additional Filter Dropdown for Quotation View */}
          {isQuotationView && (
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
              <span>{quotationFilterStatus}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {isSalesInvoicesView && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
              <span>Bulk Actions</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}

          {/* Primary Create Button */}
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-1.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white px-4 py-1.5 rounded-lg text-xs font-extrabold shadow-md transition-all"
          >
            <span>{getCreateButtonLabel()}</span>
          </button>
        </div>

      </div>

      {/* DATA TABLE (Dynamic Header & Columns per Uploaded Screenshots) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Loading records...
          </div>
        ) : isPaymentInView ? (
          /* PAYMENT IN TABLE VIEW (Matching Screenshot 1) */
          filteredPaymentInRecords.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm font-bold text-slate-700">No Payment Records Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Record your first payment received from a customer.
              </p>
              <button
                onClick={onOpenCreatePaymentIn}
                className="px-4 py-2 bg-[#4f46e5] text-white font-bold text-xs rounded-lg shadow"
              >
                Create Payment In Now
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3">
                    <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-900">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3">Payment Number</th>
                  <th className="p-3">Party Name</th>
                  <th className="p-3">Total Amount Settled</th>
                  <th className="p-3">Amount Received</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPaymentInRecords.map((p) => {
                  const settledSum = (p.settled_invoices || []).reduce((acc, c) => acc + c.amount_settled, 0);
                  return (
                    <tr 
                      key={p.id}
                      onClick={() => setSelectedPaymentInRecord(p)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-semibold text-slate-700">{p.payment_date}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{p.payment_number}</td>
                      <td className="p-3 font-bold text-slate-900 uppercase">{p.party_name}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹ {settledSum.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₹ {p.amount_received.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-semibold text-slate-700">{p.payment_mode}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeletePaymentInRecord) onDeletePaymentInRecord(p.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-slate-700">No Records Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create your first record to see entries listed here.
            </p>
            <button
              onClick={() => onNewQuotation(docFilter === 'All' ? 'Sales Invoice' : docFilter)}
              className="px-4 py-2 bg-[#4f46e5] text-white font-bold text-xs rounded-lg shadow"
            >
              {getCreateButtonLabel()} Now
            </button>
          </div>
        ) : (
          /* STANDARD QUOTATION / INVOICE TABLE */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                {isSalesInvoicesView && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredQuotations.length && filteredQuotations.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                
                <th className="p-3">
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-900">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th className="p-3">
                  {isQuotationView ? 'Quotation Number' : isProformaView ? 'PI Number' : 'Invoice Number'}
                </th>

                {docFilter === 'All' && (
                  <th className="p-3">Type</th>
                )}

                <th className="p-3">Party Name</th>

                {isQuotationView ? (
                  <>
                    <th className="p-3">Due In</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </>
                ) : (
                  <>
                    <th className="p-3">Due In</th>
                    <th className="p-3">
                      <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-900">
                        <span>Amount</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3">Status</th>
                  </>
                )}

                <th className="p-3 w-10"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredQuotations.map((q) => {
                const idKey = q.id || q.quotation_no;
                const isSelected = selectedIds.includes(idKey);
                const isPaid = q.payment_status === 'Paid' || q.is_fully_paid;
                const unpaidAmt = isPaid ? 0 : Math.max(0, q.total_amount - (q.amount_received || 0));

                return (
                  <tr 
                    key={idKey}
                    className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}
                  >
                    {isSalesInvoicesView && (
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(idKey)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    )}

                    <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                      {q.quotation_date}
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {q.quotation_no}
                    </td>

                    {docFilter === 'All' && (
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (q.document_type || 'Quotation') === 'Quotation'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {q.document_type || 'Quotation'}
                        </span>
                      </td>
                    )}

                    <td className="p-3 font-bold text-slate-900 uppercase">
                      {q.customer_name}
                    </td>

                    {isQuotationView ? (
                      /* QUOTATION COLUMNS (Matching Screenshot 2) */
                      <>
                        <td className="p-3 text-slate-400 font-mono">
                          {q.due_date || '–'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          ₹ {q.total_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Open
                          </span>
                        </td>
                      </>
                    ) : (
                      /* SALES INVOICE / PI COLUMNS */
                      <>
                        <td className="p-3 text-slate-400 font-mono">
                          {q.due_date || '–'}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹ {q.total_amount.toLocaleString('en-IN')}
                          {!isPaid && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              (₹ {unpaidAmt.toLocaleString('en-IN')} unpaid)
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                              : (q.amount_received && q.amount_received > 0)
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}>
                            {isPaid ? 'Paid' : (q.amount_received && q.amount_received > 0) ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                      </>
                    )}

                    <td className="p-3 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onSelectQuotation(q)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Open / Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id, q.quotation_no)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};
