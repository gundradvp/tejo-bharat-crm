import { useState, useEffect } from 'react';
import { supabase, LeaveApplication, LeaveBalance, LeaveType } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, FileText, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

interface LeaveApplicationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function LeaveApplicationForm({ onClose, onSuccess }: LeaveApplicationFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);

  const [formData, setFormData] = useState({
    leave_type: 'casual' as LeaveType,
    start_date: '',
    end_date: '',
    is_half_day: false,
    reason: '',
    supporting_document_url: '',
  });

  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  useEffect(() => {
    loadLeaveBalances();
  }, []);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      calculateWorkingDays();
    }
  }, [formData.start_date, formData.end_date, formData.is_half_day]);

  const loadLeaveBalances = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('year', currentYear);

      if (error) throw error;
      setLeaveBalances(data || []);
    } catch (error) {
      console.error('Error loading leave balances:', error);
    }
  };

  const calculateWorkingDays = async () => {
    if (!formData.start_date || !formData.end_date) return;

    setCalculating(true);
    try {
      const { data, error } = await supabase.rpc('calculate_working_days', {
        p_tenant_id: profile?.tenant_id,
        p_start_date: formData.start_date,
        p_end_date: formData.end_date,
        p_include_half_day: formData.is_half_day,
      });

      if (error) throw error;
      setCalculatedDays(data || 0);
    } catch (error) {
      console.error('Error calculating working days:', error);
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCalculatedDays(formData.is_half_day ? diffDays - 0.5 : diffDays);
    } finally {
      setCalculating(false);
    }
  };

  const getLeaveBalance = (leaveType: LeaveType) => {
    const balance = leaveBalances.find((b) => b.leave_type === leaveType);
    return balance?.remaining_days || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.start_date || !formData.end_date) {
      setError('Please select start and end dates');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setError('End date cannot be before start date');
      return;
    }

    if (formData.reason.trim().length < 10) {
      setError('Please provide a reason with at least 10 characters');
      return;
    }

    if (formData.leave_type !== 'unpaid') {
      const balance = getLeaveBalance(formData.leave_type);
      if (balance < calculatedDays) {
        setError(`Insufficient leave balance. Available: ${balance} days, Required: ${calculatedDays} days`);
        return;
      }
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('leave_applications').insert({
        tenant_id: profile?.tenant_id,
        user_id: profile?.id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        number_of_days: calculatedDays,
        is_half_day: formData.is_half_day,
        reason: formData.reason.trim(),
        supporting_document_url: formData.supporting_document_url || null,
        status: 'pending',
      });

      if (insertError) throw insertError;

      setSuccess('Leave application submitted successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Error submitting leave application:', error);
      setError(error.message || 'Failed to submit leave application');
    } finally {
      setLoading(false);
    }
  };

  const leaveTypes: { value: LeaveType; label: string; description: string }[] = [
    { value: 'casual', label: 'Casual Leave', description: 'For personal reasons or emergencies' },
    { value: 'sick', label: 'Sick Leave', description: 'For medical reasons or illness' },
    { value: 'vacation', label: 'Vacation Leave', description: 'For planned vacations and holidays' },
    { value: 'unpaid', label: 'Unpaid Leave', description: 'Leave without pay' },
    { value: 'maternity', label: 'Maternity Leave', description: 'For expecting mothers' },
    { value: 'paternity', label: 'Paternity Leave', description: 'For new fathers' },
    { value: 'bereavement', label: 'Bereavement Leave', description: 'For family loss' },
    { value: 'compensatory', label: 'Compensatory Leave', description: 'For overtime work' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Apply for Leave</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.leave_type}
              onChange={(e) => setFormData({ ...formData, leave_type: e.target.value as LeaveType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {leaveTypes.find((t) => t.value === formData.leave_type)?.description}
            </p>
            {formData.leave_type !== 'unpaid' && (
              <p className="mt-1 text-sm font-medium text-blue-600">
                Available Balance: {getLeaveBalance(formData.leave_type)} days
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_half_day"
              checked={formData.is_half_day}
              onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_half_day" className="text-sm font-medium text-gray-700">
              This is a half-day leave
            </label>
          </div>

          {formData.start_date && formData.end_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Working Days:</span>
                <span className="text-lg font-bold text-blue-600">
                  {calculating ? (
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  ) : (
                    `${calculatedDays} day${calculatedDays !== 1 ? 's' : ''}`
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Excludes weekends and holidays
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a detailed reason for your leave (minimum 10 characters)"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              required
              minLength={10}
              maxLength={1000}
            />
            <p className="mt-1 text-sm text-gray-500">
              {formData.reason.length}/1000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supporting Document URL (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="url"
                value={formData.supporting_document_url}
                onChange={(e) => setFormData({ ...formData, supporting_document_url: e.target.value })}
                placeholder="https://example.com/document.pdf"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              For sick leave, medical certificate may be required
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || calculating}
              className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
