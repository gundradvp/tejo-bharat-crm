import { useState, useEffect } from 'react';
import { supabase, type MarginTransaction } from '../../lib/supabase';
import { Plus, ArrowRightLeft, Trash2, Loader2, CheckCircle, Clock } from 'lucide-react';

type Props = {
  customerId: string;
  onSaved?: () => void;
};

export default function MarginTracking({ customerId, onSaved }: Props) {
  const [transactions, setTransactions] = useState<MarginTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadTransactions();
  }, [customerId]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('margin_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading margin transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('margin_transactions')
        .insert([{
          customer_id: customerId,
          amount: parseFloat(form.amount),
          transaction_date: form.transaction_date,
          description: form.description,
        }]);

      if (error) throw error;
      setForm({ amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '' });
      setShowForm(false);
      await loadTransactions();
      onSaved?.();
    } catch (error) {
      console.error('Error adding margin transaction:', error);
      alert('Could not add the margin payout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCollected = async (id: string) => {
    try {
      const { error } = await supabase
        .from('margin_transactions')
        .update({
          collected_back: true,
          collected_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id);

      if (error) throw error;
      await loadTransactions();
      onSaved?.();
    } catch (error) {
      console.error('Error marking collected:', error);
      alert('Could not update the transaction. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this margin payout?')) return;
    try {
      const { error } = await supabase
        .from('margin_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await loadTransactions();
      onSaved?.();
    } catch (error) {
      console.error('Error deleting margin transaction:', error);
      alert('Could not delete the transaction. Please try again.');
    }
  };

  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
  const totalProvided = transactions.filter(t => !t.collected_back).reduce((sum, t) => sum + t.amount, 0);
  const totalCollected = transactions.filter(t => t.collected_back).reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-orange-600" />
          Margin Payouts to Customer
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Payout
        </button>
      </div>

      {transactions.length > 0 && (
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Provided (Pending Collection)</p>
            <p className="text-lg font-bold text-orange-600">{fmt(totalProvided)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Collected Back</p>
            <p className="text-lg font-bold text-green-600">{fmt(totalCollected)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="p-5 space-y-4 border-b border-gray-100 bg-orange-50/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g. Margin advance before subsidy"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Adding...' : 'Add Payout'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-gray-100">
        {transactions.map((tx) => (
          <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              {tx.collected_back ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <Clock className="w-5 h-5 text-orange-500" />
              )}
              <div>
                <p className="font-semibold text-gray-900">{fmt(tx.amount)}</p>
                <p className="text-xs text-gray-500">
                  {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {tx.description && ` · ${tx.description}`}
                  {tx.collected_back && tx.collected_date && ` · Collected ${new Date(tx.collected_date).toLocaleDateString('en-IN')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!tx.collected_back && (
                <button
                  onClick={() => handleMarkCollected(tx.id)}
                  className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                >
                  Mark Collected
                </button>
              )}
              <button
                onClick={() => handleDelete(tx.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <ArrowRightLeft className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No margin payouts recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
