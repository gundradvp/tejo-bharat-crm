const fs = require('fs');
const path = require('path');
const https = require('https');

const COMMIT_SHA = '4610bd04751ad566fb31ea327eae5a70467c8167';

const filesToSync = [
  'package.json',
  'vite.config.ts',
  'tailwind.config.js',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
  'index.html',
  'supabase/LATEST_MIGRATIONS_BUNDLE.sql',
  'supabase/functions/whatsapp-webhook/index.ts',
  'WHATSAPP_SETUP_GUIDE.md',
  'public/_redirects',
  'vercel.json',
  'src/App.tsx',
  'src/components/Activity/ActivityTimeline.tsx',
  'src/components/Activity/UserActivityModal.tsx',
  'src/components/Attendance/AttendanceCalendar.tsx',
  'src/components/Attendance/AttendanceDetailView.tsx',
  'src/components/Attendance/AttendanceNavigation.tsx',
  'src/components/Attendance/AttendanceReports.tsx',
  'src/components/Attendance/AttendanceTracker.tsx',
  'src/components/Attendance/LeaveApplicationForm.tsx',
  'src/components/Attendance/LeaveManagement.tsx',
  'src/components/Auth/ForgotPasswordForm.tsx',
  'src/components/Auth/LoginForm.tsx',
  'src/components/Auth/ResetPasswordForm.tsx',
  'src/components/Auth/SignupForm.tsx',
  'src/components/Common/CascadingLocationSelector.tsx',
  'src/components/Common/ErrorBoundary.tsx',
  'src/components/Common/ImportProgressWidget.tsx',
  'src/components/Common/MultiSelectDropdown.tsx',
  'src/components/Common/Pagination.tsx',
  'src/components/Customers/Agreement.tsx',
  'src/components/Customers/AnnexureC.tsx',
  'src/components/Customers/BulkImport.tsx',
  'src/components/Customers/CustomerDetailsForm.tsx',
  'src/components/Customers/CustomerFinancePage.tsx',
  'src/components/Customers/CustomerForm.tsx',
  'src/components/Customers/CustomerList.tsx',
  'src/components/Customers/CustomerOverview.tsx',
  'src/components/Customers/CustomerPaymentTracking.tsx',
  'src/components/Customers/CustomerQuickViewModal.tsx',
  'src/components/Customers/CustomerTechnicalDetailsModal.tsx',
  'src/components/Customers/CustomerWorkflowChecklist.tsx',
  'src/components/Customers/DocumentPrintPage.tsx',
  'src/components/Customers/EnhancedQuotationGenerator.tsx',
  'src/components/Customers/ExpenseTracking.tsx',
  'src/components/Customers/FinancialOverview.tsx',
  'src/components/Customers/FinancialSummaryEditor.tsx',
  'src/components/Customers/LoanDisbursementTracking.tsx',
  'src/components/Customers/MarginTracking.tsx',
  'src/components/Customers/ProjectWorkflowManager.tsx',
  'src/components/Customers/Quotation.tsx',
  'src/components/Customers/QuotationManagement.tsx',
  'src/components/Customers/QuotationPage.tsx',
  'src/components/Customers/SuryaGharDetailedImport.tsx',
  'src/components/Dashboard/AdminDashboard.tsx',
  'src/components/Dashboard/AgentDashboard.tsx',
  'src/components/Dashboard/EmployeeDashboard.tsx',
  'src/components/Dashboard/FinancialDashboard.tsx',
  'src/components/Dashboard/StatCard.tsx',
  'src/components/Dashboard/SuperAdminDashboard.tsx',
  'src/components/Debug/ConnectionTest.tsx',
  'src/components/Debug/LocationDataTest.tsx',
  'src/components/Documentation/DocumentationPage.tsx',
  'src/components/Documents/CentralUploadCenter.tsx',
  'src/components/Documents/CustomerDocuments.tsx',
  'src/components/Documents/DocumentManagementDashboard.tsx',
  'src/components/Documents/QuickDocumentUpload.tsx',
  'src/components/Documents/SolarDocumentUpload.tsx',
  'src/components/EBCustomers/EBBillImport.tsx',
  'src/components/EBCustomers/EBCustomerDetailModal.tsx',
  'src/components/EBCustomers/EBCustomerImport.tsx',
  'src/components/EBCustomers/EBCustomerImportProgressWidget.tsx',
  'src/components/EBCustomers/EBCustomerList.tsx',
  'src/components/Items/ItemsManagement.tsx',
  'src/components/JSP/Dashboard/JSPDashboard.tsx',
  'src/components/JSP/Hierarchy/HierarchyBrowser.tsx',
  'src/components/JSP/Hierarchy/LocationStats.tsx',
  'src/components/JSP/Incharges/InchargeManagement.tsx',
  'src/components/JSP/Members/KriyaImport.tsx',
  'src/components/JSP/Members/KriyaMemberList.tsx',
  'src/components/Layout/Navbar.tsx',
  'src/components/LeadGenerators/LeadGeneratorManagement.tsx',
  'src/components/Notes/AddNoteForm.tsx',
  'src/components/Notes/CustomerNotes.tsx',
  'src/components/Notes/NotesList.tsx',
  'src/components/PWA/InstallPrompt.tsx',
  'src/components/Prospects/AreaCodeFilter.tsx',
  'src/components/Prospects/ProspectDetailModal.tsx',
  'src/components/Prospects/ProspectFollowupsWidget.tsx',
  'src/components/Prospects/ProspectImport.tsx',
  'src/components/Prospects/ProspectImportProgressWidget.tsx',
  'src/components/Prospects/ProspectList.tsx',
  'src/components/Quotations/QuotationForm.tsx',
  'src/components/Quotations/QuotationsList.tsx',
  'src/components/Settings/CustomStatusManagement.tsx',
  'src/components/Settings/DriveFolderMapping.tsx',
  'src/components/Settings/LocationManagement.tsx',
  'src/components/Settings/LookupManagement.tsx',
  'src/components/Settings/MasterDataManagement.tsx',
  'src/components/Settings/ProfileManagement.tsx',
  'src/components/Settings/SystemHealthDashboard.tsx',
  'src/components/Settings/TenantSettings.tsx',
  'src/components/StickyNotes/StickyNotesDrawer.tsx',
  'src/components/SuperAdmin/TenantManagement.tsx',
  'src/components/Tasks/TaskForm.tsx',
  'src/components/Tasks/TaskList.tsx',
  'src/components/Tasks/TaskTimer.tsx',
  'src/components/Tasks/TasksByUser.tsx',
  'src/components/Users/UserManagement.tsx',
  'src/components/WhatsApp/WhatsAppCampaigns.tsx',
  'src/components/WhatsApp/WhatsAppHub.tsx',
  'src/components/WhatsApp/WhatsAppInbox.tsx',
  'src/components/WhatsApp/WhatsAppSettings.tsx',
  'src/components/WhatsApp/WhatsAppTemplates.tsx',
  'src/components/Workflow/WorkflowManagement.tsx',
  'src/components/Workflow/WorkflowProgressView.tsx',
  'src/components/Workflow/WorkflowStageChanger.tsx',
  'src/contexts/AuthContext.tsx',
  'src/contexts/EBImportContext.tsx',
  'src/contexts/ImportProgressContext.tsx',
  'src/contexts/ProspectImportContext.tsx',
  'src/contexts/TenantContext.tsx',
  'src/contexts/ThemeContext.tsx',
  'src/contexts/UserActivityContext.tsx',
  'src/data/areaCodes.json',
  'src/data/customers/EBData_-_Sheet1.csv',
  'src/data/customers/sample_data_-_Sheet1.csv',
  'src/data/kakinadaAreaCodes.json',
  'src/hooks/useLocations.ts',
  'src/index.css',
  'src/lib/areaCodeCatalog.ts',
  'src/lib/csvParser.ts',
  'src/lib/documentExtractor.ts',
  'src/lib/documentMatchingService.ts',
  'src/lib/ebApi.ts',
  'src/lib/ebBillParser.ts',
  'src/lib/ebParser.ts',
  'src/lib/googleDrive.ts',
  'src/lib/importCustomers.ts',
  'src/lib/jsonParser.ts',
  'src/lib/jspLocationData.ts',
  'src/lib/locationApi.ts',
  'src/lib/notesApi.ts',
  'src/lib/pmsuryaWebSync.ts',
  'src/lib/prospectApi.ts',
  'src/lib/prospectParser.ts',
  'src/lib/solarDocumentExtractor.ts',
  'src/lib/stickyNotesStorage.ts',
  'src/lib/supabase.ts',
  'src/lib/themes.ts',
  'src/lib/userActivityTracker.ts',
  'src/lib/whatsappApi.ts',
  'src/lib/whatsappStorage.ts',
  'src/main.tsx',
  'src/types/stickyNotes.ts',
  'src/types/userActivity.ts',
  'src/types/whatsapp.ts',
  'src/vite-env.d.ts'
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
  const cdnUrl = `https://cdn.jsdelivr.net/gh/gundradvp/tejo-bharat-crm@${COMMIT_SHA}/${file}`;
  const rawUrl = `https://raw.githubusercontent.com/gundradvp/tejo-bharat-crm/${COMMIT_SHA}/${file}`;

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
  console.log(`🚀 Starting sync of all ${filesToSync.length} CRM files into Bolt...`);
  let successCount = 0;
  for (let i = 0; i < filesToSync.length; i++) {
    const ok = await syncFile(filesToSync[i], i + 1, filesToSync.length);
    if (ok) successCount++;
  }
  console.log(`\n🎉 DONE! ${successCount}/${filesToSync.length} files successfully updated inside Bolt!`);
  console.log(`👉 Run 'npm run dev' to restart your preview.`);
}

run();
