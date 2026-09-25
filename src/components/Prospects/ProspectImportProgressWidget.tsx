import { useProspectImport } from '../../contexts/ProspectImportContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, X, Upload, Phone, Users, Link2, AlertCircle } from 'lucide-react';

export default function ProspectImportProgressWidget() {
  const { activeJob, dismissJob } = useProspectImport();
  const navigate = useNavigate();

  if (!activeJob) return null;

  const isRunning = activeJob.status === 'running';
  const isCompleted = activeJob.status === 'completed';
  const isFailed = activeJob.status === 'failed';
  const pct = activeJob.total > 0 ? Math.min(100, Math.round((activeJob.current / activeJob.total) * 100)) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5">
      <div className={`px-4 py-3 flex items-center justify-between ${
        isRunning ? 'bg-blue-600' : isCompleted ? 'bg-green-600' : 'bg-red-600'
      }`}>
        <div className="flex items-center gap-2 text-white">
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : isCompleted ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {isRunning ? 'Importing Prospects...' : isCompleted ? 'Import Complete' : 'Import Failed'}
          </span>
        </div>
        {!isRunning && (
          <button onClick={() => dismissJob(activeJob.id)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="truncate">{activeJob.fileName}</span>
          <span className="font-medium text-gray-700">{activeJob.current} / {activeJob.total}</span>
        </div>

        {isRunning && (
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}

        {isCompleted && activeJob.result && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">New</p>
                <p className="font-bold text-gray-900">{activeJob.result.created}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-2 text-center">
                <AlertCircle className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Updated</p>
                <p className="font-bold text-gray-900">{activeJob.result.updated}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <Link2 className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Surya Ghar</p>
                <p className="font-bold text-gray-900">{activeJob.result.existingCustomerMatches}</p>
              </div>
            </div>
            {activeJob.result.errors.length > 0 && (
              <p className="text-xs text-red-600">{activeJob.result.errors.length} errors occurred</p>
            )}
            <button
              onClick={() => { navigate('/prospects'); dismissJob(activeJob.id); }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              View Prospects
            </button>
          </div>
        )}

        {isFailed && activeJob.result && (
          <div className="text-xs text-red-600 space-y-1">
            {activeJob.result.errors.slice(0, 3).map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}

        {isRunning && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Upload className="w-3 h-3" />
            You can navigate to other pages — import continues in background
          </p>
        )}
      </div>
    </div>
  );
}
