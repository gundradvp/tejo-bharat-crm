export interface DcrHop {
  name: string;
  invoice?: string;
  role: string;
}

export interface DcrSerialHierarchy {
  serial: string;
  app_id: string;
  raw_chain: string;
  hops: DcrHop[];
  mfr: string;
  status?: string;
  sno?: string;
  consumer?: string;
  date?: string;
}

export interface DcrMasterData {
  summary?: Record<string, number>;
  vendor_intelligence?: Record<string, any>;
  snumber_dcr_map?: Record<string, any>;
  serial_metadata?: Record<string, any>;
  chain_catalog?: Record<string, DcrHop[]>;
  manufacturers_ranking?: any[];
  dcr_serials_list?: string[];
}

const CORP_TOKENS = new Set([
  'ltd', 'limited', 'pvt', 'private', 'llp', 'enterprises', 'enterprise',
  'solar', 'energy', 'power', 'solutions', 'systems', 'technologies', 'technology',
  'tech', 'infra', 'electrical', 'electricals', 'engineering', 'services',
  'associates', 'agencies', 'agency', 'renewables', 'renewable', 'works',
  'green', 'batteries', 'battery', 'store', 'traders', 'trading',
  'industries', 'industry', 'corporation', 'communications', 'holdings',
  'ventures', 'devloper', 'developer', 'distributors', 'distributor',
  'controls', 'automations', 'projects', 'greenergy', 'photovoltaic',
]);

function extractNameAndInvoice(raw: string): { name: string; invoice: string } {
  const cleaned = raw.replace(/\bClaimed\b/gi, '').trim();
  const invMatch = cleaned.match(/\(([^)]+)\)/);
  const invoice = invMatch ? invMatch[1].trim() : '';
  const name = cleaned.replace(/\(.*?\)/g, '').replace(/^[\s\-–,]+|[\s\-–,]+$/g, '').trim();
  return { name, invoice };
}

