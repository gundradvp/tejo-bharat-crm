import { useState } from 'react';
import { X, Loader2, Pin, Lock, Languages } from 'lucide-react';
import type { NoteType } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddNoteFormProps {
  onSubmit: (noteText: string, noteType: NoteType, isPinned: boolean, isPrivate: boolean, language: string) => Promise<void>;
  onCancel: () => void;
}

export default function AddNoteForm({ onSubmit, onCancel }: AddNoteFormProps) {
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('general');
  const [language, setLanguage] = useState<'english' | 'telugu'>('english');
  const [isPinned, setIsPinned] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (noteText.trim().length < 5) {
      setError('Note must be at least 5 characters long');
      return;
    }

    if (noteText.length > 2000) {
      setError('Note cannot exceed 2000 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(noteText, noteType, isPinned, isPrivate, language);
      setNoteText('');
      setNoteType('general');
      setLanguage('english');
      setIsPinned(false);
      setIsPrivate(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const characterCount = noteText.length;
  const characterLimit = 2000;

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Add New Note</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="noteType" className="block text-sm font-medium text-gray-700 mb-2">
              Note Type
            </label>
            <select
              id="noteType"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="general">General</option>
              <option value="follow_up">Follow-up</option>
              <option value="phone_call">Phone Call</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="issue">Issue</option>
              <option value="resolution">Resolution</option>
              <option value="document">Document</option>
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Languages className="w-4 h-4" />
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'english' | 'telugu')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="english">English</option>
              <option value="telugu">తెలుగు (Telugu)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="noteText" className="block text-sm font-medium text-gray-700 mb-2">
            Note Content
          </label>
          <textarea
            id="noteText"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Enter your note here..."
            autoFocus
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${characterCount > characterLimit ? 'text-red-600' : 'text-gray-500'}`}>
              {characterCount} / {characterLimit}
            </span>
            {characterCount >= 5 && characterCount <= characterLimit && (
              <span className="text-xs text-green-600">✓ Valid length</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Pin className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">Pin this note</span>
          </label>

          {isAdmin() && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Lock className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">Private (Admin only)</span>
            </label>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || noteText.length < 5 || noteText.length > characterLimit}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Note'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
