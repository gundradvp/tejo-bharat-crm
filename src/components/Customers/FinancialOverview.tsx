import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, Receipt, Loader2 } from 'lucide-react';

type FinancialData = {
  loanSanctioned: number;
  loanDisbursed: number;
  loanPending: number;
  expectedCustomerPayment: number;
  customerPaymentReceived: number;
  customerPaymentPending: number;
  totalExpenses: number;
  inputGST: number;
  outputGST: number;
  netGST: number;
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
  profitPercentage: number;
};

type FinancialOverviewProps = {
  customerId: string;
  loanSanctionedAmount: number;
  outputGSTAmount: number;
  agreedCost?: number;
};

export default function FinancialOverview({
  customerId,
  loanSanctionedAmount,
  outputGSTAmount,
  agreedCost = 0
}: FinancialOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState<FinancialData>({
    loanSanctioned: loanSanctionedAmount,
    loanDisbursed: 0,
    loanPending: 0,
    expectedCustomerPayment: 0,
    customerPaymentReceived: 0,
    customerPaymentPending: 0,
    totalExpenses: 0,
    inputGST: 0,
    outputGST: outputGSTAmount,
    netGST: 0,
    totalRevenue: 0,
    grossProfit: 0,
    netProfit: 0,
    profitPercentage: 0,
  });

  useEffect(() => {
    loadFinancialData();
  }, [customerId, loanSanctionedAmount, outputGSTAmount, agreedCost]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      const loanAppRes = await supabase
        .from('loan_applications')
        .select('id')
        .eq('customer_id', customerId)
        .maybeSingle();

      let disbursementRows: { disbursement_amount: number; received_in_account: boolean | null }[] = [];
      if (loanAppRes.data?.id) {
        const { data: disbRows, error: disbErr } = await supabase
          .from('loan_disbursements')
          .select('disbursement_amount, received_in_account')
          .eq('loan_application_id', loanAppRes.data.id);
        if (disbErr) console.error('Error loading disbursements:', disbErr);
        disbursementRows = disbRows || [];
      }

      const [paymentsRes, expensesRes] = await Promise.all([
        supabase
          .from('customer_payments')
          .select('payment_amount, payment_status')
          .eq('customer_id', customerId),
        supabase
          .from('customer_expenses')
          .select('amount, gst_amount')
          .eq('customer_id', customerId),
      ]);

      const loanDisbursed = disbursementRows
        .filter(d => d.received_in_account)
        .reduce((sum, d) => sum + d.disbursement_amount, 0);

      const customerPaymentReceived = paymentsRes.data
        ?.filter(p => p.payment_status === 'received')
        .reduce((sum, p) => sum + p.payment_amount, 0) || 0;

      const totalExpenses = expensesRes.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const inputGST = expensesRes.data?.reduce((sum, e) => sum + (e.gst_amount || 0), 0) || 0;

      const expectedCustomerPayment = agreedCost - loanSanctionedAmount;
      const loanPending = loanSanctionedAmount - loanDisbursed;
      const customerPaymentPending = expectedCustomerPayment - customerPaymentReceived;
      const totalRevenue = loanSanctionedAmount + expectedCustomerPayment;
      const netGST = outputGSTAmount - inputGST;
      const grossProfit = totalRevenue - totalExpenses;
      const netProfit = grossProfit - netGST;
      const profitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setFinancialData({
        loanSanctioned: loanSanctionedAmount,
        loanDisbursed,
        loanPending,
        expectedCustomerPayment,
        customerPaymentReceived,
        customerPaymentPending,
        totalExpenses,
        inputGST,
        outputGST: outputGSTAmount,
        netGST,
        totalRevenue,
        grossProfit,
        netProfit,
        profitPercentage,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Financial Overview</h3>
        <div className="flex items-center gap-2">
          {financialData.netProfit >= 0 ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-lg font-bold ${financialData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {financialData.netProfit >= 0 ? 'Profitable' : 'Loss'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">Loan Sanctioned</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">₹{financialData.loanSanctioned.toLocaleString()}</p>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-blue-600">Disbursed: ₹{financialData.loanDisbursed.toLocaleString()}</span>
            {financialData.loanPending > 0 && (
              <span className="text-amber-600 font-semibold">Pending: ₹{financialData.loanPending.toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-teal-600" />
            <p className="text-sm text-teal-700 font-medium">Customer Payment</p>
          </div>
          <p className="text-2xl font-bold text-teal-900">₹{financialData.expectedCustomerPayment.toLocaleString()}</p>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-teal-600">Received: ₹{financialData.customerPaymentReceived.toLocaleString()}</span>
            {financialData.customerPaymentPending > 0 && (
              <span className="text-amber-600 font-semibold">Pending: ₹{financialData.customerPaymentPending.toLocaleString()}</span>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <p className="text-sm text-gray-700 font-medium">Total Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{financialData.totalRevenue.toLocaleString()}</p>
          <p className="mt-2 text-xs text-gray-600">Loan + Customer Payment</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700 font-medium">Total Expenses</p>
          </div>
          <p className="text-2xl font-bold text-red-900">₹{financialData.totalExpenses.toLocaleString()}</p>
          <p className="mt-2 text-xs text-red-600">Input GST: ₹{financialData.inputGST.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">GST Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Output GST (Charged)</p>
            <p className="text-xl font-bold text-gray-900">₹{financialData.outputGST.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Input GST (Credit)</p>
            <p className="text-xl font-bold text-gray-900">₹{financialData.inputGST.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Net GST Payable</p>
            <p className={`text-xl font-bold ${financialData.netGST >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
              ₹{Math.abs(financialData.netGST).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              financialData.netGST > 0
                ? 'bg-amber-100 text-amber-700'
                : financialData.netGST < 0
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {financialData.netGST > 0 ? 'Payable' : financialData.netGST < 0 ? 'Receivable' : 'Balanced'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Profit/Loss Calculation</h4>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-gray-600">Total Revenue</span>
            <span className="font-semibold text-gray-900">₹{financialData.totalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-gray-600">Total Expenses</span>
            <span className="font-semibold text-red-600">- ₹{financialData.totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-gray-600 font-medium">Gross Profit (Before GST)</span>
            <span className={`font-bold ${financialData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{financialData.grossProfit.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <span className="text-gray-600">Net GST Impact</span>
            <span className={`font-semibold ${financialData.netGST >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {financialData.netGST >= 0 ? '-' : '+'} ₹{Math.abs(financialData.netGST).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-bold text-gray-900">Net Profit/Loss</span>
            <div className="text-right">
              <p className={`text-2xl font-bold ${financialData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(financialData.netProfit).toLocaleString()}
              </p>
              <p className={`text-sm font-medium ${financialData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {financialData.profitPercentage >= 0 ? '+' : ''}{financialData.profitPercentage.toFixed(2)}% margin
              </p>
            </div>
          </div>
        </div>
      </div>

      {(financialData.loanPending > 0 || financialData.customerPaymentPending > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-900 mb-2">Outstanding Payments</h4>
          <ul className="space-y-1 text-sm text-amber-800">
            {financialData.loanPending > 0 && (
              <li>• Loan disbursement pending: ₹{financialData.loanPending.toLocaleString()}</li>
            )}
            {financialData.customerPaymentPending > 0 && (
              <li>• Customer payment pending: ₹{financialData.customerPaymentPending.toLocaleString()}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
