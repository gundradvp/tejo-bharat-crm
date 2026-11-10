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

async function main() {
  console.log('🧹 Clearing all Lead Prospects -> National Portal mapping...');

  let totalCleared = 0;
  const FETCH_BATCH = 1000;
  const UPDATE_CHUNK = 200;
  const startTime = Date.now();

  while (true) {
    // Always fetch the first batch of rows that still have national_portal_status or np_registration_number
    const { data, error } = await supabase
      .from('lead_prospects')
      .select('id')
      .or('national_portal_status.not.is.null,np_registration_number.not.is.null')
      .limit(FETCH_BATCH);

    if (error) {
      console.error('❌ Error fetching batch:', error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    const ids = data.map((r) => r.id);
    const chunks = [];
    for (let i = 0; i < ids.length; i += UPDATE_CHUNK) {
      chunks.push(ids.slice(i, i + UPDATE_CHUNK));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        const { error: updateErr } = await supabase
          .from('lead_prospects')
          .update({
            national_portal_status: null,
            np_registration_number: null,
          })
          .in('id', chunk);

        if (updateErr) {
          console.error('❌ Error updating chunk:', updateErr.message);
        } else {
          totalCleared += chunk.length;
        }
      })
    );

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r   Cleared ${totalCleared.toLocaleString('en-IN')} rows in ${elapsedSec}s...`);
  }

  console.log(`\n\n✅ Finished clearing ${totalCleared.toLocaleString('en-IN')} rows!`);

  // Verify remaining counts
  const { count: remStatus } = await supabase
    .from('lead_prospects')
    .select('*', { count: 'exact', head: true })
    .not('national_portal_status', 'is', null);

  const { count: remNp } = await supabase
    .from('lead_prospects')
    .select('*', { count: 'exact', head: true })
    .not('np_registration_number', 'is', null);

  console.log(`📊 Verification -> Remaining with national_portal_status: ${remStatus}, np_registration_number: ${remNp}`);
}

main().catch(console.error);
