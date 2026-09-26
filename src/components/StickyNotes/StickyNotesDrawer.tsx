import React, { useState, useEffect, useMemo } from 'react';
import {
  StickyNote as StickyNoteIcon,
  Plus,
  Trash2,
  Pin,
  Copy,
  Check,
  Search,
  X,
  Sparkles,
  Tag,
  Maximize2,
  Minimize2,
  Clock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserActivity } from '../../contexts/UserActivityContext';
import { StickyNote, StickyNoteColor, STICKY_COLOR_SCHEMES } from '../../types/stickyNotes';
import {
  getUserStickyNotes,
  upsertUserStickyNote,
  deleteUserStickyNote,
  togglePinUserStickyNote,
} from '../../lib/stickyNotesStorage';

export default function StickyNotesDrawer() {
  const { profile, user } = useAuth();
  const { isStickyNotesOpen, closeStickyNotes, toggleStickyNotes, logActivity } = useUserActivity();

  const userId = profile?.id || user?.id || '00000000-0000-0000-0000-000000000001';
  const userName = profile?.full_name || 'Durga Rao';

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<'all' | StickyNoteColor>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // New Note Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState<StickyNoteColor>('yellow');
  const [newTagsInput, setNewTagsInput] = useState('');

  // Copy Feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load user notes
  useEffect(() => {
    if (userId) {
      setNotes(getUserStickyNotes(userId, userName));
    }
  }, [userId, userName]);

  // Handle 1-Click Copy
  const handleCopyText = (text: string, identifier: string, label: string = 'Note') => {
    if (!text) return;
    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopiedId(identifier);
      logActivity('sticky_note', `Copied ${label}: "${text.slice(0, 30)}..."`);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    });
  };

  // Add Note
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const tags = newTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const newNote: StickyNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      userName,
      title: newTitle.trim() || 'Quick Note',
      content: newContent.trim(),
      color: newColor,
      isPinned: false,
      tags: tags.length > 0 ? tags : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = upsertUserStickyNote(userId, newNote);
    setNotes(updated);
    logActivity('sticky_note', `Created sticky note "${newNote.title}"`);

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setNewTagsInput('');
    setIsAddingNew(false);
  };

  const handleDelete = (noteId: string, title: string) => {
    if (window.confirm(`Delete sticky note "${title}"?`)) {
      const updated = deleteUserStickyNote(userId, noteId);
      setNotes(updated);
      logActivity('sticky_note', `Deleted sticky note "${title}"`);
    }
  };

  const handleTogglePin = (noteId: string) => {
    const updated = togglePinUserStickyNote(userId, noteId);
    setNotes(updated);
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        !searchQuery ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchColor = selectedColorFilter === 'all' || n.color === selectedColorFilter;

      return matchSearch && matchColor;
    });
  }, [notes, searchQuery, selectedColorFilter]);

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      <button
        type="button"
        onClick={toggleStickyNotes}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-amber-300 cursor-pointer"
        title="Open Personal Sticky Notes (Click to toggle)"
      >
        <StickyNoteIcon className="w-4 h-4 fill-amber-300 text-amber-900" />
        <span className="hidden sm:inline font-semibold">Sticky Notes</span>
        <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded-full text-[10px] font-bold">
          {notes.length}
        </span>
      </button>

      {/* Slide-over Drawer / Panel */}
      {isStickyNotesOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeStickyNotes}
          />

          {/* Drawer Content */}
          <div
            className={`relative w-full ${
              isExpanded ? 'max-w-3xl' : 'max-w-md'
            } bg-gray-50 h-full shadow-2xl flex flex-col z-10 transition-all duration-300 border-l border-gray-200`}
          >
            {/* Drawer Header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shadow-2xs">
                  <StickyNoteIcon className="w-4 h-4 fill-amber-300" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    Personal Sticky Notes
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                      User: {userName.split(' ')[0]}
                    </span>
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Quick reminders, phone numbers & 1-click copy items
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={closeStickyNotes}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Close Sticky Notes"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-bar: Search, Color Filters & "Add Note" Button */}
            <div className="p-3 bg-white/80 border-b border-gray-200 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notes, phone numbers, scripts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingNew(!isAddingNew)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingNew ? 'Cancel' : 'New Note'}
                </button>
              </div>

              {/* Color filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
                <span className="text-[10px] text-gray-400 font-semibold mr-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-gray-500" /> Color:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedColorFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    selectedColorFilter === 'all'
                      ? 'bg-gray-800 text-white shadow-2xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({notes.length})
                </button>
                {(['yellow', 'green', 'blue', 'purple', 'rose', 'amber'] as StickyNoteColor[]).map((c) => {
                  const count = notes.filter((n) => n.color === c).length;
                  if (count === 0 && selectedColorFilter !== c) return null;
                  const scheme = STICKY_COLOR_SCHEMES[c];
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColorFilter(c)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                        selectedColorFilter === c
                          ? `${scheme.badge} ring-1 ring-black/20`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${scheme.bg} border ${scheme.border}`} />
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Note Form */}
            {isAddingNew && (
              <form onSubmit={handleCreateNote} className="p-4 bg-white border-b border-amber-200 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Create Personal Note
                  </h3>
                  {/* Color Selector */}
                  <div className="flex items-center gap-1">
                    {(['yellow', 'green', 'blue', 'purple', 'rose', 'amber'] as StickyNoteColor[]).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewColor(col)}
                        className={`w-5 h-5 rounded-full border transition-transform ${
                          STICKY_COLOR_SCHEMES[col].bg
                        } ${STICKY_COLOR_SCHEMES[col].border} ${
                          newColor === col ? 'scale-125 ring-2 ring-amber-500 shadow-xs' : 'hover:scale-110'
                        }`}
                        title={col}
                      />
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Note Title (e.g. Follow-Up Numbers, WhatsApp Pitch)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />

                <textarea
                  rows={4}
                  required
                  placeholder="Note Content (each line can be copied separately with 1 click!)..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />

                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Tags separated by comma (e.g. Leads, 3kW, Followup)"
                    value={newTagsInput}
                    onChange={(e) => setNewTagsInput(e.target.value)}
                    className="flex-1 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Save Note
                  </button>
                </div>
              </form>
            )}

            {/* Sticky Notes Grid / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {filteredNotes.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <StickyNoteIcon className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-xs font-semibold text-gray-600">
                    {searchQuery ? 'No notes matching search.' : 'No sticky notes yet.'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Click "New Note" to save personal reminders, customer phones, or WhatsApp scripts.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold border border-amber-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Your First Note
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const scheme = STICKY_COLOR_SCHEMES[note.color] || STICKY_COLOR_SCHEMES.yellow;
                  const isNoteCopied = copiedId === note.id;

                  // Parse lines to provide individual item 1-click copy
                  const lines = note.content
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);

                  return (
                    <div
                      key={note.id}
                      className={`rounded-xl border ${scheme.border} ${scheme.bg} shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col`}
                    >
                      {/* Note Header */}
                      <div
                        className={`px-3 py-2 border-b ${scheme.border} ${scheme.header} flex items-center justify-between gap-2`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {note.isPinned && (
                            <Pin className="w-3 h-3 text-amber-700 fill-amber-600 flex-shrink-0" />
                          )}
                          <h4 className="text-xs font-bold text-gray-900 truncate">
                            {note.title}
                          </h4>
                        </div>

                        {/* Top Action Buttons: Copy All, Pin, Delete */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyText(note.content, note.id, note.title)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isNoteCopied
                                ? 'bg-emerald-600 text-white'
                                : `${scheme.btnHover} bg-white/70 shadow-2xs`
                            }`}
                            title="Copy entire note content to clipboard"
                          >
                            {isNoteCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Note
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePin(note.id)}
                            className={`p-1 rounded hover:bg-black/10 transition-colors ${
                              note.isPinned ? 'text-amber-800' : 'text-gray-400'
                            }`}
                            title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-amber-600' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(note.id, note.title)}
                            className="p-1 rounded text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Note Items (Each Line has its own 1-click Copy button) */}
                      <div className="p-3 space-y-1.5 text-xs text-gray-800">
                        {lines.map((line, idx) => {
                          const lineId = `${note.id}_line_${idx}`;
                          const isLineCopied = copiedId === lineId;

                          return (
                            <div
                              key={idx}
                              className={`group flex items-start justify-between gap-2 p-1.5 rounded-lg transition-colors ${scheme.itemBg}`}
                            >
                              <span className="flex-1 whitespace-pre-wrap font-sans text-xs leading-relaxed select-text">
                                {line}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleCopyText(line, lineId, 'Item')}
                                className={`opacity-80 group-hover:opacity-100 flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                  isLineCopied
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white/80 hover:bg-white text-gray-700 shadow-2xs border border-gray-200/50'
                                }`}
                                title="1-Click copy this item"
                              >
                                {isLineCopied ? (
                                  <>
                                    <Check className="w-2.5 h-2.5" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-2.5 h-2.5 text-gray-500" />
                                    <span className="hidden group-hover:inline">Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Note Footer: Tags & Time */}
                      <div className="px-3 py-1.5 bg-black/3 border-t border-black/5 flex items-center justify-between text-[10px] text-gray-500">
                        <div className="flex items-center gap-1 flex-wrap">
                          {note.tags &&
                            note.tags.map((tg, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.2 rounded bg-white/70 text-gray-600 font-medium text-[9px] border border-gray-200/40"
                              >
                                #{tg}
                              </span>
                            ))}
                        </div>
                        <span className="flex items-center gap-1 text-[9px] text-gray-400 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(note.updatedAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-3 bg-white border-t border-gray-200 text-center text-[11px] text-gray-500 flex items-center justify-between">
              <span>{notes.length} total personal notes</span>
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="text-amber-700 font-bold hover:underline cursor-pointer"
              >
                + Add another note
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
