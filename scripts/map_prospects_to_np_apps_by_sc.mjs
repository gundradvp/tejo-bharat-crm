import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CRM_ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(CRM_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rlwcqmlspvddfscyngfw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const NP_APP_STEPS = [
  'Application', 'Cancel', 'Feasibility', 'Inspection', 'Installation',
  'Registration', 'Subsidy Disbursal', 'Subsidy Request', 'Unknown Step',
  'Upload Agreement', 'Vendor Selection',
];

function extractNPId(npReg) {
  if (!npReg) return null;
  let str = String(npReg).trim();
  if (!str || str === '-' || str === '--' || str === 'N/A' || str === 'NA') return null;
  str = str.replace(/\/\d{2,4}$/, '');
  const lastHyphen = str.lastIndexOf('-');
  if (lastHyphen !== -1) str = str.slice(lastHyphen + 1).trim();
  const slashIdx = str.indexOf('/');
  if (slashIdx !== -1) str = str.slice(0, slashIdx).trim();
  return str.length > 0 ? str : null;
}

async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (poolLimit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= poolLimit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(ret);
}

async function main() {
  console.log('============================================================');
  console.log('🔗 Mapping Lead Prospects <-> National Portal Apps');
  console.log('   (by Service Number AND NP Registration Number / App ID)');
  console.log('============================================================');

  // 1. Fetch all National Portal Applications
  console.log('\n📖 Fetching National Portal Apps from Supabase...');
  const { count: totalNpa } = await supabase
    .from('national_portal_applications')
    .select('*', { count: 'exact', head: true });

  const PAGE_SIZE = 1000;
  const pageStarts = [];
  for (let offset = 0; offset < (totalNpa || 0); offset += PAGE_SIZE) {
    pageStarts.push(offset);
  }

  const scMap = new Map();
  const appNumMap = new Map();
  const idMap = new Map();
  let fetchedNpa = 0;

  await asyncPool(8, pageStarts, async (offset) => {
    const { data, error } = await supabase
      .from('national_portal_applications')
      .select('id, sc, app_num, step, cap, name, phone, submission_date')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (data) {
      for (const row of data) {
        const sc = (row.sc || '').trim();
        if (sc) {
          const existing = scMap.get(sc);
          if (!existing || ((row.submission_date || '') > (existing.submission_date || ''))) {
            scMap.set(sc, row);
          }
        }
        const appNum = (row.app_num || '').trim();
        if (appNum) {
          appNumMap.set(appNum.toUpperCase(), row);
        }
        const idStr = String(row.id || '').trim();
        if (idStr) {
          idMap.set(idStr, row);
          const stripped = idStr.replace(/^0+/, '');
          if (stripped) idMap.set(stripped, row);
        }
      }
      fetchedNpa += data.length;
      process.stdout.write(`\r   Fetched ${fetchedNpa.toLocaleString('en-IN')} / ${(totalNpa || 0).toLocaleString('en-IN')} NP Apps...`);
    }
  });

  console.log(`\n✅ Indexed ${scMap.size.toLocaleString('en-IN')} SCs, ${appNumMap.size.toLocaleString('en-IN')} App Nums, ${idMap.size.toLocaleString('en-IN')} IDs.`);

  // 2. Scan ALL lead_prospects in batches (checking both SC Number and NP Registration Number)
  console.log('\n🔍 Scanning Lead Prospects to match by SC # or NP Reg #...');
  const { count: totalLp } = await supabase
    .from('lead_prospects')
    .select('*', { count: 'exact', head: true });

  const lpPageStarts = [];
  for (let offset = 0; offset < (totalLp || 0); offset += PAGE_SIZE) {
    lpPageStarts.push(offset);
  }

  const toUpdate = [];
  let scannedLp = 0;
  let matchedBySc = 0;
  let matchedByNpReg = 0;
  const npStepSet = new Set(NP_APP_STEPS);

  await asyncPool(8, lpPageStarts, async (offset) => {
    const { data, error } = await supabase
      .from('lead_prospects')
      .select('id, sc_number, national_portal_status, np_registration_number, applied_solar_load_kw, customer_name, mobile_number')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('\n❌ Error scanning lead_prospects:', error.message);
      return;
    }

    if (data) {
      for (const p of data) {
        const scClean = (p.sc_number || '').trim();
        const npRegClean = (p.np_registration_number || '').trim();

        let npa = scClean ? scMap.get(scClean) : undefined;
        if (npa) {
          matchedBySc++;
        } else if (npRegClean) {
          npa = appNumMap.get(npRegClean.toUpperCase());
          if (!npa) {
            const npId = extractNPId(npRegClean);
            if (npId) {
              npa = idMap.get(npId) || idMap.get(npId.replace(/^0+/, ''));
            }
          }
          if (npa) matchedByNpReg++;
        }

        if (!npa) continue;

        const updates = {};
        if (npa.step && p.national_portal_status !== npa.step) {
          updates.national_portal_status = npa.step;
        }
        if (npa.app_num && (!p.np_registration_number || p.np_registration_number.trim() === '')) {
          updates.np_registration_number = npa.app_num;
        }
        if (npa.cap && (!p.applied_solar_load_kw || Number(p.applied_solar_load_kw) === 0)) {
          updates.applied_solar_load_kw = Number(npa.cap);
        }
        if (npa.name && (!p.customer_name || p.customer_name.trim() === '')) {
          updates.customer_name = npa.name.trim();
        }
        if (npa.phone && (!p.mobile_number || p.mobile_number.trim().length < 10)) {
          const cleanPhone = String(npa.phone).replace(/\D/g, '').slice(-10);
          if (cleanPhone.length === 10) updates.mobile_number = cleanPhone;
        }

        if (Object.keys(updates).length > 0) {
          toUpdate.push({ id: p.id, updates });
        }
      }

      scannedLp += data.length;
      process.stdout.write(
        `\r   Scanned ${scannedLp.toLocaleString('en-IN')} / ${(totalLp || 0).toLocaleString('en-IN')} | SC matches: ${matchedBySc.toLocaleString('en-IN')} | NP Reg # matches: ${matchedByNpReg.toLocaleString('en-IN')} | To Update: ${toUpdate.length.toLocaleString('en-IN')}`
      );
    }
  });

  console.log(`\n\n📊 Summary:`);
  console.log(`   Matched by SC Number:          ${matchedBySc.toLocaleString('en-IN')}`);
  console.log(`   Matched by NP Reg # (Extra):   ${matchedByNpReg.toLocaleString('en-IN')}`);
  console.log(`   Total Matched (On NP):         ${(matchedBySc + matchedByNpReg).toLocaleString('en-IN')}`);
  console.log(`   Prospects needing update:      ${toUpdate.length.toLocaleString('en-IN')}`);

  if (toUpdate.length === 0) {
    console.log('✨ All matched prospects are already up to date!');
    return;
  }

  // 3. Apply updates in fast parallel chunks
  console.log('\n🚀 Updating matched Lead Prospects in Supabase...');
  const updateChunks = [];
  for (let i = 0; i < toUpdate.length; i += 25) {
    updateChunks.push(toUpdate.slice(i, i + 25));
  }

  let updated = 0;
  const startTime = Date.now();
  const nowIso = new Date().toISOString();

  await asyncPool(4, updateChunks, async (batch) => {
    await Promise.all(
      batch.map(async (item) => {
        const { error } = await supabase
          .from('lead_prospects')
          .update({ ...item.updates, updated_at: nowIso })
          .eq('id', item.id);
        if (!error) updated++;
      })
    );
    const pct = ((updated / toUpdate.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r   Updated: ${updated.toLocaleString('en-IN')} / ${toUpdate.length.toLocaleString('en-IN')} (${pct}%) in ${elapsed}s...`);
  });

  console.log(`\n\n🎉 Mapping complete! ${updated.toLocaleString('en-IN')} additional Lead Prospects updated.`);
}

main().catch(console.error);
