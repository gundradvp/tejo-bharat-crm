import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, CreditCard, AlertTriangle, Receipt, Wallet, TrendingDown, Loader2, Calendar, Search, ArrowUpDown } from 'lucide-react';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';

type FinancialStats = {
  totalRevenue: number;
  totalExpenses: number;
  totalLoanSanctioned: number;
  totalLoanDisbursed: number;
  pendingDisbursements: number;
  totalCustomerPaymentExpected: number;
  totalCustomerPaymentReceived: number;
  totalInputGST: number;
  totalOutputGST: number;
  netGST: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  customersWithPendingDisbursement: number;
  customersWithPendingPayment: number;
};

type ProjectProfit = {
  customerId: string;
  customerName: string;
  agreedCost: number;
  totalDisbursed: number;
  totalPayments: number;
  marginProvided: number;
  totalExpenses: number;
  profit: number;
  profitPercent: number;
};

type DateRange = 'all' | 'this_week' | 'this_month' | 'this_quarter' | 'custom';

export default function FinancialDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0, totalExpenses: 0, totalLoanSanctioned: 0, totalLoanDisbursed: 0,
    pendingDisbursements: 0, totalCustomerPaymentExpected: 0, totalCustomerPaymentReceived: 0,
    totalInputGST: 0, totalOutputGST: 0, netGST: 0, grossProfit: 0, netProfit: 0,
    profitMargin: 0, customersWithPendingDisbursement: 0, customersWithPendingPayment: 0,
  });
  const [projectProfits, setProjectProfits] = useState<ProjectProfit[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'profit' | 'name' | 'agreedCost' | 'expenses'>('profit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadFinancialStats();
  }, [dateRange, customFrom, customTo]);

  const getDateFilter = () => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (dateRange) {
      case 'this_week': {
        const day = now.getDay();
        from = new Date(now);
        from.setDate(now.getDate() - day);
        from.setHours(0, 0, 0, 0);
        break;
      }
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'this_quarter': {
        const q = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), q * 3, 1);
        break;
      }
      case 'custom':
        if (customFrom) from = new Date(customFrom);
        if (customTo) to = new Date(customTo);
        to?.setHours(23, 59, 59, 999);
        break;
      case 'all':
      default:
        break;
    }
    return { from: from?.toISOString().split('T')[0], to: to?.toISOString().split('T')[0] };
  };

  const loadFinancialStats = async () => {
    try {
      setLoading(true);
      const { from, to } = getDateFilter();

      let expenseQuery = supabase.from('customer_expenses').select('customer_id, amount, gst_amount, expense_date');
      if (from) expenseQuery = expenseQuery.gte('expense_date', from);
      if (to) expenseQuery = expenseQuery.lte('expense_date', to);

      let disbursementQuery = supabase.from('loan_disbursements').select('loan_application_id, disbursement_amount, received_in_account, disbursement_date');
      if (from) disbursementQuery = disbursementQuery.gte('disbursement_date', from);
      if (to) disbursementQuery = disbursementQuery.lte('disbursement_date', to);

      let paymentQuery = supabase.from('customer_payments').select('customer_id, payment_amount, payment_status, payment_date');
      if (from) paymentQuery = paymentQuery.gte('payment_date', from);
      if (to) paymentQuery = paymentQuery.lte('payment_date', to);

      const [customersRes, expensesRes, disbursementsRes, paymentsRes, marginRes] = await Promise.all([
        supabase.from('customers').select('id, customer_name, agreed_project_cost, loan_sanctioned_amount, output_gst_amount, installation_status'),
        expenseQuery,
        disbursementQuery,
        paymentQuery,
        supabase.from('margin_transactions').select('customer_id, amount, collected_back, transaction_date'),
      ]);

      const totalExpenses = expensesRes.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const totalInputGST = expensesRes.data?.reduce((sum, e) => sum + (e.gst_amount || 0), 0) || 0;

      let totalLoanSanctioned = 0;
      let totalLoanDisbursed = 0;
      let totalCustomerPaymentExpected = 0;
      let totalOutputGST = 0;

      const customerPaymentMap = new Map<string, number>();
      paymentsRes.data?.forEach(payment => {
        if (payment.payment_status === 'received') {
          customerPaymentMap.set(payment.customer_id,
            (customerPaymentMap.get(payment.customer_id) || 0) + payment.payment_amount);
        }
      });

      const disbursementByCustomer = new Map<string, number>();
      disbursementsRes.data?.forEach(d => {
        if (d.received_in_account) {
          disbursementByCustomer.set(d.loan_application_id,
            (disbursementByCustomer.get(d.loan_application_id) || 0) + d.disbursement_amount);
        }
      });

      const expensesByCustomer = new Map<string, number>();
      expensesRes.data?.forEach(e => {
        expensesByCustomer.set(e.customer_id,
          (expensesByCustomer.get(e.customer_id) || 0) + e.amount);
      });

      const marginByCustomer = new Map<string, number>();
      marginRes.data?.forEach(m => {
        if (!m.collected_back) {
          marginByCustomer.set(m.customer_id,
            (marginByCustomer.get(m.customer_id) || 0) + m.amount);
        }
      });

      // Build per-project profit table
      const projects: ProjectProfit[] = (customersRes.data || []).map(c => {
        const disbursed = disbursementByCustomer.get(c.id) || 0;
        const payments = customerPaymentMap.get(c.id) || 0;
        const marginProvided = marginByCustomer.get(c.id) || 0;
        const expenses = expensesByCustomer.get(c.id) || 0;
        const totalIn = disbursed + payments + marginProvided;
        const profit = totalIn - expenses;
        const agreedCost = c.agreed_project_cost || 0;
        return {
          customerId: c.id,
          customerName: c.customer_name || 'Unknown',
          agreedCost,
          totalDisbursed: disbursed,
          totalPayments: payments,
          marginProvided,
          totalExpenses: expenses,
          profit,
          profitPercent: agreedCost > 0 ? (profit / agreedCost) * 100 : 0,
        };
      });

      setProjectProfits(projects);

      customersRes.data?.forEach(customer => {
        totalLoanSanctioned += customer.loan_sanctioned_amount || 0;
        totalOutputGST += customer.output_gst_amount || 0;
        totalCustomerPaymentExpected += (customer.agreed_project_cost || 0) - (customer.loan_sanctioned_amount || 0);
      });

      totalLoanDisbursed = Array.from(disbursementByCustomer.values()).reduce((s, v) => s + v, 0);
      const totalCustomerPaymentReceived = Array.from(customerPaymentMap.values()).reduce((s, v) => s + v, 0);
      const pendingDisbursements = Math.max(0, totalLoanSanctioned - totalLoanDisbursed);

      const totalRevenue = totalLoanSanctioned + totalCustomerPaymentExpected;
      const netGST = totalOutputGST - totalInputGST;
      const grossProfit = totalRevenue - totalExpenses;
      const netProfit = grossProfit - netGST;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      const customersWithPendingDisbursement = (customersRes.data || []).filter(c => {
        const pending = (c.loan_sanctioned_amount || 0) - (disbursementByCustomer.get(c.id) || 0);
        return pending > 0 && c.installation_status === 'completed';
      }).length;

      const customersWithPendingPayment = (customersRes.data || []).filter(c => {
        const expected = (c.agreed_project_cost || 0) - (c.loan_sanctioned_amount || 0);
        return expected > (customerPaymentMap.get(c.id) || 0);
      }).length;

      setStats({
        totalRevenue, totalExpenses, totalLoanSanctioned, totalLoanDisbursed,
        pendingDisbursements, totalCustomerPaymentExpected, totalCustomerPaymentReceived,
        totalInputGST, totalOutputGST, netGST, grossProfit, netProfit, profitMargin,
        customersWithPendingDisbursement, customersWithPendingPayment,
      });
    } catch (error) {
      console.error('Error loading financial stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedProjects = useMemo(() => {
    let filtered = projectProfits;
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.customerName.localeCompare(b.customerName);
      else if (sortField === 'profit') cmp = a.profit - b.profit;
      else if (sortField === 'agreedCost') cmp = a.agreedCost - b.agreedCost;
      else if (sortField === 'expenses') cmp = a.totalExpenses - b.totalExpenses;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [projectProfits, searchQuery, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-gray-600 mt-1">Comprehensive financial metrics and project profitability</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-200">
          {stats.netProfit >= 0 ? (
            <TrendingUp className="w-6 h-6 text-green-600" />
          ) : (
            <TrendingDown className="w-6 h-6 text-red-600" />
          )}
          <div>
            <p className="text-xs text-gray-600">Net Profit</p>
            <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{(Math.abs(stats.netProfit) / 100000).toFixed(2)}L
            </p>
            <p className={`text-xs font-medium ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.profitMargin >= 0 ? '+' : ''}{stats.profitMargin.toFixed(1)}% margin
            </p>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Period:</span>
          {(['all', 'this_week', 'this_month', 'this_quarter', 'custom'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateRange === r
                  ? 'bg-teal-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {r === 'all' ? 'All Time' : r === 'this_week' ? 'This Week' : r === 'this_month' ? 'This Month' : r === 'this_quarter' ? 'This Quarter' : 'Custom'}
            </button>
          ))}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={fmt(stats.totalRevenue)} icon={TrendingUp} color="green" subtitle="Loan + Customer Payment" />
        <StatCard title="Total Expenses" value={fmt(stats.totalExpenses)} icon={Receipt} color="red" subtitle="All customer expenses" />
        <StatCard title="Gross Profit" value={fmt(stats.grossProfit)} icon={DollarSign} color={stats.grossProfit >= 0 ? 'green' : 'red'} subtitle="Before GST impact" />
        <StatCard title="Pending Disbursements" value={fmt(stats.pendingDisbursements)} icon={CreditCard} color="amber" subtitle={`${stats.customersWithPendingDisbursement} customers`} />
      </div>

      {/* Per-Project Profit Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Per-Project Profitability</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Customer <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('agreedCost')}>
                  <span className="flex items-center gap-1 justify-end">Agreed Cost <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Loan Received</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payments</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('expenses')}>
                  <span className="flex items-center gap-1 justify-end">Expenses <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => toggleSort('profit')}>
                  <span className="flex items-center gap-1 justify-end">Profit/Loss <ArrowUpDown className="w-3 h-3" /></span>
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedProjects.map(p => (
                <tr key={p.customerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <button
                      onClick={() => navigate(`/customers/${p.customerId}/finance`)}
                      className="font-medium text-teal-700 hover:text-teal-900 hover:underline"
                    >
                      {p.customerName}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{p.agreedCost > 0 ? fmt(p.agreedCost) : '—'}</td>
                  <td className="px-5 py-3 text-right text-blue-600">{p.totalDisbursed > 0 ? fmt(p.totalDisbursed) : '—'}</td>
                  <td className="px-5 py-3 text-right text-teal-600">{p.totalPayments > 0 ? fmt(p.totalPayments) : '—'}</td>
                  <td className="px-5 py-3 text-right text-red-600">{p.totalExpenses > 0 ? fmt(p.totalExpenses) : '—'}</td>
                  <td className={`px-5 py-3 text-right font-bold ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.profit >= 0 ? '+' : '-'}{fmt(p.profit)}
                  </td>
                  <td className={`px-5 py-3 text-right text-xs font-medium ${p.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.profitPercent.toFixed(1)}%
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => navigate(`/customers/${p.customerId}/finance`)}
                      className="text-xs text-teal-700 hover:text-teal-900 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {sortedProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No projects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Loan Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total Sanctioned</span>
              <span className="font-semibold text-gray-900">{fmt(stats.totalLoanSanctioned)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total Disbursed</span>
              <span className="font-semibold text-green-600">{fmt(stats.totalLoanDisbursed)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Pending</span>
              <span className="font-bold text-amber-600">{fmt(stats.pendingDisbursements)}</span>
            </div>
          </div>
          {stats.customersWithPendingDisbursement > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">{stats.customersWithPendingDisbursement}</span> customers with completed installation awaiting disbursement
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-600" />
            Customer Payment Summary
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total Expected</span>
              <span className="font-semibold text-gray-900">{fmt(stats.totalCustomerPaymentExpected)}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <span className="text-gray-600">Total Received</span>
              <span className="font-semibold text-green-600">{fmt(stats.totalCustomerPaymentReceived)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Pending</span>
              <span className="font-bold text-amber-600">
                {fmt(stats.totalCustomerPaymentExpected - stats.totalCustomerPaymentReceived)}
              </span>
            </div>
          </div>
          {stats.customersWithPendingPayment > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{stats.customersWithPendingPayment}</span> customers with pending payments
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Total Revenue</span>
            <span className="font-semibold text-gray-900">{fmt(stats.totalRevenue)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Total Expenses</span>
            <span className="font-semibold text-red-600">- {fmt(stats.totalExpenses)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Gross Profit (Before GST)</span>
            <span className={`font-bold ${stats.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(stats.grossProfit)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Net GST Impact</span>
            <span className={`font-semibold ${stats.netGST >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {stats.netGST >= 0 ? '-' : '+'} {fmt(stats.netGST)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-4">
            <span className="text-lg font-bold text-gray-900">Net Profit/Loss</span>
            <div className="text-right">
              <p className={`text-3xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(stats.netProfit)}
              </p>
              <p className={`text-sm font-medium mt-1 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.profitMargin >= 0 ? '+' : ''}{stats.profitMargin.toFixed(2)}% margin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
