import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rlwcqmlspvddfscyngfw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';
const CUSTOMERS_DIR = '/Users/durgajo/Desktop/Tejo Bharat/Customers';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findFiles(dir, matchFn, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findFiles(fullPath, matchFn, fileList);
      } else if (matchFn(item, fullPath)) {
        fileList.push(fullPath);
      }
    } catch (e) {}
  }
  return fileList;
}

async function main() {
  console.log('🔍 Scanning GST Invoices and Full Loan Disbursal Customers...');

  // 1. Find all Invoice files in Customers directory
  const invoiceFiles = findFiles(CUSTOMERS_DIR, (fileName, fullPath) => {
    const lower = fileName.toLowerCase();
    const isPdf = lower.endsWith('.pdf');
    const hasInvoice = lower.includes('invoice') || lower.includes('_tb_') || lower.includes('gst');
    const isMerged = lower.includes('merged') || lower.includes('.ds_store');
    return isPdf && (hasInvoice || fullPath.includes('/GST/') || fullPath.includes('/OUTINVOICE/')) && !isMerged;
  });

  console.log(`📁 Found ${invoiceFiles.length} GST Invoice PDF files on disk.`);

  // Extract names and possible SC numbers from invoice files
  const invoiceRecords = invoiceFiles.map(filePath => {
    const base = path.basename(filePath, '.pdf');
    let cleanName = base
      .replace(/^(B2B_|B2C_)/i, '')
      .replace(/_Invoice.*$/i, '')
      .replace(/_Quotation.*$/i, '')
      .replace(/_ORIGINAL_FOR_RECIPIENT.*/i, '')
      .replace(/_TB_\d+_\d+.*$/i, '')
      .replace(/_/g, ' ')
      .trim();

    return {
      filePath,
      fileName: path.basename(filePath),
      extractedName: cleanName,
      normName: normalize(cleanName)
    };
  });

  // 2. Fetch all customers from Supabase
  let allCustomers = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, customer_name, consumer_number, phone, agreed_project_cost, loan_sanctioned_amount, loan_status, current_loan_status, subsidy_status, installation_status, current_workflow_stage, overall_status, address')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching customers:', error);
      break;
    }
    if (!data || data.length === 0) break;
    allCustomers.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  console.log(`👥 Loaded ${allCustomers.length} total customers from Supabase.`);

  // 3. Cross-match invoices with Supabase customers
  const invoiceMatchedCustomers = new Map();

  for (const inv of invoiceRecords) {
    if (!inv.normName || inv.normName.length < 3) continue;

    // Try exact match first
    let matched = allCustomers.find(c => normalize(c.customer_name) === inv.normName);

    // Try substring matching
    if (!matched) {
      matched = allCustomers.find(c => {
        const custNorm = normalize(c.customer_name);
        if (!custNorm || custNorm.length < 3) return false;
        return (custNorm.length >= 5 && inv.normName.length >= 5) && (custNorm.includes(inv.normName) || inv.normName.includes(custNorm));
      });
    }

    if (matched) {
      if (!invoiceMatchedCustomers.has(matched.id)) {
        invoiceMatchedCustomers.set(matched.id, {
          customer: matched,
          invoices: [inv.fileName]
        });
      } else {
        invoiceMatchedCustomers.get(matched.id).invoices.push(inv.fileName);
      }
    }
  }

  console.log(`✅ Matched ${invoiceMatchedCustomers.size} customers who already have GST Invoices raised.`);

  // 4. Identify customers whose loan disbursal is COMPLETE & FULL ('Disbursed')
  const fullyDisbursedCustomers = allCustomers.filter(c => {
    const st = (c.current_loan_status || c.loan_status || '').toLowerCase();
    return st === 'disbursed';
  });

  console.log(`🏦 Found ${fullyDisbursedCustomers.length} customers with FULL Loan Disbursal ('Disbursed').`);

  // Split into:
  // A) Fully Disbursed & Invoice Already Raised
  // B) Fully Disbursed & NO Invoice Raised (ACTION REQUIRED)
  const disbursedWithInvoice = [];
  const disbursedNeedsInvoice = [];

  for (const c of fullyDisbursedCustomers) {
    if (invoiceMatchedCustomers.has(c.id)) {
      disbursedWithInvoice.push({
        id: c.id,
        name: c.customer_name,
        consumerNumber: c.consumer_number || '-',
        phone: c.phone || '-',
        district: c.district || '-',
        agreedCost: c.agreed_project_cost || 0,
        loanStatus: c.current_loan_status || c.loan_status,
        invoices: invoiceMatchedCustomers.get(c.id).invoices,
        currentStage: c.current_workflow_stage || c.installation_status || c.overall_status || 'site_survey'
      });
    } else {
      disbursedNeedsInvoice.push({
        id: c.id,
        name: c.customer_name,
        consumerNumber: c.consumer_number || '-',
        phone: c.phone || '-',
        district: c.district || '-',
        agreedCost: c.agreed_project_cost || 0,
        loanStatus: c.current_loan_status || c.loan_status,
        currentStage: c.current_workflow_stage || c.installation_status || c.overall_status || 'site_survey'
      });
    }
  }

  // All customers with invoice raised
  const allInvoiceRaisedList = Array.from(invoiceMatchedCustomers.values()).map(({ customer, invoices }) => ({
    id: customer.id,
    name: customer.customer_name,
    consumerNumber: customer.consumer_number || '-',
    phone: customer.phone || '-',
    loanStatus: customer.current_loan_status || customer.loan_status || 'not_applicable',
    invoices,
    currentStage: customer.current_workflow_stage || customer.installation_status || 'site_survey'
  }));

  const report = {
    summary: {
      totalCustomers: allCustomers.length,
      totalGstInvoiceFiles: invoiceFiles.length,
      totalCustomersWithInvoicesRaised: allInvoiceRaisedList.length,
      totalFullyDisbursedCustomers: fullyDisbursedCustomers.length,
      fullyDisbursedWithInvoice: disbursedWithInvoice.length,
      fullyDisbursedNEEDSInvoice: disbursedNeedsInvoice.length
    },
    allInvoiceRaisedList,
    disbursedNeedsInvoice,
    disbursedWithInvoice
  };

  const reportPath = '/Users/durgajo/Desktop/Tejo Bharat/Softwares/crm/scripts/invoice_disbursal_report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n======================================================');
  console.log(`📋 SUMMARY`);
  console.log(`======================================================`);
  console.log(`1. Customers with GST Invoices Raised: ${allInvoiceRaisedList.length}`);
  console.log(`2. Full Loan Disbursed Customers: ${fullyDisbursedCustomers.length}`);
  console.log(`   ├─ Invoice Already Raised: ${disbursedWithInvoice.length}`);
  console.log(`   └─ 🚨 INVOICE NEEDS TO BE RAISED: ${disbursedNeedsInvoice.length}`);
  console.log(`\n💾 Saved detailed structured report to: ${reportPath}`);
}

main().catch(console.error);
