import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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

function isConsumerHop(name, rawRole) {
  if (rawRole === 'End Consumer') return true;
  if (rawRole === 'Vendor (Claimed)' || rawRole === 'Manufacturer' || rawRole === 'Distributor') {
    return false;
  }
  const low = String(name || '').toLowerCase();
  if (['stock at', 'near ', 'mandapam', 'colony', 'street', 'd.no', 'door no', 'pmkusum'].some((w) => low.includes(w))) {
    return true;
  }
  const tokens = low.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (CORP_TOKENS.has(tok)) return false;
  }
  return true;
}

function parseHopsFallback(rawChain) {
  if (!rawChain || typeof rawChain !== 'string' || !rawChain.includes('->')) return [];
  const parts = rawChain
    .split('->')
    .map((p) => p.trim())
    .filter((p) => p && !/^(NP-|NP\/)/i.test(p));

  if (parts.length < 2) return [];
  return parts.map((raw, idx) => {
    const cleaned = raw.replace(/\bClaimed\b/gi, '').trim();
    const invMatch = cleaned.match(/\(([^)]+)\)/);
    const invoice = invMatch ? invMatch[1].trim() : '';
    const name = cleaned.replace(/\(.*?\)/g, '').replace(/^[\s\-–,]+|[\s\-–,]+$/g, '').trim() || cleaned;
    return {
      name,
      invoice,
      role: idx === 0 ? 'Manufacturer' : idx === parts.length - 1 ? 'Vendor / Reseller' : 'Distributor',
    };
  });
}

export function resolveSupabaseServiceKey(rootDir, envObj = {}) {
  if (envObj.SUPABASE_SERVICE_ROLE_KEY) return envObj.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const migrateScript = path.join(rootDir, 'scripts/migrate_np_to_supabase.mjs');
    if (!fs.existsSync(migrateScript)) return '';
    const src = fs.readFileSync(migrateScript, 'utf-8');
    const match = src.match(/SUPABASE_SERVICE_ROLE_KEY\s*\|\|\s*'([^']+)'/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

/**
 * Rebuilds master.vendor_intelligence, master.manufacturers_ranking, and master.summary
 * across ALL entries in master.serial_metadata so DCR Supply Chain Tracker reflects
 * newly imported National Portal panel chains immediately.
 */
