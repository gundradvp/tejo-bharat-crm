import { useState } from 'react';
import { Edit2, Trash2, Pin, Lock, MessageCircle, Clock, Phone, Users, Mail, AlertCircle, CheckCircle, FileText, Languages } from 'lucide-react';
import type { CustomerNote } from '../../lib/supabase';
import { formatRelativeTime, getNoteTypeConfig } from '../../lib/notesApi';
import { useAuth } from '../../contexts/AuthContext';

interface NotesListProps {
  notes: CustomerNote[];
  onEdit: (note: CustomerNote) => void;
  onDelete: (noteId: string) => void;
  loading?: boolean;
}

const noteTypeIcons = {
  MessageCircle,
  Clock,
  Phone,
  Users,
  Mail,
  AlertCircle,
  CheckCircle,
  FileText,
};

export default function NotesList({ notes, onEdit, onDelete, loading }: NotesListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canEdit = (note: CustomerNote) => {
    if (isAdmin()) return true;
    if (note.user_id !== user?.id) return false;

    const createdAt = new Date(note.created_at);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation < 24;
  };

  const canDelete = (note: CustomerNote) => {
    return isAdmin() || note.user_id === user?.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No notes yet</p>
        <p className="text-sm text-gray-500 mt-1">Add your first note to get started</p>
      </div>
    );
  }

  const pinnedNotes = notes.filter(note => note.is_pinned);
  const regularNotes = notes.filter(note => !note.is_pinned);

  return (
    <div className="space-y-4">
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Pin className="w-4 h-4 text-yellow-600" />
            Pinned Notes
          </h4>
          {pinnedNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEdit(note)}
              canDelete={canDelete(note)}
              onEdit={() => onEdit(note)}
              onDelete={() => {
                if (deleteConfirm === note.id) {
                  onDelete(note.id);
                  setDeleteConfirm(null);
                } else {
                  setDeleteConfirm(note.id);
                }
              }}
              deleteConfirm={deleteConfirm === note.id}
              onCancelDelete={() => setDeleteConfirm(null)}
              getInitials={getInitials}
            />
          ))}
        </div>
      )}

      {regularNotes.length > 0 && (
        <div className="space-y-3">
          {pinnedNotes.length > 0 && (
            <h4 className="text-sm font-semibold text-gray-700">All Notes</h4>
          )}
          {regularNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              canEdit={canEdit(note)}
              canDelete={canDelete(note)}
              onEdit={() => onEdit(note)}
              onDelete={() => {
                if (deleteConfirm === note.id) {
                  onDelete(note.id);
                  setDeleteConfirm(null);
                } else {
                  setDeleteConfirm(note.id);
                }
              }}
              deleteConfirm={deleteConfirm === note.id}
              onCancelDelete={() => setDeleteConfirm(null)}
              getInitials={getInitials}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NoteCardProps {
  note: CustomerNote;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onCancelDelete: () => void;
  getInitials: (name: string) => string;
}

function NoteCard({
  note,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  deleteConfirm,
  onCancelDelete,
  getInitials,
}: NoteCardProps) {
  const config = getNoteTypeConfig(note.note_type);
  const IconComponent = noteTypeIcons[config.icon as keyof typeof noteTypeIcons];
  const language = (note.metadata as any)?.language || 'english';
  const languageLabel = language === 'telugu' ? 'తెలుగు' : 'EN';

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${note.is_pinned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
            {note.profiles?.full_name ? getInitials(note.profiles.full_name) : '??'}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">
                {note.profiles?.full_name || 'Unknown User'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <IconComponent className="w-3 h-3" />
                {config.label}
              </span>
              {note.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Pin className="w-3 h-3" />
                  Pinned
                </span>
              )}
              {note.is_private && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${language === 'telugu' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                <Languages className="w-3 h-3" />
                {languageLabel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit note"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={onDelete}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p className="text-gray-700 whitespace-pre-wrap mb-2">{note.note_text}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatRelativeTime(note.created_at)}
              {note.updated_at !== note.created_at && ' (edited)'}
            </span>
          </div>

          {deleteConfirm && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this note?</p>
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={onCancelDelete}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
