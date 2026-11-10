import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  compactDcrMasterForStorage,
  rebuildVendorIntelligenceAndRanking,
  resolveSupabaseServiceKey,
  writeJsonAtomic,
} from './scripts/dcr_master_helpers.mjs';

const viteEnv = loadEnv('development', __dirname, '');
const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY =
  viteEnv.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  viteEnv.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

function groundReportsPersistencePlugin(): Plugin {
  return {
    name: 'ground-reports-persistence',
    configureServer(server) {
      server.middlewares.use('/api/save-ground-reports', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              if (Array.isArray(data)) {
                const targetPath = path.resolve(__dirname, 'public/s_numbers_ground_reports.json');
                fs.writeFileSync(targetPath, JSON.stringify(data), 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, count: data.length }));
                return;
              }
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Expected JSON array' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end();
        }
      });

      server.middlewares.use('/api/import-dcr-chains', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const items = Array.isArray(payload?.items) ? payload.items : [];
            if (items.length === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'No DCR hierarchy items provided' }));
              return;
            }

            const masterPath = path.resolve(__dirname, 'public/dcr_supply_chain_master.json');
            const emptyMaster = { summary: {}, vendor_intelligence: {}, snumber_dcr_map: {}, serial_metadata: {}, chain_catalog: {}, manufacturers_ranking: [], dcr_serials_list: [] };
            let master: any = emptyMaster;
            if (fs.existsSync(masterPath)) {
              const rawMaster = fs.readFileSync(masterPath, 'utf-8').trim();
              if (rawMaster) {
                try {
                  master = JSON.parse(rawMaster);
                } catch {
                  master = emptyMaster;
                }
              }
            }

            if (!master.serial_metadata) master.serial_metadata = {};
            if (!master.snumber_dcr_map) master.snumber_dcr_map = {};
            if (!master.chain_catalog) master.chain_catalog = {};
            if (!Array.isArray(master.dcr_serials_list)) master.dcr_serials_list = [];
            if (!master.summary) master.summary = {};

            const serialSet = new Set<string>(master.dcr_serials_list);
            const serialUpperSet = new Set<string>(master.dcr_serials_list.map((s: string) => String(s).trim().toUpperCase()));
            const importedUpperMap = new Map<string, { serial: string; meta: any; item: any }>();
            let addedSerials = 0;
            let updatedSerials = 0;

            for (const item of items) {
              const serial = String(item?.serial || '').trim();
              if (!serial) continue;
              const upper = serial.toUpperCase();

              const isNew = !master.serial_metadata[serial] && !serialUpperSet.has(upper);
              if (!serialSet.has(serial)) {
                serialSet.add(serial);
              }
              serialUpperSet.add(upper);

              const prev = master.serial_metadata[serial] || {};
              const prevHops =
                Array.isArray(prev.hops) && prev.hops.length > 0
                  ? prev.hops
                  : prev.cid != null && Array.isArray(master.chain_catalog[prev.cid])
                  ? master.chain_catalog[prev.cid]
                  : [];
              const mergedHops = Array.isArray(item.hops) && item.hops.length > 0 ? item.hops : prevHops;
              const mergedRawChain =
                item.raw_chain ||
                prev.raw_chain ||
                mergedHops.map((h: any) => (h.invoice ? `${h.name} (${h.invoice})` : h.name)).join(' -> ');

              master.serial_metadata[serial] = {
                ...prev,
                app: item.app_id || prev.app || '',
                mfr: item.mfr || prev.mfr || '',
                raw_chain: mergedRawChain,
                hops: mergedHops,
              };

              // Keep full uncompacted copy for Supabase sync & S-Number cross-linking
              importedUpperMap.set(upper, {
                serial,
                meta: { ...master.serial_metadata[serial] },
                item,
              });
              if (isNew) addedSerials++;
              else updatedSerials++;
            }

            master.dcr_serials_list = Array.from(serialSet);

            // Cross-link against S-Numbers Ground Reports (supports both formatted & raw uppercase APEPDCL JSON)
            let mappedSNumbers = 0;
            const groundPath = path.resolve(__dirname, 'public/s_numbers_ground_reports.json');
            if (fs.existsSync(groundPath)) {
              try {
                const reports = JSON.parse(fs.readFileSync(groundPath, 'utf-8'));
                if (Array.isArray(reports)) {
                  for (const r of reports) {
                    const compNo = String(r.complain_no || r.snumber || r.COMP_NO || r.COMPLAINT_NO || '').trim();
                    if (!compNo) continue;

                    let panelSerials: string[] = Array.isArray(r.solar_panel_serials) ? r.solar_panel_serials : [];
                    if (panelSerials.length === 0) {
                      const rawTxt = r.SOLAR_PANEL_PRODUCT_SERIAL_NUMBER || r.SERIELNUMBER || r.panel_serials_text || '';
                      if (typeof rawTxt === 'string' && rawTxt.trim()) {
                        panelSerials = rawTxt
                          .split(/[,;\n\r\s]+/)
                          .map((s) => s.trim())
                          .filter((s) => s && s !== '-' && s.toUpperCase() !== 'NULL');
                      }
                    }
                    if (panelSerials.length === 0) continue;

                    const matchedSno = panelSerials.find((s: string) =>
                      importedUpperMap.has(String(s).trim().toUpperCase())
                    );
                    if (!matchedSno) continue;

                    const matchedEntry = importedUpperMap.get(String(matchedSno).trim().toUpperCase())!;
                    const meta = matchedEntry.meta;
                    const consumerName = r.consumer_name || r.COMP_NAME || r.NAME || '';
                    master.serial_metadata[matchedEntry.serial].sno = compNo;
                    if (consumerName && !master.serial_metadata[matchedEntry.serial].consumer) {
                      master.serial_metadata[matchedEntry.serial].consumer = consumerName;
                    }

                    master.snumber_dcr_map[compNo] = {
                      ...(master.snumber_dcr_map[compNo] || {}),
                      snumber: compNo,
                      complain_no: compNo,
                      app_id: meta.app || master.snumber_dcr_map[compNo]?.app_id || r.consumer_scno_id || r.CONSUMER_SCNO_ID || '',
                      matched_serial: matchedEntry.serial,
                      raw_chain: meta.raw_chain,
                      hops: meta.hops,
                      consumer_name: consumerName,
                      vendor_name: r.vendor_name || r.VENDOR_NAME || '',
                      district: r.district || r.DISTRICT_INSTALLATION || '',
                      section: r.section_name || r.SEC_NAME || r.SECNAME || '',
                      manufacturer: meta.mfr || r.solar_panel_manufacturer || r.SOLAR_PANEL_PRODUCT_MANUFACTURER || '',
                    };
                    mappedSNumbers++;
                  }
                }
              } catch { /* ignore ground report cross-link error */ }
            }

            // Rebuild vendor_intelligence & manufacturers_ranking so DCR Supply Chain Tracker updates immediately
            rebuildVendorIntelligenceAndRanking(master);
            // Compact repeated hops into chain_catalog and write atomically so disk errors never truncate to 0B
            compactDcrMasterForStorage(master);
            writeJsonAtomic(masterPath, master);

            // Persist per-panel DCR hierarchies into Supabase national_portal_applications.raw_details.dcrChains
            let supabaseUpdatedApps = 0;
            let supabaseLinkedPanels = 0;
            let supabaseQueuedApps = 0;
            let supabaseError: string | undefined;

            const freshEnv = loadEnv('development', __dirname, '');
            const sbUrl = freshEnv.VITE_SUPABASE_URL || SUPABASE_URL;
            const serviceRoleKey = resolveSupabaseServiceKey(__dirname, freshEnv);

            if (!sbUrl || !serviceRoleKey) {
              supabaseError =
                'Saved locally to master JSON. Add SUPABASE_SERVICE_ROLE_KEY to .env to also sync into Supabase.';
            } else {
              try {
                const supabase = createClient(sbUrl, serviceRoleKey);
                const slimMatchedById = new Map<string, any>();

                const runParallel = async <T,>(
                  tasks: Array<() => Promise<T>>,
                  concurrency: number
                ): Promise<T[]> => {
                  const results: T[] = [];
                  for (let i = 0; i < tasks.length; i += concurrency) {
                    const batch = await Promise.all(tasks.slice(i, i + concurrency).map((fn) => fn()));
                    results.push(...batch);
                  }
                  return results;
                };

                // 1) Fast indexed parallel lookup by claimed NP application numbers (slim columns only)
                const uniqueAppIds = Array.from(
                  new Set(
                    items
                      .map((it: any) => String(it?.app_id || '').trim())
                      .filter((a: string) => a.length > 0)
                  )
                );

                const appTasks: Array<() => Promise<void>> = [];
                for (let i = 0; i < uniqueAppIds.length; i += 300) {
                  const chunk = uniqueAppIds.slice(i, i + 300);
                  appTasks.push(async () => {
                    const { data: rows, error } = await supabase
                      .from('national_portal_applications')
                      .select('id, app_num, panel_serials, has_dcr, dcr_chains:raw_details->dcrChains')
                      .in('app_num', chunk);
                    if (error) throw error;
                    for (const r of rows || []) {
                      slimMatchedById.set(String(r.id), r);
                    }
                  });
                }
                await runParallel(appTasks, 8);

                // Track serials already covered by app_num matches
                const coveredSerialsUpper = new Set<string>();
                for (const r of slimMatchedById.values()) {
                  if (Array.isArray(r.panel_serials)) {
                    for (const s of r.panel_serials) {
                      const up = String(s || '').trim().toUpperCase();
                      if (up) coveredSerialsUpper.add(up);
                    }
                  }
                }

                // 2) Only run overlaps() for items with NO claimed app_id (and <= 1500 items to prevent DB timeouts)
                const noAppSerials: string[] = [];
                for (const entry of importedUpperMap.values()) {
                  const appUp = String(entry.item?.app_id || '').trim().toUpperCase();
                  if (appUp) continue;
                  if (coveredSerialsUpper.has(entry.serial.toUpperCase())) continue;
                  noAppSerials.push(entry.serial);
                }

                if (noAppSerials.length > 0 && noAppSerials.length <= 1500) {
                  const overlapTasks: Array<() => Promise<void>> = [];
                  for (let i = 0; i < noAppSerials.length; i += 150) {
                    const chunk = noAppSerials.slice(i, i + 150);
                    overlapTasks.push(async () => {
                      const { data: rows, error } = await supabase
                        .from('national_portal_applications')
                        .select('id, app_num, panel_serials, has_dcr, dcr_chains:raw_details->dcrChains')
                        .overlaps('panel_serials', chunk);
                      if (error) throw error;
                      for (const r of rows || []) {
                        slimMatchedById.set(String(r.id), r);
                      }
                    });
                  }
                  await runParallel(overlapTasks, 6);
                }

                // Group imported items by app_num (upper) for fast matching
                const itemsByAppUpper = new Map<string, any[]>();
                for (const entry of importedUpperMap.values()) {
                  const appKey = String(entry.item?.app_id || '').trim().toUpperCase();
                  if (!appKey) continue;
                  const list = itemsByAppUpper.get(appKey) || [];
                  list.push(entry);
                  itemsByAppUpper.set(appKey, list);
                }

                // Determine ONLY rows that actually need new/updated dcrChains in Supabase
                const rowMatches = new Map<string, Map<string, { serial: string; meta: any }>>();
                for (const row of slimMatchedById.values()) {
                  const rowSerialsUpper = new Set<string>(
                    (Array.isArray(row.panel_serials) ? row.panel_serials : [])
                      .map((s: any) => String(s || '').trim().toUpperCase())
                      .filter(Boolean)
                  );
                  const rowAppUpper = String(row.app_num || '').trim().toUpperCase();

                  const matchedEntriesMap = new Map<string, { serial: string; meta: any }>();
                  if (rowAppUpper && itemsByAppUpper.has(rowAppUpper)) {
                    for (const entry of itemsByAppUpper.get(rowAppUpper)!) {
                      matchedEntriesMap.set(entry.serial, { serial: entry.serial, meta: entry.meta });
                    }
                  }
                  for (const sUp of rowSerialsUpper) {
                    const entry = importedUpperMap.get(sUp);
                    if (entry) {
                      matchedEntriesMap.set(entry.serial, { serial: entry.serial, meta: entry.meta });
                    }
                  }
                  if (matchedEntriesMap.size === 0) continue;

                  const existingChains =
                    row.dcr_chains && typeof row.dcr_chains === 'object' ? row.dcr_chains : {};
                  let needsUpdate = !row.has_dcr;
                  if (!needsUpdate) {
                    for (const serial of matchedEntriesMap.keys()) {
                      if (!existingChains[serial]) {
                        needsUpdate = true;
                        break;
                      }
                    }
                  }
                  if (needsUpdate) {
                    rowMatches.set(String(row.id), matchedEntriesMap);
                  }
                }

                const idsToUpdate = Array.from(rowMatches.keys());

                const syncMatchedRows = async () => {
                  const nowIso = new Date().toISOString();
                  const chunks: string[][] = [];
                  for (let i = 0; i < idsToUpdate.length; i += 50) {
                    chunks.push(idsToUpdate.slice(i, i + 50));
                  }

                  const batchTasks = chunks.map((idChunk) => async () => {
                    const { data: fullRows, error: fetchErr } = await supabase
                      .from('national_portal_applications')
                      .select('*')
                      .in('id', idChunk);
                    if (fetchErr) throw fetchErr;
                    if (!fullRows || fullRows.length === 0) return;

                    const batchPayloads: any[] = [];
                    let panelsInBatch = 0;

                    for (const row of fullRows) {
                      const matchedEntriesMap = rowMatches.get(String(row.id));
                      if (!matchedEntriesMap) continue;

                      const nextRaw =
                        row.raw_details && typeof row.raw_details === 'object' ? { ...row.raw_details } : {};
                      const nextChains =
                        nextRaw.dcrChains && typeof nextRaw.dcrChains === 'object' ? { ...nextRaw.dcrChains } : {};

                      let firstMfr = '';
                      for (const { serial, meta } of matchedEntriesMap.values()) {
                        if (!firstMfr && meta.mfr) firstMfr = meta.mfr;
                        nextChains[serial] = {
                          serial,
                          app_id: meta.app || row.app_num || '',
                          raw_chain: meta.raw_chain || '',
                          hops: meta.hops || [],
                          mfr: meta.mfr || '',
                          status: meta.status || '',
                          imported_at: nowIso,
                        };
                        panelsInBatch++;
                      }
                      nextRaw.dcrChains = nextChains;

                      batchPayloads.push({
                        ...row,
                        raw_details: nextRaw,
                        has_dcr: true,
                        ...(firstMfr && !row.module_mfr ? { module_mfr: firstMfr } : {}),
                        updated_at: nowIso,
                      });
                    }

                    if (batchPayloads.length === 0) return;

                    const { data: upData, error: upErr } = await supabase
                      .from('national_portal_applications')
                      .upsert(batchPayloads, { onConflict: 'id' })
                      .select('id');
                    if (upErr) {
                      if (!supabaseError) supabaseError = upErr.message;
                    } else if (upData && upData.length > 0) {
                      supabaseUpdatedApps += upData.length;
                      supabaseLinkedPanels += panelsInBatch;
                    }
                  });

                  await runParallel(batchTasks, 4);
                };

                if (idsToUpdate.length > 400) {
                  // Huge bulk import: return immediately after local master JSON save and flush Supabase in background
                  supabaseQueuedApps = idsToUpdate.length;
                  void syncMatchedRows().catch((err) =>
                    console.warn('Background Supabase DCR sync error:', err)
                  );
                } else if (idsToUpdate.length > 0) {
                  await syncMatchedRows();
                  if (supabaseUpdatedApps === 0 && !supabaseError) {
                    supabaseError =
                      'Supabase RLS blocked writes (0 rows updated). Check SUPABASE_SERVICE_ROLE_KEY in .env.';
                  }
                }
              } catch (sbErr: any) {
                supabaseError = sbErr?.message || String(sbErr);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                addedSerials,
                updatedSerials,
                mappedSNumbers,
                totalSerials: master.dcr_serials_list.length,
                supabaseUpdatedApps,
                supabaseLinkedPanels,
                supabaseQueuedApps,
                supabaseError,
              })
            );
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

