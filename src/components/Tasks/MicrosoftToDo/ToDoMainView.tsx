import React, { useState, useMemo } from 'react';
import {
  Sun,
  Star,
  Calendar,
  User,
  CheckSquare,
  Plus,
  ArrowUpDown,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  CheckCircle2,
  Menu,
  Sparkles,
  PhoneCall,
  FileText,
  Zap,
  Wrench,
  Clock,
} from 'lucide-react';
import { ToDoListType, ToDoCustomList, EnrichedTask, ToDoSortOption } from '../../../types/todo';
import { Customer, Profile } from '../../../lib/supabase';
import { getTodayDateString, getTomorrowDateString } from '../../../lib/todoStorage';
import ToDoTaskItem from './ToDoTaskItem';

interface ToDoMainViewProps {
  currentList: ToDoListType;
  customListId?: string;
  customLists: ToDoCustomList[];
  tasks: EnrichedTask[];
  selectedTask: EnrichedTask | null;
  onSelectTask: (task: EnrichedTask | null) => void;
  onToggleComplete: (task: EnrichedTask, e: React.MouseEvent) => void;
  onToggleImportant: (task: EnrichedTask, e: React.MouseEvent) => void;
  onQuickAddTask: (data: {
    title: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    is_important?: boolean;
    customer_id?: string;
    task_type?: any;
    my_day?: boolean;
    custom_list_id?: string;
  }) => Promise<void>;
  customers: Customer[];
  employees: Profile[];
  onOpenMobileSidebar: () => void;
  onOpenClassicForm: () => void;
}

