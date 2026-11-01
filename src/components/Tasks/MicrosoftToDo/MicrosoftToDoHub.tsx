import { useState, useEffect, useCallback } from 'react';
import { supabase, Customer, Profile } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useTenant } from '../../../contexts/TenantContext';
import {
  ToDoListType,
  ToDoCustomList,
  EnrichedTask,
  ToDoViewMode,
} from '../../../types/todo';
import {
  enrichTask,
  embedTaskMetadata,
  getCustomLists,
  addCustomList,
  deleteCustomList,
  playCompletionSound,
  getTodayDateString,
} from '../../../lib/todoStorage';
import ToDoSidebar from './ToDoSidebar';
import ToDoMainView from './ToDoMainView';
import ToDoDetailPane from './ToDoDetailPane';
import TaskForm from '../TaskForm';
import { Loader2, LayoutGrid, CheckSquare, Plus, RefreshCw } from 'lucide-react';

interface MicrosoftToDoHubProps {
  onSwitchToClassic?: () => void;
  showViewToggle?: boolean;
}

export default function MicrosoftToDoHub({
  onSwitchToClassic,
  showViewToggle = true,
}: MicrosoftToDoHubProps) {
  const { profile } = useAuth();
  const { currentTenant } = useTenant();

  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentList, setCurrentList] = useState<ToDoListType>('my_day');
  const [customListId, setCustomListId] = useState<string | undefined>(undefined);
  const [customLists, setCustomLists] = useState<ToDoCustomList[]>([]);
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showClassicForm, setShowClassicForm] = useState(false);

  // Load custom lists from storage
  useEffect(() => {
    setCustomLists(getCustomLists(currentTenant?.id));
  }, [currentTenant?.id]);

  // Load Reference Data (Customers & Employees)
  useEffect(() => {
    const loadRefData = async () => {
      try {
        const [custRes, empRes] = await Promise.all([
          supabase.from('customers').select('*').order('customer_name').limit(200),
          supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
        ]);
        if (custRes.data) setCustomers(custRes.data);
        if (empRes.data) setEmployees(empRes.data);
      } catch (err) {
        console.error('Error loading CRM reference data:', err);
      }
    };
    loadRefData();
  }, []);

  // Load Tasks from Supabase
  const loadTasks = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      let query = supabase
        .from('tasks')
        .select(`
          *,
          customer:customers(*),
          assigned_to_profile:profiles!tasks_assigned_to_fkey(*),
          assigned_by_profile:profiles!tasks_assigned_by_fkey(*)
        `)
        .order('created_at', { ascending: false });

      const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);
      if (
        userRoles.includes('employee') &&
        !userRoles.includes('admin') &&
        !userRoles.includes('lead_generator')
      ) {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const enriched = (data || []).map(enrichTask);
      setTasks(enriched);

      // Keep selectedTask up to date if currently open
      if (selectedTask) {
        const found = enriched.find((t) => t.id === selectedTask.id);
        if (found) setSelectedTask(found);
      }
    } catch (err) {
      console.error('Error loading tasks for To Do:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile, selectedTask]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Toggle Completion
  const handleToggleComplete = async (task: EnrichedTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    const isNowCompleted = nextStatus === 'completed';

    if (isNowCompleted) {
      playCompletionSound();
    }

    const updatedTask: EnrichedTask = {
      ...task,
      status: nextStatus,
      completed_at: isNowCompleted ? new Date().toISOString() : undefined,
    };

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
    if (selectedTask?.id === task.id) {
      setSelectedTask(updatedTask);
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: nextStatus,
          completed_at: isNowCompleted ? new Date().toISOString() : null,
        })
        .eq('id', task.id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update task completion:', err);
      // Revert on failure
      loadTasks(true);
    }
  };

  // Toggle Important
  const handleToggleImportant = async (task: EnrichedTask, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextImportant = !task.isImportant;
    const nextPriority = nextImportant ? 'urgent' : 'medium';
    const updatedMeta = { ...task.meta, is_important: nextImportant };
    const serializedRemarks = embedTaskMetadata(task.cleanRemarks, updatedMeta, task.id);

    const updatedTask: EnrichedTask = {
      ...task,
      isImportant: nextImportant,
      priority: nextPriority,
      meta: updatedMeta,
    };

    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
    if (selectedTask?.id === task.id) {
      setSelectedTask(updatedTask);
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          priority: nextPriority,
          remarks: serializedRemarks,
        })
        .eq('id', task.id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update task importance:', err);
      loadTasks(true);
    }
  };

  // Quick Add Task
  const handleQuickAddTask = async (data: {
    title: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    is_important?: boolean;
    customer_id?: string;
    task_type?: any;
    my_day?: boolean;
    custom_list_id?: string;
  }) => {
    if (!profile?.id || !currentTenant?.id) return;

    const initialMeta = {
      is_important: Boolean(data.is_important),
      my_day_date: data.my_day ? getTodayDateString() : null,
      custom_list_id: data.custom_list_id,
      steps: [],
    };

    const serializedRemarks = embedTaskMetadata('', initialMeta);

    const insertPayload: any = {
      title: data.title,
      customer_id: data.customer_id || null,
      assigned_to: profile.id, // assigned to self by default
      assigned_by: profile.id,
      tenant_id: currentTenant.id,
      task_type: data.task_type || 'other',
      status: 'pending',
      priority: data.priority || 'medium',
      due_date: data.due_date || null,
      remarks: serializedRemarks,
    };

    try {
      const { data: created, error } = await supabase
        .from('tasks')
        .insert(insertPayload)
        .select(`
          *,
          customer:customers(*),
          assigned_to_profile:profiles!tasks_assigned_to_fkey(*),
          assigned_by_profile:profiles!tasks_assigned_by_fkey(*)
        `)
        .single();

      if (error) throw error;

      if (created) {
        const enriched = enrichTask(created);
        setTasks((prev) => [enriched, ...prev]);
        setSelectedTask(enriched);
      }
    } catch (err) {
      console.error('Failed to quick add task:', err);
      alert('Could not create task. Please try again.');
    }
  };

  // Full Task Update from Detail Pane
  const handleUpdateTask = async (updated: EnrichedTask) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);

    try {
      const serializedRemarks = embedTaskMetadata(updated.cleanRemarks, updated.meta, updated.id);

      const payload: any = {
        title: updated.title,
        status: updated.status,
        priority: updated.priority,
        task_type: updated.task_type,
        due_date: updated.due_date || null,
        completed_at: updated.completed_at || null,
        customer_id: updated.customer_id || null,
        assigned_to: updated.assigned_to || null,
        remarks: serializedRemarks,
      };

      const { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', updated.id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update task:', err);
      loadTasks(true);
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to delete task:', err);
      loadTasks(true);
    }
  };

  // Custom List Handlers
  const handleAddCustomList = (name: string) => {
    const created = addCustomList(currentTenant?.id, name);
    setCustomLists(getCustomLists(currentTenant?.id));
    setCurrentList('custom');
    setCustomListId(created.id);
  };

  const handleDeleteCustomList = (id: string) => {
    const remaining = deleteCustomList(currentTenant?.id, id);
    setCustomLists(remaining);
    if (currentList === 'custom' && customListId === id) {
      setCurrentList('all_tasks');
      setCustomListId(undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs text-gray-500 font-medium">Loading Solar To Do...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] min-h-[550px] bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden select-none">
      {/* Top Bar with Mode Switcher & Refresh */}
      <div className="px-4 py-2 bg-slate-50 border-b border-gray-200/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-200/70 p-0.5 rounded-lg font-semibold">
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-700 shadow-2xs font-bold"
              title="Microsoft To Do Layout"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>To Do View</span>
            </button>
            {onSwitchToClassic && (
              <button
                onClick={onSwitchToClassic}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-gray-600 hover:text-gray-900 transition-colors"
                title="Switch to Classic CRM Table"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Classic Table</span>
              </button>
            )}
          </div>

          <button
            onClick={() => loadTasks(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-1"
            title="Refresh tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            {tasks.filter((t) => t.status !== 'completed').length} active tasks
          </span>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setShowClassicForm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Multi-Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Pane Microsoft To Do Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <ToDoSidebar
          currentList={currentList}
          customListId={customListId}
          onSelectList={(type, cId) => {
            setCurrentList(type);
            setCustomListId(cId);
            setIsMobileSidebarOpen(false);
          }}
          tasks={tasks}
          customLists={customLists}
          onAddCustomList={handleAddCustomList}
          onDeleteCustomList={handleDeleteCustomList}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Center Main View */}
        <ToDoMainView
          currentList={currentList}
          customListId={customListId}
          customLists={customLists}
          tasks={tasks}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
          onToggleComplete={handleToggleComplete}
          onToggleImportant={handleToggleImportant}
          onQuickAddTask={handleQuickAddTask}
          customers={customers}
          employees={employees}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenClassicForm={() => setShowClassicForm(true)}
        />

        {/* Right Detail Pane */}
        {selectedTask && (
          <ToDoDetailPane
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            employees={employees}
            customers={customers}
          />
        )}
      </div>

      {/* Optional Classic Task Form modal for multi-customer or legacy tasks */}
      {showClassicForm && (
        <TaskForm
          task={null}
          onClose={() => {
            setShowClassicForm(false);
            loadTasks(true);
          }}
        />
      )}
    </div>
  );
}
