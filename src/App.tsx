import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ImportProgressProvider } from './contexts/ImportProgressContext';
import { ProspectImportProvider } from './contexts/ProspectImportContext';
import { EBImportProvider } from './contexts/EBImportContext';
import ProspectImportProgressWidget from './components/Prospects/ProspectImportProgressWidget';
import EBCustomerImportProgressWidget from './components/EBCustomers/EBCustomerImportProgressWidget';
import ImportProgressWidget from './components/Common/ImportProgressWidget';
import { supabase } from './lib/supabase';
import LoginForm from './components/Auth/LoginForm';
import SignupForm from './components/Auth/SignupForm';
import ForgotPasswordForm from './components/Auth/ForgotPasswordForm';
import ResetPasswordForm from './components/Auth/ResetPasswordForm';
import Navbar from './components/Layout/Navbar';

import AdminDashboard from './components/Dashboard/AdminDashboard';
import AgentDashboard from './components/Dashboard/AgentDashboard';
import EmployeeDashboard from './components/Dashboard/EmployeeDashboard';
import FinancialDashboard from './components/Dashboard/FinancialDashboard';
import SuperAdminDashboard from './components/Dashboard/SuperAdminDashboard';
import CustomerList from './components/Customers/CustomerList';
import SuryaGharDetailedImport from './components/Customers/SuryaGharDetailedImport';
import CustomerOverview from './components/Customers/CustomerOverview';
import CustomerDetailsForm from './components/Customers/CustomerDetailsForm';
import DocumentPrintPage from './components/Customers/DocumentPrintPage';
import QuotationPage from './components/Customers/QuotationPage';
import QuotationManagement from './components/Customers/QuotationManagement';
import CustomerFinancePage from './components/Customers/CustomerFinancePage';
import QuotationsList from './components/Quotations/QuotationsList';
import QuotationForm from './components/Quotations/QuotationForm';
import CentralUploadCenter from './components/Documents/CentralUploadCenter';
import DocumentManagementDashboard from './components/Documents/DocumentManagementDashboard';
import SolarDocumentUpload from './components/Documents/SolarDocumentUpload';
import TaskList from './components/Tasks/TaskList';
import TasksByUser from './components/Tasks/TasksByUser';
import UserManagement from './components/Users/UserManagement';
import AttendanceReports from './components/Attendance/AttendanceReports';
import LeaveManagement from './components/Attendance/LeaveManagement';
import AttendanceDetailView from './components/Attendance/AttendanceDetailView';
import AttendanceCalendar from './components/Attendance/AttendanceCalendar';
import CustomStatusManagement from './components/Settings/CustomStatusManagement';
import ProfileManagement from './components/Settings/ProfileManagement';
import DocumentationPage from './components/Documentation/DocumentationPage';
import TenantSettings from './components/Settings/TenantSettings';
import DriveFolderMapping from './components/Settings/DriveFolderMapping';
import MasterDataManagement from './components/Settings/MasterDataManagement';
import LookupManagement from './components/Settings/LookupManagement';
import LocationManagement from './components/Settings/LocationManagement';
import TenantManagement from './components/SuperAdmin/TenantManagement';
import ItemsManagement from './components/Items/ItemsManagement';
import LeadGeneratorManagement from './components/LeadGenerators/LeadGeneratorManagement';
import WorkflowManagement from './components/Workflow/WorkflowManagement';
import ProspectList from './components/Prospects/ProspectList';
import ProspectImport from './components/Prospects/ProspectImport';
import EBCustomerList from './components/EBCustomers/EBCustomerList';
import EBCustomerImport from './components/EBCustomers/EBCustomerImport';
import EBBillImport from './components/EBCustomers/EBBillImport';
import ConnectionTest from './components/Debug/ConnectionTest';
import SystemHealthDashboard from './components/Settings/SystemHealthDashboard';
import JSPHierarchyBrowser from './components/JSP/Hierarchy/HierarchyBrowser';
import JSPDashboard from './components/JSP/Dashboard/JSPDashboard';
import KriyaMemberList from './components/JSP/Members/KriyaMemberList';
import KriyaImport from './components/JSP/Members/KriyaImport';
import InchargeManagement from './components/JSP/Incharges/InchargeManagement';
import WhatsAppHub from './components/WhatsApp/WhatsAppHub';
import { UserActivityProvider } from './contexts/UserActivityContext';
import StickyNotesDrawer from './components/StickyNotes/StickyNotesDrawer';
import UserActivityModal from './components/Activity/UserActivityModal';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/Common/ErrorBoundary';

