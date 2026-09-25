import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, DollarSign, Trash2, Loader2 } from 'lucide-react';

type Expense = {
  id: string;
  customer_id: string;
  expense_type: string;
  description: string;
  amount: number;
  base_amount: number;
  gst_amount: number;
  gst_percentage: number;
  expense_date: string;
  vendor_name: string;
  payment_status: 'paid' | 'pending' | 'partial';
  remarks: string;
  created_at: string;
};

type ExpenseTypeOption = {
  value: string;
  display_label: string;
};

type ExpenseTrackingProps = {
  customerId: string;
  agreedCost?: number;
};

export default function ExpenseTracking({ customerId, agreedCost }: ExpenseTrackingProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeOption[]>([]);
  const [formData, setFormData] = useState({
    expense_type: '',
    description: '',
    amount: '',
    base_amount: '',
    gst_percentage: '18',
    gst_amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    payment_status: 'pending' as 'paid' | 'pending' | 'partial',
    remarks: '',
  });

  useEffect(() => {
    loadExpenses();
    loadExpenseTypes();
  }, [customerId]);

  const loadExpenseTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('value, display_label')
        .eq('category', 'expense_types')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setExpenseTypes(data || []);
    } catch (error) {
      console.error('Error loading expense types:', error);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_expenses')
        .select('*')
        .eq('customer_id', customerId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('customer_expenses')
        .insert([{
          customer_id: customerId,
          ...formData,
          amount: parseFloat(formData.amount),
          base_amount: parseFloat(formData.base_amount || '0'),
          gst_amount: parseFloat(formData.gst_amount || '0'),
          gst_percentage: parseFloat(formData.gst_percentage || '0'),
        }]);

      if (error) throw error;

      setFormData({
        expense_type: '',
        description: '',
        amount: '',
        base_amount: '',
        gst_percentage: '18',
        gst_amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        vendor_name: '',
        payment_status: 'pending',
        remarks: '',
      });
      setShowForm(false);
      loadExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('customer_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  // When base amount or GST percentage changes: total = base + (base * GST%)
  const handleBaseAmountChange = (baseAmount: string) => {
    const base = parseFloat(baseAmount || '0');
    const gstRate = parseFloat(formData.gst_percentage || '0');
    const gst = (base * gstRate) / 100;
    const total = base + gst;
    setFormData({
      ...formData,
      base_amount: baseAmount,
      gst_amount: gst.toFixed(2),
      amount: total.toFixed(2),
    });
  };

  // When GST percentage changes: recalculate from base amount
  const handleGstPercentageChange = (gstPercentage: string) => {
    const base = parseFloat(formData.base_amount || '0');
    const gstRate = parseFloat(gstPercentage || '0');
    const gst = (base * gstRate) / 100;
    const total = base + gst;
    setFormData({
      ...formData,
      gst_percentage: gstPercentage,
      gst_amount: gst.toFixed(2),
      amount: total.toFixed(2),
    });
  };

  // When total amount changes: base = total / (1 + GST%/100)
  const handleTotalAmountChange = (totalAmount: string) => {
    const total = parseFloat(totalAmount || '0');
    const gstRate = parseFloat(formData.gst_percentage || '0');
    const base = total / (1 + gstRate / 100);
    const gst = total - base;
    setFormData({
      ...formData,
      amount: totalAmount,
      base_amount: base.toFixed(2),
      gst_amount: gst.toFixed(2),
    });
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalGSTCredit = expenses.reduce((sum, exp) => sum + (exp.gst_amount || 0), 0);
  const profit = agreedCost ? agreedCost - totalExpenses : 0;
  const profitPercentage = agreedCost ? ((profit / agreedCost) * 100).toFixed(2) : 0;

  const expensesByCategory = expenses.reduce((acc, exp) => {
    const type = exp.expense_type;
    if (!acc[type]) {
      acc[type] = { total: 0, count: 0, gst: 0 };
    }
    acc[type].total += exp.amount;
    acc[type].gst += exp.gst_amount || 0;
    acc[type].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number; gst: number }>);

  const paymentStatusColors = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-orange-100 text-orange-700',
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
        <h3 className="text-xl font-semibold text-gray-900">Expense Tracking</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {agreedCost && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium mb-1">Agreed Cost</p>
            <p className="text-2xl font-bold text-blue-900">₹{agreedCost.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-red-900">₹{totalExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium mb-1">Input GST Credit</p>
            <p className="text-2xl font-bold text-purple-900">₹{totalGSTCredit.toLocaleString()}</p>
          </div>
          <div className={`${profit >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4`}>
            <p className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'} font-medium mb-1`}>
              {profit >= 0 ? 'Profit' : 'Loss'}
            </p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              ₹{Math.abs(profit).toLocaleString()}
            </p>
          </div>
          <div className={`${profit >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4`}>
            <p className={`text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'} font-medium mb-1`}>
              Margin
            </p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {profitPercentage}%
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Expense</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Type *
              </label>
              <select
                value={formData.expense_type}
                onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Type</option>
                {expenseTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.display_label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.base_amount}
                onChange={(e) => handleBaseAmountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST % *
              </label>
              <select
                value={formData.gst_percentage}
                onChange={(e) => handleGstPercentageChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.gst_amount}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-semibold"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Editing total will auto-adjust base amount based on GST%</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor/Supplier Name
              </label>
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Date
              </label>
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Expense
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {expenses.map((expense) => (
          <div
            key={expense.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900 capitalize">
                      {expense.expense_type}
                    </h4>
                    {expense.description && (
                      <p className="text-sm text-gray-600">{expense.description}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Total Amount</p>
                    <p className="font-semibold text-gray-900">₹{expense.amount.toLocaleString()}</p>
                  </div>
                  {(expense.gst_amount > 0 || expense.gst_percentage > 0) && (
                    <div>
                      <p className="text-gray-500">GST ({expense.gst_percentage}%)</p>
                      <p className="font-semibold text-purple-700">₹{(expense.gst_amount || 0).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </p>
                  </div>
                  {expense.vendor_name && (
                    <div>
                      <p className="text-gray-500">Vendor</p>
                      <p className="font-semibold text-gray-900">{expense.vendor_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Payment</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${paymentStatusColors[expense.payment_status]}`}>
                      {expense.payment_status}
                    </span>
                  </div>
                </div>

                {expense.remarks && (
                  <p className="mt-2 text-sm text-gray-600 italic">{expense.remarks}</p>
                )}
              </div>

              <button
                onClick={() => handleDelete(expense.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {expenses.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No expenses recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
