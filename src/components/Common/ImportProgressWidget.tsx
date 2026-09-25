import { useState } from 'react';
import { useImportProgress } from '../../contexts/ImportProgressContext';
import { CheckCircle, XCircle, Loader2, X, ChevronUp, ChevronDown, FileText } from 'lucide-react';

export default function ImportProgressWidget() {
  const { activeJob, dismissJob } = useImportProgress();
  const [expanded, setExpanded] = useState(true);
  const [minimized, setMinimized] = useState(false);

  if (!activeJob) return null;

  const isRunning = activeJob.status === 'running';
  const isCompleted = activeJob.status === 'completed';
  const isFailed = activeJob.status === 'failed';
  const canDismiss = !isRunning;

  const percent = activeJob.total > 0
    ? Math.min(100, Math.round((activeJob.current / activeJob.total) * 100))
    : 0;

  const handleDismiss = () => {
    if (canDismiss) dismissJob(activeJob.id);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 no-print" style={{ maxWidth: minimized ? 'auto' : '400px' }}>
      <div className="theme-card rounded-xl shadow-2xl border theme-card-border overflow-hidden" style={{ borderColor: 'var(--color-card-border)' }}>
        {/* Header bar */}
        <div
          className="px-4 py-3 flex items-center justify-between cursor-pointer"
          style={{
            backgroundColor: isRunning ? 'var(--color-primary-light)' : isFailed ? '#fee2e2' : '#dcfce7',
          }}
          onClick={() => setMinimized(!minimized)}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isRunning && <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: 'var(--color-primary)' }} />}
            {isCompleted && <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />}
            {isFailed && <XCircle className="w-5 h-5 flex-shrink-0 text-red-600" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {isRunning ? 'Importing customers...' : isCompleted ? 'Import completed' : 'Import failed'}
              </p>
              {!minimized && (
                <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {activeJob.fileName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {minimized ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
            )}
            {canDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                className="p-1 rounded hover:bg-black/10 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {!minimized && (
          <div className="p-4">
            {isRunning && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {activeJob.current} of {activeJob.total} imported
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                    {percent}%
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--color-primary-light)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: 'var(--color-primary)',
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {activeJob.currentName}
                  </span>
                </div>

                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  You can navigate to other pages — the import continues in the background.
                </p>
              </>
            )}

            {isCompleted && activeJob.result && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    <strong>{activeJob.result.created}</strong> new customers created
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    <strong>{activeJob.result.updated}</strong> existing customers updated
                  </span>
                </div>
                {activeJob.result.restoredActive > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      <strong>{activeJob.result.restoredActive}</strong> lost customers restored to active
                    </span>
                  </div>
                )}
                {activeJob.result.markedLost > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      <strong>{activeJob.result.markedLost}</strong> customers marked as lost/churned
                    </span>
                  </div>
                )}
                {activeJob.result.errors.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs font-medium text-red-800 mb-1">
                      {activeJob.result.errors.length} error(s):
                    </p>
                    {expanded ? (
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {activeJob.result.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-700">{err}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-700 truncate">{activeJob.result.errors[0]}</p>
                    )}
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-xs text-red-600 underline mt-1"
                    >
                      {expanded ? 'Show less' : `Show all ${activeJob.result.errors.length} errors`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isFailed && activeJob.result && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    Import failed with {activeJob.result.errors.length} error(s)
                  </span>
                </div>
                <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {activeJob.result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-700">{err}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
