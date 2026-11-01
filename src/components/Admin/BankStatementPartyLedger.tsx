import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Calendar,
  Building2,
  DollarSign,
  ArrowUpDown,
  CreditCard,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Sparkles,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import {
  BANK_STATEMENT_TRANSACTIONS,
  BankStatementTransaction,
  STATEMENT_METADATA,
  STATEMENT_PARTIES_LIST,
} from '../../data/bankStatementData';

// Helper to parse DD-MM-YYYY dates
function parseDateTimeValue(dateStr: string): number {
  if (!dateStr) return 0;
  // Format: "30-10-2026 11:06:05" or "30-10-2026"
  const parts = dateStr.trim().split(' ')[0].split('-');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    return new Date(y, m, d).getTime();
  }
  return 0;
}

export default function BankStatementPartyLedger() {
  const navigate = useNavigate();
  const [selectedParty, setSelectedParty] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'CR' | 'DR'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'sl'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const handleCopy = (text: string, identifier: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedRef(identifier);
    showToast(`Copied: ${text}`);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    return BANK_STATEMENT_TRANSACTIONS.filter((tx) => {
      // Party filter
      if (selectedParty !== 'all') {
        if (selectedParty === 'dsr') {
          if (tx.partyKey !== 'dsr' && !tx.desc.toLowerCase().includes('dsr')) return false;
        } else if (tx.partyKey !== selectedParty) {
          return false;
        }
      }

      // Type filter (CR / DR)
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = tx.desc.toLowerCase().includes(q);
        const matchParty = tx.party.toLowerCase().includes(q);
        const matchRef = tx.refNo.toLowerCase().includes(q);
        const matchAmount = tx.amount.toString().includes(q);
        const matchDate = tx.date.toLowerCase().includes(q);
        return matchDesc || matchParty || matchRef || matchAmount || matchDate;
      }

      return true;
    });
  }, [selectedParty, typeFilter, searchQuery]);

  // Sort Transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = parseDateTimeValue(a.date);
        const dateB = parseDateTimeValue(b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      if (sortField === 'amount') {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      if (sortField === 'sl') {
        return sortOrder === 'desc' ? b.sl - a.sl : a.sl - b.sl;
      }
      return 0;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  // Dynamic Party Metrics
  const metrics = useMemo(() => {
    const credits = filteredTransactions.filter((t) => t.type === 'CR');
    const debits = filteredTransactions.filter((t) => t.type === 'DR');
    const totalCreditAmt = credits.reduce((sum, t) => sum + t.amount, 0);
    const totalDebitAmt = debits.reduce((sum, t) => sum + t.amount, 0);
    const netPosition = totalCreditAmt - totalDebitAmt;

    return {
      totalCount: filteredTransactions.length,
      creditCount: credits.length,
      totalCredits: totalCreditAmt,
      debitCount: debits.length,
      totalDebits: totalDebitAmt,
      netPosition,
    };
  }, [filteredTransactions]);

  // Export to Excel
  const exportToExcel = () => {
    const partyName =
      STATEMENT_PARTIES_LIST.find((p) => p.key === selectedParty)?.name || 'Filtered';
    const rows = sortedTransactions.map((tx) => ({
      'Sl. No.': tx.sl,
      'Transaction Date': tx.date,
      'Value Date': tx.valueDate,
      'Party / Entity': tx.party,
      'Description': tx.desc,
      'Chq / Ref No.': tx.refNo,
      'Type': tx.type,
      'Amount (₹)': tx.amount,
      'Balance (₹)': tx.balance,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Statement');
    XLSX.writeFile(
      wb,
      `Kotak_Statement_${selectedParty}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showToast(`Exported ${sortedTransactions.length} transactions to Excel!`);
  };

  // Copy TSV
  const copyAsTSV = () => {
    const headers = ['Sl', 'Date', 'Party', 'Description', 'Ref No', 'Type', 'Amount', 'Balance'];
    const lines = [headers.join('\t')];
    sortedTransactions.forEach((tx) => {
      lines.push(
        [
          tx.sl,
          tx.date,
          tx.party,
          tx.desc.replace(/\t/g, ' '),
          tx.refNo,
          tx.type,
          tx.amount,
          tx.balance,
        ].join('\t')
      );
    });
    navigator.clipboard.writeText(lines.join('\n'));
    showToast(`Copied ${sortedTransactions.length} rows to clipboard!`);
  };

  const selectedPartyObj = STATEMENT_PARTIES_LIST.find((p) => p.key === selectedParty);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Statement Meta Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                Kotak Mahindra Bank
              </span>
              <span className="text-xs text-gray-400 font-mono">
                A/c No: {STATEMENT_METADATA.accountNumber}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                IFSC: {STATEMENT_METADATA.ifsc}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {STATEMENT_METADATA.accountName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300">
              <span>📍 Branch: {STATEMENT_METADATA.branch}</span>
              <span>📅 Period: {STATEMENT_METADATA.period}</span>
              <span>🔢 {STATEMENT_METADATA.totalTransactions} Total Transactions</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs px-5 py-3 rounded-xl border border-white/15">
            <div>
              <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
                Latest Bank Balance (30-Oct-2026)
              </p>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                ₹{STATEMENT_METADATA.latestBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} CR
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Party Filter Pills Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Filter by Party
            </span>
          </div>
          {selectedParty !== 'all' && (
            <button
              onClick={() => setSelectedParty('all')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset to All Parties
            </button>
          )}
        </div>

        {/* Quick Clickable Party Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATEMENT_PARTIES_LIST.map((party) => {
            const isSelected = selectedParty === party.key;
            const isDSR = party.key === 'dsr';

            return (
              <button
                key={party.key}
                type="button"
                onClick={() => setSelectedParty(party.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                    : isDSR
                    ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-100'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {isDSR && <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                <span>{party.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white/80 text-gray-700 border border-gray-200'
                  }`}
                >
                  {party.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DSR Solar Special Highlight Banner (When DSR is selected) */}
      {selectedParty === 'dsr' && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border-2 border-emerald-400/80 rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ☀️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-emerald-950">
                    DSR SOLAR ENTERPRISES (Channel Partner)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                    4 Payments Received
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Total Settlement Received:{' '}
                  <span className="font-bold font-mono text-sm text-emerald-900">
                    ₹3,36,000.00
                  </span>{' '}
                  via Kotak IMPS Accounts X1953 & X0031
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/billing')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Open in Billing Suite</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic KPI Metrics for Active Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow (CR) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Inflow (Credits)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">
            ₹{metrics.totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {metrics.creditCount} incoming payments
          </div>
        </div>

        {/* Total Outflow (DR) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Outflow (Debits)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700 font-mono">
            ₹{metrics.totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {metrics.debitCount} outgoing transfers
          </div>
        </div>

        {/* Net Party Position */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Net Settlement Position</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div
            className={`text-xl font-bold font-mono ${
              metrics.netPosition >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {metrics.netPosition >= 0 ? '+' : '-'}₹
            {Math.abs(metrics.netPosition).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {metrics.netPosition >= 0 ? 'Net Inward Surplus' : 'Net Outward Payment'}
          </div>
        </div>

        {/* Active Party Records Count */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium mb-1">
            <span>Filtered Transactions</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-bold text-gray-900 font-mono">
            {metrics.totalCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Party: <span className="font-semibold text-gray-700">{selectedPartyObj?.name}</span>
          </div>
        </div>
      </div>

      {/* Search, Filter & Action Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search description, UTR, Cheque/Ref No, Amount, or Party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-xs font-medium bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white transition"
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

          {/* Type Filter (All / CR / DR) */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl text-xs font-semibold text-gray-600">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('CR')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'CR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'hover:text-emerald-700'
              }`}
            >
              Inward (CR)
            </button>
            <button
              onClick={() => setTypeFilter('DR')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'DR' ? 'bg-rose-600 text-white shadow-sm' : 'hover:text-rose-700'
              }`}
            >
              Outward (DR)
            </button>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-300 rounded-xl px-2 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="date">Sort by Date</option>
                <option value="amount">Sort by Amount</option>
                <option value="sl">Sort by Sl No.</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 transition"
              title={`Sorting: ${sortOrder === 'desc' ? 'Newest / Highest First' : 'Oldest / Lowest First'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyAsTSV}
              className="px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Copy as Tab-Separated Values for Excel"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy TSV</span>
            </button>
            <button
              onClick={exportToExcel}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statement Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-3 w-12 text-center">Sl</th>
                <th className="py-3 px-3 w-36">Date & Time</th>
                <th className="py-3 px-3 w-44">Party / Entity</th>
                <th className="py-3 px-4">Transaction Description</th>
                <th className="py-3 px-3 w-40">Chq / Ref No.</th>
                <th className="py-3 px-3 w-20 text-center">Type</th>
                <th className="py-3 px-4 w-32 text-right">Amount (₹)</th>
                <th className="py-3 px-4 w-32 text-right">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => {
                  const isDSR = tx.partyKey === 'dsr';
                  const isCR = tx.type === 'CR';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDSR ? 'bg-emerald-50/40 hover:bg-emerald-50/70 font-medium' : ''
                      }`}
                    >
                      {/* Sl No */}
                      <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {tx.sl}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 font-mono text-[11px]">
                          {tx.date.split(' ')[0]}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono">
                          {tx.date.split(' ')[1] || tx.valueDate}
                        </div>
                      </td>

                      {/* Party Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                            isDSR
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : tx.partyKey === 'sunray'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : tx.partyKey === 'ecowatts'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : tx.partyKey === 'venkatasiri'
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                              : tx.partyKey === 'sufin'
                              ? 'bg-slate-100 text-slate-800 border-slate-300'
                              : tx.partyKey === 'pmsurya'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-gray-100 text-gray-800 border-gray-200'
                          }`}
                        >
                          {isDSR && <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />}
                          <span className="truncate max-w-[150px]">{tx.party}</span>
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-800 break-words leading-relaxed">
                        {tx.desc}
                      </td>

                      {/* Ref No. with 1-click Copy */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {tx.refNo ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-600">
                            <span className="truncate max-w-[120px]">{tx.refNo}</span>
                            <button
                              onClick={() => handleCopy(tx.refNo, tx.id)}
                              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition"
                              title="Copy Ref No"
                            >
                              {copiedRef === tx.id ? (
                                <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Type (CR / DR) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isCR
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-xs ${
                          isCR ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isCR ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-gray-700 text-xs">
                        ₹{tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3 bg-slate-50 border-t border-gray-200 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Showing <strong className="text-gray-800">{sortedTransactions.length}</strong> of{' '}
            <strong className="text-gray-800">{BANK_STATEMENT_TRANSACTIONS.length}</strong> transactions
          </span>
          <div className="flex items-center gap-3">
            <span>
              Total Filtered Inflow:{' '}
              <strong className="text-emerald-700 font-mono">
                ₹{metrics.totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
            </span>
            <span>
              Total Outflow:{' '}
              <strong className="text-rose-700 font-mono">
                ₹{metrics.totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
