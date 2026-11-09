import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

            const summaryPath = path.resolve(__dirname, 'public/national_portal_summary.json');
            const catalogPath = path.resolve(__dirname, 'public/national_portal_catalog.json');
            const distSummaryPath = path.resolve(__dirname, 'dist/national_portal_summary.json');
            const distCatalogPath = path.resolve(__dirname, 'dist/national_portal_catalog.json');

            // Load existing
            let summaryList: any[] = [];
            let catalog: Record<string, any> = {};
            try { summaryList = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')); } catch {}
            try { catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')); } catch {}

            // Build a map of existing entries for fast O(1) lookup/update
            const summaryMap = new Map<string, any>();
            for (const s of summaryList) summaryMap.set(String(s.id), s);

            let added = 0, updated = 0, skipped = 0;
            for (const d of rawRecords) {
              if (!d || d.error || !d.appId) { skipped++; continue; }
              const appId = String(d.appId);
              const summary = rawToSummary(d);
              const isNew = !summaryMap.has(appId);
              summaryMap.set(appId, summary);
              catalog[appId] = d;
              if (isNew) added++; else updated++;
            }

            // Re-sort and write
            const finalList = Array.from(summaryMap.values())
              .sort((a: any, b: any) => Number(b.id) - Number(a.id));

            fs.writeFileSync(summaryPath, JSON.stringify(finalList), 'utf-8');
            fs.writeFileSync(catalogPath, JSON.stringify(catalog), 'utf-8');
            try {
              if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
                fs.writeFileSync(distSummaryPath, JSON.stringify(finalList), 'utf-8');
                fs.writeFileSync(distCatalogPath, JSON.stringify(catalog), 'utf-8');
              }
            } catch {}

            // Update Supabase lead_prospects and customers connection
            let prospectsUpdated = 0;
            let customersUpdated = 0;
            const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rlwcqmlspvddfscyngfw.supabase.co';
            const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';

            if (SUPABASE_URL && SERVICE_KEY && rawRecords.length > 0) {
              try {
                const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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
