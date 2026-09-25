import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, CreditCard, Trash2, Loader2, AlertCircle, CheckCircle, Layers } from 'lucide-react';

type LoanDisbursement = {
  id: string;
  loan_application_id: string | null;
  disbursement_number: number | null;
  disbursement_amount: number;
  disbursement_date: string;
  disbursement_reference: string | null;
  received_in_account: boolean;
  notes: string | null;
  created_at: string;
};

type LoanDisbursementTrackingProps = {
  customerId: string;
  loanSanctionedAmount: number;
  installationStatus: string;
};

const TRANCHE_LABELS: Record<number, string> = {
  1: '1st Tranche',
  2: '2nd Tranche',
  3: '3rd Tranche',
  4: '4th Tranche',
};

function trancheLabel(n: number | null): string {
  if (!n) return 'Disbursement';
  return TRANCHE_LABELS[n] || `${n}th Tranche`;
}

export default function LoanDisbursementTracking({
  customerId,
  loanSanctionedAmount,
  installationStatus,
}: LoanDisbursementTrackingProps) {
  const [disbursements, setDisbursements] = useState<LoanDisbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    disbursement_amount: '',
    disbursement_date: new Date().toISOString().split('T')[0],
    disbursement_reference: '',
    received_in_account: true,
    notes: '',
  });

  useEffect(() => {
    loadDisbursements();
  }, [customerId]);

  // Resolve the loan_applications row for this customer, creating one if
  // none exists yet. loan_disbursements.loan_application_id is a FK to
  // loan_applications.id, so we cannot use the customer id directly.
  const resolveLoanApplicationId = async (): Promise<string> => {
    const { data: existing, error: findError } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (findError) throw findError;
    if (existing) return existing.id;

    const { data: created, error: createError } = await supabase
      .from('loan_applications')
      .insert({
        customer_id: customerId,
        loan_amount_sanctioned: loanSanctionedAmount,
        disbursement_type: 'tranche',
        loan_status: 'sanctioned',
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return created.id;
  };

  const loadDisbursements = async () => {
    try {
      setLoading(true);
      const { loanAppId, error: appError } = await resolveLoanApplicationIdSafe();
      if (appError || !loanAppId) {
        setDisbursements([]);
        return;
      }
      const { data, error } = await supabase
        .from('loan_disbursements')
        .select('id, loan_application_id, disbursement_number, disbursement_amount, disbursement_date, disbursement_reference, received_in_account, notes, created_at')
        .eq('loan_application_id', loanAppId)
        .order('disbursement_number', { ascending: true });

      if (error) throw error;
      setDisbursements(data || []);
    } catch (error) {
      console.error('Error loading disbursements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Non-throwing version used during load (we don't want to create an
  // application row just by viewing the tab — only when adding a tranche).
  const resolveLoanApplicationIdSafe = async (): Promise<{ loanAppId: string | null; error: string | null }> => {
    const { data, error } = await supabase
      .from('loan_applications')
      .select('id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) return { loanAppId: null, error: error.message };
    return { loanAppId: data?.id ?? null, error: null };
  };

  const nextTrancheNumber = () => {
    const maxNum = disbursements.reduce((max, d) => Math.max(max, d.disbursement_number || 0), 0);
    return maxNum + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const loanAppId = await resolveLoanApplicationId();
      const trancheNum = nextTrancheNumber();
      const { error } = await supabase
        .from('loan_disbursements')
        .insert([{
          loan_application_id: loanAppId,
          disbursement_number: trancheNum,
          disbursement_amount: parseFloat(formData.disbursement_amount),
          disbursement_date: formData.disbursement_date,
          disbursement_reference: formData.disbursement_reference || null,
          received_in_account: formData.received_in_account,
          notes: formData.notes || null,
        }]);

      if (error) throw error;

      setFormData({
        disbursement_amount: '',
        disbursement_date: new Date().toISOString().split('T')[0],
        disbursement_reference: '',
        received_in_account: true,
        notes: '',
      });
      setShowForm(false);
      loadDisbursements();
    } catch (error) {
      console.error('Error adding disbursement:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setFormError(`Could not add the disbursement: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this disbursement?')) return;
    try {
      const { error } = await supabase
        .from('loan_disbursements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadDisbursements();
    } catch (error) {
      console.error('Error deleting disbursement:', error);
      alert('Could not delete the disbursement. Please try again.');
    }
  };

  const totalDisbursed = disbursements
    .filter(d => d.received_in_account)
    .reduce((sum, d) => sum + d.disbursement_amount, 0);
  const pendingDisbursement = loanSanctionedAmount - totalDisbursed;
  const disbursementPercentage = loanSanctionedAmount > 0
    ? ((totalDisbursed / loanSanctionedAmount) * 100).toFixed(1)
    : '0';

  const receivedTranches = disbursements.filter(d => d.received_in_account);
  const pendingTranches = disbursements.filter(d => !d.received_in_account);
  const nextExpectedTranche = nextTrancheNumber();

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
        <h3 className="text-xl font-semibold text-gray-900">Loan Disbursement Tranches</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Tranche
        </button>
      </div>

      {pendingDisbursement > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Partial Disbursement</p>
            <p className="text-sm text-amber-700 mt-1">
              {receivedTranches.length > 0
                ? `₹${totalDisbursed.toLocaleString('en-IN')} received so far. `
                : 'No disbursements received yet. '}
              {trancheLabel(nextExpectedTranche)} of ₹{pendingDisbursement.toLocaleString('en-IN')} is still pending from the bank.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">Sanctioned Amount</p>
          <p className="text-2xl font-bold text-blue-900">₹{loanSanctionedAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">Total Disbursed</p>
          <p className="text-2xl font-bold text-green-900">₹{totalDisbursed.toLocaleString('en-IN')}</p>
          <p className="text-xs text-green-500 mt-0.5">{receivedTranches.length} tranche(s) received</p>
        </div>
        <div className={`${pendingDisbursement > 0 ? 'bg-amber-50' : 'bg-gray-50'} rounded-lg p-4`}>
          <p className={`text-sm ${pendingDisbursement > 0 ? 'text-amber-600' : 'text-gray-600'} font-medium mb-1`}>
            Pending Amount
          </p>
          <p className={`text-2xl font-bold ${pendingDisbursement > 0 ? 'text-amber-900' : 'text-gray-900'}`}>
            ₹{pendingDisbursement.toLocaleString('en-IN')}
          </p>
          {pendingDisbursement > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">Awaiting {trancheLabel(nextExpectedTranche)}</p>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 font-medium mb-1">Disbursed</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{disbursementPercentage}%</p>
            {pendingDisbursement === 0 && loanSanctionedAmount > 0 && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            Add {trancheLabel(nextTrancheNumber())}
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            This will be recorded as tranche #{nextTrancheNumber()}
          </p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disbursement Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.disbursement_amount}
                onChange={(e) => setFormData({ ...formData, disbursement_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disbursement Date *
              </label>
              <input
                type="date"
                value={formData.disbursement_date}
                onChange={(e) => setFormData({ ...formData, disbursement_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Reference Number
              </label>
              <input
                type="text"
                value={formData.disbursement_reference}
                onChange={(e) => setFormData({ ...formData, disbursement_reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Received in Account?
              </label>
              <select
                value={formData.received_in_account ? 'yes' : 'no'}
                onChange={(e) => setFormData({ ...formData, received_in_account: e.target.value === 'yes' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="yes">Yes — Received</option>
                <option value="no">No — Pending</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
            {formError && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            )}
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : `Add ${trancheLabel(nextTrancheNumber())}`}
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

      {/* Disbursement list */}
      <div className="space-y-3">
        {disbursements.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${d.received_in_account ? 'bg-green-100' : 'bg-amber-100'}`}>
                    <Layers className={`w-5 h-5 ${d.received_in_account ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {trancheLabel(d.disbursement_number)} — ₹{d.disbursement_amount.toLocaleString('en-IN')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {new Date(d.disbursement_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`ml-2 inline-block px-2 py-1 rounded text-xs font-medium ${d.received_in_account ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {d.received_in_account ? 'Received' : 'Pending'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {d.disbursement_reference && (
                    <div>
                      <p className="text-gray-500">Reference</p>
                      <p className="font-semibold text-gray-900">{d.disbursement_reference}</p>
                    </div>
                  )}
                </div>
                {d.notes && <p className="mt-2 text-sm text-gray-600 italic">{d.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(d.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {disbursements.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No disbursements recorded yet</p>
            <p className="text-sm text-gray-400 mt-1">Add the 1st tranche when the bank releases the first payment</p>
          </div>
        )}
      </div>
    </div>
  );
}
