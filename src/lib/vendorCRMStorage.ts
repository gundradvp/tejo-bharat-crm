import { VendorItem, DistrictSummary, VendorNote, PipelineStage, Priority, CallOutcome } from '../types/vendorCRM';
import { cleanPhoneNumber, normalizeVendorName, getDCRSupplyChainMaster } from './vendorContactsService';

const DB_NAME = 'tb_vendor_crm_db_v1';
const DB_VERSION = 1;
const VENDORS_STORE = 'vendors';
const DISTRICTS_STORE = 'districts';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(VENDORS_STORE)) {
        const vendorStore = db.createObjectStore(VENDORS_STORE, { keyPath: 'uniqueKey' });
        vendorStore.createIndex('district', 'district', { unique: false });
        vendorStore.createIndex('pipelineStage', 'pipelineStage', { unique: false });
        vendorStore.createIndex('priority', 'priority', { unique: false });
        vendorStore.createIndex('nextFollowUpDate', 'nextFollowUpDate', { unique: false });
      }
      if (!db.objectStoreNames.contains(DISTRICTS_STORE)) {
        db.createObjectStore(DISTRICTS_STORE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.error('IndexedDB open error:', req.error);
      reject(req.error);
    };
  });

  return dbPromise;
}

export function normalizeRawVendor(raw: any, districtName: string, dcrMap?: Record<string, any>): VendorItem {
  const now = new Date().toISOString();
  const vId = raw.vendorId || Math.floor(Math.random() * 1000000);
  const mobile = cleanPhoneNumber(raw.contactPersonMobile);
  const vName = (raw.vendorName || '').trim();
  const uniqueKey = `${districtName.toLowerCase()}_${vId}`;

  const norm = normalizeVendorName(vName);
  const dcr = dcrMap ? dcrMap[norm] : null;

  return {
    uniqueKey,
    vendorId: vId,
    vendorName: vName,
    contactPersonName: (raw.contactPersonName || '').trim(),
    contactPersonMobile: mobile,
    contactPersonEmail: (raw.contactPersonEmail || '').trim(),
    address: (raw.address || '').trim(),
    websiteUrl: (raw.websiteUrl || '').trim(),
    rating: raw.rating ?? null,
    consumerRatingCount: raw.consumerRatingCount || 0,
    brands: (raw.vendorBrandsList || []).map((b: any) => b.brandName).filter(Boolean),
    district: districtName,
    nationalCapacityKW: (raw.nationwiseInstallationAndCapacity || {}).installedCapacity || 0,
    nationalInstallations: (raw.nationwiseInstallationAndCapacity || {}).installationCount || 0,
    districtCapacityKW: (raw.districtwiseInstallationAndCapacity || {}).installedCapacity || 0,
    districtInstallations: (raw.districtwiseInstallationAndCapacity || {}).installationCount || 0,
    
    // DCR link
    dcrTracked: Boolean(dcr),
    dcrInboundPanels: dcr?.total_inbound_panels,
    dcrOutboundPanels: dcr?.b2b_outbound_panels ?? dcr?.total_outbound_panels,
    dcrManufacturers: dcr ? Object.keys(dcr.manufacturers_handled || {}) : undefined,
    dcrSuppliers: dcr ? (dcr.suppliers || []).map((s: any) => s.supplier_name) : undefined,
    dcrBuyers: dcr ? (dcr.buyers || []).map((b: any) => b.buyer_name) : undefined,

    // CRM fields
    pipelineStage: 'NEW',
    priority: ((raw.nationwiseInstallationAndCapacity || {}).installedCapacity || 0) > 50 ? 'HOT' : 'NORMAL',
    lastCallOutcome: null,
    lastContactedAt: null,
    nextFollowUpDate: null,
    solarRequirement: undefined,
    tags: (raw.vendorBrandsList || []).map((b: any) => b.brandName).filter(Boolean),
    notes: [],
    isPinned: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAllVendorsFromDB(): Promise<VendorItem[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(VENDORS_STORE, 'readonly');
      const store = tx.objectStore(VENDORS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get vendors from IndexedDB:', err);
    return [];
  }
}

export async function saveVendorsBatch(vendors: VendorItem[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VENDORS_STORE, 'readwrite');
    const store = tx.objectStore(VENDORS_STORE);
    for (const v of vendors) {
      store.put(v);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllDistrictsFromDB(): Promise<DistrictSummary[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DISTRICTS_STORE, 'readonly');
      const store = tx.objectStore(DISTRICTS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to get districts from IndexedDB:', err);
    return [];
  }
}

export async function saveDistrictsToDB(districts: DistrictSummary[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DISTRICTS_STORE, 'readwrite');
    const store = tx.objectStore(DISTRICTS_STORE);
    store.clear();
    for (const d of districts) {
      store.put(d);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function initializeVendorCRM(): Promise<{ vendors: VendorItem[]; districts: DistrictSummary[] }> {
  try {
    let vendors = await getAllVendorsFromDB();
    let districts = await getAllDistrictsFromDB();

    if (vendors.length === 0) {
      console.log('IndexedDB empty. Loading default Anakapalli vendors from /data/anakapalli.json...');
      
      const dcrData = await getDCRSupplyChainMaster();
      const dcrNormMap: Record<string, any> = {};
      if (dcrData) {
        for (const [name, obj] of Object.entries(dcrData)) {
          const norm = normalizeVendorName(name);
          if (norm && !dcrNormMap[norm]) dcrNormMap[norm] = obj;
        }
      }

      const res = await fetch('/data/anakapalli.json');
      if (res.ok) {
        const rawList = await res.json();
        const normalized = rawList.map((item: any) => normalizeRawVendor(item, 'Anakapalli', dcrNormMap));

        const anakapalliDist: DistrictSummary = {
          id: 'anakapalli',
          name: 'Anakapalli',
          totalVendors: normalized.length,
          contactedCount: 0,
          interestedCount: 0,
          fileName: 'anakapalli.json',
          importedAt: new Date().toISOString(),
        };

        await saveVendorsBatch(normalized);
        await saveDistrictsToDB([anakapalliDist]);

        return { vendors: normalized, districts: [anakapalliDist] };
      }
    }

    return { vendors, districts };
  } catch (err) {
    console.error('initializeVendorCRM error:', err);
    return { vendors: [], districts: [] };
  }
}

export async function updateVendorInDB(vendorKey: string, updates: Partial<VendorItem>): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VENDORS_STORE, 'readwrite');
    const store = tx.objectStore(VENDORS_STORE);
    const getReq = store.get(vendorKey);
    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (existing) {
        const updated = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        store.put(updated);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function addVendorNoteInDB(
  vendorKey: string,
  noteData: {
    content: string;
    callOutcome?: CallOutcome | string;
    nextFollowUpDate?: string | null;
    stageChange?: PipelineStage;
    priorityChange?: Priority;
    solarRequirement?: VendorItem['solarRequirement'];
  },
  author: string = 'Durga'
): Promise<VendorItem | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VENDORS_STORE, 'readwrite');
    const store = tx.objectStore(VENDORS_STORE);
    const getReq = store.get(vendorKey);
    getReq.onsuccess = () => {
      const existing: VendorItem = getReq.result;
      if (!existing) {
        resolve(null);
        return;
      }

      const now = new Date().toISOString();
      const newNote: VendorNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        vendorId: existing.vendorId,
        district: existing.district,
        createdAt: now,
        callOutcome: noteData.callOutcome,
        content: noteData.content,
        nextFollowUpDate: noteData.nextFollowUpDate ?? existing.nextFollowUpDate,
        stageChange: noteData.stageChange,
        priorityChange: noteData.priorityChange,
        solarRequirement: noteData.solarRequirement,
        author,
      };

      const updated: VendorItem = {
        ...existing,
        notes: [newNote, ...(existing.notes || [])],
        lastContactedAt: now,
        lastCallOutcome: (noteData.callOutcome as CallOutcome) || existing.lastCallOutcome,
        nextFollowUpDate: noteData.nextFollowUpDate !== undefined ? noteData.nextFollowUpDate : existing.nextFollowUpDate,
        pipelineStage: noteData.stageChange || existing.pipelineStage,
        priority: noteData.priorityChange || existing.priority,
        solarRequirement: noteData.solarRequirement || existing.solarRequirement,
        updatedAt: now,
      };

      store.put(updated);
      resolve(updated);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function importDistrictJSON(districtName: string, rawList: any[]): Promise<VendorItem[]> {
  const dcrData = await getDCRSupplyChainMaster();
  const dcrNormMap: Record<string, any> = {};
  if (dcrData) {
    for (const [name, obj] of Object.entries(dcrData)) {
      const norm = normalizeVendorName(name);
      if (norm && !dcrNormMap[norm]) dcrNormMap[norm] = obj;
    }
  }

  const normalized = rawList.map((item: any) => normalizeRawVendor(item, districtName, dcrNormMap));
  await saveVendorsBatch(normalized);

  const existingDistricts = await getAllDistrictsFromDB();
  const districtId = districtName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const updatedDistricts = existingDistricts.filter(d => d.id !== districtId);
  updatedDistricts.push({
    id: districtId,
    name: districtName,
    totalVendors: normalized.length,
    contactedCount: 0,
    interestedCount: 0,
    fileName: `${districtId}.json`,
    importedAt: new Date().toISOString(),
  });
  await saveDistrictsToDB(updatedDistricts);

  return normalized;
}