export function rebuildVendorIntelligenceAndRanking(master) {
  const serialMeta = master.serial_metadata || {};

  const vendorInbound = new Map();
  const vendorOutboundB2b = new Map();
  const vendorB2cCount = new Map();
  const vendorMfrs = new Map();
  const mfrCounts = new Map();
  const mfrTier1Buyers = new Map();

  const ensureEdge = (outerMap, keyA, keyB) => {
    let inner = outerMap.get(keyA);
    if (!inner) {
      inner = new Map();
      outerMap.set(keyA, inner);
    }
    let rec = inner.get(keyB);
    if (!rec) {
      rec = { count: 0, invoices: new Set(), mfrs: new Set(), serials: [], panels: [] };
      inner.set(keyB, rec);
    }
    return rec;
  };

  const addVendorMfr = (vName, mfrName) => {
    if (!vName || !mfrName) return;
    let mm = vendorMfrs.get(vName);
    if (!mm) {
      mm = new Map();
      vendorMfrs.set(vName, mm);
    }
    mm.set(mfrName, (mm.get(mfrName) || 0) + 1);
  };

  const existingCatalog = master.chain_catalog || {};
  let chainsCount = 0;

  for (const [serial, meta] of Object.entries(serialMeta)) {
    if (!meta || typeof meta !== 'object') continue;
    let hops =
      Array.isArray(meta.hops) && meta.hops.length >= 2
        ? meta.hops
        : meta.cid != null && Array.isArray(existingCatalog[meta.cid]) && existingCatalog[meta.cid].length >= 2
        ? existingCatalog[meta.cid]
        : null;
    if (!hops && meta.raw_chain) {
      const parsed = parseHopsFallback(meta.raw_chain);
      if (parsed.length >= 2) hops = parsed;
    }
    if (!hops || hops.length < 2) continue;

    chainsCount++;
    const mfrName = String(hops[0]?.name || meta.mfr || '').trim();
    const t1Name = String(hops[1]?.name || '').trim();
    const t1Inv = String(hops[1]?.invoice || '').trim();

    if (mfrName) {
      mfrCounts.set(mfrName, (mfrCounts.get(mfrName) || 0) + 1);
      if (t1Name) {
        let mMap = mfrTier1Buyers.get(mfrName);
        if (!mMap) {
          mMap = new Map();
          mfrTier1Buyers.set(mfrName, mMap);
        }
        let bRec = mMap.get(t1Name);
        if (!bRec) {
          bRec = { count: 0, invoices: new Set() };
          mMap.set(t1Name, bRec);
        }
        bRec.count++;
        if (t1Inv) bRec.invoices.add(t1Inv);
      }
    }

    for (let i = 0; i < hops.length - 1; i++) {
      const srcName = String(hops[i]?.name || '').trim();
      const dstHop = hops[i + 1];
      const dstName = String(dstHop?.name || '').trim();
      const dstInv = String(dstHop?.invoice || '').trim();
      if (!srcName || !dstName) continue;

      addVendorMfr(srcName, mfrName);
      addVendorMfr(dstName, mfrName);

      const isDstTerminal = i + 1 === hops.length - 1;
      const isCons = isDstTerminal && isConsumerHop(dstName, dstHop?.role);

      if (isCons) {
        vendorB2cCount.set(srcName, (vendorB2cCount.get(srcName) || 0) + 1);
      } else {
        const inEdge = ensureEdge(vendorInbound, dstName, srcName);
        inEdge.count++;
        if (dstInv && inEdge.invoices.size < 200) inEdge.invoices.add(dstInv);
        if (mfrName) inEdge.mfrs.add(mfrName);
        if (inEdge.serials.length < 5) inEdge.serials.push(serial);
        if (inEdge.panels.length < 50) inEdge.panels.push({ serial, invoice: dstInv });

        const outEdge = ensureEdge(vendorOutboundB2b, srcName, dstName);
        outEdge.count++;
        if (dstInv && outEdge.invoices.size < 200) outEdge.invoices.add(dstInv);
        if (mfrName) outEdge.mfrs.add(mfrName);
        if (outEdge.serials.length < 5) outEdge.serials.push(serial);
        if (outEdge.panels.length < 50) outEdge.panels.push({ serial, invoice: dstInv });
      }
    }
  }

  const allVendors = new Set([
    ...vendorInbound.keys(),
    ...vendorOutboundB2b.keys(),
    ...vendorB2cCount.keys(),
  ]);

  const vendorIntelligence = {};

  for (const vName of allVendors) {
    const sups = [];
    const inInner = vendorInbound.get(vName);
    if (inInner) {
      for (const [sName, info] of inInner.entries()) {
        sups.push({
          supplier_name: sName,
          panels_count: info.count,
          invoices: Array.from(info.invoices).sort(),
          manufacturers: Array.from(info.mfrs).sort(),
          sample_serials: info.serials,
          panels: info.panels,
        });
      }
      sups.sort((a, b) => b.panels_count - a.panels_count);
    }

    const buyers = [];
    const outInner = vendorOutboundB2b.get(vName);
    if (outInner) {
      for (const [bName, info] of outInner.entries()) {
        buyers.push({
          buyer_name: bName,
          panels_count: info.count,
          invoices: Array.from(info.invoices).sort(),
          manufacturers: Array.from(info.mfrs).sort(),
          sample_serials: info.serials,
          panels: info.panels,
        });
      }
      buyers.sort((a, b) => b.panels_count - a.panels_count);
    }

    const totIn = sups.reduce((sum, s) => sum + s.panels_count, 0);
    const totB2bOut = buyers.reduce((sum, b) => sum + b.panels_count, 0);
    const totB2cOut = vendorB2cCount.get(vName) || 0;

    const mfrMap = vendorMfrs.get(vName);
    const mfrsHandled = {};
    if (mfrMap) {
      const sortedMfrs = Array.from(mfrMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [m, c] of sortedMfrs) mfrsHandled[m] = c;
    }

    vendorIntelligence[vName] = {
      vendor_name: vName,
      total_inbound_panels: totIn,
      total_outbound_panels: totB2bOut + totB2cOut,
      b2b_outbound_panels: totB2bOut,
      b2c_consumer_panels: totB2cOut,
      suppliers: sups,
      buyers,
      manufacturers_handled: mfrsHandled,
    };
  }

  // Consolidated Venkata Siri entry (matches build_dcr_supply_chain_master.py)
  const vsPvt = vendorIntelligence['Venkata Siri Solar Private Limited'];
  const vsPower = vendorIntelligence['Venkata Siri Solar Power'];
  if (vsPvt || vsPower) {
    const combSups = new Map();
    const combBuyers = new Map();
    const combMfrs = new Map();
    let combB2c = 0;

    for (const vs of [vsPvt, vsPower]) {
      if (!vs) continue;
      combB2c += vs.b2c_consumer_panels || 0;
      for (const [m, c] of Object.entries(vs.manufacturers_handled || {})) {
        combMfrs.set(m, (combMfrs.get(m) || 0) + c);
      }
      for (const s of vs.suppliers || []) {
        if (s.supplier_name.toLowerCase().includes('venkata siri')) continue;
        let rec = combSups.get(s.supplier_name);
        if (!rec) {
          rec = { count: 0, invoices: new Set(), mfrs: new Set(), serials: [], panels: [] };
          combSups.set(s.supplier_name, rec);
        }
        rec.count += s.panels_count;
        for (const inv of s.invoices || []) rec.invoices.add(inv);
        for (const m of s.manufacturers || []) rec.mfrs.add(m);
        for (const sr of (s.sample_serials || []).slice(0, 2)) {
          if (rec.serials.length < 5) rec.serials.push(sr);
        }
        for (const p of s.panels || []) {
          if (rec.panels.length < 50) rec.panels.push(p);
        }
      }
      for (const b of vs.buyers || []) {
        if (b.buyer_name.toLowerCase().includes('venkata siri')) continue;
        let rec = combBuyers.get(b.buyer_name);
        if (!rec) {
          rec = { count: 0, invoices: new Set(), mfrs: new Set(), serials: [], panels: [] };
          combBuyers.set(b.buyer_name, rec);
        }
        rec.count += b.panels_count;
        for (const inv of b.invoices || []) rec.invoices.add(inv);
        for (const m of b.manufacturers || []) rec.mfrs.add(m);
        for (const sr of (b.sample_serials || []).slice(0, 2)) {
          if (rec.serials.length < 5) rec.serials.push(sr);
        }
        for (const p of b.panels || []) {
          if (rec.panels.length < 50) rec.panels.push(p);
        }
      }
    }

    const cSups = Array.from(combSups.entries())
      .map(([k, v]) => ({
        supplier_name: k,
        panels_count: v.count,
        invoices: Array.from(v.invoices).sort(),
        manufacturers: Array.from(v.mfrs).sort(),
        sample_serials: v.serials,
        panels: v.panels,
      }))
      .sort((a, b) => b.panels_count - a.panels_count);

    const cBuyers = Array.from(combBuyers.entries())
      .map(([k, v]) => ({
        buyer_name: k,
        panels_count: v.count,
        invoices: Array.from(v.invoices).sort(),
        manufacturers: Array.from(v.mfrs).sort(),
        sample_serials: v.serials,
        panels: v.panels,
      }))
      .sort((a, b) => b.panels_count - a.panels_count);

    const mHandled = {};
    for (const [m, c] of Array.from(combMfrs.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      mHandled[m] = c;
    }

    vendorIntelligence['Venkata Siri (All Entities Consolidated)'] = {
      vendor_name: 'Venkata Siri (All Entities Consolidated)',
      total_inbound_panels: cSups.reduce((a, s) => a + s.panels_count, 0),
      total_outbound_panels: cBuyers.reduce((a, b) => a + b.panels_count, 0) + combB2c,
      b2b_outbound_panels: cBuyers.reduce((a, b) => a + b.panels_count, 0),
      b2c_consumer_panels: combB2c,
      suppliers: cSups,
      buyers: cBuyers,
      manufacturers_handled: mHandled,
    };
  }

  // Manufacturers ranking
  let totalMfrPanels = 0;
  for (const c of mfrCounts.values()) totalMfrPanels += c;
  const denom = totalMfrPanels || 1;

  const ranking = Array.from(mfrCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([mfr, count], idx) => {
      const tier1Map = mfrTier1Buyers.get(mfr);
      const topBuyers = tier1Map
        ? Array.from(tier1Map.entries())
            .map(([bName, bInfo]) => ({
              buyer_name: bName,
              panels_count: bInfo.count,
              sample_invoices: Array.from(bInfo.invoices).sort().slice(0, 3),
            }))
            .sort((a, b) => b.panels_count - a.panels_count)
            .slice(0, 10)
        : [];
      return {
        rank: idx + 1,
        manufacturer_name: mfr,
        total_panels: count,
        share_percentage: Math.round((count / denom) * 10000) / 100,
        tier1_buyers_count: tier1Map ? tier1Map.size : 0,
        top_tier1_buyers: topBuyers,
      };
    });

  master.vendor_intelligence = vendorIntelligence;
  master.manufacturers_ranking = ranking;
  if (!master.summary) master.summary = {};
  master.summary.total_dcr_serials = (master.dcr_serials_list || []).length;
  master.summary.total_dcr_chains = Object.keys(serialMeta).length;
  master.summary.total_mapped_snumbers = Object.keys(master.snumber_dcr_map || {}).length;
  master.summary.total_entities_tracked = Object.keys(vendorIntelligence).length;
  master.summary.total_manufacturers = ranking.length;

  return {
    chainsProcessed: chainsCount,
    entitiesTracked: master.summary.total_entities_tracked,
    manufacturersCount: ranking.length,
  };
}

/**
 * Deduplicates repeated `hops` arrays into `master.chain_catalog` and drops verbose
 * `status`/`raw_chain` fields when `hops` is present (~3x smaller JSON, faster parse/write).
 */
export function compactDcrMasterForStorage(master) {
  const existingCatalog = master.chain_catalog || {};
  const catalog = {};
  const sigToId = new Map();
  let nextId = 0;

  for (const v of Object.values(master.serial_metadata || {})) {
    if (!v || typeof v !== 'object') continue;
    const hops =
      Array.isArray(v.hops) && v.hops.length > 0
        ? v.hops
        : v.cid != null && Array.isArray(existingCatalog[v.cid])
        ? existingCatalog[v.cid]
        : null;
    delete v.status;
    if (Array.isArray(hops) && hops.length > 0) {
      const sig = JSON.stringify(hops);
      let cid = sigToId.get(sig);
      if (cid == null) {
        cid = String(nextId++);
        sigToId.set(sig, cid);
        catalog[cid] = hops;
      }
      delete v.hops;
      delete v.raw_chain;
      v.cid = cid;
    }
  }
  master.chain_catalog = catalog;
  return nextId;
}

/**
 * Atomically writes JSON via a temp file + rename so ENOSPC never truncates existing data to 0 bytes.
 */
export function writeJsonAtomic(targetPath, data) {
  const out = typeof data === 'string' ? data : JSON.stringify(data);
  const tmpPath = `${targetPath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, out, 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch { /* ignore cleanup */ }
    throw err;
  }
}

/**
 * Compresses master JSON with gzip (~16 MB) and uploads to public Supabase Storage bucket `dcr-assets`
 * so Bolt and published deployments immediately receive the latest DCR Supply Chain & Vendor Tracker data.
 */
export async function uploadDcrMasterToSupabaseStorage(supabase, data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const gzBuffer = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'), { level: 6 });

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = Array.isArray(buckets) && buckets.some((b) => b.name === 'dcr-assets');
  if (!exists) {
    await supabase.storage.createBucket('dcr-assets', { public: true, fileSizeLimit: 52428800 });
  }

  const { error } = await supabase.storage
    .from('dcr-assets')
    .upload('dcr_supply_chain_master.json.gz', gzBuffer, {
      contentType: 'application/gzip',
      cacheControl: '60',
      upsert: true,
    });
  if (error) throw error;
  return { rawBytes: jsonStr.length, gzipBytes: gzBuffer.length };
}
