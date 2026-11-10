import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import {
  compactDcrMasterForStorage,
  rebuildVendorIntelligenceAndRanking,
  resolveSupabaseServiceKey,
  uploadDcrMasterToSupabaseStorage,
  writeJsonAtomic,
} from './dcr_master_helpers.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function loadLocalEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const out = {};
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return out;
}

async function runParallel(tasks, concurrency) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = await Promise.all(tasks.slice(i, i + concurrency).map((fn) => fn()));
    results.push(...batch);
  }
  return results;
}

async function main() {
  const localEnv = loadLocalEnv();
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL;
  const SERVICE_KEY = resolveSupabaseServiceKey(ROOT_DIR, localEnv);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const masterPath = path.join(ROOT_DIR, 'public/dcr_supply_chain_master.json');
  if (!fs.existsSync(masterPath)) {
    console.error('dcr_supply_chain_master.json not found at:', masterPath);
    process.exit(1);
  }

  console.log('Reading public/dcr_supply_chain_master.json...');
  const master = JSON.parse(fs.readFileSync(masterPath, 'utf-8'));

  // Ensure vendor_intelligence & manufacturers_ranking in DCR Supply Chain Tracker include all 249k+ panels
  const intelStats = rebuildVendorIntelligenceAndRanking(master);
  console.log(
    `Rebuilt DCR Supply Chain Tracker intelligence: ${intelStats.chainsProcessed.toLocaleString()} chains -> ${intelStats.entitiesTracked.toLocaleString()} entities across ${intelStats.manufacturersCount} manufacturers.`
  );
  compactDcrMasterForStorage(master);
  writeJsonAtomic(masterPath, master);
  const chainCatalog = master.chain_catalog || {};
  const serialMeta = master.serial_metadata || {};

  const serialUpperMap = new Map();
  const appUpperMap = new Map();

  for (const [rawSerial, meta] of Object.entries(serialMeta)) {
    const serial = String(rawSerial || '').trim();
    if (!serial) continue;
    const upper = serial.toUpperCase();
    const entry = { serial, meta };
    serialUpperMap.set(upper, entry);

    const appUp = String(meta?.app || '').trim().toUpperCase();
    if (appUp) {
      const list = appUpperMap.get(appUp) || [];
      list.push(entry);
      appUpperMap.set(appUp, list);
    }
  }

  console.log(
    `Loaded ${serialUpperMap.size.toLocaleString()} panel serial hierarchies across ${appUpperMap.size.toLocaleString()} claimed NP applications.`
  );

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log('Uploading gzipped DCR master to Supabase Storage (dcr-assets) for Bolt & Published App...');
  const storageRes = await uploadDcrMasterToSupabaseStorage(supabase, master);
  console.log(
    `  Uploaded dcr_supply_chain_master.json.gz (${(storageRes.gzipBytes / 1024 / 1024).toFixed(1)} MB gzipped from ${(storageRes.rawBytes / 1024 / 1024).toFixed(1)} MB)`
  );

  // Step 1: Keyset scan all rows with modules_count > 0 to match in memory
  console.log('Scanning national_portal_applications with modules_count > 0...');
  const matchedApps = new Map(); // id -> Map<serial, meta>
  const seenAppNumsUpper = new Set();
  let scanned = 0;
  let alreadySynced = 0;
  let lastId = '';

  while (true) {
    let query = supabase
      .from('national_portal_applications')
      .select('id, app_num, panel_serials, has_dcr, dcr_chains:raw_details->dcrChains')
      .gt('modules_count', 0)
      .order('id', { ascending: true })
      .limit(1000);

    if (lastId) query = query.gt('id', lastId);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      lastId = String(row.id);
      const appUp = String(row.app_num || '').trim().toUpperCase();
      if (appUp) seenAppNumsUpper.add(appUp);

      const candidates = new Map();
      if (appUp && appUpperMap.has(appUp)) {
        for (const e of appUpperMap.get(appUp)) {
          candidates.set(e.serial, e.meta);
        }
      }
      if (Array.isArray(row.panel_serials)) {
        for (const ps of row.panel_serials) {
          const entry = serialUpperMap.get(String(ps || '').trim().toUpperCase());
          if (entry) candidates.set(entry.serial, entry.meta);
        }
      }

      if (candidates.size === 0) continue;

      const existingChains =
        row.dcr_chains && typeof row.dcr_chains === 'object' ? row.dcr_chains : {};
      let needsUpdate = !row.has_dcr;
      if (!needsUpdate) {
        for (const s of candidates.keys()) {
          if (!existingChains[s]) {
            needsUpdate = true;
            break;
          }
        }
      }

      if (needsUpdate) {
        matchedApps.set(String(row.id), candidates);
      } else {
        alreadySynced++;
      }
    }

    scanned += data.length;
    if (scanned % 10000 === 0 || data.length < 1000) {
      console.log(
        `  Scanned ${scanned.toLocaleString()} rows -> ${matchedApps.size.toLocaleString()} to sync (${alreadySynced.toLocaleString()} already synced)`
      );
    }
    if (data.length < 1000) break;
  }

  // Step 2: Check claimed app_nums from master JSON that weren't in the modules_count > 0 scan
  const missingAppNums = [];
  for (const appUp of appUpperMap.keys()) {
    if (!seenAppNumsUpper.has(appUp)) {
      const firstEntry = appUpperMap.get(appUp)[0];
      const origApp = String(firstEntry?.meta?.app || '').trim();
      if (origApp) missingAppNums.push(origApp);
    }
  }

  if (missingAppNums.length > 0) {
    console.log(`Checking ${missingAppNums.length.toLocaleString()} remaining claimed NP app_nums...`);
    const appCheckTasks = [];
    for (let i = 0; i < missingAppNums.length; i += 200) {
      const chunk = missingAppNums.slice(i, i + 200);
      appCheckTasks.push(async () => {
        const { data, error } = await supabase
          .from('national_portal_applications')
          .select('id, app_num, panel_serials, has_dcr, dcr_chains:raw_details->dcrChains')
          .in('app_num', chunk);
        if (error) throw error;
        for (const row of data || []) {
          const appUp = String(row.app_num || '').trim().toUpperCase();
          const candidates = new Map();
          if (appUp && appUpperMap.has(appUp)) {
            for (const e of appUpperMap.get(appUp)) {
              candidates.set(e.serial, e.meta);
            }
          }
          if (candidates.size === 0) continue;
          const existingChains =
            row.dcr_chains && typeof row.dcr_chains === 'object' ? row.dcr_chains : {};
          let needsUpdate = !row.has_dcr;
          if (!needsUpdate) {
            for (const s of candidates.keys()) {
              if (!existingChains[s]) {
                needsUpdate = true;
                break;
              }
            }
          }
          if (needsUpdate) matchedApps.set(String(row.id), candidates);
          else alreadySynced++;
        }
      });
    }
    await runParallel(appCheckTasks, 6);
  }

  const idsToUpdate = Array.from(matchedApps.keys());
  console.log(`Total applications needing Supabase DCR update: ${idsToUpdate.length.toLocaleString()}`);
  if (idsToUpdate.length === 0) {
    console.log('Everything is already up to date in Supabase.');
    return;
  }

  // Step 3: Fetch full rows for matched IDs & batch upsert in batches of 50
  const nowIso = new Date().toISOString();
  let totalAppsUpdated = 0;
  let totalPanelsLinked = 0;

  const batchChunks = [];
  for (let i = 0; i < idsToUpdate.length; i += 50) {
    batchChunks.push(idsToUpdate.slice(i, i + 50));
  }

  const upsertTasks = batchChunks.map((idChunk, idx) => async () => {
    const { data: fullRows, error: fetchErr } = await supabase
      .from('national_portal_applications')
      .select('*')
      .in('id', idChunk);
    if (fetchErr) throw fetchErr;
    if (!fullRows || fullRows.length === 0) return;

    const payloads = [];
    let batchPanels = 0;

    for (const row of fullRows) {
      const candidates = matchedApps.get(String(row.id));
      if (!candidates) continue;

      const nextRaw =
        row.raw_details && typeof row.raw_details === 'object' ? { ...row.raw_details } : {};
      const nextChains =
        nextRaw.dcrChains && typeof nextRaw.dcrChains === 'object' ? { ...nextRaw.dcrChains } : {};

      let firstMfr = '';
      for (const [serial, meta] of candidates.entries()) {
        if (!firstMfr && meta.mfr) firstMfr = meta.mfr;
        const hops = Array.isArray(meta.hops)
          ? meta.hops
          : meta.cid != null && Array.isArray(chainCatalog[meta.cid])
          ? chainCatalog[meta.cid]
          : [];
        const rawChain =
          meta.raw_chain ||
          hops.map((h) => (h.invoice ? `${h.name} (${h.invoice})` : h.name)).join(' -> ');
        nextChains[serial] = {
          serial,
          app_id: meta.app || row.app_num || '',
          raw_chain: rawChain,
          hops,
          mfr: meta.mfr || hops[0]?.name || '',
          status: meta.status || '',
          imported_at: nowIso,
        };
        batchPanels++;
      }
      nextRaw.dcrChains = nextChains;

      payloads.push({
        ...row,
        raw_details: nextRaw,
        has_dcr: true,
        ...(firstMfr && !row.module_mfr ? { module_mfr: firstMfr } : {}),
        updated_at: nowIso,
      });
    }

    if (payloads.length === 0) return;

    const { data: upData, error: upErr } = await supabase
      .from('national_portal_applications')
      .upsert(payloads, { onConflict: 'id' })
      .select('id');
    if (upErr) throw upErr;

    totalAppsUpdated += upData ? upData.length : 0;
    totalPanelsLinked += batchPanels;

    if ((idx + 1) % 10 === 0 || idx === batchChunks.length - 1) {
      console.log(
        `  Synced batch ${idx + 1}/${batchChunks.length}: ${totalAppsUpdated.toLocaleString()} apps, ${totalPanelsLinked.toLocaleString()} panel links`
      );
    }
  });

  await runParallel(upsertTasks, 4);

  console.log('\nSupabase Sync Complete!');
  console.log(`  Apps updated: ${totalAppsUpdated.toLocaleString()}`);
  console.log(`  Panel links persisted: ${totalPanelsLinked.toLocaleString()}`);
  console.log(`  Apps already synced: ${alreadySynced.toLocaleString()}`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
