import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Star,
  Sun,
  Bell,
  Calendar,
  Repeat,
  User,
  Trash2,
  Plus,
  ExternalLink,
  MessageCircle,
  Clock,
  Layers,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EnrichedTask, ToDoStep } from '../../../types/todo';
import { Customer, Profile } from '../../../lib/supabase';
import { getTodayDateString, getTomorrowDateString } from '../../../lib/todoStorage';

interface ToDoDetailPaneProps {
  task: EnrichedTask | null;
  onClose: () => void;
  onUpdateTask: (updated: EnrichedTask) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  employees: Profile[];
  customers: Customer[];
}

export default function ToDoDetailPane({
  task,
  onClose,
  onUpdateTask,
  onDeleteTask,
  employees,
  customers,
}: ToDoDetailPaneProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [newStepTitle, setNewStepTitle] = useState('');
  const [steps, setSteps] = useState<ToDoStep[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [taskType, setTaskType] = useState<string>('other');
  const [remarks, setRemarks] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isMyDay, setIsMyDay] = useState(false);
  const [repeat, setRepeat] = useState<string>('none');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setSteps(task.meta?.steps || []);
      setDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
      setAssignedTo(task.assigned_to || '');
      setCustomerId(task.customer_id || '');
      setPriority(task.priority || 'medium');
      setTaskType(task.task_type || 'other');
      setRemarks(task.cleanRemarks || '');
      setIsImportant(task.isImportant);
      setIsMyDay(task.isMyDay);
      setRepeat(task.meta?.repeat || 'none');
    }
  }, [task]);

  if (!task) return null;

  const currentCustomer = customers.find((c) => c.id === customerId) || task.customer;
  const isCompleted = task.status === 'completed';

  const triggerUpdate = async (overrides: Partial<EnrichedTask>) => {
    if (!task) return;
    setSaving(true);
    try {
      const merged: EnrichedTask = {
        ...task,
        ...overrides,
        meta: {
          ...task.meta,
          ...(overrides.meta || {}),
        },
      };
      await onUpdateTask(merged);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      triggerUpdate({ title: title.trim() });
    }
  };

  const handleToggleComplete = () => {
    const nextStatus = isCompleted ? 'pending' : 'completed';
    triggerUpdate({
      status: nextStatus,
      completed_at: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const handleToggleImportant = () => {
    const next = !isImportant;
    setIsImportant(next);
    triggerUpdate({
      isImportant: next,
      priority: next ? 'urgent' : 'medium',
      meta: { ...task.meta, is_important: next },
    });
  };

  const handleToggleMyDay = () => {
    const today = getTodayDateString();
    const next = !isMyDay;
    setIsMyDay(next);
    triggerUpdate({
      isMyDay: next,
      meta: {
        ...task.meta,
        my_day_date: next ? today : null,
      },
    });
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    const newStep: ToDoStep = {
      id: `step_${Date.now()}`,
      title: newStepTitle.trim(),
      completed: false,
    };
    const updated = [...steps, newStep];
    setSteps(updated);
    setNewStepTitle('');
    triggerUpdate({
      meta: { ...task.meta, steps: updated },
      completedStepsCount: updated.filter((s) => s.completed).length,
      totalStepsCount: updated.length,
    });
  };

  const handleToggleStep = (stepId: string) => {
    const updated = steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            completed: !s.completed,
            completed_at: !s.completed ? new Date().toISOString() : undefined,
          }
        : s
    );
    setSteps(updated);
    triggerUpdate({
      meta: { ...task.meta, steps: updated },
      completedStepsCount: updated.filter((s) => s.completed).length,
      totalStepsCount: updated.length,
    });
  };

  const handleDeleteStep = (stepId: string) => {
    const updated = steps.filter((s) => s.id !== stepId);
    setSteps(updated);
    triggerUpdate({
      meta: { ...task.meta, steps: updated },
      completedStepsCount: updated.filter((s) => s.completed).length,
      totalStepsCount: updated.length,
    });
  };

  const handleDueDateChange = (newDate: string) => {
    setDueDate(newDate);
    const todayStr = getTodayDateString();
    const tomorrowStr = getTomorrowDateString();
    triggerUpdate({
      due_date: newDate || undefined,
      isDueToday: Boolean(newDate && newDate === todayStr),
      isDueTomorrow: Boolean(newDate && newDate === tomorrowStr),
      isOverdue: Boolean(newDate && newDate < todayStr && task.status !== 'completed'),
    });
  };

  const handleRemarksBlur = () => {
    if (remarks !== task.cleanRemarks) {
      triggerUpdate({ cleanRemarks: remarks });
    }
  };

  return (
    <div className="w-80 sm:w-96 bg-white border-l border-gray-200 h-full flex flex-col shadow-xl z-20 flex-shrink-0 select-none animate-in slide-in-from-right duration-200">
      {/* Detail Pane Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-xs font-semibold text-gray-500">Task Details</span>
        <div className="flex items-center gap-1">
          {saving && <span className="text-[10px] text-gray-400 animate-pulse mr-2">Saving...</span>}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Pane Scroll Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Title & Complete & Star */}
        <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <button
            type="button"
            onClick={handleToggleComplete}
            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
              isCompleted
                ? 'bg-blue-600 border-2 border-blue-600 text-white'
                : 'border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 text-transparent hover:text-blue-600'
            }`}
          >
            <Check className={`w-3 h-3 stroke-[3] ${isCompleted ? 'block' : 'opacity-0'}`} />
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Task Title..."
            className={`flex-1 font-medium text-sm border-none focus:outline-none bg-transparent ${
              isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          />

          <button
            type="button"
            onClick={handleToggleImportant}
            className="p-1 rounded text-gray-400 hover:text-rose-500 transition-colors"
            title={isImportant ? 'Remove importance' : 'Mark as important'}
          >
            <Star
              className={`w-4 h-4 ${
                isImportant ? 'text-rose-500 fill-rose-500' : 'text-gray-300'
              }`}
            />
          </button>
        </div>

        {/* Subtasks / Steps */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
            <span>Steps</span>
            {steps.length > 0 && (
              <span className="text-[10px] text-gray-400 font-mono">
                {steps.filter((s) => s.completed).length} of {steps.length}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {steps.map((step) => (
              <div
                key={step.id}
                className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStep(step.id)}
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                      step.completed
                        ? 'bg-blue-600 border border-blue-600 text-white'
                        : 'border border-gray-300 hover:border-blue-600'
                    }`}
                  >
                    <Check
                      className={`w-2.5 h-2.5 stroke-[3] ${
                        step.completed ? 'block' : 'opacity-0'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs truncate ${
                      step.completed ? 'line-through text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteStep(step.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddStep} className="pt-1 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <input
              type="text"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              placeholder="Add next step..."
              className="flex-1 text-xs bg-transparent border-none focus:outline-none placeholder-blue-600/70 text-gray-800"
            />
          </form>
        </div>

        {/* My Day Toggle Button */}
        <button
          type="button"
          onClick={handleToggleMyDay}
          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
            isMyDay
              ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sun className={`w-4 h-4 ${isMyDay ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
            <span>{isMyDay ? 'Added to My Day' : 'Add to My Day'}</span>
          </div>
          {isMyDay && (
            <span className="text-[10px] text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
        </button>

        {/* Due Date & Remind & Repeat Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs space-y-3">
          {/* Due Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-gray-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Due Date</span>
            </div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Quick Date Pills */}
          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleDueDateChange(getTodayDateString())}
              className="px-2 py-1 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 text-[10px] font-medium transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleDueDateChange(getTomorrowDateString())}
              className="px-2 py-1 rounded-md bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-700 text-[10px] font-medium transition-colors"
            >
              Tomorrow
            </button>
            {dueDate && (
              <button
                type="button"
                onClick={() => handleDueDateChange('')}
                className="px-2 py-1 rounded-md hover:bg-rose-50 text-gray-400 hover:text-rose-600 text-[10px] font-medium ml-auto"
              >
                Clear
              </button>
            )}
          </div>

          {/* Repeat */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-gray-700">
              <Repeat className="w-4 h-4 text-indigo-500" />
              <span>Repeat</span>
            </div>
            <select
              value={repeat}
              onChange={(e) => {
                const rep = e.target.value as any;
                setRepeat(rep);
                triggerUpdate({ meta: { ...task.meta, repeat: rep } });
              }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 focus:bg-white focus:outline-none"
            >
              <option value="none">Never</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {/* Solar CRM Integrations: Customer & Stage & Assignee */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            CRM Integration
          </p>

          {/* Customer Selection & Quick Actions */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Linked Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                const newCId = e.target.value;
                setCustomerId(newCId);
                const found = customers.find((c) => c.id === newCId);
                triggerUpdate({
                  customer_id: newCId || undefined,
                  customer: found,
                });
              }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None (General Task)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>

            {currentCustomer && (
              <div className="mt-2 p-2 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center justify-between">
                <div className="truncate mr-2">
                  <p className="font-semibold text-blue-900 truncate">
                    {currentCustomer.customer_name}
                  </p>
                  <p className="text-[10px] text-blue-700">{currentCustomer.phone || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {currentCustomer.phone && (
                    <a
                      href={`https://wa.me/91${currentCustomer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hi ${currentCustomer.customer_name}, regarding your solar task: ${task.title}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      title="Open WhatsApp chat"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => navigate(`/customers/${currentCustomer.id}/details`)}
                    className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    title="View Customer Profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Solar Task Type */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Solar Task Stage
            </label>
            <select
              value={taskType}
              onChange={(e) => {
                const tt = e.target.value as any;
                setTaskType(tt);
                triggerUpdate({ task_type: tt });
              }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none capitalize"
            >
              <option value="follow_up">Follow Up</option>
              <option value="document_collection">Document Collection</option>
              <option value="eb_change">EB / Net Metering</option>
              <option value="installation">Installation</option>
              <option value="verification">Verification</option>
              <option value="other">Other / General</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">
              Assigned To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => {
                const aId = e.target.value;
                setAssignedTo(aId);
                const foundProfile = employees.find((p) => p.id === aId);
                triggerUpdate({
                  assigned_to: aId || undefined,
                  assigned_to_profile: foundProfile,
                });
              }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none"
            >
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[11px] font-medium text-gray-600 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                const pr = e.target.value as any;
                setPriority(pr);
                const isImp = pr === 'urgent' || pr === 'high';
                setIsImportant(isImp);
                triggerUpdate({
                  priority: pr,
                  isImportant: isImp,
                  meta: { ...task.meta, is_important: isImp },
                });
              }}
              className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:outline-none capitalize"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Notes / Remarks textarea */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs">
          <label className="block text-[11px] font-medium text-gray-600 mb-1">
            Notes & Remarks
          </label>
          <textarea
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            onBlur={handleRemarksBlur}
            placeholder="Add detailed notes, site measurements, DISCOM references..."
            className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white resize-y"
          />
        </div>
      </div>

      {/* Detail Pane Bottom Footer */}
      <div className="p-3 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
        <span className="font-mono">
          Created{' '}
          {new Date(task.created_at).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete task "${task.title}"?`)) {
              onDeleteTask(task.id);
            }
          }}
          className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
