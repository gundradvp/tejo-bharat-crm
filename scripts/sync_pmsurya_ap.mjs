import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Load environment variables from .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SYNC_USER_EMAIL = process.env.SYNC_USER_EMAIL || 'durga@tejobharat.com';
const SYNC_USER_PASSWORD = process.env.SYNC_USER_PASSWORD || 'TejoBharat@2024';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// 2. Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
====================================================
⚡ APEPDCL PM Surya Ghar CLI Sync Tool
====================================================
Usage:
  node scripts/sync_pmsurya_ap.mjs [options]

Options:
  --all                 Sync ALL 11 circles across entire APEPDCL (same as --circle=ALL)
  --circle=<NAME>       Specific circle name (default: KAKINADA)
  --file=<PATH>         Import from a local downloaded HTML file (e.g. pmsurya_all_circles.html)
  --dry-run             Parse HTML without writing to database
  --help, -h            Show this documentation

Available APEPDCL Circles:
  🌐 ALL                         (All 11 Districts at once)
  📍 KAKINADA
  📍 DR.B.R.AMBEDKAR KONASEEMA   (or --circle=konaseema)
  📍 EAST GODAVARI               (or --circle=rajahmundry)
  📍 WEST GODAVARI
  📍 ELURU
  📍 VISAKHAPATNAM               (or --circle=vizag)
  📍 ANAKAPALLI
  📍 ALLURI SITHARAMARAJU        (or --circle=asr)
  📍 VIZIANAGARAM
  📍 PARVATHIPURAM MANYAM        (or --circle=manyam)
  📍 SRIKAKULAM
====================================================
`);
  process.exit(0);
}

const getArg = (name, defaultVal) => {
  const prefix = `--${name}=`;
  const match = args.find((a) => a.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  return defaultVal;
};

const CIRCLE_ALIASES = {
  KONASEEMA: 'DR.B.R.AMBEDKAR KONASEEMA',
  RAJAHMUNDRY: 'EAST GODAVARI',
  VIZAG: 'VISAKHAPATNAM',
  ASR: 'ALLURI SITHARAMARAJU',
  MANYAM: 'PARVATHIPURAM MANYAM',
};

let rawCircle = (getArg('circle', args.includes('--all') ? 'ALL' : 'KAKINADA')).trim().toUpperCase();
if (CIRCLE_ALIASES[rawCircle]) {
  rawCircle = CIRCLE_ALIASES[rawCircle];
}
const circle = rawCircle;
const isAll = circle === 'ALL';
const localFile = getArg('file', null);
const isDryRun = args.includes('--dry-run');

const ENDPOINT_URL = `https://epccbopn.apeasternpower.com/jw/corporatedashboard/PMSuryadet.jsp?&CmtType=PMSREG&Circle=${encodeURIComponent(circle)}&Divisionval=ALL&SubDivval=ALL&AglType=&Secval=ALL&Pentype=&AppTyp=ALL`;

const MONTH_MAP = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

function parseComplaintDate(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '-' || dateStr.trim() === '--') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const mon = MONTH_MAP[parts[1].toUpperCase()] || '01';
    const year = parts[2];
    return `${year}-${mon}-${day}`;
  }
  return null;
}

// Simple async concurrency runner
async function asyncPool(poolLimit, array, iteratorFn) {
  const ret = [];
  const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item, array));
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

