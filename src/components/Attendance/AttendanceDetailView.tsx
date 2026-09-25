import { useState, useEffect } from 'react';
import { supabase, AttendanceRecord, DailyTaskEntry, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar, Clock, MapPin, List, ChevronLeft, ChevronRight,
  User, Loader2, Map as MapIcon, FileText
} from 'lucide-react';
import AttendanceNavigation from './AttendanceNavigation';

export default function AttendanceDetailView() {
  const { profile } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<(AttendanceRecord & {
    profiles?: Profile;
    daily_task_entries?: DailyTaskEntry[];
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('self');
  const [employees, setEmployees] = useState<Profile[]>([]);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadEmployees();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAttendanceRecords();
  }, [selectedMonth, selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile?.tenant_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const userId = selectedEmployee === 'self' ? profile?.id : selectedEmployee;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*, profiles(*)')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      const recordsWithTasks = await Promise.all(
        (attendanceData || []).map(async (record) => {
          const { data: tasksData } = await supabase
            .from('daily_task_entries')
            .select('*')
            .eq('attendance_record_id', record.id)
            .order('created_at');

          return {
            ...record,
            daily_task_entries: tasksData || [],
          };
        })
      );

      setAttendanceRecords(recordsWithTasks);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    } finally {
      setLoading(false);
    }
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

  const openLocationInMap = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const statusColors = {
    present: 'bg-green-100 text-green-800 border-green-200',
    absent: 'bg-red-100 text-red-800 border-red-200',
    late: 'bg-orange-100 text-orange-800 border-orange-200',
    half_day: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    on_leave: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const categoryColors = {
    project_work: 'bg-purple-50 text-purple-700',
    meeting: 'bg-blue-50 text-blue-700',
    admin: 'bg-gray-50 text-gray-700',
    travel: 'bg-green-50 text-green-700',
    training: 'bg-yellow-50 text-yellow-700',
    support: 'bg-red-50 text-red-700',
    general: 'bg-gray-50 text-gray-700',
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

      <h3 className="text-xl font-bold text-gray-900">Attendance History</h3>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {isAdmin && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="self">Myself</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
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

        <div className="space-y-4">
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No attendance records found for this period</p>
            </div>
          ) : (
            attendanceRecords.map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <div>
                        <div className="font-semibold text-gray-900">{formatDate(record.date)}</div>
                        {isAdmin && record.profiles && (
                          <div className="text-sm text-gray-600">{record.profiles.full_name}</div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        statusColors[record.status]
                      }`}
                    >
                      {record.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Check In</div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">
                          {formatTime(record.check_in_time)}
                        </span>
                      </div>
                      {record.check_in_location && (
                        <button
                          onClick={() =>
                            openLocationInMap(
                              record.check_in_location!.latitude,
                              record.check_in_location!.longitude
                            )
                          }
                          className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                        >
                          <MapPin className="w-3 h-3" />
                          View Location
                        </button>
                      )}
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Check Out</div>
                      {record.check_out_time ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-gray-900">
                              {formatTime(record.check_out_time)}
                            </span>
                          </div>
                          {record.check_out_location && (
                            <button
                              onClick={() =>
                                openLocationInMap(
                                  record.check_out_location!.latitude,
                                  record.check_out_location!.longitude
                                )
                              }
                              className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                            >
                              <MapPin className="w-3 h-3" />
                              View Location
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Not checked out</span>
                      )}
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 mb-1">Total Hours</div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-blue-600 text-lg">
                          {record.total_hours ? `${record.total_hours.toFixed(2)}h` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {record.daily_task_entries && record.daily_task_entries.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <List className="w-4 h-4 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">
                          Tasks ({record.daily_task_entries.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {record.daily_task_entries.map((task) => (
                          <div
                            key={task.id}
                            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900">{task.task_name}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      categoryColors[task.task_category]
                                    }`}
                                  >
                                    {task.task_category.replace('_', ' ')}
                                  </span>
                                </div>
                                {task.task_description && (
                                  <p className="text-sm text-gray-600 mb-2">{task.task_description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-600">
                                  <span>Est: {task.estimated_hours}h</span>
                                  {task.actual_hours > 0 && (
                                    <span className="text-blue-600 font-medium">
                                      Actual: {task.actual_hours}h
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded ${
                                      task.completion_status === 'completed'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {task.completion_status.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {record.notes && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-600 mt-0.5" />
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                          <p className="text-sm text-gray-600">{record.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