// ─── Helper: same transform logic as build_national_portal_catalog.mjs ───────
function extractSerials(list: any[]): string[] {
  if (!Array.isArray(list)) return [];
  const serials: string[] = [];
  for (const item of list) {
    if (!item) continue;
    if (Array.isArray(item.serialNumbers)) {
      for (const s of item.serialNumbers) {
        if (typeof s === 'string') {
          const t = s.trim(); if (t) serials.push(t);
        } else if (s && typeof s === 'object' && s.serialNumber) {
          const t = String(s.serialNumber).trim(); if (t) serials.push(t);
        }
      }
    } else if (item.serialNumber && typeof item.serialNumber === 'string') {
      const t = item.serialNumber.trim(); if (t) serials.push(t);
    }
  }
  return Array.from(new Set(serials));
}

function extractMfrs(list: any[]): string[] {
  if (!Array.isArray(list)) return [];
  const mfrs: string[] = [];
  for (const item of list) {
    if (item && item.manufacturerName && typeof item.manufacturerName === 'string') {
      const t = item.manufacturerName.trim();
      if (t && !mfrs.includes(t)) mfrs.push(t);
    }
  }
  return mfrs;
}

function rawToSummary(d: any) {
  const appId = String(d.appId);
  const panelSerials = extractSerials(d.moduleList);
  const invSerials = extractSerials(d.inverterList);
  const moduleMfrs = extractMfrs(d.moduleList);
  const invMfrs = extractMfrs(d.inverterList);
  return {
    id: appId,
    appNum: d.applicationNumber || d.registrationNumber || '',
    name: d.consumerName || d.applicantName || 'Unknown Consumer',
    phone: d.mobile || '',
    email: d.email || '',
    sc: d.consumerNo || '',
    state: d.stateName || '',
    district: d.districtName || '',
    circle: d.circleName || '',
    division: d.divisionName || '',
    subdiv: d.subDivisionName || '',
    village: d.villagePanchayatName || d.villageName || '',
    address: d.address || '',
    pincode: d.pinCode || '',
    cap: Number(d.appliedCapacity) || Number(d.pvCapacity) || 0,
    sanctionLoad: Number(d.sanctionLoad) || 0,
    stepId: String(d.stepId || ''),
    step: d.stepName || 'Unknown Step',
    vendor: d.vendorName || '',
    subsidyAmt: Number(d.subsidyAmount) || 0,
    subsidyStatus: d.subsidyStatus || '',
    modulesCount: Array.isArray(d.moduleList) ? d.moduleList.length : 0,
    invertersCount: Array.isArray(d.inverterList) ? d.inverterList.length : 0,
    docsCount: Array.isArray(d.documentList) ? d.documentList.length : 0,
    hasDcr: Boolean(d.dcrType && d.dcrType.toLowerCase().includes('dcr')),
    panelSerials,
    invSerials,
    moduleMfr: moduleMfrs.join(', '),
    invMfr: invMfrs.join(', '),
    loanAppNo: d.loanApplicationNumber || '',
    loanAmt: Number(d.sanctionAmount) || 0,
    loanStatus: d.currentLoanStatus || '',
    loanDate: d.sanctionDate || '',
    bankName: d.bankName || '',
    accountNo: d.accountNumber || '',
    ifsc: d.ifscCode || '',
    accountHolder: d.accountHolderName || '',
    netMeterDate: d.netMeteringDate || '',
    submissionDate: d.appSubmissionDate || d.submittedDate || d.appliedDate || '',
  };
}

