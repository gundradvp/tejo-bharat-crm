import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CRM_ROOT = path.resolve(__dirname, '..');
const FETCHER_DIR = '/Users/durgajo/Desktop/Tejo Bharat/Softwares/pmsuryaghar-fetcher';
const FETCHER_OUTPUT_DIR = path.join(FETCHER_DIR, 'output');
const DOWNLOADS_DIR = '/Users/durgajo/Downloads';
const PUBLIC_DIR = path.join(CRM_ROOT, 'public');
const DIST_DIR = path.join(CRM_ROOT, 'dist');

console.log('============================================================');
console.log('🌐 Building Dedicated Pan-India National Portal Catalog');
console.log('   (Strictly PM Surya Ghar Portal Data - Decoupled from DISCOM)');
console.log('============================================================\n');

// 1. Load Supabase credentials from .env
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
// Use service role key if available for administrative sync, fallback to anon
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';
const SYNC_USER_EMAIL = process.env.SYNC_USER_EMAIL || 'durga@tejobharat.com';
const SYNC_USER_PASSWORD = process.env.SYNC_USER_PASSWORD || 'TejoBharat@2024';

function extractSerials(list) {
  if (!Array.isArray(list)) return [];
  const serials = [];
  for (const item of list) {
    if (!item) continue;
    if (Array.isArray(item.serialNumbers)) {
      for (const s of item.serialNumbers) {
        if (typeof s === 'string') {
          const trimmed = s.trim();
          if (trimmed) serials.push(trimmed);
        } else if (s && typeof s === 'object' && s.serialNumber) {
          const trimmed = String(s.serialNumber).trim();
          if (trimmed) serials.push(trimmed);
        }
      }
    } else if (item.serialNumber && typeof item.serialNumber === 'string') {
      const trimmed = item.serialNumber.trim();
      if (trimmed) serials.push(trimmed);
    }
  }
  return Array.from(new Set(serials));
}

function extractMfrs(list) {
  if (!Array.isArray(list)) return [];
  const mfrs = [];
  for (const item of list) {
    if (item && item.manufacturerName && typeof item.manufacturerName === 'string') {
      const trimmed = item.manufacturerName.trim();
      if (trimmed && !mfrs.includes(trimmed)) mfrs.push(trimmed);
    }
  }
  return mfrs;
}

function normalizeRecord(d) {
  if (!d || d.error || d.isError) return null;
  const appId = String(d.appId || d.applicationId || d.id || '');
  if (!appId || appId === 'undefined' || appId === 'null') return null;

  const panelSerials = extractSerials(d.moduleList);
  const invSerials = extractSerials(d.inverterList);
  const moduleMfrs = extractMfrs(d.moduleList);
  const invMfrs = extractMfrs(d.inverterList);

  const summaryItem = {
    id: appId,
    appNum: d.applicationNumber || d.registrationNumber || `NP-${appId}`,
    name: d.consumerName || d.applicantName || 'Consumer',
    phone: d.mobile || d.mobileNumber || '',
    email: d.email || '',
    sc: d.consumerNo || d.consumerNumber || '',
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
    panelSerials: panelSerials,
    invSerials: invSerials,
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
    submissionDate: d.appSubmissionDate || d.submittedDate || d.appliedDate || ''
  };

  return { summaryItem, fullDetail: d };
}

function processFile(filePath, summaryMap, fullCatalog, stats) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const content = JSON.parse(raw);

    const items = [];
    if (Array.isArray(content)) {
      items.push(...content);
    } else if (content && typeof content === 'object') {
      if (Array.isArray(content.records)) {
        items.push(...content.records);
      } else if (Array.isArray(content.data)) {
        items.push(...content.data);
      } else {
        items.push(content);
      }
    }

    for (const item of items) {
      const res = normalizeRecord(item);
      if (!res) continue;
      const { summaryItem, fullDetail } = res;
      const appId = summaryItem.id;

      if (!summaryMap.has(appId)) {
        summaryMap.set(appId, summaryItem);
        fullCatalog[appId] = fullDetail;

        if (summaryItem.panelSerials.length > 0) stats.panels += summaryItem.panelSerials.length;
        if (summaryItem.invSerials.length > 0) stats.inverters += summaryItem.invSerials.length;
        if (summaryItem.loanAppNo || summaryItem.loanAmt) stats.loans++;
        if (summaryItem.subsidyAmt) stats.subsidyTotal += summaryItem.subsidyAmt;
        if (summaryItem.cap) stats.capacityTotal += summaryItem.cap;
      }
    }
  } catch (err) {
    // Ignore corrupt files
  }
}

