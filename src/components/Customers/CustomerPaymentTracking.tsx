import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Banknote, Trash2, Loader2, Wallet } from 'lucide-react';

type CustomerPayment = {
  id: string;
  customer_id: string;
  payment_amount: number;
  payment_date: string;
  payment_mode: 'cash' | 'cheque' | 'online_transfer' | 'upi';
  transaction_reference: string;
  payment_status: 'pending' | 'received' | 'bounced';
  remarks: string;
  created_at: string;
};

type CustomerPaymentTrackingProps = {
  customerId: string;
  expectedCustomerPayment?: number;
};

export default function CustomerPaymentTracking({
  customerId,
  expectedCustomerPayment = 0
}: CustomerPaymentTrackingProps) {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'cash' as 'cash' | 'cheque' | 'online_transfer' | 'upi',
    transaction_reference: '',
    payment_status: 'received' as 'pending' | 'received' | 'bounced',
    remarks: '',
  });

  useEffect(() => {
    loadPayments();
  }, [customerId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('customer_payments')
        .insert([{
          customer_id: customerId,
          ...formData,
          payment_amount: parseFloat(formData.payment_amount),
        }]);

      if (error) throw error;

      setFormData({
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_mode: 'cash',
        transaction_reference: '',
        payment_status: 'received',
        remarks: '',
      });
      setShowForm(false);
      loadPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase
        .from('customer_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment');
    }
  };

  const totalReceived = payments
    .filter(p => p.payment_status === 'received')
    .reduce((sum, p) => sum + p.payment_amount, 0);
  const outstandingAmount = expectedCustomerPayment - totalReceived;
  const paymentPercentage = expectedCustomerPayment > 0
    ? ((totalReceived / expectedCustomerPayment) * 100).toFixed(1)
    : '0';

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    received: 'bg-green-100 text-green-700',
    bounced: 'bg-red-100 text-red-700',
  };

  const modeColors = {
    cash: 'bg-blue-100 text-blue-700',
    cheque: 'bg-purple-100 text-purple-700',
    online_transfer: 'bg-teal-100 text-teal-700',
    upi: 'bg-orange-100 text-orange-700',
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
        <h3 className="text-xl font-semibold text-gray-900">Customer Payment Tracking</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Payment
        </button>
      </div>

      {expectedCustomerPayment > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium mb-1">Expected Payment</p>
            <p className="text-2xl font-bold text-blue-900">₹{expectedCustomerPayment.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium mb-1">Total Received</p>
            <p className="text-2xl font-bold text-green-900">₹{totalReceived.toLocaleString()}</p>
          </div>
          <div className={`${outstandingAmount > 0 ? 'bg-amber-50' : 'bg-gray-50'} rounded-lg p-4`}>
            <p className={`text-sm ${outstandingAmount > 0 ? 'text-amber-600' : 'text-gray-600'} font-medium mb-1`}>
              Outstanding
            </p>
            <p className={`text-2xl font-bold ${outstandingAmount > 0 ? 'text-amber-900' : 'text-gray-900'}`}>
              ₹{outstandingAmount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium mb-1">Received</p>
            <p className="text-2xl font-bold text-gray-900">{paymentPercentage}%</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Payment</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.payment_amount}
                onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="online_transfer">Online Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Reference
              </label>
              <input
                type="text"
                value={formData.transaction_reference}
                onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="received">Received</option>
                <option value="pending">Pending</option>
                <option value="bounced">Bounced</option>
              </select>
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
                Add Payment
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
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Banknote className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      ₹{payment.payment_amount.toLocaleString()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Payment Mode</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${modeColors[payment.payment_mode]}`}>
                      {payment.payment_mode.replace('_', ' ')}
                    </span>
                  </div>
                  {payment.transaction_reference && (
                    <div>
                      <p className="text-gray-500">Reference</p>
                      <p className="font-semibold text-gray-900">{payment.transaction_reference}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${statusColors[payment.payment_status]}`}>
                      {payment.payment_status}
                    </span>
                  </div>
                </div>

                {payment.remarks && (
                  <p className="mt-2 text-sm text-gray-600 italic">{payment.remarks}</p>
                )}
              </div>

              <button
                onClick={() => handleDelete(payment.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {payments.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No payments recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
