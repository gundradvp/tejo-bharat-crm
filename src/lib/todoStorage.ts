import { Task, Customer, Profile } from './supabase';
import { ToDoMetadata, ToDoCustomList, EnrichedTask } from '../types/todo';

const META_START = '<!-- TODO_META:';
const META_END = '-->';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function extractTaskMetadata(remarks?: string, taskId?: string): { cleanRemarks: string; meta: ToDoMetadata } {
  let meta: ToDoMetadata = {
    steps: [],
    is_important: false,
    my_day_date: null,
    repeat: 'none',
  };

  // 1. Try local storage cache
  if (taskId) {
    try {
      const cached = localStorage.getItem(`tejo_todo_meta_${taskId}`);
      if (cached) {
        meta = { ...meta, ...JSON.parse(cached) };
      }
    } catch {
      // ignore
    }
  }

  // 2. Try embedded metadata in remarks
  let cleanRemarks = remarks || '';
  if (remarks && remarks.includes(META_START)) {
    try {
      const startIndex = remarks.indexOf(META_START);
      const endIndex = remarks.indexOf(META_END, startIndex);
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonStr = remarks.substring(startIndex + META_START.length, endIndex).trim();
        const parsed = JSON.parse(jsonStr);
        meta = { ...meta, ...parsed };
        cleanRemarks = (remarks.substring(0, startIndex) + remarks.substring(endIndex + META_END.length)).trim();
      }
    } catch (e) {
      console.warn('Failed to parse todo metadata from remarks', e);
    }
  }

  return { cleanRemarks, meta };
}

export function embedTaskMetadata(cleanRemarks: string, meta: ToDoMetadata, taskId?: string): string {
  if (taskId) {
    try {
      localStorage.setItem(`tejo_todo_meta_${taskId}`, JSON.stringify(meta));
    } catch {
      // ignore
    }
  }
  const jsonStr = JSON.stringify(meta);
  const trimmed = cleanRemarks.trim();
  return trimmed ? `${trimmed}\n\n${META_START}${jsonStr}${META_END}` : `${META_START}${jsonStr}${META_END}`;
}

const DEFAULT_CUSTOM_LISTS: ToDoCustomList[] = [
  {
    id: 'list_site_surveys',
    name: 'Solar Site Surveys',
    icon: '☀️',
    color: '#0284c7',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list_pmsurya_dbt',
    name: 'PM Surya Ghar DBT Invoices',
    icon: '⚡',
    color: '#059669',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'list_commercial_quotes',
    name: 'Commercial & B2B Follow-ups',
    icon: '🏢',
    color: '#7c3aed',
    createdAt: new Date().toISOString(),
  },
];

export function getCustomLists(tenantId?: string): ToDoCustomList[] {
  const key = `tejo_todo_custom_lists_${tenantId || 'global'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load custom lists:', err);
  }
  saveCustomLists(tenantId, DEFAULT_CUSTOM_LISTS);
  return DEFAULT_CUSTOM_LISTS;
}

export function saveCustomLists(tenantId: string | undefined, lists: ToDoCustomList[]): void {
  const key = `tejo_todo_custom_lists_${tenantId || 'global'}`;
  try {
    localStorage.setItem(key, JSON.stringify(lists));
  } catch (err) {
    console.error('Failed to save custom lists:', err);
  }
}

export function addCustomList(tenantId: string | undefined, name: string, icon = '📋', color = '#2563eb'): ToDoCustomList {
  const current = getCustomLists(tenantId);
  const newList: ToDoCustomList = {
    id: `list_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    icon,
    color,
    createdAt: new Date().toISOString(),
  };
  const updated = [...current, newList];
  saveCustomLists(tenantId, updated);
  return newList;
}

export function deleteCustomList(tenantId: string | undefined, listId: string): ToDoCustomList[] {
  const current = getCustomLists(tenantId);
  const updated = current.filter((l) => l.id !== listId);
  saveCustomLists(tenantId, updated);
  return updated;
}

/**
 * Enriches a standard Supabase task with Microsoft To Do calculated fields & metadata
 */
export function enrichTask(
  task: Task & { customer?: Customer; assigned_to_profile?: Profile; assigned_by_profile?: Profile }
): EnrichedTask {
  const { cleanRemarks, meta } = extractTaskMetadata(task.remarks, task.id);
  const todayStr = getTodayDateString();
  const tomorrowStr = getTomorrowDateString();

  const isImportant = Boolean(
    meta.is_important || task.priority === 'urgent' || task.priority === 'high'
  );

  const isDueToday = Boolean(task.due_date && task.due_date.slice(0, 10) === todayStr);
  const isDueTomorrow = Boolean(task.due_date && task.due_date.slice(0, 10) === tomorrowStr);
  const isOverdue = Boolean(
    task.due_date && task.due_date.slice(0, 10) < todayStr && task.status !== 'completed'
  );

  const isMyDay = Boolean(meta.my_day_date === todayStr || isDueToday);

  const steps = meta.steps || [];
  const completedStepsCount = steps.filter((s) => s.completed).length;
  const totalStepsCount = steps.length;

  return {
    ...task,
    meta,
    cleanRemarks,
    isImportant,
    isMyDay,
    completedStepsCount,
    totalStepsCount,
    isOverdue,
    isDueToday,
    isDueTomorrow,
  };
}

/**
 * Soft pleasant chime using Web Audio API (like Microsoft To Do completion sound)
 */
export function playCompletionSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    // Pleasant high melodic ping: 587.33Hz (D5) -> 880Hz (A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Audio context may be restricted before user gesture
  }
}
