import { useState, useEffect } from 'react';
import { supabase, AttendanceRecord, DailyTaskEntry, Customer, Task } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, LogIn, LogOut, MapPin, Loader2, Plus, CheckSquare, X, AlertCircle } from 'lucide-react';

export default function AttendanceTracker() {
  const { profile } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<DailyTaskEntry[]>([]);
  const [locationError, setLocationError] = useState('');
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  useEffect(() => {
    loadTodayAttendance();
    checkLocationPermission();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (todayAttendance) {
      loadDailyTasks();
    }
  }, [todayAttendance]);

  const checkLocationPermission = async () => {
    if (navigator.permissions) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);
        result.addEventListener('change', () => {
          setLocationPermission(result.state);
        });
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    }
  };

  const loadTodayAttendance = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setTodayAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyTasks = async () => {
    if (!todayAttendance) return;

    try {
      const { data, error } = await supabase
        .from('daily_task_entries')
        .select('*')
        .eq('attendance_record_id', todayAttendance.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDailyTasks(data || []);
    } catch (error) {
      console.error('Error loading daily tasks:', error);
    }
  };

  const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      setLocationError('');

      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          setLocationError(errorMessage);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const location = await getLocation();

      if (!location && locationPermission === 'denied') {
        alert('Location access is required for attendance tracking. Please enable location permissions.');
        return;
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          user_id: profile?.id,
          tenant_id: profile?.tenant_id,
          check_in_time: new Date().toISOString(),
          check_in_location: location,
          date: new Date().toISOString().split('T')[0],
          status: 'present',
        })
        .select()
        .single();

      if (error) throw error;
      await loadTodayAttendance();
      setShowTaskModal(true);
    } catch (error: any) {
      console.error('Error checking in:', error);
      alert(error.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;

    try {
      setActionLoading(true);
      const location = await getLocation();
      const checkOutTime = new Date().toISOString();

      const checkInTime = new Date(todayAttendance.check_in_time);
      const checkOut = new Date(checkOutTime);
      const totalHours = (checkOut.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out_time: checkOutTime,
          check_out_location: location,
          total_hours: Number(totalHours.toFixed(2)),
        })
        .eq('id', todayAttendance.id);

      if (updateError) throw updateError;

      if (dailyTasks.length > 0) {
        const totalEstimated = dailyTasks.reduce((sum, task) => sum + task.estimated_hours, 0);
        const distributedHours = dailyTasks.map((task) => {
          const proportion = totalEstimated > 0 ? task.estimated_hours / totalEstimated : 1 / dailyTasks.length;
          return {
            id: task.id,
            actual_hours: Number((totalHours * proportion).toFixed(2)),
          };
        });

        for (const task of distributedHours) {
          await supabase
            .from('daily_task_entries')
            .update({
              actual_hours: task.actual_hours,
              completion_status: 'completed'
            })
            .eq('id', task.id);
        }
      }

      await loadTodayAttendance();
    } catch (error: any) {
      console.error('Error checking out:', error);
      alert(error.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimeFromString = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateWorkingHours = () => {
    if (!todayAttendance?.check_in_time) return '0h 0m';

    const checkIn = new Date(todayAttendance.check_in_time);
    const checkOut = todayAttendance.check_out_time
      ? new Date(todayAttendance.check_out_time)
      : new Date();

    const diff = checkOut.getTime() - checkIn.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Attendance
          </h3>
          <div className="text-2xl font-mono text-gray-700">
            {formatTime(currentTime)}
          </div>
        </div>

        {locationError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">{locationError}</p>
          </div>
        )}

        <div className="space-y-3">
          {todayAttendance ? (
            <>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-green-900">Checked In</div>
                    <div className="text-xs text-green-700">
                      {formatTimeFromString(todayAttendance.check_in_time)}
                    </div>
                  </div>
                </div>
                {todayAttendance.check_in_location && (
                  <MapPin className="w-4 h-4 text-green-600" />
                )}
              </div>

              {todayAttendance.check_out_time ? (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-sm font-medium text-red-900">Checked Out</div>
                      <div className="text-xs text-red-700">
                        {formatTimeFromString(todayAttendance.check_out_time)}
                      </div>
                    </div>
                  </div>
                  {todayAttendance.check_out_location && (
                    <MapPin className="w-4 h-4 text-red-600" />
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Add Task
                  </button>
                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="w-5 h-5" />
                        Check Out
                      </>
                    )}
                  </button>
                </>
              )}

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-900">Working Hours</div>
                <div className="text-2xl font-semibold text-blue-700">
                  {calculateWorkingHours()}
                </div>
              </div>

              {dailyTasks.length > 0 && (
                <div className="border-t border-gray-200 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Today's Tasks</h4>
                    <span className="text-xs text-gray-500">{dailyTasks.length} task{dailyTasks.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dailyTasks.map((task) => (
                      <div key={task.id} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{task.task_name}</div>
                            {task.task_description && (
                              <div className="text-xs text-gray-600 truncate">{task.task_description}</div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">Est: {task.estimated_hours}h</span>
                              {task.actual_hours > 0 && (
                                <span className="text-xs text-blue-600">Actual: {task.actual_hours}h</span>
                              )}
                            </div>
                          </div>
                          {task.completion_status === 'completed' && (
                            <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Check In
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showTaskModal && todayAttendance && (
        <TaskEntryModal
          attendanceRecordId={todayAttendance.id}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            loadDailyTasks();
            setShowTaskModal(false);
          }}
        />
      )}
    </>
  );
}

interface TaskEntryModalProps {
  attendanceRecordId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function TaskEntryModal({ attendanceRecordId, onClose, onSuccess }: TaskEntryModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '',
    task_description: '',
    task_category: 'general' as const,
    estimated_hours: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.task_name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('daily_task_entries').insert({
        tenant_id: profile?.tenant_id,
        attendance_record_id: attendanceRecordId,
        user_id: profile?.id,
        task_name: formData.task_name.trim(),
        task_description: formData.task_description.trim() || null,
        task_category: formData.task_category,
        estimated_hours: formData.estimated_hours,
        actual_hours: 0,
        completion_status: 'in_progress',
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      console.error('Error adding task:', error);
      alert(error.message || 'Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'project_work', label: 'Project Work' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'admin', label: 'Administrative' },
    { value: 'travel', label: 'Travel' },
    { value: 'training', label: 'Training' },
    { value: 'support', label: 'Support' },
    { value: 'general', label: 'General' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Add Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              placeholder="e.g., Customer site visit"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={3}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              placeholder="Brief description of the task"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.task_category}
              onChange={(e) => setFormData({ ...formData, task_category: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Hours
            </label>
            <input
              type="number"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })}
              min="0.5"
              max="24"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
