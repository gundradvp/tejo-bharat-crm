import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ctnridgmzwvwcioizspp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0bnJpZGdtend2d2Npb2l6c3BwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNDQxNTksImV4cCI6MjA3ODYyMDE1OX0.aWaddy1jXM3sM7pOWN3bzidc4OP7oXozEXM_kQ1AxMg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTenantId() {
  return '12a7aad5-baea-46ca-8f39-72aa8a367ffe';
}

async function readJSONFile() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream('./data/locations/location-template.json', { encoding: 'utf8' });

    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      try {
        const jsonData = JSON.parse(chunks.join(''));
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    });

    stream.on('error', reject);
  });
}

async function importData() {
  try {
    console.log('Getting tenant ID...');
    const tenantId = await getTenantId();
    console.log(`Tenant ID: ${tenantId}`);

    console.log('\nReading JSON file...');
    const jsonData = await readJSONFile();
    console.log(`Found ${jsonData.states?.length || 0} states`);

    const stats = {
      states: 0,
      districts: 0,
      constituencies: 0,
      mandals: 0,
      villages: 0
    };

    for (const stateData of jsonData.states || []) {
      const stateName = stateData.name || stateData.state_name;

      if (stateName !== 'Andhra Pradesh') {
        console.log(`Skipping: ${stateName}`);
        continue;
      }

      console.log(`\nImporting: ${stateName}`);

      const stateId = stateData.id || stateData.state_id || 1;
      await supabase.from('states').upsert({
        id: stateId,
        name: stateName,
        code: stateData.code || 'AP',
        tenant_id: tenantId
      });
      stats.states++;

      for (const district of stateData.districts || []) {
        await supabase.from('districts').upsert({
          id: district.id,
          state_id: stateId,
          name: district.district_name || district.name,
          tenant_id: tenantId
        });
        stats.districts++;

        for (const constituency of district.constituencies || []) {
          const constId = constituency.id || constituency.constituency_id;
          await supabase.from('constituencies').upsert({
            id: constId,
            district_id: district.id,
            name: constituency.constituency_name || constituency.name,
            parliament_constituency_id: constituency.parliament_constituency_id,
            parliament_constituency_name: constituency.parliament_constituency_name,
            tenant_id: tenantId
          });
          stats.constituencies++;

          for (const mandal of constituency.mandals || []) {
            await supabase.from('mandals').upsert({
              id: mandal.id,
              constituency_id: constId,
              name: mandal.mandal_name || mandal.name,
              tenant_id: tenantId
            });
            stats.mandals++;

            for (const village of mandal.panchayats || []) {
              await supabase.from('villages').upsert({
                id: village.id,
                mandal_id: mandal.id,
                name: village.name,
                name_telugu: village.name_telugu,
                area_category: village.area_category || 'Rural/Panchayat',
                total_wards: village.total_wards || 0,
                tenant_id: tenantId
              });
              stats.villages++;

              if (stats.villages % 100 === 0) {
                console.log(`  Imported ${stats.villages} villages...`);
              }
            }
          }
        }
      }
    }

    console.log('\n=== Import Complete ===');
    console.log(`States: ${stats.states}`);
    console.log(`Districts: ${stats.districts}`);
    console.log(`Constituencies: ${stats.constituencies}`);
    console.log(`Mandals: ${stats.mandals}`);
    console.log(`Villages: ${stats.villages}`);

    console.log('\n Searching for Durgada...');
    const { data: villages } = await supabase
      .from('villages')
      .select('name, name_telugu')
      .or('name.ilike.%durgada%,name.ilike.%durgad%')
      .limit(10);

    console.log(`Found ${villages?.length || 0} matching villages:`);
    villages?.forEach(v => console.log(`  - ${v.name} ${v.name_telugu ? `(${v.name_telugu})` : ''}`));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

importData();
