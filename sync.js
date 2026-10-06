const fs = require('fs');
const path = require('path');
const https = require('https');

const filesToSync = [
  'package.json',
  'vite.config.ts',
  'src/App.tsx',
  'src/components/Activity/UserActivityModal.tsx',
  'src/components/Common/Pagination.tsx',
  'src/components/Customers/BulkImport.tsx',
  'src/components/Customers/CustomerDetailsForm.tsx',
  'src/components/Customers/CustomerList.tsx',
  'src/components/Customers/CustomerOverview.tsx',
  'src/components/Dashboard/AdminDashboard.tsx',
  'src/components/Dashboard/AgentDashboard.tsx',
  'src/components/Dashboard/EmployeeDashboard.tsx',
  'src/components/EBCustomers/EBCustomerDetailModal.tsx',
  'src/components/EBCustomers/EBCustomerList.tsx',
  'src/components/JSP/Members/KriyaImport.tsx',
  'src/components/JSP/Members/KriyaMemberList.tsx',
  'src/components/Layout/Navbar.tsx',
  'src/components/Prospects/AreaCodeFilter.tsx',
  'src/components/Prospects/ProspectDetailModal.tsx',
  'src/components/Prospects/ProspectImport.tsx',
  'src/components/Prospects/ProspectList.tsx',
  'src/components/Settings/SystemHealthDashboard.tsx',
  'src/components/StickyNotes/StickyNotesDrawer.tsx',
  'src/components/WhatsApp/WhatsAppCampaigns.tsx',
  'src/components/WhatsApp/WhatsAppHub.tsx',
  'src/components/WhatsApp/WhatsAppInbox.tsx',
  'src/components/WhatsApp/WhatsAppSettings.tsx',
  'src/components/WhatsApp/WhatsAppTemplates.tsx',
  'src/contexts/AuthContext.tsx',
  'src/contexts/TenantContext.tsx',
  'src/contexts/UserActivityContext.tsx',
  'src/data/areaCodes.json',
  'src/data/kakinadaAreaCodes.json',
  'src/lib/areaCodeCatalog.ts',
  'src/lib/ebApi.ts',
  'src/lib/importCustomers.ts',
  'src/lib/jspLocationData.ts',
  'src/lib/pmsuryaWebSync.ts',
  'src/lib/prospectApi.ts',
  'src/lib/stickyNotesStorage.ts',
  'src/lib/supabase.ts',
  'src/lib/userActivityTracker.ts',
  'src/lib/whatsappApi.ts',
  'src/lib/whatsappStorage.ts',
  'src/types/stickyNotes.ts',
  'src/types/userActivity.ts',
  'src/types/whatsapp.ts',
  'src/lib/ebParser.ts',
  'tailwind.config.js',
  'supabase/migrations/20260912000000_create_jsp_sadhaks_table.sql',
  'supabase/migrations/20260924100000_create_whatsapp_inbox_tables.sql',
  'supabase/migrations/20260925014000_add_lost_at_to_customers.sql',
  'supabase/migrations/20260930123000_fix_search_eb_customers_bills_and_area_codes.sql',
  'supabase/migrations/20261005130000_add_phone_search_to_prospects.sql',
  'supabase/migrations/20261005170000_mark_legacy_unknown_with_consumer_number_as_churned.sql',
  'supabase/LATEST_MIGRATIONS_BUNDLE.sql',
  'supabase/functions/whatsapp-webhook/index.ts',
  'WHATSAPP_SETUP_GUIDE.md',
  'public/_redirects',
  'vercel.json'
];

function fetchWithHttps(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) return reject(new Error('Too many redirects'));
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Bolt-Sync/1.0)',
        'Accept': '*/*'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchWithHttps(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function syncFile(file, index, total) {
  const cdnUrl = `https://cdn.jsdelivr.net/gh/gundradvp/tejo-bharat-crm@main/${file}`;
  const rawUrl = `https://raw.githubusercontent.com/gundradvp/tejo-bharat-crm/main/${file}`;

  let content = null;
  try {
    content = await fetchWithHttps(cdnUrl);
  } catch (e) {
    try {
      content = await fetchWithHttps(rawUrl);
    } catch (e2) {}
  }

  if (content === null) {
    console.error(`❌ [${index}/${total}] Failed to fetch: ${file}`);
    return false;
  }

  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log(`✅ [${index}/${total}] Updated ${file}`);
  return true;
}

async function run() {
  console.log(`🚀 Starting sync of ${filesToSync.length} files from GitHub into Bolt...`);
  let successCount = 0;
  for (let i = 0; i < filesToSync.length; i++) {
    const ok = await syncFile(filesToSync[i], i + 1, filesToSync.length);
    if (ok) successCount++;
  }
  console.log(`\n🎉 DONE! ${successCount}/${filesToSync.length} files successfully updated inside Bolt!`);
  console.log(`👉 Run 'npm run dev' to restart your preview.`);
}

run();
