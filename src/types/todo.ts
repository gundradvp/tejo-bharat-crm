import { Task, Customer, Profile } from '../lib/supabase';

export interface ToDoStep {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
}

export type ToDoListType =
  | 'my_day'
  | 'important'
  | 'planned'
  | 'assigned_to_me'
  | 'all_tasks'
  | 'document_collection'
  | 'eb_change'
  | 'follow_up'
  | 'installation'
  | 'verification'
  | 'other'
  | 'custom';

export interface ToDoCustomList {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  createdAt: string;
}

export interface ToDoMetadata {
  is_important?: boolean;
  my_day_date?: string | null; // ISO Date "YYYY-MM-DD"
  steps?: ToDoStep[];
  repeat?: 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'none';
  custom_list_id?: string;
  notes?: string;
}

export type EnrichedTask = Task & {
  customer?: Customer;
  assigned_to_profile?: Profile;
  assigned_by_profile?: Profile;
  meta: ToDoMetadata;
  cleanRemarks: string;
  isImportant: boolean;
  isMyDay: boolean;
  completedStepsCount: number;
  totalStepsCount: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
};

export type ToDoSortOption = 'importance' | 'due_date' | 'alphabetical' | 'created_at' | 'completed';
export type ToDoViewMode = 'todo' | 'classic' | 'kanban';
