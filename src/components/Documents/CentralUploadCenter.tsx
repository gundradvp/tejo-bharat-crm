import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2, HardDrive } from 'lucide-react';
import { extractDocumentData } from '../../lib/documentExtractor';
import { matchDocumentToCustomer, findAllMatches, MatchResult } from '../../lib/documentMatchingService';

interface UploadState {
  file: File | null;
  extractedText: string;
  isExtracting: boolean;
  extractError: string | null;
  matchResults: MatchResult[];
  selectedMatch: MatchResult | null;
  isUploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  bucketReady: boolean | null;
}

export default function CentralUploadCenter() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    file: null,
    extractedText: '',
    isExtracting: false,
    extractError: null,
    matchResults: [],
    selectedMatch: null,
    isUploading: false,
    uploadError: null,
    uploadSuccess: false,
    bucketReady: null,
  });

  useEffect(() => {
    const checkBucket = async () => {
      try {
        await supabase.storage.from('documents-central').list('', { limit: 1 });
        setState(prev => ({ ...prev, bucketReady: true }));
      } catch (error) {
        setState(prev => ({ ...prev, bucketReady: false }));
      }
    };

    checkBucket();

    const interval = setInterval(checkBucket, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setState(prev => ({ ...prev, uploadError: 'File size must be less than 25MB' }));
      return;
    }

    setState(prev => ({
      ...prev,
      file,
      isExtracting: true,
      extractError: null,
      uploadError: null,
      uploadSuccess: false,
    }));

    try {
      const extractedData = await extractDocumentData(file);

      const bestMatch = await matchDocumentToCustomer(extractedData);
      const allMatches = await findAllMatches(extractedData);

      setState(prev => ({
        ...prev,
        extractedText: extractedData.fullText,
        isExtracting: false,
        matchResults: allMatches,
        selectedMatch: bestMatch,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isExtracting: false,
        extractError: error.message || 'Failed to extract document content',
      }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = {
        target: { files: [file] },
      } as any;
      handleFileSelect(event);
    }
  };

  const handleUpload = async () => {
    if (!state.file || !profile) return;

    if (!state.selectedMatch) {
      setState(prev => ({
        ...prev,
        uploadError: 'Please select a customer to link this document',
      }));
      return;
    }

    setState(prev => ({ ...prev, isUploading: true, uploadError: null }));

    try {
      const now = new Date();
      const timestamp = now.getTime();
      const fileExt = state.file.name.split('.').pop();
      const fileName = `${timestamp}_${state.file.name}`;
      const filePath = `${profile.id}/${state.selectedMatch.customerId}/${fileName}`;

      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'documents-central');

        if (!bucketExists) {
          throw new Error('Documents storage bucket is not initialized. Please contact administrator.');
        }
      } catch (bucketError: any) {
        if (bucketError.message.includes('not initialized')) {
          throw bucketError;
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('documents-central')
        .upload(filePath, state.file);

      if (uploadError) throw uploadError;

      const { data: docData, error: docError } = await supabase
        .from('customer_documents')
        .insert({
          document_name: state.file.name,
          file_path: filePath,
          file_type: state.file.type || fileExt || 'unknown',
          file_size: state.file.size,
          extracted_text: state.extractedText,
          customer_id: state.selectedMatch.customerId,
          uploaded_by: profile.id,
          processing_status: 'extracted',
          match_confidence: state.selectedMatch.confidence,
        })
        .select()
        .single();

      if (docError) throw docError;

      if (docData) {
        const { error: logError } = await supabase
          .from('document_matching_logs')
          .insert({
            document_id: docData.id,
            matched_customer_id: state.selectedMatch.customerId,
            confidence_score: state.selectedMatch.confidence,
            matching_fields: {
              matched_fields: state.selectedMatch.matchedFields,
              phone: state.selectedMatch.phone,
            },
            manual_override: false,
          });

        if (logError) console.error('Error logging match:', logError);
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadSuccess: true,
        file: null,
        extractedText: '',
        matchResults: [],
        selectedMatch: null,
      }));

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          uploadSuccess: false,
        }));
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadError: error.message || 'Failed to upload document',
      }));
    }
  };

  const handleClear = () => {
    setState(prev => ({
      ...prev,
      file: null,
      extractedText: '',
      isExtracting: false,
      extractError: null,
      matchResults: [],
      selectedMatch: null,
      isUploading: false,
      uploadError: null,
      uploadSuccess: false,
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Document Upload Center</h1>
        </div>

        {state.bucketReady === false && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">Initializing Storage</p>
              <p className="text-yellow-800 text-sm">Setting up document storage. This will be ready in a moment...</p>
            </div>
          </div>
        )}

        {state.uploadSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-900">Document uploaded successfully</p>
              <p className="text-green-800 text-sm">
                Your document has been linked to {state.selectedMatch?.customerName}
              </p>
            </div>
          </div>
        )}

        {state.uploadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Upload Error</p>
              <p className="text-red-800 text-sm">{state.uploadError}</p>
            </div>
          </div>
        )}

        {state.extractError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Extraction Error</p>
              <p className="text-red-800 text-sm">{state.extractError}</p>
            </div>
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50 cursor-pointer hover:border-blue-500 hover:bg-blue-100 transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          />

          {!state.file ? (
            <div onClick={() => fileInputRef.current?.click()}>
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-1">
                Drag and drop your document here
              </p>
              <p className="text-gray-600 mb-3">or click to select a file</p>
              <p className="text-sm text-gray-500">
                Supported formats: PDF, JPG, PNG, DOCX, XLSX (Max 25MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.isExtracting && (
                <div className="flex items-center justify-center gap-3 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing document...</span>
                </div>
              )}

              {!state.isExtracting && state.matchResults.length > 0 && (
                <div className="space-y-4">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      File: {state.file.name}
                    </p>

                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Document Preview:
                      </p>
                      <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto text-left text-xs text-gray-600 font-mono">
                        {state.extractedText.substring(0, 500)}
                        {state.extractedText.length > 500 && '...'}
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Possible Customers:
                    </p>
                    <div className="space-y-2">
                      {state.matchResults.map((match, index) => (
                        <button
                          key={match.customerId}
                          onClick={() => setState(prev => ({ ...prev, selectedMatch: match }))}
                          className={`w-full text-left p-3 rounded-lg border-2 transition ${
                            state.selectedMatch?.customerId === match.customerId
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {match.customerName}
                              </p>
                              <p className="text-sm text-gray-600">{match.phone}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Matched on: {match.matchedFields.join(', ')}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                                match.confidence >= 80
                                  ? 'bg-green-100 text-green-700'
                                  : match.confidence >= 50
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {Math.round(match.confidence)}% match
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleClear}
                      disabled={state.isUploading}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={!state.selectedMatch || state.isUploading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {state.isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload & Link Document
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
