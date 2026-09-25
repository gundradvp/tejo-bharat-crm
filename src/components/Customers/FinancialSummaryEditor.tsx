import { useState, useEffect } from 'react';
import { supabase, type ProjectFinancialSummary } from '../../lib/supabase';
import { Save, Calculator, Loader2, Info } from 'lucide-react';

type Props = {
  customerId: string;
  onSaved?: () => void;
};

export default function FinancialSummaryEditor({ customerId, onSaved }: Props) {
  const [summary, setSummary] = useState<ProjectFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    agreed_project_cost: '',
    quotation_to_bank: '',
    bank_loan_percentage: '90',
    notes: '',
  });

  useEffect(() => {
    loadSummary();
  }, [customerId]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_financial_summary')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (error) throw error;
      setSummary(data);
      if (data) {
        setForm({
          agreed_project_cost: String(data.agreed_project_cost || ''),
          quotation_to_bank: String(data.quotation_to_bank || ''),
          bank_loan_percentage: String(data.bank_loan_percentage || '90'),
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error loading financial summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        customer_id: customerId,
        agreed_project_cost: parseFloat(form.agreed_project_cost || '0'),
        quotation_to_bank: parseFloat(form.quotation_to_bank || '0'),
        bank_loan_percentage: parseFloat(form.bank_loan_percentage || '90'),
        notes: form.notes,
      };

      if (summary) {
        const { error } = await supabase
          .from('project_financial_summary')
          .update(payload)
          .eq('customer_id', customerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_financial_summary')
          .insert([payload]);
        if (error) throw error;
      }

      setEditing(false);
      await loadSummary();
      onSaved?.();
    } catch (error) {
      console.error('Error saving financial summary:', error);
      alert('Could not save the financial summary. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
      </div>
    );
  }

  const bankLoanAmount = summary?.bank_loan_amount || 0;
  const customerMargin = summary?.customer_margin || 0;
  const marginProvided = summary?.margin_provided || 0;
  const marginPending = summary?.margin_pending || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Calculator className="w-4 h-4 text-teal-700" />
          Bank Quotation & Margin Summary
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-teal-700 hover:text-teal-900 font-medium"
          >
            {summary ? 'Edit' : 'Set Up'}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-teal-800">
              Enter the agreed project cost and the quotation amount shown to the bank.
              The bank loan amount and customer margin are calculated automatically.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agreed Project Cost (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.agreed_project_cost}
                onChange={(e) => setForm({ ...form, agreed_project_cost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. 210000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quotation to Bank (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.quotation_to_bank}
                onChange={(e) => setForm({ ...form, quotation_to_bank: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. 220000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Loan Percentage (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.bank_loan_percentage}
                onChange={(e) => setForm({ ...form, bank_loan_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. 90"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 disabled:opacity-50 text-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Summary
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                if (summary) {
                  setForm({
                    agreed_project_cost: String(summary.agreed_project_cost || ''),
                    quotation_to_bank: String(summary.quotation_to_bank || ''),
                    bank_loan_percentage: String(summary.bank_loan_percentage || '90'),
                    notes: summary.notes || '',
                  });
                }
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="p-5">
          {!summary ? (
            <div className="text-center py-8">
              <Calculator className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">
                No financial summary set up yet. Click "Set Up" to configure the bank quotation and margin.
              </p>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 text-sm"
              >
                Set Up Summary
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryTile label="Agreed Cost" value={fmt(summary.agreed_project_cost)} color="teal" />
                <SummaryTile label="Quotation to Bank" value={fmt(summary.quotation_to_bank)} color="blue" />
                <SummaryTile
                  label={`Bank Loan (${summary.bank_loan_percentage}%)`}
                  value={fmt(bankLoanAmount)}
                  color="indigo"
                />
                <SummaryTile label="Customer Margin" value={fmt(customerMargin)} color="amber" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                <SummaryTile
                  label="Margin Provided to Customer"
                  value={fmt(marginProvided)}
                  color="orange"
                />
                <SummaryTile
                  label="Margin Pending to Collect"
                  value={fmt(marginPending)}
                  color={marginPending > 0 ? 'red' : 'green'}
                />
                <SummaryTile
                  label="Loan Received from Bank"
                  value={fmt(summary.loan_from_bank_received)}
                  color="green"
                />
              </div>
              {summary.notes && (
                <p className="text-sm text-gray-600 italic pt-2 border-t border-gray-100">{summary.notes}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'teal' | 'blue' | 'indigo' | 'amber' | 'orange' | 'red' | 'green';
}) {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-900',
    blue: 'bg-blue-50 text-blue-900',
    indigo: 'bg-indigo-50 text-indigo-900',
    amber: 'bg-amber-50 text-amber-900',
    orange: 'bg-orange-50 text-orange-900',
    red: 'bg-red-50 text-red-900',
    green: 'bg-green-50 text-green-900',
  };
  const labelColors: Record<string, string> = {
    teal: 'text-teal-600',
    blue: 'text-blue-600',
    indigo: 'text-indigo-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    green: 'text-green-600',
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className={`text-xs font-medium mb-1 ${labelColors[color]}`}>{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
