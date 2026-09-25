import { useState, useEffect } from 'react';
import { X, MessageCircle, Paperclip, Plus, Loader2, FolderOpen, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomerNotes, createCustomerNote, deleteCustomerNote } from '../../lib/notesApi';
import { supabase, Customer, CustomerNote, NoteType } from '../../lib/supabase';
import { buildEmbedUrl, buildDriveUrl } from '../../lib/googleDrive';
import AddNoteForm from '../Notes/AddNoteForm';
import NotesList from '../Notes/NotesList';
import QuickDocumentUpload from '../Documents/QuickDocumentUpload';
import CustomerDocuments from '../Documents/CustomerDocuments';

interface CustomerQuickViewModalProps {
  customer: Customer;
  onClose: () => void;
  initialTab?: 'notes' | 'documents' | 'drive';
  onNotesCountChange?: (customerId: string, count: number) => void;
  onDocumentsCountChange?: (customerId: string, count: number) => void;
}

export default function CustomerQuickViewModal({
  customer,
  onClose,
  initialTab = 'notes',
  onNotesCountChange,
  onDocumentsCountChange,
}: CustomerQuickViewModalProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'documents' | 'drive'>(initialTab);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [gdriveFolderUrl, setGdriveFolderUrl] = useState<string | null>(null);
  const [mainFolderUrl, setMainFolderUrl] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const canViewDrive = profile?.role === 'admin' || profile?.role === 'employee';

  useEffect(() => {
    loadNotes();
    loadDocumentsCount();
    loadGdriveInfo();
  }, [customer.id]);

  const loadGdriveInfo = async () => {
    try {
      const { data: cust } = await supabase
        .from('customers')
        .select('gdrive_folder_url')
        .eq('id', customer.id)
        .maybeSingle();
      setGdriveFolderUrl(cust?.gdrive_folder_url || null);

      if (profile?.tenant_id) {
        const { data: settings } = await supabase
          .from('company_settings')
          .select('gdrive_customers_folder_url')
          .eq('tenant_id', profile.tenant_id)
          .maybeSingle();
        setMainFolderUrl(settings?.gdrive_customers_folder_url || null);
      }
    } catch (err) {
      console.error('Error loading drive info:', err);
    }
  };

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getCustomerNotes(customer.id);
      setNotes(data);
      onNotesCountChange?.(customer.id, data.length);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('customer_documents')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .eq('processing_status', 'extracted');

      if (error) throw error;
      setDocumentsCount(count || 0);
      onDocumentsCountChange?.(customer.id, count || 0);
    } catch (error) {
      console.error('Error loading documents count:', error);
    }
  };

  const handleAddNote = async (
    noteText: string,
    noteType: NoteType,
    isPinned: boolean,
    isPrivate: boolean,
    language: string
  ) => {
    if (!user || !profile?.tenant_id) return;

    await createCustomerNote(customer.id, user.id, noteText, noteType, profile.tenant_id, isPinned, isPrivate, language);
    await loadNotes();
    setShowAddNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteCustomerNote(noteId);
    await loadNotes();
  };

  const handleDocumentUploadSuccess = () => {
    loadDocumentsCount();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{customer.customer_name}</h2>
            <p className="text-sm text-gray-600 mt-1">Quick View</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'notes'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Notes</span>
            {notes.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                {notes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Paperclip className="w-5 h-5" />
            <span>Documents</span>
            {documentsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                {documentsCount}
              </span>
            )}
          </button>
          {canViewDrive && (
            <button
              onClick={() => setActiveTab('drive')}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'drive'
                  ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span>Drive</span>
              {gdriveFolderUrl && (
                <span className="ml-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {!showAddNote && (
                <button
                  onClick={() => setShowAddNote(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Note
                </button>
              )}

              {showAddNote && (
                <AddNoteForm
                  onSubmit={handleAddNote}
                  onCancel={() => setShowAddNote(false)}
                />
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No notes yet</p>
                  <p className="text-sm text-gray-500 mt-1">Add your first note to start tracking conversations</p>
                </div>
              ) : (
                <NotesList
                  notes={notes}
                  onEdit={() => {}}
                  onDelete={handleDeleteNote}
                  loading={false}
                />
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <QuickDocumentUpload
                customerId={customer.id}
                onUploadSuccess={handleDocumentUploadSuccess}
              />

              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
                <CustomerDocuments
                  customerId={customer.id}
                  limit={50}
                  showViewAll={false}
                />
              </div>
            </div>
          )}

          {activeTab === 'drive' && canViewDrive && (
            <div className="space-y-4">
              {gdriveFolderUrl ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FolderOpen className="w-5 h-5 text-amber-600" />
                      <span>Google Drive folder for this customer</span>
                    </div>
                    <a
                      href={buildDriveUrl(gdriveFolderUrl) || gdriveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Drive
                    </a>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      src={buildEmbedUrl(gdriveFolderUrl) || ''}
                      className="w-full"
                      style={{ height: '500px' }}
                      title="Customer Drive folder"
                    />
                  </div>
                </>
              ) : mainFolderUrl ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      No individual folder linked for this customer. Showing the main Customers folder below.
                      An admin can map this customer's folder from Settings &gt; Drive Folder Mapping.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                      <span>Main Customers folder</span>
                    </div>
                    <a
                      href={buildDriveUrl(mainFolderUrl) || mainFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in Drive
                    </a>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      src={buildEmbedUrl(mainFolderUrl) || ''}
                      className="w-full"
                      style={{ height: '500px' }}
                      title="Main Customers folder"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No Drive folder linked yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    An admin needs to configure the main Customers folder in Organization Settings
                    and map this customer's folder from Settings &gt; Drive Folder Mapping.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