function DashboardRouter() {
  const { profile, hasRole } = useAuth();

  const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);

  if (userRoles.includes('admin')) {
    return <AdminDashboard />;
  } else if (userRoles.includes('lead_generator')) {
    return <AgentDashboard />;
  } else if (userRoles.includes('employee')) {
    return <EmployeeDashboard />;
  } else if (userRoles.includes('finance')) {
    return <CustomerList />;
  } else if (userRoles.some(r => r.startsWith('jsp_'))) {
    return <JSPDashboard />;
  }

  return <div>Invalid role</div>;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      const initializeStorageBucket = async () => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-storage-bucket`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            }
          );
          if (!response.ok) {
            console.error('Failed to initialize storage bucket');
          }
        } catch (error) {
          console.error('Error initializing storage bucket:', error);
        }
      };

      initializeStorageBucket();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen theme-page-bg">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<DashboardRouter />} />
          <Route path="/financial" element={<FinancialDashboard />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/import-detailed" element={<SuryaGharDetailedImport />} />
          <Route path="/customers/:id" element={<CustomerOverview />} />
          <Route path="/customers/:id/details" element={<CustomerDetailsForm />} />
          <Route path="/customers/:id/print" element={<DocumentPrintPage />} />
          <Route path="/customers/:id/quotation" element={<QuotationPage />} />
          <Route path="/customers/:id/quotation-manage" element={<QuotationManagement />} />
          <Route path="/customers/:id/finance" element={<CustomerFinancePage />} />
          <Route path="/quotations" element={<QuotationsList />} />
          <Route path="/quotations/create" element={<QuotationForm />} />
          <Route path="/quotations/:id/edit" element={<QuotationForm />} />
          <Route path="/quotations/:id/view" element={<QuotationForm />} />
          <Route path="/quotations/:id/print" element={<QuotationForm />} />
          <Route path="/documents/upload" element={<CentralUploadCenter />} />
          <Route path="/documents/manage" element={<DocumentManagementDashboard />} />
          <Route path="/documents/solar-upload" element={<SolarDocumentUpload />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/by-user" element={<TasksByUser />} />
          <Route path="/attendance" element={<AttendanceReports />} />
          <Route path="/attendance/leave" element={<LeaveManagement />} />
          <Route path="/attendance/details" element={<AttendanceDetailView />} />
          <Route path="/attendance/calendar" element={<AttendanceCalendar />} />
          <Route path="/items" element={<ItemsManagement />} />
          <Route path="/lead-generators" element={<LeadGeneratorManagement />} />
          <Route path="/workflow" element={<WorkflowManagement />} />
          <Route path="/prospects" element={<ProspectList />} />
          <Route path="/prospects/import" element={<ProspectImport />} />
          <Route path="/whatsapp" element={<WhatsAppHub />} />
          <Route path="/whatsapp/:tab" element={<WhatsAppHub />} />
          <Route path="/eb-customers" element={<EBCustomerList />} />
          <Route path="/eb-customers/import" element={<EBCustomerImport />} />
          <Route path="/eb-customers/import-bills" element={<EBBillImport />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/settings/custom-status" element={<CustomStatusManagement />} />
          <Route path="/settings/master-data" element={<MasterDataManagement />} />
          <Route path="/settings/lookups" element={<LookupManagement />} />
          <Route path="/settings/locations" element={<LocationManagement />} />
          <Route path="/settings/tenant" element={<TenantSettings />} />
          <Route path="/settings/drive-mapping" element={<DriveFolderMapping />} />
          <Route path="/settings/system-health" element={<SystemHealthDashboard />} />
          <Route path="/debug/health" element={<SystemHealthDashboard />} />
          <Route path="/profile" element={<ProfileManagement />} />
          <Route path="/documentation" element={<DocumentationPage />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/tenants/create" element={<TenantManagement />} />
          <Route path="/super-admin/tenants/:id" element={<TenantManagement />} />
          <Route path="/jsp" element={<JSPDashboard />} />
          <Route path="/jsp/members" element={<KriyaMemberList />} />
          <Route path="/jsp/import" element={<KriyaImport />} />
          <Route path="/jsp/hierarchy" element={<JSPHierarchyBrowser />} />
          <Route path="/jsp/incharges" element={<InchargeManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      </main>

      {/* User-Specific Personal Sticky Notes & Time Spent Tracker Modal */}
      <StickyNotesDrawer />
      <UserActivityModal />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserActivityProvider>
          <ThemeProvider>
            <ImportProgressProvider>
              <ProspectImportProvider>
              <EBImportProvider>
                <TenantProvider>
                  <Routes>
                    <Route path="/debug/connection" element={<ConnectionTest />} />
                    <Route path="/signup" element={<SignupForm />} />
                    <Route path="/forgot-password" element={<ForgotPasswordForm />} />
                    <Route path="/reset-password" element={<ResetPasswordForm />} />
                    <Route path="*" element={<ProtectedRoutes />} />
                  </Routes>
                  <ImportProgressWidget />
                  <ProspectImportProgressWidget />
                  <EBCustomerImportProgressWidget />
                </TenantProvider>
              </EBImportProvider>
              </ProspectImportProvider>
            </ImportProgressProvider>
          </ThemeProvider>
        </UserActivityProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
