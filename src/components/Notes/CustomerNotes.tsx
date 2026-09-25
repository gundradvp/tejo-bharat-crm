import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import AddNoteForm from './AddNoteForm';
import NotesList from './NotesList';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerNotes, createCustomerNote, updateCustomerNote, deleteCustomerNote } from '../../lib/notesApi';
import type { CustomerNote, NoteType } from '../../lib/supabase';

interface CustomerNotesProps {
  customerId: string;
}

export default function CustomerNotes({ customerId }: CustomerNotesProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<CustomerNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<CustomerNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');
  const { user, profile } = useAuth();

  useEffect(() => {
    loadNotes();
  }, [customerId]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm, filterType]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getCustomerNotes(customerId);
      setNotes(data);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];

    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.note_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(note => note.note_type === filterType);
    }

    setFilteredNotes(filtered);
  };

  const handleAddNote = async (
    noteText: string,
    noteType: NoteType,
    isPinned: boolean,
    isPrivate: boolean,
    language: string
  ) => {
    if (!user || !profile?.tenant_id) return;

    await createCustomerNote(customerId, user.id, noteText, noteType, profile.tenant_id, isPinned, isPrivate, language);
    await loadNotes();
    setShowAddForm(false);
  };

  const handleUpdateNote = async (
    noteText: string,
    noteType: NoteType,
    isPinned: boolean,
    isPrivate: boolean,
    language: string
  ) => {
    if (!editingNote) return;

    await updateCustomerNote(editingNote.id, {
      note_text: noteText,
      note_type: noteType,
      is_pinned: isPinned,
      is_private: isPrivate,
    });
    await loadNotes();
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteCustomerNote(noteId);
    await loadNotes();
  };

  const noteTypeCounts = notes.reduce((acc, note) => {
    acc[note.note_type] = (acc[note.note_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
          <p className="text-sm text-gray-600">Track conversations and updates</p>
        </div>
        {!showAddForm && !editingNote && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-11 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NoteType | 'all')}
            className="w-full sm:w-48 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Types ({notes.length})</option>
            <option value="general">General ({noteTypeCounts.general || 0})</option>
            <option value="follow_up">Follow-up ({noteTypeCounts.follow_up || 0})</option>
            <option value="phone_call">Phone Call ({noteTypeCounts.phone_call || 0})</option>
            <option value="meeting">Meeting ({noteTypeCounts.meeting || 0})</option>
            <option value="email">Email ({noteTypeCounts.email || 0})</option>
            <option value="issue">Issue ({noteTypeCounts.issue || 0})</option>
            <option value="resolution">Resolution ({noteTypeCounts.resolution || 0})</option>
            <option value="document">Document ({noteTypeCounts.document || 0})</option>
          </select>
        </div>
      </div>

      {(showAddForm || editingNote) && (
        <AddNoteForm
          onSubmit={editingNote ? handleUpdateNote : handleAddNote}
          onCancel={() => {
            setShowAddForm(false);
            setEditingNote(null);
          }}
        />
      )}

      <NotesList
        notes={filteredNotes}
        onEdit={setEditingNote}
        onDelete={handleDeleteNote}
        loading={loading}
      />

      {searchTerm && filteredNotes.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No notes found matching "{searchTerm}"
        </div>
      )}
    </div>
  );
}
