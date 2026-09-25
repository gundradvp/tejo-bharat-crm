import { useState, useEffect } from 'react';
import { supabase, LeaveApplication, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar, User, CheckCircle, XCircle, Clock, Filter,
  Search, Loader2, MessageSquare, FileText, Plus
} from 'lucide-react';
import LeaveApplicationForm from './LeaveApplicationForm';
import AttendanceNavigation from './AttendanceNavigation';

export default function LeaveManagement() {
  const { profile } = useAuth();
  const [leaveApplications, setLeaveApplications] = useState<(LeaveApplication & { profiles: Profile; reviewer?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState<string | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadLeaveApplications();
  }, [selectedStatus]);

  const loadLeaveApplications = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('leave_applications')
        .select('*, profiles:user_id(*), reviewer:reviewed_by(*)');

      if (isAdmin) {
        query = query.eq('tenant_id', profile?.tenant_id);
      } else {
        query = query.eq('user_id', profile?.id);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      query = query.order('applied_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setLeaveApplications(data || []);
    } catch (error) {
      console.error('Error loading leave applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewLeave = async (leaveId: string, action: 'approved' | 'rejected') => {
    if (!reviewComments.trim() && action === 'rejected') {
      alert('Please provide comments for rejection');
      return;
    }

    setProcessingAction(true);
    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({
          status: action,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: reviewComments.trim() || null,
        })
        .eq('id', leaveId);

      if (error) throw error;

      setReviewingLeave(null);
      setReviewComments('');
      loadLeaveApplications();
    } catch (error: any) {
      console.error('Error reviewing leave:', error);
      alert(error.message || 'Failed to process leave application');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredApplications = leaveApplications.filter((app) => {
    const matchesSearch =
      app.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const leaveTypeLabels = {
    casual: 'Casual',
    sick: 'Sick',
    vacation: 'Vacation',
    unpaid: 'Unpaid',
    maternity: 'Maternity',
    paternity: 'Paternity',
    bereavement: 'Bereavement',
    compensatory: 'Compensatory',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
        <AttendanceNavigation />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Leave Management</h3>
        <button
          onClick={() => setShowApplicationForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Apply for Leave
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or reason..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-4">
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No leave applications found</p>
            </div>
          ) : (
            filteredApplications.map((application) => (
              <div
                key={application.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {application.profiles?.full_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {leaveTypeLabels[application.leave_type]} Leave
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      statusColors[application.status]
                    }`}
                  >
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {formatDate(application.start_date)} - {formatDate(application.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {application.number_of_days} day{application.number_of_days !== 1 ? 's' : ''}
                      {application.is_half_day && ' (Half Day)'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Applied: {formatDate(application.applied_date)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Reason:</span> {application.reason}
                  </p>
                </div>

                {application.supporting_document_url && (
                  <div className="mb-3">
                    <a
                      href={application.supporting_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      View Supporting Document
                    </a>
                  </div>
                )}

                {application.status !== 'pending' && application.reviewed_at && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-600">
                          <span className="font-medium">
                            {application.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                            {application.reviewer?.full_name || 'Admin'}
                          </span>
                          {' on '}{formatDate(application.reviewed_at)}
                        </p>
                        {application.reviewer_comments && (
                          <p className="text-gray-700 mt-1">{application.reviewer_comments}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isAdmin && application.status === 'pending' && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    {reviewingLeave === application.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          placeholder="Add comments (optional for approval, required for rejection)"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewLeave(application.id, 'approved')}
                            disabled={processingAction}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewLeave(application.id, 'rejected')}
                            disabled={processingAction}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                          <button
                            onClick={() => {
                              setReviewingLeave(null);
                              setReviewComments('');
                            }}
                            disabled={processingAction}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewingLeave(application.id)}
                        className="w-full px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                      >
                        Review Application
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showApplicationForm && (
        <LeaveApplicationForm
          onClose={() => setShowApplicationForm(false)}
          onSuccess={loadLeaveApplications}
        />
      )}
    </div>
  );
}
