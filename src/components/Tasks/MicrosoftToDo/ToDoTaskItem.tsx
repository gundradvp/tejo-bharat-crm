import React from 'react';
import {
  Check,
  Star,
  Calendar,
  Sun,
  User,
  ListTree,
  ChevronRight,
  Phone,
  Clock,
} from 'lucide-react';
import { EnrichedTask } from '../../../types/todo';

interface ToDoTaskItemProps {
  task: EnrichedTask;
  isSelected: boolean;
  onSelect: (task: EnrichedTask) => void;
  onToggleComplete: (task: EnrichedTask, e: React.MouseEvent) => void;
  onToggleImportant: (task: EnrichedTask, e: React.MouseEvent) => void;
  onToggleMyDay?: (task: EnrichedTask, e: React.MouseEvent) => void;
}

export default function ToDoTaskItem({
  task,
  isSelected,
  onSelect,
  onToggleComplete,
  onToggleImportant,
}: ToDoTaskItemProps) {
  const isCompleted = task.status === 'completed';

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (task.isDueToday) return 'Today';
    if (task.isDueTomorrow) return 'Tomorrow';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getDueDateColor = () => {
    if (isCompleted) return 'text-gray-400';
    if (task.isOverdue) return 'text-rose-600 font-semibold';
    if (task.isDueToday) return 'text-blue-600 font-medium';
    return 'text-gray-500';
  };

  return (
    <div
      onClick={() => onSelect(task)}
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-blue-50/70 border-blue-300 shadow-xs'
          : isCompleted
          ? 'bg-gray-50/60 border-gray-200/80 hover:bg-gray-50'
          : 'bg-white border-gray-200/90 hover:border-blue-200 hover:shadow-xs'
      }`}
    >
      {/* Circular Checkbox (Microsoft To Do style) */}
      <button
        type="button"
        onClick={(e) => onToggleComplete(task, e)}
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
          isCompleted
            ? 'bg-blue-600 border-2 border-blue-600 text-white'
            : 'border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 text-transparent hover:text-blue-600'
        }`}
        title={isCompleted ? 'Mark as not completed' : 'Mark as completed'}
      >
        <Check className={`w-3 h-3 stroke-[3] ${isCompleted ? 'block' : 'opacity-0 group-hover:opacity-100'}`} />
      </button>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm leading-snug break-words ${
              isCompleted
                ? 'line-through text-gray-400 font-normal'
                : 'text-gray-900 font-medium'
            }`}
          >
            {task.title}
          </p>
        </div>

        {/* Metadata badges row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
          {/* My Day Indicator */}
          {task.isMyDay && !isCompleted && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Sun className="w-3 h-3" />
              <span>My Day</span>
            </span>
          )}

          {/* Subtasks / Steps Progress */}
          {task.totalStepsCount > 0 && (
            <span className="flex items-center gap-1 text-gray-600 font-mono">
              <ListTree className="w-3 h-3 text-gray-400" />
              <span>
                {task.completedStepsCount} of {task.totalStepsCount}
              </span>
            </span>
          )}

          {/* Due Date */}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${getDueDateColor()}`}>
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{formatDueDate(task.due_date)}</span>
            </span>
          )}

          {/* Customer Name */}
          {task.customer && (
            <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100 font-medium truncate max-w-[140px]">
              <User className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{task.customer.customer_name}</span>
            </span>
          )}

          {/* Assigned To (if not current user or shown) */}
          {task.assigned_to_profile && (
            <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 text-[10px]">
              <span>{task.assigned_to_profile.full_name?.split(' ')[0]}</span>
            </span>
          )}

          {/* Solar Stage */}
          {task.task_type && task.task_type !== 'other' && (
            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded capitalize">
              {task.task_type.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Star / Importance Button (Right) */}
      <button
        type="button"
        onClick={(e) => onToggleImportant(task, e)}
        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 cursor-pointer ${
          task.isImportant
            ? 'text-rose-500 hover:bg-rose-50'
            : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
        }`}
        title={task.isImportant ? 'Remove importance' : 'Mark as important'}
      >
        <Star
          className={`w-4 h-4 transition-transform ${
            task.isImportant ? 'fill-rose-500 scale-110' : 'hover:scale-110'
          }`}
        />
      </button>
    </div>
  );
}
