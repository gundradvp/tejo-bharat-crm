import { useState, useEffect } from 'react';
import { supabase, Task, Profile, TaskTimeLog } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TaskWithTimeLogs = Task & {
  time_logs?: TaskTimeLog[];
  total_time?: number;
};

export default function TasksByUser() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [tasks, setTasks] = useState<TaskWithTimeLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    totalTime: 0,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadTasksForUser();
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', profile?.tenant_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      if (data && data.length > 0 && !selectedUser) {
        setSelectedUser(data[0].id);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasksForUser = async () => {
    try {
      setLoading(true);
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', selectedUser)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const tasksWithTimeLogs = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { data: timeLogs } = await supabase
            .from('task_time_logs')
            .select('*')
            .eq('task_id', task.id)
            .eq('user_id', selectedUser);

          const totalTime = timeLogs?.reduce(
            (sum, log) => sum + (log.duration_minutes || 0),
            0
          ) || 0;

          return {
            ...task,
            time_logs: timeLogs || [],
            total_time: totalTime,
          };
        })
      );

      setTasks(tasksWithTimeLogs);
      calculateStats(tasksWithTimeLogs);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tasks: TaskWithTimeLogs[]) => {
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
      totalTime: tasks.reduce((sum, t) => sum + (t.total_time || 0), 0),
    };
    setStats(stats);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      blocked: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const selectedUserData = users.find((u) => u.id === selectedUser);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Tasks by User</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name} - {user.email}
            </option>
          ))}
        </select>
      </div>

      {selectedUserData && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedUserData.full_name}</h3>
                <p className="text-gray-600">{selectedUserData.email}</p>
                {selectedUserData.phone && (
                  <p className="text-sm text-gray-500">{selectedUserData.phone}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">Total Tasks</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-700 mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-700 mb-1">In Progress</div>
                <div className="text-2xl font-bold text-blue-900">{stats.inProgress}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-700 mb-1">Completed</div>
                <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-700 mb-1">Blocked</div>
                <div className="text-2xl font-bold text-red-900">{stats.blocked}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-700 mb-1">Total Time</div>
                <div className="text-2xl font-bold text-purple-900">{formatTime(stats.totalTime)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No tasks assigned to this user</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                      <p className="text-gray-600 text-sm">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Task Type</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {task.task_type.replace('_', ' ')}
                      </p>
                    </div>
                    {task.due_date && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Due Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {task.started_at && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Started</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(task.started_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {task.total_time && task.total_time > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-700 mb-1">Time Spent</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-900">{formatTime(task.total_time)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {task.completed_at && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Completed on {new Date(task.completed_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
