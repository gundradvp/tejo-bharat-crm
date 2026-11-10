import fs from 'fs';
import path from 'path';
import readline from 'readline';
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

const htmlFilePath = process.argv[2] || '/Users/durgajo/pmsurya_all_circles.html';

if (!fs.existsSync(htmlFilePath)) {
  console.error(`❌ File not found: ${htmlFilePath}`);
  console.log(`Usage: node scripts/update_np_from_html.mjs <path_to_html>`);
  process.exit(1);
}

console.log('============================================================');
console.log('⚡ PM Surya Ghar: Update NP Numbers from HTML into Supabase');
console.log('============================================================');
console.log(`📁 Source HTML: ${htmlFilePath}`);

async function main() {
  console.log('\n📖 Scanning HTML file for SC -> NP Registration mapping...');
  const scToNpMap = new Map();
  const fileStream = fs.createReadStream(htmlFilePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inTbody = false;
  let currentTds = [];
  const tdRegex = /<td[^>]*>(.*?)<\/td>/gi;
  const cleanTagRegex = /<[^>]+>/g;

  for await (const line of rl) {
    if (line.includes('<tbody>')) {
      inTbody = true;
      continue;
    }
    if (line.includes('</tbody>')) {
      break;
    }
    if (!inTbody) continue;

    if (line.includes('<tr')) {
      currentTds = [];
    }

    let match;
    while ((match = tdRegex.exec(line)) !== null) {
      const text = match[1].replace(cleanTagRegex, '').trim();
      currentTds.push(text);
    }

    if (line.includes('</tr>') && currentTds.length >= 11) {
      // cells[5]: Scno, cells[9]: NP Reg No, cells[10]: EP Reg No, cells[14]: NP Status
      const rawSc = currentTds[5] || '';
      const scClean = rawSc.replace(/^['"]+/, '').trim();
      const npReg = (currentTds[9] || '').trim();
      const npStatus = (currentTds[14] || '').trim();
      const epReg = (currentTds[10] || '').trim();

      if (scClean && npReg && npReg !== '-' && npReg !== '--') {
        scToNpMap.set(scClean, {
          np_registration_number: npReg,
          national_portal_status: npStatus && npStatus !== '-' ? npStatus : null,
          ep_registration_number: epReg && epReg !== '-' ? epReg : undefined,
        });
      }
      currentTds = [];
    }
  }

  console.log(`✅ Extracted ${scToNpMap.size.toLocaleString('en-IN')} valid NP registrations from HTML.`);

  console.log('\n🔍 Fetching lead_prospects from Supabase where np_registration_number IS NULL...');
  let offset = 0;
  const PAGE_SIZE = 1000;
  let nullProspects = [];

  while (true) {
    const { data, error } = await supabase
      .from('lead_prospects')
      .select('id, sc_number')
      .is('np_registration_number', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Error querying Supabase:', error);
      break;
    }
    if (!data || data.length === 0) break;
    nullProspects.push(...data);
    offset += data.length;
    process.stdout.write(`\r   Fetched ${nullProspects.length.toLocaleString('en-IN')} prospects with null NP...`);
    if (data.length < PAGE_SIZE) break;
  }

  console.log(`\n📦 Total prospects with missing NP number: ${nullProspects.length.toLocaleString('en-IN')}`);

  const toUpdate = [];
  for (const p of nullProspects) {
    const match = scToNpMap.get(p.sc_number);
    if (match) {
      toUpdate.push({
        id: p.id,
        sc_number: p.sc_number,
        np_registration_number: match.np_registration_number,
        national_portal_status: match.national_portal_status,
      });
    }
  }

  console.log(`🎯 Matched ${toUpdate.length.toLocaleString('en-IN')} prospects with NP numbers from HTML!`);

  if (toUpdate.length === 0) {
    console.log('✨ All prospects already have matching NP numbers!');
    return;
  }

  console.log('\n🚀 Updating Supabase lead_prospects in parallel batches...');
  const BATCH_SIZE = 50;
  let updatedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item) => {
        const updatePayload = {
          np_registration_number: item.np_registration_number,
        };
        if (item.national_portal_status) {
          updatePayload.national_portal_status = item.national_portal_status;
        }
        const { error } = await supabase
          .from('lead_prospects')
          .update(updatePayload)
          .eq('id', item.id);

        if (!error) updatedCount++;
      })
    );

    const pct = ((updatedCount / toUpdate.length) * 100).toFixed(1);
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r   Progress: ${updatedCount.toLocaleString('en-IN')} / ${toUpdate.length.toLocaleString('en-IN')} (${pct}%) in ${elapsedSec}s...`);
  }

  console.log(`\n\n🎉 Done! Successfully updated ${updatedCount.toLocaleString('en-IN')} prospects with their NP Registration Numbers.`);
}

main().catch(console.error);
