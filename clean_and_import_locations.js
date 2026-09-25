import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function getTenantId() {
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('No tenant found. Please create a tenant first.');
  }

  return data.id;
}

async function cleanAllLocationData() {
  console.log('\n=== Cleaning all existing location data ===');

  const tables = ['villages', 'mandals', 'constituencies', 'districts', 'states'];

  for (const table of tables) {
    console.log(`Deleting all records from ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', 0);

    if (error) {
      console.error(`Error cleaning ${table}:`, error.message);
    } else {
      console.log(`✓ ${table} cleaned`);
    }
  }

  console.log('✓ All location data cleaned');
}

async function importLocationData(tenantId) {
  console.log('\n=== Importing location data from JSON ===');

  const jsonPath = join(__dirname, 'data', 'locations', 'location-template.json');
  console.log(`Reading from: ${jsonPath}`);

  const jsonContent = await readFile(jsonPath, 'utf-8');
  const jsonData = JSON.parse(jsonContent);

  const stats = {
    states: 0,
    districts: 0,
    constituencies: 0,
    mandals: 0,
    villages: 0
  };

  if (!jsonData.states || !Array.isArray(jsonData.states)) {
    throw new Error('Invalid JSON format: missing states array');
  }

  console.log(`Found ${jsonData.states.length} states in JSON`);

  for (const stateData of jsonData.states) {
    const stateName = stateData.name || stateData.state_name || 'Unknown';

    if (stateName !== 'Andhra Pradesh') {
      console.log(`Skipping state: ${stateName}`);
      continue;
    }

    console.log(`\nProcessing state: ${stateName}`);

    const { error: stateError } = await supabase
      .from('states')
      .upsert({
        id: stateData.id || stateData.state_id || 1,
        name: stateName,
        code: stateData.code,
        tenant_id: tenantId
      }, {
        onConflict: 'tenant_id,id'
      });

    if (stateError) throw stateError;
    stats.states++;

    const stateId = stateData.id || stateData.state_id || 1;

    if (stateData.districts && Array.isArray(stateData.districts)) {
      console.log(`  Processing ${stateData.districts.length} districts...`);

      for (const districtData of stateData.districts) {
        const { error: districtError } = await supabase
          .from('districts')
          .upsert({
            id: districtData.id,
            state_id: stateId,
            name: districtData.district_name || districtData.name,
            tenant_id: tenantId
          }, {
            onConflict: 'tenant_id,id'
          });

        if (districtError) throw districtError;
        stats.districts++;

        if (districtData.constituencies && Array.isArray(districtData.constituencies)) {
          for (const constituencyData of districtData.constituencies) {
            const constituencyId = constituencyData.id || constituencyData.constituency_id;

            const { error: constituencyError } = await supabase
              .from('constituencies')
              .upsert({
                id: constituencyId,
                district_id: districtData.id,
                name: constituencyData.constituency_name || constituencyData.name,
                parliament_constituency_id: constituencyData.parliament_constituency_id,
                parliament_constituency_name: constituencyData.parliament_constituency_name,
                tenant_id: tenantId
              }, {
                onConflict: 'tenant_id,id'
              });

            if (constituencyError) throw constituencyError;
            stats.constituencies++;

            if (constituencyData.mandals && Array.isArray(constituencyData.mandals)) {
              for (const mandalData of constituencyData.mandals) {
                const { error: mandalError } = await supabase
                  .from('mandals')
                  .upsert({
                    id: mandalData.id,
                    constituency_id: constituencyId,
                    name: mandalData.mandal_name || mandalData.name,
                    tenant_id: tenantId
                  }, {
                    onConflict: 'tenant_id,id'
                  });

                if (mandalError) throw mandalError;
                stats.mandals++;

                if (mandalData.panchayats && Array.isArray(mandalData.panchayats)) {
                  for (const villageData of mandalData.panchayats) {
                    const { error: villageError } = await supabase
                      .from('villages')
                      .upsert({
                        id: villageData.id,
                        mandal_id: mandalData.id,
                        name: villageData.name,
                        name_telugu: villageData.name_telugu,
                        area_category: villageData.area_category || 'Rural/Panchayat',
                        total_wards: villageData.total_wards || 0,
                        tenant_id: tenantId
                      }, {
                        onConflict: 'tenant_id,id'
                      });

                    if (villageError) throw villageError;
                    stats.villages++;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  console.log('\n=== Import Statistics ===');
  console.log(`States: ${stats.states}`);
  console.log(`Districts: ${stats.districts}`);
  console.log(`Constituencies: ${stats.constituencies}`);
  console.log(`Mandals: ${stats.mandals}`);
  console.log(`Villages: ${stats.villages}`);

  return stats;
}

async function verifyData() {
  console.log('\n=== Verifying imported data ===');

  const { data: villages, error } = await supabase
    .from('villages')
    .select('name')
    .ilike('name', '%durgada%')
    .limit(10);

  if (error) {
    console.error('Error searching for Durgada:', error.message);
  } else {
    console.log(`Found ${villages.length} villages matching "Durgada":`);
    villages.forEach(v => console.log(`  - ${v.name}`));
  }

  const { count } = await supabase
    .from('villages')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal villages in database: ${count}`);
}

async function main() {
  try {
    console.log('Starting location data cleanup and import...');

    const tenantId = await getTenantId();
    console.log(`Using tenant ID: ${tenantId}`);

    await cleanAllLocationData();
    await importLocationData(tenantId);
    await verifyData();

    console.log('\n✓ Location data cleanup and import completed successfully!');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

main();