async function main() {
  const summaryMap = new Map();
  const fullCatalog = {};
  const stats = {
    panels: 0,
    inverters: 0,
    loans: 0,
    subsidyTotal: 0,
    capacityTotal: 0
  };

  console.log('📂 1. Scanning PM Surya Ghar Fetcher output JSONs...');
  if (fs.existsSync(FETCHER_OUTPUT_DIR)) {
    const fetcherFiles = fs.readdirSync(path.join(FETCHER_OUTPUT_DIR, 'data'))
      .filter(f => f.endsWith('.json') && !f.includes('.tmp'))
      .map(f => path.join(FETCHER_OUTPUT_DIR, 'data', f));
    console.log(`   Found ${fetcherFiles.length.toLocaleString()} files in fetcher data dir.`);
    for (const f of fetcherFiles) {
      processFile(f, summaryMap, fullCatalog, stats);
    }
  }

  console.log('📂 2. Scanning Batch JSON files in Fetcher directory...');
  const rootBatchFiles = fs.readdirSync(FETCHER_DIR)
    .filter(f => f.startsWith('pmsuryaghar_saved_') && f.endsWith('.json'))
    .map(f => path.join(FETCHER_DIR, f));
  console.log(`   Found ${rootBatchFiles.length} batch files in root fetcher.`);
  for (const f of rootBatchFiles) {
    processFile(f, summaryMap, fullCatalog, stats);
  }

  console.log('📂 3. Scanning Downloads folder for saved PM Surya Ghar files...');
  if (fs.existsSync(DOWNLOADS_DIR)) {
    const downloadFiles = fs.readdirSync(DOWNLOADS_DIR)
      .filter(f => (f.startsWith('pmsuryaghar_') || f.startsWith('pm_suryaghar_')) && f.endsWith('.json'))
      .map(f => path.join(DOWNLOADS_DIR, f));
    console.log(`   Found ${downloadFiles.length} files in Downloads.`);
    for (const f of downloadFiles) {
      processFile(f, summaryMap, fullCatalog, stats);
    }
  }

  const summaryList = Array.from(summaryMap.values())
    .sort((a, b) => Number(b.id) - Number(a.id));

  console.log('\n============================================================');
  console.log(`✅ Loaded ${summaryList.length.toLocaleString()} Genuine PM Surya Ghar Applications`);
  console.log(`⚡ Total Capacity:        ${(stats.capacityTotal / 1000).toFixed(2)} MW`);
  console.log(`☀️ DCR Panels Tracked:    ${stats.panels.toLocaleString()}`);
  console.log(`⚡ Inverters Tracked:     ${stats.inverters.toLocaleString()}`);
  console.log(`🏦 Bank Loans:            ${stats.loans.toLocaleString()}`);
  console.log(`💰 CFA Subsidy Tracked:   ₹${(stats.subsidyTotal / 10000000).toFixed(2)} Cr`);
  console.log('============================================================\n');

  // STEP 4: Write clean JSON catalog & summary
  console.log('💾 Writing files to public/ and dist/...');
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  const summaryJson = JSON.stringify(summaryList);
  const catalogJson = JSON.stringify(fullCatalog);

  const publicSummaryPath = path.join(PUBLIC_DIR, 'national_portal_summary.json');
  const publicCatalogPath = path.join(PUBLIC_DIR, 'national_portal_catalog.json');
  const distSummaryPath = path.join(DIST_DIR, 'national_portal_summary.json');
  const distCatalogPath = path.join(DIST_DIR, 'national_portal_catalog.json');

  fs.writeFileSync(publicSummaryPath, summaryJson, 'utf8');
  fs.writeFileSync(publicCatalogPath, catalogJson, 'utf8');
  fs.writeFileSync(distSummaryPath, summaryJson, 'utf8');
  fs.writeFileSync(distCatalogPath, catalogJson, 'utf8');

  console.log(`   Written ${publicSummaryPath} (${(Buffer.byteLength(summaryJson) / (1024 * 1024)).toFixed(1)} MB)`);
  console.log(`   Written ${publicCatalogPath} (${(Buffer.byteLength(catalogJson) / (1024 * 1024)).toFixed(1)} MB)`);

  // STEP 5: Sync to Supabase
  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('\n🔄 Syncing National Portal intelligence to Supabase...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 5A. Enrich existing Tejo Bharat CRM Customers
    console.log('   Checking CRM customers for national portal enrichment...');
    const { data: crmCustomers, error: custErr } = await supabase
      .from('customers')
      .select('id, customer_name, application_ref_no, consumer_number, phone');

    if (!custErr && crmCustomers && crmCustomers.length > 0) {
      let enrichedCount = 0;
      for (const cust of crmCustomers) {
        let match = null;
        if (cust.application_ref_no) {
          const cleanRef = cust.application_ref_no.trim();
          match = summaryList.find(s => s.appNum === cleanRef || s.id === cleanRef.replace(/\D/g, ''));
        }
        if (!match && cust.consumer_number) {
          const cleanSc = cust.consumer_number.trim();
          match = summaryList.find(s => s.sc === cleanSc);
        }
        if (!match && cust.phone) {
          const cleanPhone = cust.phone.trim().slice(-10);
          if (cleanPhone.length === 10) {
            match = summaryList.find(s => s.phone && s.phone.endsWith(cleanPhone));
          }
        }

        if (match) {
          const full = fullCatalog[match.id];
          const updatePayload = {
            updated_at: new Date().toISOString()
          };
          if (match.panelSerials && match.panelSerials.length > 0) {
            updatePayload.panel_serial_numbers = match.panelSerials.join(', ');
          }
          if (match.invSerials && match.invSerials.length > 0) {
            updatePayload.inverter_serial_number = match.invSerials[0];
          }
          if (match.vendor) updatePayload.vendor_name = match.vendor;
          if (match.loanAppNo) updatePayload.loan_reference_number = match.loanAppNo;
          if (match.loanAmt) updatePayload.loan_sanctioned_amount = match.loanAmt;
          if (match.subsidyAmt) updatePayload.subsidy_amount = match.subsidyAmt;
          if (match.pincode) updatePayload.pincode = match.pincode;
          if (match.step) updatePayload.portal_current_step_name = match.step;
          if (full && full.inverterList) updatePayload.portal_inverter_list = full.inverterList;
          if (full && full.moduleList) updatePayload.portal_module_list = full.moduleList;

          const { error: upErr } = await supabase
            .from('customers')
            .update(updatePayload)
            .eq('id', cust.id);

          if (!upErr) enrichedCount++;
        }
      }
      console.log(`   ✅ Enriched ${enrichedCount} CRM customers with live National Portal equipment/loan data.`);
    }

    // 5B. Cross-reference lead_prospects national_portal_status
    console.log('   Syncing stage statuses to matching Lead Prospects in Supabase...');
    // Find all prospects that have np_registration_number matching any in summaryList
    const appNumMap = new Map();
    for (const item of summaryList) {
      if (item.appNum) appNumMap.set(item.appNum.trim().toUpperCase(), item.step);
      if (item.id) appNumMap.set(item.id.trim(), item.step);
      if (item.sc) appNumMap.set(item.sc.trim(), item.step);
    }

    let updatedProspects = 0;
    // Process in batches
    const { count: prospectCount } = await supabase
      .from('lead_prospects')
      .select('id', { count: 'exact', head: true })
      .not('np_registration_number', 'is', null);

    const totalProspects = prospectCount || 0;
    const BATCH_SIZE = 1000;
    const pages = Math.ceil(totalProspects / BATCH_SIZE);

    for (let p = 0; p < Math.min(pages, 20); p++) {
      const from = p * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;
      const { data: batch } = await supabase
        .from('lead_prospects')
        .select('id, np_registration_number, sc_number, national_portal_status')
        .not('np_registration_number', 'is', null)
        .range(from, to);

      if (batch) {
        for (const pr of batch) {
          const npReg = (pr.np_registration_number || '').trim().toUpperCase();
          const scNo = (pr.sc_number || '').trim();
          const cleanId = npReg.replace(/\D/g, '');

          const step = appNumMap.get(npReg) || appNumMap.get(cleanId) || appNumMap.get(scNo);
          if (step && pr.national_portal_status !== step) {
            await supabase
              .from('lead_prospects')
              .update({ national_portal_status: step, updated_at: new Date().toISOString() })
              .eq('id', pr.id);
            updatedProspects++;
          }
        }
      }
    }
    console.log(`   ✅ Updated ${updatedProspects} Lead Prospects with actual National Portal stage statuses.`);
  }

  console.log('\n🎉 National Portal Catalog refreshed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
