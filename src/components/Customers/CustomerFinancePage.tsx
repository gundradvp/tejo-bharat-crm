import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, IndianRupee, Loader2, TrendingUp, TrendingDown, Wallet, Calculator, ArrowRightLeft, Receipt, AlertCircle } from 'lucide-react';
import ExpenseTracking from './ExpenseTracking';
import LoanDisbursementTracking from './LoanDisbursementTracking';
import CustomerPaymentTracking from './CustomerPaymentTracking';
import FinancialSummaryEditor from './FinancialSummaryEditor';
import MarginTracking from './MarginTracking';

interface CustomerData {
  id: string;
  customer_name: string;
  agreed_project_cost?: number;
  loan_sanctioned_amount?: number;
  installation_status?: string;
  payment_method_type?: string;
  bank_name?: string;
}

type Tab = 'overview' | 'expenses' | 'loan' | 'payments' | 'margin';

export default function CustomerFinancePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isFinance, isAdmin } = useAuth();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tab = searchParams.get('tab');
    return (tab === 'expenses' || tab === 'loan' || tab === 'payments' || tab === 'margin') ? tab : 'overview';
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [profitData, setProfitData] = useState({
    totalExpenses: 0,
    totalDisbursed: 0,
    totalPayments: 0,
    marginProvided: 0,
    profit: 0,
  });

  const isFinanceUser = isFinance();
  const isAdminUser = isAdmin();
  const canSeeFullFinancials = isAdminUser;

  useEffect(() => {
    if (id) {
      fetchCustomer();
      if (canSeeFullFinancials) {
        fetchProfitData();
      }
    }
  }, [id, refreshKey]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, customer_name, agreed_project_cost, loan_sanctioned_amount, installation_status, payment_method_type, bank_name')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Failed to load customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitData = async () => {
    try {
      const loanAppRes = await supabase
        .from('loan_applications')
        .select('id')
        .eq('customer_id', id)
        .maybeSingle();

      let totalDisbursed = 0;
      if (loanAppRes.data?.id) {
        const { data: disbRows } = await supabase
          .from('loan_disbursements')
          .select('disbursement_amount, received_in_account')
          .eq('loan_application_id', loanAppRes.data.id);
        totalDisbursed = disbRows
          ?.filter(d => d.received_in_account)
          .reduce((s, d) => s + d.disbursement_amount, 0) || 0;
      }

      const [expensesRes, paymentsRes, marginRes] = await Promise.all([
        supabase.from('customer_expenses').select('amount').eq('customer_id', id),
        supabase.from('customer_payments').select('payment_amount, payment_status').eq('customer_id', id),
        supabase.from('margin_transactions').select('amount, collected_back').eq('customer_id', id),
      ]);

      const totalExpenses = expensesRes.data?.reduce((s, e) => s + (e.amount || 0), 0) || 0;
      const totalPayments = paymentsRes.data?.filter(p => p.payment_status === 'received').reduce((s, p) => s + p.payment_amount, 0) || 0;
      const marginProvided = marginRes.data?.filter(m => !m.collected_back).reduce((s, m) => s + m.amount, 0) || 0;

      const totalIn = totalDisbursed + totalPayments + marginProvided;
      const profit = totalIn - totalExpenses;

      setProfitData({ totalExpenses, totalDisbursed, totalPayments, marginProvided, profit });
    } catch (error) {
      console.error('Error loading profit data:', error);
    }
  };

  const triggerRefresh = () => {
    setRefreshKey(k => k + 1);
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

  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  // Finance role: only see expenses tab
  if (isFinanceUser && !isAdminUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                {customer.customer_name} — Expense Entry
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Add and manage project expenses</p>
            </div>
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-6">
          <ExpenseTracking customerId={customer.id} agreedCost={customer.agreed_project_cost} />
        </div>
      </div>
    );
  }

  // Admin: full financial view
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Calculator className="w-4 h-4" /> },
    { key: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { key: 'loan', label: 'Loan Tranches', icon: <Wallet className="w-4 h-4" /> },
    { key: 'payments', label: 'Customer Payments', icon: <IndianRupee className="w-4 h-4" /> },
    { key: 'margin', label: 'Margin Payouts', icon: <ArrowRightLeft className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-green-600" />
              {customer.customer_name} — Project Finance
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {customer.bank_name && `Bank: ${customer.bank_name}`}
              {customer.agreed_project_cost && ` · Agreed Cost: ${fmt(customer.agreed_project_cost)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/financial')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Profit Dashboard
            </button>
            <button
              onClick={() => navigate(`/customers/${id}`)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customer
            </button>
          </div>
        </div>
      </div>

      {/* Profit Summary Bar (admin only) */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          <ProfitTile label="Loan Received" value={fmt(profitData.totalDisbursed)} color="text-blue-600" />
          <ProfitTile label="Customer Payments" value={fmt(profitData.totalPayments)} color="text-teal-600" />
          <ProfitTile label="Margin Provided" value={fmt(profitData.marginProvided)} color="text-orange-600" />
          <ProfitTile label="Total Expenses" value={fmt(profitData.totalExpenses)} color="text-red-600" />
          <div className={`rounded-lg p-3 ${profitData.profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-xs font-medium mb-1 ${profitData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitData.profit >= 0 ? 'Project Profit' : 'Project Loss'}
            </p>
            <p className={`text-xl font-bold ${profitData.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {fmt(Math.abs(profitData.profit))}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-teal-700 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <FinancialSummaryEditor customerId={customer.id} onSaved={triggerRefresh} />
            <MarginTracking customerId={customer.id} onSaved={triggerRefresh} />
          </div>
        )}
        {activeTab === 'expenses' && (
          <ExpenseTracking customerId={customer.id} agreedCost={customer.agreed_project_cost} />
        )}
        {activeTab === 'loan' && (
          <LoanDisbursementTracking
            customerId={customer.id}
            loanSanctionedAmount={customer.loan_sanctioned_amount || 0}
            installationStatus={customer.installation_status || ''}
          />
        )}
        {activeTab === 'payments' && (
          <CustomerPaymentTracking customerId={customer.id} />
        )}
        {activeTab === 'margin' && (
          <MarginTracking customerId={customer.id} onSaved={triggerRefresh} />
        )}
      </div>
    </div>
  );
}

function ProfitTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
