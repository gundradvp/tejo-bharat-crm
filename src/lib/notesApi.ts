import { supabase } from './supabase';
import type { CustomerNote, TaskNote, ActivityLog, NoteType } from './supabase';

export async function getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
  const { data, error } = await supabase
    .from('customer_notes')
    .select('*, profiles(id, full_name, email)')
    .eq('customer_id', customerId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createCustomerNote(
  customerId: string,
  userId: string,
  noteText: string,
  noteType: NoteType,
  tenantId: string,
  isPinned: boolean = false,
  isPrivate: boolean = false,
  language: string = 'english'
): Promise<CustomerNote> {
  const { data, error } = await supabase
    .from('customer_notes')
    .insert({
      customer_id: customerId,
      user_id: userId,
      note_text: noteText,
      note_type: noteType,
      tenant_id: tenantId,
      is_pinned: isPinned,
      is_private: isPrivate,
      metadata: { language },
    })
    .select('*, profiles(id, full_name, email)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomerNote(
  noteId: string,
  updates: {
    note_text?: string;
    note_type?: NoteType;
    is_pinned?: boolean;
    is_private?: boolean;
  }
): Promise<CustomerNote> {
  const { data, error } = await supabase
    .from('customer_notes')
    .update(updates)
    .eq('id', noteId)
    .select('*, profiles(id, full_name, email)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomerNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('customer_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}

export async function getTaskNotes(taskId: string): Promise<TaskNote[]> {
  const { data, error } = await supabase
    .from('task_notes')
    .select('*, profiles(id, full_name, email)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTaskNote(
  taskId: string,
  userId: string,
  noteText: string,
  noteType: NoteType
): Promise<TaskNote> {
  const { data, error } = await supabase
    .from('task_notes')
    .insert({
      task_id: taskId,
      user_id: userId,
      note_text: noteText,
      note_type: noteType,
    })
    .select('*, profiles(id, full_name, email)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTaskNote(
  noteId: string,
  updates: {
    note_text?: string;
    note_type?: NoteType;
  }
): Promise<TaskNote> {
  const { data, error } = await supabase
    .from('task_notes')
    .update(updates)
    .eq('id', noteId)
    .select('*, profiles(id, full_name, email)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTaskNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('task_notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}

export async function getActivityLogs(
  entityType: 'customer' | 'task',
  entityId: string,
  limit: number = 50
): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*, profiles(id, full_name, email)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function searchCustomerNotes(
  customerId: string,
  searchTerm: string
): Promise<CustomerNote[]> {
  const { data, error } = await supabase
    .from('customer_notes')
    .select('*, profiles(id, full_name, email)')
    .eq('customer_id', customerId)
    .ilike('note_text', `%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export function getNoteTypeConfig(noteType: NoteType) {
  const configs = {
    general: { label: 'General', color: 'bg-blue-100 text-blue-800', icon: 'MessageCircle' },
    follow_up: { label: 'Follow-up', color: 'bg-orange-100 text-orange-800', icon: 'Clock' },
    phone_call: { label: 'Phone Call', color: 'bg-green-100 text-green-800', icon: 'Phone' },
    meeting: { label: 'Meeting', color: 'bg-teal-100 text-teal-800', icon: 'Users' },
    email: { label: 'Email', color: 'bg-gray-100 text-gray-800', icon: 'Mail' },
    issue: { label: 'Issue', color: 'bg-red-100 text-red-800', icon: 'AlertCircle' },
    resolution: { label: 'Resolution', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' },
    document: { label: 'Document', color: 'bg-purple-100 text-purple-800', icon: 'FileText' },
  };

  return configs[noteType];
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