export default function ToDoMainView({
  currentList,
  customListId,
  customLists,
  tasks,
  selectedTask,
  onSelectTask,
  onToggleComplete,
  onToggleImportant,
  onQuickAddTask,
  customers,
  onOpenMobileSidebar,
  onOpenClassicForm,
}: ToDoMainViewProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueDate, setQuickDueDate] = useState<string>('');
  const [quickCustomerId, setQuickCustomerId] = useState<string>('');
  const [quickIsImportant, setQuickIsImportant] = useState(false);
  const [quickTaskType, setQuickTaskType] = useState<string>('other');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ToDoSortOption>('importance');
  const [showCompleted, setShowCompleted] = useState(true);

  // List Meta Info
  const listInfo = useMemo(() => {
    switch (currentList) {
      case 'my_day':
        return {
          title: 'My Day',
          subtitle: new Intl.DateTimeFormat('en-IN', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          }).format(new Date()),
          icon: Sun,
          iconColor: 'text-amber-500 fill-amber-500',
          bgColor: 'from-amber-500/10 to-transparent',
        };
      case 'important':
        return {
          title: 'Important',
          subtitle: 'High priority & flagged tasks',
          icon: Star,
          iconColor: 'text-rose-500 fill-rose-500',
          bgColor: 'from-rose-500/10 to-transparent',
        };
      case 'planned':
        return {
          title: 'Planned',
          subtitle: 'Tasks with due dates',
          icon: Calendar,
          iconColor: 'text-emerald-500',
          bgColor: 'from-emerald-500/10 to-transparent',
        };
      case 'assigned_to_me':
        return {
          title: 'Assigned to me',
          subtitle: 'Customer assignments & tasks',
          icon: User,
          iconColor: 'text-indigo-500',
          bgColor: 'from-indigo-500/10 to-transparent',
        };
      case 'follow_up':
        return {
          title: 'Follow-ups',
          subtitle: 'Customer calls & site survey follow ups',
          icon: PhoneCall,
          iconColor: 'text-blue-600',
          bgColor: 'from-blue-500/10 to-transparent',
        };
      case 'document_collection':
        return {
          title: 'Document Collection',
          subtitle: 'Aadhaar, Electricity Bill & Docs',
          icon: FileText,
          iconColor: 'text-amber-600',
          bgColor: 'from-amber-500/10 to-transparent',
        };
      case 'eb_change':
        return {
          title: 'EB / Net Metering',
          subtitle: 'DISCOM & Meter change requests',
          icon: Zap,
          iconColor: 'text-purple-600',
          bgColor: 'from-purple-500/10 to-transparent',
        };
      case 'installation':
        return {
          title: 'Solar Installation',
          subtitle: 'Structure, panels & inverter setup',
          icon: Wrench,
          iconColor: 'text-teal-600',
          bgColor: 'from-teal-500/10 to-transparent',
        };
      case 'verification':
        return {
          title: 'Site Verification',
          subtitle: 'CEIG & DISCOM inspection',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          bgColor: 'from-emerald-500/10 to-transparent',
        };
      case 'custom': {
        const found = customLists.find((l) => l.id === customListId);
        return {
          title: found?.name || 'Custom List',
          subtitle: 'Custom task collection',
          icon: CheckSquare,
          iconColor: 'text-blue-600',
          bgColor: 'from-blue-500/10 to-transparent',
        };
      }
      case 'all_tasks':
      default:
        return {
          title: 'Tasks',
          subtitle: 'All active and pending tasks',
          icon: CheckSquare,
          iconColor: 'text-blue-600',
          bgColor: 'from-blue-500/10 to-transparent',
        };
    }
  }, [currentList, customListId, customLists]);

  // Filter tasks based on current list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search text match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchRemarks = t.cleanRemarks.toLowerCase().includes(q);
        const matchCustomer = t.customer?.customer_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchRemarks && !matchCustomer) return false;
      }

      // List filtering
      switch (currentList) {
        case 'my_day':
          return t.isMyDay;
        case 'important':
          return t.isImportant;
        case 'planned':
          return Boolean(t.due_date);
        case 'assigned_to_me':
          return true; // Parent caller passes relevant tasks
        case 'follow_up':
          return t.task_type === 'follow_up';
        case 'document_collection':
          return t.task_type === 'document_collection';
        case 'eb_change':
          return t.task_type === 'eb_change';
        case 'installation':
          return t.task_type === 'installation';
        case 'verification':
          return t.task_type === 'verification';
        case 'custom':
          return t.meta.custom_list_id === customListId;
        case 'all_tasks':
        default:
          return true;
      }
    });
  }, [tasks, currentList, customListId, searchQuery]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a, b) => {
      if (sortBy === 'importance') {
        if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
    return list;
  }, [filteredTasks, sortBy]);

  const activeTasks = sortedTasks.filter((t) => t.status !== 'completed');
  const completedTasks = sortedTasks.filter((t) => t.status === 'completed');

  // Quick Add submit
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onQuickAddTask({
        title: quickTitle.trim(),
        due_date: quickDueDate || (currentList === 'planned' ? getTodayDateString() : undefined),
        priority: quickIsImportant || currentList === 'important' ? 'urgent' : 'medium',
        is_important: quickIsImportant || currentList === 'important',
        customer_id: quickCustomerId || undefined,
        task_type:
          ['follow_up', 'document_collection', 'eb_change', 'installation', 'verification'].includes(
            currentList
          )
            ? currentList
            : quickTaskType,
        my_day: currentList === 'my_day',
        custom_list_id: currentList === 'custom' ? customListId : undefined,
      });

      // Reset
      setQuickTitle('');
      setQuickDueDate('');
      setQuickCustomerId('');
      setQuickIsImportant(false);
      setIsInputFocused(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const IconComponent = listInfo.icon;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Top Header */}
      <div className={`p-4 sm:p-6 pb-2 border-b border-gray-200/60 bg-gradient-to-b ${listInfo.bgColor}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-white/80 transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <IconComponent className={`w-6 h-6 ${listInfo.iconColor}`} />
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                  {listInfo.title}
                </h1>
                <p className="text-xs text-gray-500 font-medium">{listInfo.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Action buttons (Sort, Search, Classic Form) */}
          <div className="flex items-center gap-2">
            {/* Search Input (desktop) */}
            <div className="relative hidden sm:block">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-44 transition-all focus:w-60"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ToDoSortOption)}
                className="appearance-none pl-7 pr-7 py-1.5 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="importance">Sort: Importance</option>
                <option value="due_date">Sort: Due date</option>
                <option value="alphabetical">Sort: Alphabetical</option>
                <option value="created_at">Sort: Creation date</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Classic Full Form Button */}
            <button
              onClick={onOpenClassicForm}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all cursor-pointer flex-shrink-0"
              title="Open full detailed assignment modal"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Detailed Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Task List Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Microsoft To Do Fast Quick-Add Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <form onSubmit={handleQuickAddSubmit} className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 flex-shrink-0">
                <Plus className="w-3 h-3 stroke-[3]" />
              </div>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                placeholder={`Add a task to "${listInfo.title}"... (Press Enter)`}
                className="flex-1 text-sm bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400 font-medium"
              />
              <button
                type="button"
                onClick={() => setQuickIsImportant(!quickIsImportant)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  quickIsImportant ? 'text-rose-500 hover:bg-rose-50' : 'text-gray-300 hover:text-gray-500'
                }`}
                title="Mark Important"
              >
                <Star className={`w-4 h-4 ${quickIsImportant ? 'fill-rose-500' : ''}`} />
              </button>
            </div>

            {/* Quick action bar revealed when focused or typed */}
            {(isInputFocused || quickTitle.trim().length > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Due Date Shortcut */}
                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <input
                      type="date"
                      value={quickDueDate}
                      onChange={(e) => setQuickDueDate(e.target.value)}
                      className="bg-transparent text-xs text-gray-700 focus:outline-none"
                    />
                  </div>

                  {/* Customer Selector Shortcut */}
                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <select
                      value={quickCustomerId}
                      onChange={(e) => setQuickCustomerId(e.target.value)}
                      className="bg-transparent text-xs text-gray-700 focus:outline-none max-w-[130px] truncate"
                    >
                      <option value="">Customer...</option>
                      {customers.slice(0, 30).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.customer_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Solar Stage */}
                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <select
                      value={quickTaskType}
                      onChange={(e) => setQuickTaskType(e.target.value)}
                      className="bg-transparent text-xs text-gray-700 focus:outline-none capitalize"
                    >
                      <option value="other">General Task</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="document_collection">Doc Collection</option>
                      <option value="eb_change">EB / Net Meter</option>
                      <option value="installation">Installation</option>
                      <option value="verification">Verification</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!quickTitle.trim() || isSubmitting}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 disabled:opacity-40 transition-colors ml-auto cursor-pointer"
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Active Tasks */}
        <div className="space-y-2">
          {activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white/70 border border-dashed border-gray-200">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3">
                <CheckSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-800">Focus on what matters today</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                Tasks added to {listInfo.title} or assigned to you will show up here. Add a new task above or organize your solar pipeline.
              </p>
            </div>
          ) : (
            activeTasks.map((task) => (
              <ToDoTaskItem
                key={task.id}
                task={task}
                isSelected={selectedTask?.id === task.id}
                onSelect={(t) => onSelectTask(selectedTask?.id === t.id ? null : t)}
                onToggleComplete={onToggleComplete}
                onToggleImportant={onToggleImportant}
              />
            ))
          )}
        </div>

        {/* Completed Tasks Accordion */}
        {completedTasks.length > 0 && (
          <div className="pt-4 space-y-2">
            <button
              type="button"
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors py-1 cursor-pointer select-none"
            >
              {showCompleted ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span>Completed</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700 text-[10px]">
                {completedTasks.length}
              </span>
            </button>

            {showCompleted && (
              <div className="space-y-2 transition-all">
                {completedTasks.map((task) => (
                  <ToDoTaskItem
                    key={task.id}
                    task={task}
                    isSelected={selectedTask?.id === task.id}
                    onSelect={(t) => onSelectTask(selectedTask?.id === t.id ? null : t)}
                    onToggleComplete={onToggleComplete}
                    onToggleImportant={onToggleImportant}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