function isEndConsumer(cleanName: string, rawPart: string, isTerminal: boolean): boolean {
  const low = cleanName.toLowerCase();
  const rawLow = rawPart.toLowerCase();
  if (['stock at', 'near ', 'mandapam', 'colony', 'street', 'd.no', 'door no'].some((w) => rawLow.includes(w))) {
    return true;
  }
  const words = new Set(low.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  for (const tok of CORP_TOKENS) {
    if (words.has(tok)) return false;
  }
  return isTerminal;
}

/**
 * Parses a DCR Checker JSON item or rawRemarks text into structured supply-chain hops.
 * Supports multi-line rawRemarks (where `->` may appear at line end or start).
 */
export function parseDcrItemToHierarchy(item: {
  serial?: string;
  Serial?: string;
  'Serial Number'?: string;
  rawRemarks?: string;
  'Error Remarks'?: string;
  remarks?: string;
  chain?: string;
  claimedNp?: string;
  app_id?: string;
  status?: string;
}): DcrSerialHierarchy | null {
  const serial = String(item.serial || item.Serial || item['Serial Number'] || '').trim();
  if (!serial) return null;

  const rawText = String(item.rawRemarks || item['Error Remarks'] || item.remarks || item.chain || '').trim();
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Join all lines starting from the first line containing `->`
  const firstArrowIdx = lines.findIndex((l) => l.includes('->'));
  const trailLine =
    firstArrowIdx !== -1
      ? lines
          .slice(firstArrowIdx)
          .filter((l) => !/^stock at\b|^b2c\b/i.test(l))
          .join(' ')
      : '';

  let appId = String(item.claimedNp || item.app_id || '').trim();
  if (!appId) {
    const npMatch = rawText.match(/\b(NP-[A-Z0-9-]+|NP\/Reg-[0-9/]+|NP\/[0-9/]+)\b/i);
    if (npMatch) appId = npMatch[1];
  }

  const parts = trailLine
    .split('->')
    .map((p) => p.trim())
    .filter(Boolean);

  const nodes: string[] = [];
  for (const p of parts) {
    if (/^(NP-|NP\/)/i.test(p)) {
      if (!appId) appId = p;
    } else {
      nodes.push(p);
    }
  }

  if (nodes.length === 0) return null;

  const hops: DcrHop[] = nodes.map((rawNode, idx) => {
    const { name, invoice } = extractNameAndInvoice(rawNode);
    const isTerm = idx === nodes.length - 1;
    const isCons = isEndConsumer(name, rawNode, isTerm);
    let role = 'Vendor / Reseller';
    if (idx === 0) role = 'Manufacturer';
    else if (isCons) role = 'End Consumer';
    else if (isTerm) role = 'Vendor (Claimed)';
    return { name: name || rawNode, invoice, role };
  });

  const mfr = hops[0]?.name || '';
  const cleanChain = parts.join(' -> ');

  return {
    serial,
    app_id: appId,
    raw_chain: cleanChain,
    hops,
    mfr,
    status: item.status || lines[0] || '',
  };
}

let cachedMaster: DcrMasterData | null = null;
let cachedSerialSet: Set<string> | null = null;
let cachedUpperMetaMap: Map<string, any> | null = null;
let loadPromise: Promise<DcrMasterData | null> | null = null;

export function invalidateDcrMasterCache(): void {
  cachedMaster = null;
  cachedSerialSet = null;
  cachedUpperMetaMap = null;
  loadPromise = null;
}

function buildUpperSerialSetAndMap(data: DcrMasterData | null): {
  serialSet: Set<string>;
  metaMap: Map<string, any>;
} {
  const serialSet = new Set<string>();
  const metaMap = new Map<string, any>();

  if (Array.isArray(data?.dcr_serials_list)) {
    for (const s of data.dcr_serials_list) {
      const up = String(s || '').trim().toUpperCase();
      if (up) serialSet.add(up);
    }
  }
  if (data?.serial_metadata) {
    for (const [k, v] of Object.entries(data.serial_metadata)) {
      const up = String(k || '').trim().toUpperCase();
      if (up) {
        serialSet.add(up);
        metaMap.set(up, v);
      }
    }
  }
  return { serialSet, metaMap };
}

export async function loadDcrMasterData(forceRefresh = false): Promise<DcrMasterData | null> {
  if (!forceRefresh && cachedMaster) return cachedMaster;
  if (!forceRefresh && loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch(`/dcr_supply_chain_master.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data: DcrMasterData = await res.json();
      cachedMaster = data;
      const built = buildUpperSerialSetAndMap(data);
      cachedSerialSet = built.serialSet;
      cachedUpperMetaMap = built.metaMap;
      return data;
    } catch (err) {
      console.warn('Could not load dcr_supply_chain_master.json:', err);
      return null;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function getDcrSerialsSet(master: DcrMasterData | null): Set<string> {
  if (cachedSerialSet && master === cachedMaster) return cachedSerialSet;
  return buildUpperSerialSetAndMap(master).serialSet;
}

export function lookupPanelDcrHierarchy(
  serial: string,
  master: DcrMasterData | null,
  complainNo?: string | null,
  inlineDcrChains?: Record<string, any> | null
): DcrSerialHierarchy | null {
  const cleanSno = serial?.trim();
  const upperSno = cleanSno ? cleanSno.toUpperCase() : '';

  // 1. Check Supabase-stored per-application dcrChains first (if provided)
  if (inlineDcrChains && upperSno) {
    let inlineMatch = inlineDcrChains[cleanSno] || inlineDcrChains[upperSno];
    if (!inlineMatch) {
      for (const [k, v] of Object.entries(inlineDcrChains)) {
        if (k.trim().toUpperCase() === upperSno) {
          inlineMatch = v;
          break;
        }
      }
    }
    if (inlineMatch && (Array.isArray(inlineMatch.hops) || inlineMatch.raw_chain)) {
      return {
        serial: cleanSno,
        app_id: inlineMatch.app_id || '',
        raw_chain: inlineMatch.raw_chain || '',
        hops: Array.isArray(inlineMatch.hops) ? inlineMatch.hops : [],
        mfr: inlineMatch.mfr || inlineMatch.hops?.[0]?.name || '',
        status: inlineMatch.status,
      };
    }
  }

  if (!master) return null;
  let meta = cleanSno ? master.serial_metadata?.[cleanSno] : null;
  if (!meta && upperSno) {
    if (master === cachedMaster && cachedUpperMetaMap) {
      meta = cachedUpperMetaMap.get(upperSno);
    } else if (master.serial_metadata) {
      meta = buildUpperSerialSetAndMap(master).metaMap.get(upperSno);
    }
  }
  const snumKey = complainNo?.trim() || meta?.sno;
  const snumEntry = snumKey ? master.snumber_dcr_map?.[snumKey] : null;
  const metaHops: DcrHop[] | null =
    meta && Array.isArray(meta.hops) && meta.hops.length > 0
      ? meta.hops
      : meta && meta.cid != null && master.chain_catalog && Array.isArray(master.chain_catalog[meta.cid])
      ? master.chain_catalog[meta.cid]
      : null;

  const hopsToRaw = (hops: DcrHop[]) =>
    hops.map((h) => (h.invoice ? `${h.name} (${h.invoice})` : h.name)).join(' -> ');

  if (meta && metaHops && metaHops.length > 0) {
    return {
      serial: cleanSno,
      app_id: meta.app || '',
      raw_chain: meta.raw_chain || hopsToRaw(metaHops),
      hops: metaHops,
      mfr: meta.mfr || metaHops[0]?.name || '',
      status: meta.status,
      sno: meta.sno,
      consumer: meta.consumer,
      date: meta.date,
    };
  }

  if (snumEntry && Array.isArray(snumEntry.hops) && snumEntry.hops.length > 0) {
    return {
      serial: cleanSno,
      app_id: snumEntry.app_id || meta?.app || '',
      raw_chain: snumEntry.raw_chain || hopsToRaw(snumEntry.hops),
      hops: snumEntry.hops,
      mfr: snumEntry.manufacturer || meta?.mfr || snumEntry.hops[0]?.name || '',
      sno: snumEntry.snumber || meta?.sno,
      consumer: snumEntry.consumer_name || meta?.consumer,
    };
  }

  if (meta) {
    return {
      serial: cleanSno,
      app_id: meta.app || '',
      raw_chain: meta.raw_chain || '',
      hops: meta.mfr ? [{ name: meta.mfr, role: 'Manufacturer' }] : [],
      mfr: meta.mfr || '',
      sno: meta.sno,
      consumer: meta.consumer,
      date: meta.date,
    };
  }

  return null;
}

export async function importDcrHierarchiesToServer(
  items: DcrSerialHierarchy[]
): Promise<{
  success: boolean;
  addedSerials: number;
  updatedSerials: number;
  mappedSNumbers: number;
  totalSerials: number;
  supabaseUpdatedApps?: number;
  supabaseLinkedPanels?: number;
  supabaseQueuedApps?: number;
  supabaseError?: string;
  error?: string;
}> {
  const res = await fetch('/api/import-dcr-chains', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  invalidateDcrMasterCache();
  return data;
}
