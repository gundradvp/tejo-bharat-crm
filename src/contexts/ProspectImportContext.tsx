import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { importProspects, ImportResult } from '../lib/prospectApi';

export interface ProspectImportJob {
  id: string;
  fileName: string;
  total: number;
  current: number;
  status: 'running' | 'completed' | 'failed';
  result: ImportResult | null;
  startedAt: number;
  completedAt: number | null;
}

interface ProspectImportContextType {
  activeJob: ProspectImportJob | null;
  recentJobs: ProspectImportJob[];
  startImport: (fileName: string, rows: any[]) => void;
  dismissJob: (jobId: string) => void;
}

const ProspectImportContext = createContext<ProspectImportContextType | undefined>(undefined);

export function ProspectImportProvider({ children }: { children: ReactNode }) {
  const [activeJob, setActiveJob] = useState<ProspectImportJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<ProspectImportJob[]>([]);
  const jobRef = useRef<ProspectImportJob | null>(null);

  const startImport = useCallback((fileName: string, rows: any[]) => {
    const jobId = `prospect-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: ProspectImportJob = {
      id: jobId,
      fileName,
      total: rows.length,
      current: 0,
      status: 'running',
      result: null,
      startedAt: Date.now(),
      completedAt: null,
    };

    jobRef.current = job;
    setActiveJob(job);

    importProspects(rows, (current, total) => {
      const updated: ProspectImportJob = {
        ...jobRef.current!,
        current,
        total,
      };
      jobRef.current = updated;
      setActiveJob(updated);
    }, fileName)
      .then((result) => {
        const completed: ProspectImportJob = {
          ...jobRef.current!,
          status: 'completed',
          result,
          completedAt: Date.now(),
          current: rows.length,
        };
        jobRef.current = completed;
        setActiveJob(completed);
        setRecentJobs((prev) => [completed, ...prev].slice(0, 3));
      })
      .catch((err) => {
        const failed: ProspectImportJob = {
          ...jobRef.current!,
          status: 'failed',
          result: {
            total: rows.length,
            created: 0,
            updated: 0,
            existingCustomerMatches: 0,
            errors: [err.message || 'Import failed unexpectedly'],
          },
          completedAt: Date.now(),
        };
        jobRef.current = failed;
        setActiveJob(failed);
        setRecentJobs((prev) => [failed, ...prev].slice(0, 3));
      });
  }, []);

  const dismissJob = useCallback((jobId: string) => {
    setActiveJob((current) => {
      if (current && current.id === jobId && current.status !== 'running') {
        return null;
      }
      return current;
    });
  }, []);

  return (
    <ProspectImportContext.Provider value={{ activeJob, recentJobs, startImport, dismissJob }}>
      {children}
    </ProspectImportContext.Provider>
  );
}

export function useProspectImport() {
  const context = useContext(ProspectImportContext);
  if (context === undefined) {
    throw new Error('useProspectImport must be used within a ProspectImportProvider');
  }
  return context;
}
