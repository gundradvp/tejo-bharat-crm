import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rlwcqmlspvddfscyngfw.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsd2NxbWxzcHZkZGZzY3luZ2Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYyNTcyMSwiZXhwIjoyMDkwMjAxNzIxfQ.8xDUtgktqSVGRC97z6OqCJuGF6lKRA00ZwDrmP6TW5U';
const reportPath = '/Users/durgajo/Desktop/Tejo Bharat/Softwares/crm/scripts/invoice_disbursal_report.json';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  if (!fs.existsSync(reportPath)) {
    console.error('Report file not found. Run analyze first.');
    return;
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const invoicedCustomers = report.allInvoiceRaisedList;

  console.log(`🚀 Updating ${invoicedCustomers.length} customers with raised GST invoices to 'completed'...`);

  let updatedCount = 0;
  for (const item of invoicedCustomers) {
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          installation_status: 'completed',
          overall_status: 'completed',
          current_workflow_stage: 'completed',
          workflow_stage_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) {
        console.error(`Failed to update ${item.name}:`, error.message);
      } else {
        updatedCount++;
        console.log(`✅ [${updatedCount}/${invoicedCustomers.length}] Marked Completed: ${item.name} (SC: ${item.consumerNumber})`);
      }
    } catch (err) {
      console.error(`Error updating customer ${item.id}:`, err);
    }
  }

  console.log(`\n🎉 Successfully marked ${updatedCount} customers as Completed!`);
}

main().catch(console.error);
