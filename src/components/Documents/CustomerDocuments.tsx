import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Trash2, FileText, Loader2, Eye } from 'lucide-react';
import QuickDocumentUpload from './QuickDocumentUpload';

interface Document {
  id: string;
  document_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  processing_status: string;
  uploaded_by: string;
  customer_id: string;
}

interface CustomerDocumentsProps {
  customerId: string;
  limit?: number;
  showViewAll?: boolean;
}

export default function CustomerDocuments({
  customerId,
  limit = 5,
  showViewAll = true,
}: CustomerDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [customerId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .eq('processing_status', 'extracted')
        .order('upload_date', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      setDownloading(doc.id);

      const { data, error: downloadError } = await supabase.storage
        .from('documents-central')
        .download(doc.file_path);

      if (downloadError) throw downloadError;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading document:', err);
      alert('Failed to download document');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents-central')
        .remove([doc.file_path]);

      if (storageError) console.error('Storage delete error:', storageError);

      const { error: dbError } = await supabase
        .from('customer_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    return '📎';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
        {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">No documents uploaded yet</p>
        </div>
        {showViewAll && <QuickDocumentUpload customerId={customerId} onUploadSuccess={fetchDocuments} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showViewAll && <QuickDocumentUpload customerId={customerId} onUploadSuccess={fetchDocuments} />}
      {documents.map(doc => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{getFileIcon(doc.file_type)}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.document_name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(doc.file_size)} • {formatDate(doc.upload_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <button
              onClick={() => handleDownload(doc)}
              disabled={downloading === doc.id}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
              title="Download"
            >
              {downloading === doc.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => handleDelete(doc)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {showViewAll && documents.length >= limit && (
        <button className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition">
          View all documents
        </button>
      )}
    </div>
  );
}
