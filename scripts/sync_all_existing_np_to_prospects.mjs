import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rlwcqmlspvddfscyngfw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('🔄 Loading National Portal Summary JSON...');
  const summaryPath = path.resolve(__dirname, '../public/national_portal_summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.error('❌ national_portal_summary.json not found!');
    process.exit(1);
  }

  const raw = fs.readFileSync(summaryPath, 'utf8');
  const npList = JSON.parse(raw);
  console.log(`✅ Loaded ${npList.length.toLocaleString('en-IN')} National Portal applications.`);

  // Map SC -> National Portal details
  const scMap = new Map();
  for (const item of npList) {
    const sc = (item.sc || '').trim();
    if (sc && sc.length > 5) {
      scMap.set(sc, item);
    }
  }
  console.log(`✅ Indexed ${scMap.size.toLocaleString('en-IN')} unique Service Connection numbers.`);

  const allScs = Array.from(scMap.keys());
  const BATCH_SIZE = 100;
  let totalMatched = 0;
  let totalUpdated = 0;

  console.log('🚀 Scanning and updating Lead Prospects in Supabase by matching SC number...');

  for (let i = 0; i < allScs.length; i += BATCH_SIZE) {
    const batchScs = allScs.slice(i, i + BATCH_SIZE);

    // Query lead_prospects matching any of these SCs
    const { data: prospects, error } = await supabase
      .from('lead_prospects')
      .select('id, sc_number, customer_name, np_registration_number, national_portal_status, applied_solar_load_kw, mobile_number, email, village_name, remark')
      .in('sc_number', batchScs);

    if (error) {
      console.error(`Error querying batch at index ${i}:`, error.message);
      continue;
    }

    if (!prospects || prospects.length === 0) continue;

    totalMatched += prospects.length;

    // For each matched prospect, see what fields need enrichment from National Portal
    for (const p of prospects) {
      const np = scMap.get(p.sc_number);
      if (!np) continue;

      const updates = {};

      // 1. National portal status / step
      if (np.step && p.national_portal_status !== np.step) {
        updates.national_portal_status = np.step;
      }

      // 2. National portal registration number
      if (np.appNum && (!p.np_registration_number || p.np_registration_number !== np.appNum)) {
        updates.np_registration_number = np.appNum;
      }

      // 3. Customer name (often null or generic in DISCOM dump)
      if (np.name && (!p.customer_name || p.customer_name.trim() === '')) {
        updates.customer_name = np.name.trim();
      }

      // 4. Applied solar capacity in kW
      if (np.cap && (!p.applied_solar_load_kw || p.applied_solar_load_kw === 0)) {
        updates.applied_solar_load_kw = Number(np.cap);
      }

      // 5. Mobile number (if missing or placeholder in prospect)
      if (np.phone && (!p.mobile_number || p.mobile_number.length < 10)) {
        const cleanPhone = np.phone.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length === 10) updates.mobile_number = cleanPhone;
      }

      // 6. Email (if missing)
      if (np.email && (!p.email || p.email.trim() === '' || p.email === '-')) {
        updates.email = np.email.trim();
      }

      // 7. Village / Panchayat
      if (np.village && np.village !== '0' && (!p.village_name || p.village_name === '0')) {
        updates.village_name = np.village.trim();
      }

      // 8. Track vendor in remark if present
      if (np.vendor && (!p.remark || !p.remark.includes(np.vendor))) {
        const vendorTag = `[NP Vendor: ${np.vendor.trim()}]`;
        updates.remark = p.remark ? `${p.remark} ${vendorTag}` : vendorTag;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from('lead_prospects')
          .update(updates)
          .eq('id', p.id);

        if (!updateErr) {
          totalUpdated++;
        }
      }
    }

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= allScs.length) {
      console.log(`   Checked ${Math.min(i + BATCH_SIZE, allScs.length).toLocaleString('en-IN')} / ${allScs.length.toLocaleString('en-IN')} SCs | Matched Prospects: ${totalMatched} | Updated: ${totalUpdated}`);
    }
  }

  console.log(`\n🎉 COMPLETED!`);
  console.log(`Total Matched Prospects: ${totalMatched.toLocaleString('en-IN')}`);
  console.log(`Total Updated with NP Details: ${totalUpdated.toLocaleString('en-IN')}`);
}

run().catch((err) => {
  console.error('Fatal script error:', err);
  process.exit(1);
});
