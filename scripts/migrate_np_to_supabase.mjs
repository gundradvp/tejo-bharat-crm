import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rlwcqmlspvddfscyngfw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('🚀 Starting National Portal to Supabase migration...');
  const summaryPath = path.resolve(__dirname, '../public/national_portal_summary.json');

  if (!fs.existsSync(summaryPath)) {
    console.error('❌ national_portal_summary.json not found at:', summaryPath);
    process.exit(1);
  }

  console.log('📖 Reading summary JSON file...');
  const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  console.log(`📦 Loaded ${summaryData.length} records from summary.`);

  // Check if table exists
  const testRes = await supabase.from('national_portal_applications').select('id').limit(1);
  if (testRes.error) {
    console.error('\n❌ Table "national_portal_applications" does not exist in Supabase yet!');
    console.error('Please run the migration SQL in your Supabase SQL Editor:');
    console.error('supabase/migrations/20261109230000_create_national_portal_applications_table.sql\n');
    console.error('Error detail:', testRes.error.message);
    process.exit(1);
  }

  const BATCH_SIZE = 500;
  let totalUploaded = 0;
  const startTime = Date.now();

  for (let i = 0; i < summaryData.length; i += BATCH_SIZE) {
    const chunk = summaryData.slice(i, i + BATCH_SIZE);
    const rows = chunk.map((item) => ({
      id: String(item.id || item.appId || ''),
      app_num: item.appNum || item.applicationNumber || null,
      name: item.name || item.consumerName || null,
      phone: item.phone || item.mobile || null,
      email: item.email || null,
      sc: item.sc || item.consumerNo || null,
      state: item.state || item.stateName || null,
      district: item.district || item.districtName || null,
      circle: item.circle || item.circleName || null,
      division: item.division || item.divisionName || null,
      subdiv: item.subdiv || item.subDivisionName || null,
      village: item.village || item.villageName || null,
      address: item.address || null,
      pincode: item.pincode ? String(item.pincode) : null,
      cap: Number(item.cap || item.appliedCapacity) || 0,
      sanction_load: Number(item.sanctionLoad) || 0,
      step_id: item.stepId ? String(item.stepId) : null,
      step: item.step || item.stepName || null,
      vendor: item.vendor || item.vendorName || null,
      subsidy_amt: Number(item.subsidyAmt || item.subsidyAmount) || 0,
      subsidy_status: item.subsidyStatus || null,
      modules_count: Number(item.modulesCount) || 0,
      inverters_count: Number(item.invertersCount) || 0,
      docs_count: Number(item.docsCount) || 0,
      has_dcr: Boolean(item.hasDcr),
      panel_serials: Array.isArray(item.panelSerials) ? item.panelSerials : [],
      inv_serials: Array.isArray(item.invSerials) ? item.invSerials : [],
      module_mfr: item.moduleMfr || null,
      inv_mfr: item.invMfr || null,
      loan_app_no: item.loanAppNo || item.loanApplicationNumber || null,
      loan_amt: Number(item.loanAmt || item.sanctionAmount) || 0,
      loan_status: item.loanStatus || item.currentLoanStatus || null,
      loan_date: item.loanDate || null,
      bank_name: item.bankName || null,
      account_no: item.accountNo || item.accountNumber || null,
      ifsc: item.ifsc || item.ifscCode || null,
      account_holder: item.accountHolder || item.accountHolderName || null,
      net_meter_date: item.netMeterDate || item.netMeteringDate || null,
      submission_date: item.submissionDate || item.appSubmissionDate || null,
    })).filter(r => r.id);

    const { error } = await supabase
      .from('national_portal_applications')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error uploading batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      totalUploaded += rows.length;
      const pct = ((totalUploaded / summaryData.length) * 100).toFixed(1);
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r⏳ Uploaded ${totalUploaded}/${summaryData.length} records (${pct}%) in ${elapsedSec}s...`);
    }
  }

  console.log(`\n🎉 Successfully migrated ${totalUploaded} National Portal records to Supabase!`);
}

main().catch(console.error);
