import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Download, Trash2, Loader2, AlertCircle, CheckCircle, FileText, Filter } from 'lucide-react';

interface Document {
  id: string;
  document_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  processing_status: 'pending_extraction' | 'extracted' | 'matched' | 'unmatched' | 'error';
  customer_id?: string;
  uploaded_by: string;
  match_confidence: number;
  customers?: { customer_name: string };
  profiles?: { full_name: string };
}

export default function DocumentManagementDashboard() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDocuments();
    }
  }, [profile]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('customer_documents')
        .select('*, customers(customer_name), profiles(full_name)')
        .order('upload_date', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;
      setDocuments((data as Document[]) || []);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.customers?.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || doc.processing_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'unmatched':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending_extraction':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'bg-green-50 text-green-700';
      case 'unmatched':
        return 'bg-orange-50 text-orange-700';
      case 'error':
        return 'bg-red-50 text-red-700';
      case 'pending_extraction':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const statusStats = {
    matched: documents.filter(d => d.processing_status === 'matched').length,
    unmatched: documents.filter(d => d.processing_status === 'unmatched').length,
    error: documents.filter(d => d.processing_status === 'error').length,
    pending: documents.filter(d => d.processing_status === 'pending_extraction').length,
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">You don't have permission to access this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
        <p className="text-gray-600 mt-1">Manage all uploaded documents and their customer matches</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Matched</p>
          <p className="text-2xl font-bold text-green-600">{statusStats.matched}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Unmatched</p>
          <p className="text-2xl font-bold text-orange-600">{statusStats.unmatched}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{statusStats.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Errors</p>
          <p className="text-2xl font-bold text-red-600">{statusStats.error}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center gap-2"
          >
            <option value="all">All Status</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="pending_extraction">Pending</option>
            <option value="error">Errors</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center p-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No documents found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Document</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Uploaded By</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Confidence</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a
                        href="#"
                        className="text-blue-600 hover:underline truncate max-w-xs inline-block"
                        title={doc.document_name}
                      >
                        {doc.document_name}
                      </a>
                      <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {doc.customers?.customer_name ? (
                        <span className="text-gray-900">{doc.customers.customer_name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Not matched</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{doc.profiles?.full_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          doc.processing_status
                        )}`}
                      >
                        {getStatusIcon(doc.processing_status)}
                        {doc.processing_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900 font-medium">{Math.round(doc.match_confidence)}%</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {formatDate(doc.upload_date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloading === doc.id}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-50"
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
