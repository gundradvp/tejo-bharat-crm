import { useState, useEffect } from 'react';
import { supabase, Task, Customer, Profile, TaskCustomer } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, AlertCircle, CheckCircle, Clock, XCircle, Loader2, MessageSquare, FileText, CreditCard as Edit2, ChevronDown, ChevronRight, Trash2, Bell, User, Calendar, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TaskForm from './TaskForm';
import TaskTimer from './TaskTimer';

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusIcons = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle,
  blocked: XCircle,
  cancelled: XCircle,
};

const statusColors = {
  pending: 'text-gray-600',
  in_progress: 'text-blue-600',
  completed: 'text-green-600',
  blocked: 'text-red-600',
  cancelled: 'text-gray-400',
};

const statusBgColors = {
  pending: 'bg-gray-50',
  in_progress: 'bg-blue-50',
  completed: 'bg-green-50',
  blocked: 'bg-red-50',
  cancelled: 'bg-gray-50',
};

type TaskWithDetails = Task & {
  customer?: Customer;
  assigned_to_profile?: Profile;
  task_customers?: (TaskCustomer & { customer: Customer })[];
};

export default function TaskList() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskReminders, setTaskReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('tasks')
        .select(`
          *,
          customer:customers(*),
          assigned_to_profile:profiles!tasks_assigned_to_fkey(*)
        `)
        .order('created_at', { ascending: false });

      const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);
      if (userRoles.includes('employee') && !userRoles.includes('admin') && !userRoles.includes('lead_generator')) {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tasksWithCustomers = await Promise.all(
        (data || []).map(async (task) => {
          const { data: taskCustomers, error: tcError } = await supabase
            .from('task_customers')
            .select('*, customer:customers(*)')
            .eq('task_id', task.id)
            .order('order_index');

          if (tcError) {
            console.error('Error loading task customers:', tcError);
            return task;
          }

          return {
            ...task,
            task_customers: taskCustomers || [],
          };
        })
      );

      setTasks(tasksWithCustomers);

      // Load which tasks have pending reminders
      const { data: reminders } = await supabase
        .from('task_reminders')
        .select('task_id')
        .eq('status', 'pending');
      if (reminders) {
        setTaskReminders(new Set(reminders.map((r: any) => r.task_id)));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter === 'all') return true;
    return task.status === statusFilter;
  });

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTask(null);
    loadTasks();
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const handleSubtaskStatusChange = async (taskCustomerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('task_customers')
        .update({ status: newStatus })
        .eq('id', taskCustomerId);

      if (error) throw error;
      loadTasks();
    } catch (error) {
      console.error('Error updating subtask status:', error);
      alert('Failed to update subtask status');
    }
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(error.message || 'Failed to delete task');
    }
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600 mt-1">{filteredTasks.length} tasks</p>
        </div>
        {((profile?.roles?.includes('admin') || profile?.roles?.includes('lead_generator')) || (profile?.role === 'admin' || profile?.role === 'lead_generator')) && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Assign Task
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => {
          const StatusIcon = statusIcons[task.status];
          const hasSubtasks = task.task_customers && task.task_customers.length > 0;
          const isExpanded = expandedTasks.has(task.id);
          const completedSubtasks = task.task_customers?.filter(tc => tc.status === 'completed').length || 0;
          const totalSubtasks = task.task_customers?.length || 0;

          return (
            <div
              key={task.id}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 flex items-start gap-3">
                    {hasSubtasks && (
                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors mt-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <StatusIcon className={`w-5 h-5 ${statusColors[task.status]}`} />
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        {taskReminders.has(task.id) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title="Has pending reminder">
                            <Bell className="w-3 h-3" />
                            Reminder set
                          </span>
                        )}
                        {hasSubtasks && (
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {completedSubtasks}/{totalSubtasks} completed
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm">{task.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                    {!hasSubtasks && task.customer && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${task.customer.id}/details`);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Customer Details"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${task.customer.id}/details`, { state: { scrollToNotes: true } });
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Notes"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {((profile?.roles?.includes('admin') || profile?.roles?.includes('lead_generator')) || (profile?.role === 'admin' || profile?.role === 'lead_generator')) && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(task);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {(profile?.roles?.includes('admin') || profile?.role === 'admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!hasSubtasks && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <label className="block text-xs text-gray-500 mb-2">Status</label>
                    <select
                      value={task.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="blocked">Blocked</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {task.assigned_to === profile?.id && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <TaskTimer taskId={task.id} onTimeLogChange={loadTasks} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {!hasSubtasks && task.customer && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Customer</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{task.customer.customer_name}</span>
                      </div>
                    </div>
                  )}
                  {task.assigned_to_profile && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{task.assigned_to_profile.full_name}</span>
                      </div>
                    </div>
                  )}
                  {task.due_date && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Due Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{new Date(task.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Task Type</p>
                    <span className="font-medium text-gray-900 capitalize">{task.task_type.replace('_', ' ')}</span>
                  </div>
                </div>

                {task.remarks && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Remarks</p>
                    <p className="text-sm text-gray-700">{task.remarks}</p>
                  </div>
                )}
              </div>

              {hasSubtasks && isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Customers ({totalSubtasks})
                  </h4>
                  <div className="space-y-2">
                    {task.task_customers?.map((tc, index) => {
                      const SubtaskIcon = statusIcons[tc.status];
                      return (
                        <div
                          key={tc.id}
                          className={`${statusBgColors[tc.status]} border border-gray-200 rounded-lg p-3 transition-colors`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded">
                                #{index + 1}
                              </span>
                              <SubtaskIcon className={`w-4 h-4 ${statusColors[tc.status]}`} />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {tc.customer?.customer_name}
                                </p>
                                {tc.customer?.phone && (
                                  <a
                                    href={`tel:${tc.customer.phone}`}
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Phone className="w-3 h-3" />
                                    {tc.customer.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={tc.status}
                                onChange={(e) => handleSubtaskStatusChange(tc.id, e.target.value)}
                                className={`px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent ${statusColors[tc.status]} bg-white`}
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="blocked">Blocked</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button
                                onClick={() => navigate(`/customers/${tc.customer_id}/details`)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="View Customer"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/customers/${tc.customer_id}/details`, { state: { scrollToNotes: true } })}
                                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                title="View Notes"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {tc.completed_at && (
                            <p className="text-xs text-gray-500 mt-2 ml-12">
                              Completed: {new Date(tc.completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No tasks found</p>
        </div>
      )}

      {showForm && (
        <TaskForm
          task={editingTask}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