// 3. Fetch HTML content
async function fetchHtml() {
  if (localFile) {
    console.log(`📂 Reading local HTML file: ${localFile}`);
    return fs.readFileSync(localFile, 'utf8');
  }

  console.log(`🌐 Fetching latest PM Surya Ghar data for circle: ${circle}...`);
  console.log(`🔗 URL: ${ENDPOINT_URL}`);
  
  const startTime = Date.now();
  const response = await fetch(ENDPOINT_URL, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch from APEPDCL: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const sizeMb = (html.length / (1024 * 1024)).toFixed(1);
  console.log(`✅ Download complete: ${sizeMb} MB received in ${elapsed}s`);
  return html;
}

// 4. Parse table rows from HTML
function parseHtmlRows(html) {
  console.log('⚡ Parsing HTML table records...');
  const startParse = Date.now();
  
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  let headerParsed = false;
  const records = [];
  const seenSc = new Set();

  while ((trMatch = trRegex.exec(html)) !== null) {
    const trContent = trMatch[1];
    if (!headerParsed) {
      if (trContent.includes('<th')) {
        headerParsed = true;
        continue;
      }
    }

    const tdMatches = [...trContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (tdMatches.length < 10) continue;

    const cells = tdMatches.map((m) => m[1].replace(/<[^>]+>/g, '').trim());

    // Clean SC Number: remove leading single quotes (') or double quotes
    let scNo = (cells[5] || '').replace(/^[\x27\x22]+/, '').trim();
    if (!scNo || seenSc.has(scNo)) continue;
    seenSc.add(scNo);

    const epRegNo = cells[10] && cells[10] !== '-' && cells[10] !== '--' ? cells[10].trim() : null;
    const rowCircle = cells[1] && cells[1] !== '-' ? cells[1].trim() : '';

    records.push({
      serial_number: parseInt(cells[0]) || null,
      circle_name: rowCircle || (isAll ? 'UNKNOWN' : circle),
      division_name: cells[2] || null,
      subdiv_name: cells[3] || null,
      section_name: cells[4] || null,
      sc_number: scNo,
      existing_load_kw: parseFloat(cells[6]) || null,
      existing_solar_load_kw: parseFloat(cells[7]) || null,
      applied_solar_load_kw: parseFloat(cells[8]) || null,
      np_registration_number: cells[9] && cells[9] !== '-' ? cells[9].trim() : null,
      ep_registration_number: epRegNo,
      complaint_date: parseComplaintDate(cells[11]),
      mobile_number: cells[12] && cells[12] !== '-' ? cells[12].trim() : null,
      email: cells[13] && cells[13] !== '-' ? cells[13].trim() : null,
      national_portal_status: cells[14] || null,
      epdcl_portal_status: cells[15] || null,
      call_status: epRegNo ? 'solar_already_installed' : 'not_called',
    });
  }

  const elapsedMs = Date.now() - startParse;
  console.log(`✅ Parsed ${records.length} unique records in ${elapsedMs}ms`);
  return records;
}

// 5. Sync to Supabase
async function syncToDatabase(records) {
  console.log(`🔐 Authenticating with Supabase as ${SYNC_USER_EMAIL}...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: SYNC_USER_EMAIL,
    password: SYNC_USER_PASSWORD,
  });

  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }
  console.log(`✅ Logged in successfully. (User ID: ${authData.user.id})`);

  const nowIso = new Date().toISOString();
  const dateStr = nowIso.split('T')[0];
  const batchId = crypto.randomUUID();
  const batchLabel = localFile
    ? `APEPDCL Auto-File [${isAll ? 'ALL' : circle}] ${dateStr}`
    : `APEPDCL Auto-Sync [${isAll ? 'ALL' : circle}] ${dateStr}`;

  console.log(`🔍 Checking existing records in lead_prospects (in parallel batches)...`);
  const scList = records.map((r) => r.sc_number);
  const existingMap = new Map();

  const chunks = [];
  for (let i = 0; i < scList.length; i += 200) {
    chunks.push(scList.slice(i, i + 200));
  }

  let checkedCount = 0;
  await asyncPool(6, chunks, async (chunk) => {
    const { data, error } = await supabase
      .from('lead_prospects')
      .select('id, sc_number, created_at, customer_name, national_portal_status, epdcl_portal_status, ep_registration_number, applied_solar_load_kw')
      .in('sc_number', chunk);

    if (error) throw error;
    if (data) {
      for (const row of data) {
        existingMap.set(row.sc_number, row);
      }
    }
    checkedCount += chunk.length;
    process.stdout.write(`\r   Checked: ${Math.min(checkedCount, scList.length)} / ${scList.length}`);
  });
  console.log(`\n✅ Database check complete: ${existingMap.size} existing, ${records.length - existingMap.size} new records.`);

  const newRecords = [];
  const updatedRecords = [];

  for (const r of records) {
    const existing = existingMap.get(r.sc_number);
    if (!existing) {
      // NEW RECORD: Stamped with today's created_at and batch info!
      newRecords.push({
        ...r,
        created_at: nowIso,
        updated_at: nowIso,
        import_batch_id: batchId,
        import_batch_label: batchLabel,
      });
    } else {
      // EXISTING RECORD: Check if any status or registration changed
      const changed =
        existing.national_portal_status !== r.national_portal_status ||
        existing.epdcl_portal_status !== r.epdcl_portal_status ||
        existing.ep_registration_number !== r.ep_registration_number ||
        existing.applied_solar_load_kw !== r.applied_solar_load_kw;

      if (changed) {
        updatedRecords.push({
          id: existing.id,
          national_portal_status: r.national_portal_status,
          epdcl_portal_status: r.epdcl_portal_status,
          ep_registration_number: r.ep_registration_number,
          applied_solar_load_kw: r.applied_solar_load_kw,
          call_status: r.ep_registration_number ? 'solar_already_installed' : undefined,
          updated_at: nowIso,
        });
      }
    }
  }

  // Auto-enrich new records with customer names and mandals from eb_customers!
  if (newRecords.length > 0) {
    console.log(`🔎 Enriching ${newRecords.length} new records from eb_customers database...`);
    const newScList = newRecords.map((r) => r.sc_number);
    const ebMap = new Map();
    const ebChunks = [];
    for (let i = 0; i < newScList.length; i += 200) {
      ebChunks.push(newScList.slice(i, i + 200));
    }

    await asyncPool(6, ebChunks, async (chunk) => {
      const { data } = await supabase
        .from('eb_customers')
        .select('sc_number, customer_name, mandal_name, section_name, area_name')
        .in('sc_number', chunk);
      if (data) {
        for (const row of data) {
          ebMap.set(row.sc_number, row);
        }
      }
    });

    let matchedEb = 0;
    for (const r of newRecords) {
      const eb = ebMap.get(r.sc_number);
      if (eb) {
        matchedEb++;
        if (!r.customer_name && eb.customer_name) r.customer_name = eb.customer_name;
        if (!r.mandal_name && eb.mandal_name) r.mandal_name = eb.mandal_name;
        if (!r.section_name && eb.section_name) r.section_name = eb.section_name;
        if (!r.area_name && eb.area_name) r.area_name = eb.area_name;
      }
    }
    console.log(`✅ Enriched ${matchedEb} new prospects with names & details from EB customers.`);
  }

  if (isDryRun) {
    console.log('\n⚠️ [DRY RUN MODE] No changes will be written to database.');
    console.log(`   New records to insert: ${newRecords.length}`);
    console.log(`   Existing records to update: ${updatedRecords.length}`);
    return { newCount: newRecords.length, updatedCount: updatedRecords.length };
  }

  // Insert NEW records in batches of 250
  let insertedCount = 0;
  if (newRecords.length > 0) {
    console.log(`\n📥 Inserting ${newRecords.length} new prospects (stamped with date: ${dateStr})...`);
    for (let i = 0; i < newRecords.length; i += 250) {
      const batch = newRecords.slice(i, i + 250);
      const { error } = await supabase.from('lead_prospects').insert(batch);
      if (error) {
        console.error(`\n❌ Error inserting batch at index ${i}:`, error.message);
      } else {
        insertedCount += batch.length;
      }
      process.stdout.write(`\r   Inserted: ${insertedCount} / ${newRecords.length}`);
    }
    console.log('\n✅ New records insertion complete.');
  } else {
    console.log(`\nℹ️ No new records found. All ${records.length} records are already tracked.`);
  }

  // Update EXISTING records with status changes in parallel batches
  let updatedCount = 0;
  if (updatedRecords.length > 0) {
    console.log(`\n🔄 Updating ${updatedRecords.length} existing prospects with status changes...`);
    const updateChunks = [];
    for (let i = 0; i < updatedRecords.length; i += 50) {
      updateChunks.push(updatedRecords.slice(i, i + 50));
    }

    await asyncPool(10, updateChunks, async (batch) => {
      for (const row of batch) {
        const { id, ...updateFields } = row;
        const { error } = await supabase.from('lead_prospects').update(updateFields).eq('id', id);
        if (!error) updatedCount++;
      }
      process.stdout.write(`\r   Updated: ${updatedCount} / ${updatedRecords.length}`);
    });
    console.log('\n✅ Status updates complete.');
  } else {
    console.log(`\nℹ️ All existing records are up-to-date with portal statuses.`);
  }

  return { newCount: insertedCount, updatedCount };
}

// 6. Main runner
async function main() {
  console.log('====================================================');
  console.log('🚀 APEPDCL PM Surya Ghar Daily Sync');
  console.log(`📅 Timestamp: ${new Date().toLocaleString('en-IN')}`);
  console.log('====================================================');

  try {
    const html = await fetchHtml();
    const records = parseHtmlRows(html);
    if (records.length === 0) {
      console.warn('⚠️ No records found in HTML table.');
      return;
    }

    const { newCount, updatedCount } = await syncToDatabase(records);

    console.log('\n====================================================');
    console.log('📊 SYNC SUMMARY');
    console.log('====================================================');
    console.log(`Total Portal Records:    ${records.length.toLocaleString('en-IN')}`);
    console.log(`New Prospects Added:     ${newCount.toLocaleString('en-IN')} (Stamped with today's date)`);
    console.log(`Status Changes Updated:  ${updatedCount.toLocaleString('en-IN')}`);
    console.log('====================================================');
    console.log('🎉 Sync completed successfully!');
  } catch (err) {
    console.error('\n❌ Fatal Sync Error:', err);
    process.exit(1);
  }
}

main();
