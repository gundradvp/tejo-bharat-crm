import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import {
  bulkImportCustomers,
  bulkImportCustomersJSON,
  bulkImportNativeCRM,
  bulkImportSuryaGharDetailed,
  ImportResult,
  ImportJob,
  ImportType,
  ImportProgressCallback,
} from '../lib/importCustomers';
import { CSVCustomerData } from '../lib/csvParser';
import { JSONCustomerData, NativeCRMCustomer, SuryaGharDetailedCustomer } from '../lib/jsonParser';

interface ImportProgressContextType {
  activeJob: ImportJob | null;
  recentJobs: ImportJob[];
  startImport: (params: StartImportParams) => void;
  dismissJob: (jobId: string) => void;
}

interface StartImportParams {
  type: ImportType;
  fileName: string;
  total: number;
  customers: CSVCustomerData[] | JSONCustomerData[] | NativeCRMCustomer[] | SuryaGharDetailedCustomer[];
  userId: string;
}

const ImportProgressContext = createContext<ImportProgressContextType | undefined>(undefined);

export function ImportProgressProvider({ children }: { children: ReactNode }) {
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<ImportJob[]>([]);
  const jobRef = useRef<ImportJob | null>(null);

  const startImport = useCallback((params: StartImportParams) => {
    const jobId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: ImportJob = {
      id: jobId,
      type: params.type,
      fileName: params.fileName,
      total: params.total,
      current: 0,
      currentName: 'Starting...',
      status: 'running',
      result: null,
      startedAt: Date.now(),
      completedAt: null,
    };

    jobRef.current = job;
    setActiveJob(job);

    const onProgress: ImportProgressCallback = (current, total, currentName) => {
      const updated: ImportJob = {
        ...jobRef.current!,
        current,
        total,
        currentName,
      };
      jobRef.current = updated;
      setActiveJob(updated);
    };

    const runImport = async () => {
      try {
        let result: ImportResult;
        if (params.type === 'csv') {
          result = await bulkImportCustomers(
            params.customers as CSVCustomerData[],
            params.userId,
            onProgress
          );
        } else if (params.type === 'json') {
          result = await bulkImportCustomersJSON(
            params.customers as JSONCustomerData[],
            params.userId,
            onProgress
          );
        } else if (params.type === 'surya_ghar_detailed') {
          result = await bulkImportSuryaGharDetailed(
            params.customers as SuryaGharDetailedCustomer[],
            params.userId,
            onProgress
          );
        } else {
          result = await bulkImportNativeCRM(
            params.customers as NativeCRMCustomer[],
            params.userId,
            onProgress
          );
        }

        const completed: ImportJob = {
          ...jobRef.current!,
          status: result.success ? 'completed' : 'failed',
          result,
          completedAt: Date.now(),
          current: params.total,
          currentName: 'Completed',
        };
        jobRef.current = completed;
        setActiveJob(completed);
        setRecentJobs((prev) => [completed, ...prev].slice(0, 5));
      } catch (err: any) {
        const failed: ImportJob = {
          ...jobRef.current!,
          status: 'failed',
          result: {
            success: false,
            created: 0,
            updated: 0,
            errors: [err.message || 'Import failed unexpectedly'],
            markedLost: 0,
            restoredActive: 0,
          },
          completedAt: Date.now(),
          currentName: 'Failed',
        };
        jobRef.current = failed;
        setActiveJob(failed);
        setRecentJobs((prev) => [failed, ...prev].slice(0, 5));
      }
    };

    runImport();
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
    <ImportProgressContext.Provider value={{ activeJob, recentJobs, startImport, dismissJob }}>
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  const context = useContext(ImportProgressContext);
  if (context === undefined) {
    throw new Error('useImportProgress must be used within an ImportProgressProvider');
  }
  return context;
}