function nationalPortalImportPlugin(): Plugin {
  return {
    name: 'national-portal-import',
    configureServer(server) {
      server.middlewares.use('/api/import-national-portal', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            // body: { records: RawPortalRecord[] }
            const rawRecords: any[] = Array.isArray(body.records) ? body.records : [];

            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

            let added = 0, updated = 0, skipped = 0;
            const dbRows = rawRecords.map((d: any) => {
              if (!d || d.error || !d.appId) { skipped++; return null; }
              const pSerials = extractSerials(d.moduleList);
              const iSerials = extractSerials(d.inverterList);
              return {
                id: String(d.appId),
                app_num: d.applicationNumber || d.registrationNumber || null,
                name: d.consumerName || d.applicantName || null,
                phone: (d.mobile || '').replace(/\D/g, '').slice(-10) || null,
                email: d.email || null,
                sc: (d.consumerNo || d.consumerNumber || '').trim() || null,
                state: d.stateName || null,
                district: d.districtName || null,
                circle: d.circleName || null,
                division: d.divisionName || null,
                subdiv: d.subDivisionName || null,
                village: d.villagePanchayatName || d.villageName || null,
                address: d.address || null,
                pincode: d.pinCode ? String(d.pinCode) : null,
                cap: Number(d.appliedCapacity) || Number(d.pvCapacity) || 0,
                sanction_load: Number(d.sanctionLoad) || 0,
                step_id: d.stepId ? String(d.stepId) : null,
                step: d.stepName || null,
                vendor: d.vendorName || null,
                subsidy_amt: Number(d.subsidyAmount) || 0,
                subsidy_status: d.subsidyStatus || null,
                modules_count: (d.moduleList || []).length,
                inverters_count: (d.inverterList || []).length,
                docs_count: (d.documentList || []).length,
                has_dcr: Boolean(d.dcrType || d.hasDcr),
                panel_serials: pSerials,
                inv_serials: iSerials,
                module_mfr: d.brand || null,
                inv_mfr: null,
                loan_app_no: d.loanApplicationNumber || null,
                loan_amt: Number(d.sanctionAmount) || 0,
                loan_status: d.currentLoanStatus || null,
                bank_name: d.bankName || null,
                account_no: d.accountNumber || null,
                ifsc: d.ifscCode || null,
                account_holder: d.accountHolderName || null,
                net_meter_date: d.netMeteringDate || null,
                submission_date: d.appSubmissionDate || d.submittedDate || null,
                raw_details: d,
                updated_at: new Date().toISOString()
              };
            }).filter(Boolean);

            if (dbRows.length > 0) {
              const { error: upErr } = await supabase
                .from('national_portal_applications')
                .upsert(dbRows, { onConflict: 'id' });
              if (!upErr) added = dbRows.length;
            }

            // Update Supabase lead_prospects and customers connection
            let prospectsUpdated = 0;
            let customersUpdated = 0;

            if (SUPABASE_URL && SUPABASE_SERVICE_KEY && rawRecords.length > 0) {
              try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

                // Map of SC -> National Portal Record for deep field-level enrichment
                const scToRecord = new Map<string, any>();
                for (const d of rawRecords) {
                  if (!d || d.error || !d.appId) continue;
                  const sc = (d.consumerNo || d.consumerNumber || '').trim();
                  if (sc && sc.length > 5) {
                    scToRecord.set(sc, d);
                  }
                }

                const allScs = Array.from(scToRecord.keys());
                const BATCH = 100;
                for (let i = 0; i < allScs.length; i += BATCH) {
                  const chunk = allScs.slice(i, i + BATCH);
                  const { data: matchedProspects } = await supabase
                    .from('lead_prospects')
                    .select('id, sc_number, customer_name, np_registration_number, national_portal_status, applied_solar_load_kw, mobile_number, email, village_name, remark')
                    .in('sc_number', chunk);

                  if (matchedProspects && matchedProspects.length > 0) {
                    for (const p of matchedProspects) {
                      const d = scToRecord.get(p.sc_number);
                      if (!d) continue;

                      const step = d.stepName || 'Registered on National Portal';
                      const npNum = (d.applicationNumber || d.registrationNumber || (d.appId ? `NP-${d.appId}` : '')).trim();
                      const name = (d.consumerName || d.applicantName || '').trim();
                      const cap = Number(d.appliedCapacity) || Number(d.pvCapacity) || 0;
                      const phone = (d.mobile || '').replace(/\D/g, '').slice(-10);
                      const email = (d.email || '').trim();
                      const village = (d.villagePanchayatName || d.villageName || '').trim();
                      const vendor = (d.vendorName || '').trim();

                      const updates: Record<string, any> = {};

                      if (step && p.national_portal_status !== step) {
                        updates.national_portal_status = step;
                      }
                      if (npNum && (!p.np_registration_number || p.np_registration_number !== npNum)) {
                        updates.np_registration_number = npNum;
                      }
                      if (name && (!p.customer_name || p.customer_name.trim() === '')) {
                        updates.customer_name = name;
                      }
                      if (cap > 0 && (!p.applied_solar_load_kw || p.applied_solar_load_kw === 0)) {
                        updates.applied_solar_load_kw = cap;
                      }
                      if (phone.length === 10 && (!p.mobile_number || p.mobile_number.length < 10)) {
                        updates.mobile_number = phone;
                      }
                      if (email && email !== '-' && (!p.email || p.email.trim() === '')) {
                        updates.email = email;
                      }
                      if (village && village !== '0' && (!p.village_name || p.village_name === '0')) {
                        updates.village_name = village;
                      }
                      if (vendor && (!p.remark || !p.remark.includes(vendor))) {
                        const vendorTag = `[NP Vendor: ${vendor}]`;
                        updates.remark = p.remark ? `${p.remark} ${vendorTag}` : vendorTag;
                      }

                      if (Object.keys(updates).length > 0) {
                        updates.updated_at = new Date().toISOString();
                        const { error: upErr } = await supabase
                          .from('lead_prospects')
                          .update(updates)
                          .eq('id', p.id);
                        if (!upErr) prospectsUpdated++;
                      }
                    }
                  }
                }

                // Also update CRM customers if any match
                for (const d of rawRecords) {
                  if (!d || d.error || !d.appId) continue;
                  const sc = (d.consumerNo || d.consumerNumber || '').trim();
                  const np = (d.applicationNumber || d.registrationNumber || '').trim();
                  if (!sc && !np) continue;

                  const pSerials = extractSerials(d.moduleList);
                  const iSerials = extractSerials(d.inverterList);
                  const payload: any = { updated_at: new Date().toISOString() };
                  if (pSerials.length > 0) payload.panel_serial_numbers = pSerials.join(', ');
                  if (iSerials.length > 0) payload.inverter_serial_number = iSerials[0];
                  if (d.vendorName) payload.vendor_name = d.vendorName;
                  if (d.loanApplicationNumber) payload.loan_reference_number = d.loanApplicationNumber;
                  if (d.sanctionAmount) payload.loan_sanctioned_amount = Number(d.sanctionAmount);
                  if (d.subsidyAmount) payload.subsidy_amount = Number(d.subsidyAmount);
                  if (d.stepName) payload.portal_current_step_name = d.stepName;
                  if (d.moduleList) payload.portal_module_list = d.moduleList;
                  if (d.inverterList) payload.portal_inverter_list = d.inverterList;

                  let custQuery = supabase.from('customers').update(payload);
                  if (sc) custQuery = custQuery.eq('consumer_number', sc);
                  else if (np) custQuery = custQuery.eq('application_ref_no', np);
                  const { data: cUp } = await custQuery.select('id');
                  if (cUp) customersUpdated += cUp.length;
                }
              } catch (syncErr) {
                console.warn('Could not sync imported records to Supabase:', syncErr);
              }
            }

            res.end(JSON.stringify({
              success: true,
              added,
              updated,
              skipped,
              total: finalList.length,
              prospectsUpdated,
              customersUpdated
            }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), groundReportsPersistencePlugin(), nationalPortalImportPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/apepdcl': {
        target: 'https://epccbopn.apeasternpower.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apepdcl/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
      // Proxy Meta Graph API calls to avoid CORS from browser
      '/api/meta': {
        target: 'https://graph.facebook.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/meta/, ''),
        secure: true,
      },
    },
  },
});
