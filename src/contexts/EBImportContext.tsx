import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { importEBCustomers, EBImportResult } from '../lib/ebApi';
import type { EBCustomerRow } from '../lib/ebParser';

export interface EBImportJob {
  id: string;
  fileName: string;
  total: number;
  current: number;
  status: 'running' | 'completed' | 'failed';
  result: EBImportResult | null;
  startedAt: number;
  completedAt: number | null;
}

interface EBImportContextType {
  activeJob: EBImportJob | null;
  recentJobs: EBImportJob[];
  startImport: (fileName: string, rows: EBCustomerRow[]) => void;
  dismissJob: (jobId: string) => void;
}

const EBImportContext = createContext<EBImportContextType | undefined>(undefined);

export function EBImportProvider({ children }: { children: ReactNode }) {
  const [activeJob, setActiveJob] = useState<EBImportJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<EBImportJob[]>([]);
  const jobRef = useRef<EBImportJob | null>(null);

  const startImport = useCallback((fileName: string, rows: EBCustomerRow[]) => {
    const jobId = `eb-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: EBImportJob = {
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

    importEBCustomers(rows, (current, total) => {
      const updated: EBImportJob = {
        ...jobRef.current!,
        current,
        total,
      };
      jobRef.current = updated;
      setActiveJob(updated);
    }, fileName)
      .then((result) => {
        const completed: EBImportJob = {
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
        const failed: EBImportJob = {
          ...jobRef.current!,
          status: 'failed',
          result: {
            total: rows.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
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
    <EBImportContext.Provider value={{ activeJob, recentJobs, startImport, dismissJob }}>
      {children}
    </EBImportContext.Provider>
  );
}

export function useEBImport() {
  const context = useContext(EBImportContext);
  if (context === undefined) {
    throw new Error('useEBImport must be used within an EBImportProvider');
  }
  return context;
}
