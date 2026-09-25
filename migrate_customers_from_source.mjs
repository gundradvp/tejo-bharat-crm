/**
 * Customer Migration Script
 * Fetches ALL customers from the source (original) Supabase project
 * and imports them into this project's database.
 *
 * HOW TO USE:
 * 1. Open the original Bolt project's Supabase dashboard
 * 2. Go to Settings → API
 * 3. Copy the "Project URL" and "service_role" key (not anon key)
 * 4. Paste them below in SOURCE_URL and SOURCE_SERVICE_KEY
 * 5. Run:  node migrate_customers_from_source.mjs
 */

import { createClient } from '@supabase/supabase-js';

// ─── FILL THESE IN ───────────────────────────────────────────────────────────
const SOURCE_URL         = 'https://YOUR_SOURCE_PROJECT_ID.supabase.co';
const SOURCE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // service_role key from source project
// ─────────────────────────────────────────────────────────────────────────────

// Target is this project (already configured)
const TARGET_URL         = 'https://rlwcqmlspvddfscyngfw.supabase.co';
const TARGET_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Default tenant for all imported customers
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const BATCH_SIZE = 100;

// ─── Validation ──────────────────────────────────────────────────────────────
if (SOURCE_URL.includes('YOUR_SOURCE_PROJECT_ID')) {
  console.error('ERROR: Please fill in SOURCE_URL with your original project URL.');
  process.exit(1);
}
if (SOURCE_SERVICE_KEY.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) {
  console.error('ERROR: Please fill in SOURCE_SERVICE_KEY with your original project service_role key.');
  process.exit(1);
}
if (!TARGET_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is not set.');
  console.error('Run:  SUPABASE_SERVICE_ROLE_KEY=your_key node migrate_customers_from_source.mjs');
  process.exit(1);
}

const source = createClient(SOURCE_URL, SOURCE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const target = createClient(TARGET_URL, TARGET_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ─── Column mapping: old schema → new schema ─────────────────────────────────
function mapCustomer(row) {
  return {
    // Keep same id so existing references (tasks, notes, etc.) work
    id: row.id,
    tenant_id: DEFAULT_TENANT_ID,

    // agent_id was renamed to assigned_agent_id
    assigned_agent_id: row.assigned_agent_id ?? row.agent_id ?? null,

    // Core fields (same name in both schemas)
    customer_name:       row.customer_name,
    phone:               row.phone ?? null,
    email:               row.email ?? null,
    address:             row.address ?? null,
    consumer_number:     row.consumer_number ?? null,
    application_ref_no:  row.application_ref_no ?? null,

    // Status fields
    loan_status:         row.loan_status ?? 'not_applicable',
    document_status:     row.document_status ?? 'not_submitted',
    installation_status: row.installation_status ?? 'not_started',
    subsidy_status:      row.subsidy_status ?? 'not_claimed',
    overall_status:      row.overall_status ?? 'new',

    // Workflow
    current_workflow_stage:    row.current_workflow_stage ?? 'site_survey',
    workflow_stage_updated_at: row.workflow_stage_updated_at ?? null,

    // Solar / technical fields
    sanctioned_load:     row.sanctioned_load ?? null,
    connection_type:     row.connection_type ?? null,
    discom_name:         row.discom_name ?? null,
    district_name:       row.district_name ?? null,
    system_capacity_kw:  row.system_capacity_kw ?? null,
    panel_make:          row.panel_make ?? null,
    panel_model:         row.panel_model ?? null,
    panel_wattage:       row.panel_wattage ?? null,
    panel_quantity:      row.panel_quantity ?? null,
    panel_serial_numbers: row.panel_serial_numbers ?? null,
    inverter_make:       row.inverter_make ?? null,
    inverter_model:      row.inverter_model ?? null,
    inverter_capacity_kw: row.inverter_capacity_kw ?? null,
    inverter_serial_number: row.inverter_serial_number ?? null,
    structure_type:      row.structure_type ?? null,
    installation_date:   row.installation_date ?? null,
    commissioned_date:   row.commissioned_date ?? null,
    net_meter_number:    row.net_meter_number ?? null,
    net_meter_installed_date: row.net_meter_installed_date ?? null,
    subsidy_amount:      row.subsidy_amount ?? null,
    subsidy_received_date: row.subsidy_received_date ?? null,

    // DISCOM / EB fields
    eb_account_number:   row.eb_account_number ?? null,
    eb_consumer_name:    row.eb_consumer_name ?? null,
    eb_service_connection_number: row.eb_service_connection_number ?? null,
    eb_tariff_category:  row.eb_tariff_category ?? null,
    discom_application_number: row.discom_application_number ?? null,
    discom_approval_status: row.discom_approval_status ?? null,
    discom_approved_date: row.discom_approved_date ?? null,
    discom_feasibility_ref: row.discom_feasibility_ref ?? null,
    discom_inspector_name: row.discom_inspector_name ?? null,
    discom_inspection_date: row.discom_inspection_date ?? null,
    discom_inspection_status: row.discom_inspection_status ?? null,

    // Lead generator / commission fields
    introduced_by_lead_generator_id: row.introduced_by_lead_generator_id ?? null,
    introduction_date:   row.introduction_date ?? null,
    commission_amount:   row.commission_amount ?? null,
    commission_paid:     row.commission_paid ?? false,
    commission_paid_date: row.commission_paid_date ?? null,

    // Location hierarchy fields
    state_id:            row.state_id ?? null,
    district_id:         row.district_id ?? null,
    constituency_id:     row.constituency_id ?? null,
    mandal_id:           row.mandal_id ?? null,
    village_id:          row.village_id ?? null,

    remarks:             row.remarks ?? null,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting customer migration...\n');

  // Count total rows in source
  const { count, error: countErr } = await source
    .from('customers')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Failed to count source customers:', countErr.message);
    process.exit(1);
  }

  console.log(`Found ${count} customers in source database.`);

  let offset = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  while (offset < count) {
    process.stdout.write(`Fetching rows ${offset + 1}–${Math.min(offset + BATCH_SIZE, count)}...`);

    const { data: rows, error: fetchErr } = await source
      .from('customers')
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('created_at', { ascending: true });

    if (fetchErr) {
      console.error('\nFetch error:', fetchErr.message);
      process.exit(1);
    }

    const mapped = rows.map(mapCustomer);

    const { data: upserted, error: upsertErr } = await target
      .from('customers')
      .upsert(mapped, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (upsertErr) {
      console.error('\nUpsert error:', upsertErr.message);
      totalErrors += rows.length;
    } else {
      // upsert returns all rows; we can't distinguish created vs updated, so count all as imported
      totalCreated += upserted?.length ?? 0;
      console.log(` done (${upserted?.length ?? 0} rows)`);
    }

    offset += BATCH_SIZE;
  }

  console.log('\n──────────────────────────────────');
  console.log(`Total imported : ${totalCreated}`);
  console.log(`Total errors   : ${totalErrors}`);
  console.log('──────────────────────────────────');

  if (totalErrors > 0) {
    console.log('\nSome rows failed. Common causes:');
    console.log(' - Column type mismatch between old and new schema');
    console.log(' - Foreign key (introduced_by_lead_generator_id) pointing to missing rows');
    console.log('\nTip: Null out foreign keys in mapCustomer() if needed and re-run.');
  } else {
    console.log('\nAll customers migrated successfully!');
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
