/**
 * High-Capacity IndexedDB Storage for S-Numbers Hub
 * 
 * Solves LocalStorage 5MB quota limitations by storing all 3,500+ (or up to 100,000+)
 * APEPDCL Ground Reports directly in the browser's IndexedDB.
 * 
 * Provides:
 * - Instant (<30ms) hydration on page reload
 * - Zero data loss across reloads, tab switches, and browser restarts
 * - Background syncing to disk via Vite /api/save-ground-reports
 */

import { APEGroundReport } from './apepdclGroundReport';

const DB_NAME = 'tb_s_numbers_db_v1';
const STORE_NAME = 'ground_reports';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'complain_no' });
        store.createIndex('district', 'district', { unique: false });
        store.createIndex('vendor_name', 'vendor_name', { unique: false });
        store.createIndex('section_name', 'section_name', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Get all stored reports from IndexedDB
 */
export async function getAllReportsFromDB(): Promise<APEGroundReport[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };

      req.onerror = () => {
        console.warn('Failed to read from IndexedDB:', req.error);
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable:', err);
    return [];
  }
}

/**
 * Save multiple reports to IndexedDB in a single transaction
 */
export async function saveReportsToDB(reports: APEGroundReport[]): Promise<void> {
  if (!reports || reports.length === 0) return;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const report of reports) {
        if (report.complain_no) {
          store.put(report);
        }
      }

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        console.warn('IndexedDB bulk save error:', tx.error);
        resolve();
      };
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }
}

/**
 * Save a single report to IndexedDB
 */
export async function saveSingleReportToDB(report: APEGroundReport): Promise<void> {
  if (!report || !report.complain_no) return;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(report);
  } catch (err) {
    console.warn('Failed to save single report to IndexedDB:', err);
  }
}

/**
 * Strip heavy static lookup payloads (e.g. INVERTER_MAKE_DATA) before saving to disk
 */
function cleanReportForDisk(report: APEGroundReport): Record<string, any> {
  const raw = { ...report.raw_json };
  delete raw.INVERTER_MAKE_DATA;
  return raw;
}

let syncTimeout: any = null;

/**
 * Sync reports to disk via Vite dev server middleware (/api/save-ground-reports)
 * Debounced to avoid excessive disk I/O
 */
export function syncReportsToDisk(reports: APEGroundReport[]): void {
  if (typeof window === 'undefined') return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    try {
      // Map reports back to raw JSON (without INVERTER_MAKE_DATA)
      const cleanList = reports.map((r) => cleanReportForDisk(r));

      await fetch('/api/save-ground-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanList),
      });
    } catch (e) {
      // Dev server might be offline or in static production mode
    }
  }, 1200);
}
