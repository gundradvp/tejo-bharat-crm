import { useState, useEffect } from 'react';
import { supabase, AttendanceRecord, Profile, TaskTimeLog, Task } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, User, Clock, Download, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Play, Pause } from 'lucide-react';
import AttendanceTracker from './AttendanceTracker';
import AttendanceNavigation from './AttendanceNavigation';

type AttendanceWithTasks = AttendanceRecord & {
  profiles: Profile;
  task_time_logs?: (TaskTimeLog & { task?: Task })[];
};

export default function AttendanceReports() {
  const { profile } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithTasks[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentTask, setCurrentTask] = useState<TaskTimeLog & { task?: Task } | null>(null);
  const isAdmin = profile?.role === 'admin' || profile?.roles?.includes('admin');
  const [selectedUser, setSelectedUser] = useState<string>(isAdmin ? 'all' : profile?.id || '');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState({
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAttendanceRecords();
    loadCurrentTask();
  }, [selectedUser, selectedMonth]);

  const loadCurrentTask = async () => {
    try {
      const userId = selectedUser === 'all' ? profile?.id : selectedUser;
      const { data, error } = await supabase
        .from('task_time_logs')
        .select('*, task:tasks(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentTask(data || null);
    } catch (error) {
      console.error('Error loading current task:', error);
      setCurrentTask(null);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile?.tenant_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      let query = supabase
        .from('attendance_records')
        .select('*, profiles(*)')
        .eq('tenant_id', profile?.tenant_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      const { data, error } = await query;

      if (error) throw error;

      const recordsWithTasks = await Promise.all(
        (data || []).map(async (record) => {
          const { data: timeLogs } = await supabase
            .from('task_time_logs')
            .select('*, task:tasks(*)')
            .eq('user_id', record.user_id)
            .gte('start_time', `${record.date}T00:00:00`)
            .lte('start_time', `${record.date}T23:59:59`)
            .order('start_time', { ascending: false });

          return {
            ...record,
            task_time_logs: timeLogs || [],
          };
        })
      );

      setAttendanceRecords(recordsWithTasks);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (records: AttendanceRecord[]) => {
    const stats = {
      totalDays: records.length,
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      halfDay: records.filter((r) => r.status === 'half_day').length,
      onLeave: records.filter((r) => r.status === 'on_leave').length,
    };
    setStats(stats);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const changeMonth = (direction: number) => {
    const currentDate = new Date(selectedMonth + '-01');
    currentDate.setMonth(currentDate.getMonth() + direction);
    setSelectedMonth(currentDate.toISOString().slice(0, 7));
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const toggleRow = (recordId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Employee', 'Check In', 'Check Out', 'Total Hours', 'Status'];
    const rows = attendanceRecords.map((record) => [
      record.date,
      record.profiles?.full_name || 'Unknown',
      formatTime(record.check_in_time),
      record.check_out_time ? formatTime(record.check_out_time) : 'Not checked out',
      record.total_hours?.toFixed(2) || '0',
      record.status,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statusColors = {
    present: 'bg-green-100 text-green-800 border-green-200',
    absent: 'bg-red-100 text-red-800 border-red-200',
    late: 'bg-orange-100 text-orange-800 border-orange-200',
    half_day: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    on_leave: 'bg-blue-100 text-blue-800 border-blue-200',
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

      <AttendanceTracker />

      {currentTask && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Play className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">Currently Working On</h4>
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-gray-700 font-medium mt-1">
                  {currentTask.task?.title || 'Task'}
                </p>
                {currentTask.notes && (
                  <p className="text-sm text-gray-600 mt-1">{currentTask.notes}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Started: {formatTime(currentTask.start_time)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Attendance Reports</h3>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Days</div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalDays}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="text-sm text-green-700 mb-1">Present</div>
          <div className="text-2xl font-bold text-green-900">{stats.present}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-700 mb-1">Absent</div>
          <div className="text-2xl font-bold text-red-900">{stats.absent}</div>
        </div>
        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
          <div className="text-sm text-orange-700 mb-1">Late</div>
          <div className="text-2xl font-bold text-orange-900">{stats.late}</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-sm text-blue-700 mb-1">On Leave</div>
          <div className="text-2xl font-bold text-blue-900">{stats.onLeave}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {isAdmin && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Employees</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="w-12"></th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Check In</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Check Out</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total Hours</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => {
                  const isExpanded = expandedRows.has(record.id);
                  const taskCount = record.task_time_logs?.length || 0;
                  const totalTaskTime = record.task_time_logs?.reduce(
                    (sum, log) => sum + (log.duration_minutes || 0),
                    0
                  ) || 0;

                  return (
                    <>
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 text-sm">
                          {taskCount > 0 && (
                            <button
                              onClick={() => toggleRow(record.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            {formatDate(record.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            {record.profiles?.full_name || 'Unknown'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            {formatTime(record.check_in_time)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {record.check_out_time ? (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-red-600" />
                              {formatTime(record.check_out_time)}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not checked out</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {record.total_hours ? `${record.total_hours.toFixed(2)}h` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              statusColors[record.status]
                            }`}
                          >
                            {record.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {taskCount > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-blue-600">{taskCount} tasks</span>
                              <span className="text-xs text-gray-500">{formatDuration(totalTaskTime)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No tasks</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && taskCount > 0 && (
                        <tr key={`${record.id}-expanded`} className="bg-gray-50">
                          <td colSpan={8} className="py-4 px-8">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Task Time Logs
                              </h4>
                              {record.task_time_logs?.map((log) => (
                                <div
                                  key={log.id}
                                  className="bg-white rounded-lg border border-gray-200 p-3"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        {log.is_active ? (
                                          <Play className="w-4 h-4 text-green-600 animate-pulse" />
                                        ) : (
                                          <Pause className="w-4 h-4 text-gray-400" />
                                        )}
                                        <span className="font-medium text-gray-900">
                                          {log.task?.title || 'Task'}
                                        </span>
                                        {log.is_active && (
                                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            Active
                                          </span>
                                        )}
                                      </div>
                                      {log.notes && (
                                        <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                                      )}
                                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <span>Start: {formatTime(log.start_time)}</span>
                                        {log.end_time && (
                                          <>
                                            <span>End: {formatTime(log.end_time)}</span>
                                            <span className="font-medium text-blue-600">
                                              Duration: {formatDuration(log.duration_minutes)}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
