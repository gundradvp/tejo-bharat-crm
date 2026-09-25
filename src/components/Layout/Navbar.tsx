import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Users as UsersIcon, ListTodo, DollarSign, Upload, Settings, Building2, Shield, ChevronDown, Database, Clock, Menu, X, Package, MapPin, Home, MoreHorizontal, HelpCircle, FileText, Phone, Zap, Layers, BarChart3, Network, FolderOpen, Activity, MessageSquare, StickyNote, Sun } from 'lucide-react';
import { useState } from 'react';
import { InstallButton } from '../PWA/InstallPrompt';
import { isJSPUser, isJSPAdmin, isSolarUser, hasAnyRole, isNagarjunaUser, type Profile } from '../../lib/supabase';
import { canAccessWhatsAppHub } from '../../lib/whatsappApi';
import { useUserActivity } from '../../contexts/UserActivityContext';
import { formatDuration } from '../../lib/userActivityTracker';

export default function Navbar() {
  const { profile, signOut, canManageLeadGenerators } = useAuth();
  const { tenant, isSuperAdmin } = useTenant();
  const { activeSeconds, isIdle, openActivityModal, toggleStickyNotes, openStickyNotes } = useUserActivity();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const mobileTabClass = (path: string) =>
    `flex flex-col items-center justify-center gap-0.5 px-2 py-1 flex-1 transition-colors ${
      isActive(path) ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
    }`;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Navbar: Error signing out:', error);
      alert('Failed to sign out. Please try again.');
    }
  };

  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';
  const isLeadGen = profile?.roles?.includes('lead_generator') || profile?.role === 'lead_generator';
  const isEmployee = profile?.roles?.includes('employee') || profile?.role === 'employee';
  const isFinanceUser = profile?.roles?.includes('finance') || profile?.role === 'finance';
  const isNagarjuna = isNagarjunaUser(profile as Profile | null);
  const showSolarNav = isSolarUser(profile as Profile | null);
  const showJspNav = isAdmin && isJSPUser(profile as Profile | null);
  const showJspIncharges = showJspNav && (isJSPAdmin(profile as Profile | null) || hasAnyRole(profile as Profile | null, ['jsp_assembly_incharge']));
  const showJspReports = showJspNav && isJSPAdmin(profile as Profile | null);
  const canAccessWhatsApp = canAccessWhatsAppHub(profile as Profile | null);
  const canShowSuperAdmin = isSuperAdmin && !isNagarjuna && isAdmin;

  return (
    <>
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-all group"
          >
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow bg-white p-1.5">
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={tenant.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                  }}
                />
              ) : (
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              )}
            </div>
            <div className="text-left hidden sm:block">
              <div className="flex items-baseline gap-2">
                <h1
                  className="text-base sm:text-lg font-bold"
                  style={{ color: tenant?.primary_color || '#1F2937' }}
                >
                  {tenant?.name || 'Solar CRM'}
                </h1>
                {canShowSuperAdmin && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 font-medium">Solar CRM & Management Portal</p>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-2 xl:gap-4">
            {showJspNav && (
              <>
                <button
                  onClick={() => navigate('/jsp')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden xl:inline">Dashboard</span>
                </button>
                <button
                  onClick={() => navigate('/jsp/members')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                >
                  <UsersIcon className="w-4 h-4" />
                  <span className="hidden xl:inline">Members</span>
                </button>
                <button
                  onClick={() => navigate('/jsp/hierarchy')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  <span className="hidden xl:inline">Hierarchy</span>
                </button>
                {showJspIncharges && (
                  <button
                    onClick={() => navigate('/jsp/incharges')}
                    className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                  >
                    <Network className="w-4 h-4" />
                    <span className="hidden xl:inline">Incharges</span>
                  </button>
                )}
                {showJspReports && (
                  <button
                    onClick={() => navigate('/jsp/reports')}
                    className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden xl:inline">Reports</span>
                  </button>
                )}
                {showJspReports && (
                  <button
                    onClick={() => navigate('/jsp/import')}
                    className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden xl:inline">Import</span>
                  </button>
                )}
              </>
            )}

            {showSolarNav && (
            <>
                {(isAdmin || isLeadGen || isFinanceUser) && (
              <>
                <button
                  onClick={() => navigate('/documents/solar-upload')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-white btn-primary rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden xl:inline">Quick Add Customer</span>
                  <span className="xl:hidden">Add Customer</span>
                </button>
                <button
                  onClick={() => navigate('/quotations')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden xl:inline">Quotations</span>
                </button>
                <button
                  onClick={() => navigate('/items')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Manage items and products"
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden xl:inline">Items</span>
                </button>
                <button
                  onClick={() => navigate('/documents/upload')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden xl:inline">Upload Documents</span>
                  <span className="xl:hidden">Upload</span>
                </button>
              </>
            )}

            {(isAdmin || isEmployee || isLeadGen || isNagarjuna) && (
              <button
                onClick={() => navigate('/prospects')}
                className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/prospects')
                    ? 'bg-blue-50 text-blue-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="Lead Prospects CRM"
              >
                <Phone className="w-4 h-4" />
                <span className="hidden xl:inline">Lead Prospects</span>
              </button>
            )}

            {canAccessWhatsApp && (
              <button
                onClick={() => navigate('/whatsapp')}
                className={`flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive('/whatsapp')
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="WhatsApp Business Hub"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="hidden xl:inline">WhatsApp</span>
              </button>
            )}

            {(isAdmin || isEmployee || isLeadGen || isFinanceUser) && (
              <button
                onClick={() => navigate('/eb-customers')}
                className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="EB Customers CRM"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden lg:inline">EB Customers</span>
              </button>
            )}

            {(isAdmin || canManageLeadGenerators()) && (
              <>
                <button
                  onClick={() => navigate('/tasks')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium theme-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ListTodo className="w-4 h-4" />
                  <span className="hidden xl:inline">Tasks</span>
                </button>
                <button
                  onClick={() => navigate('/attendance')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium theme-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                  title="My attendance"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden xl:inline">Attendance</span>
                </button>
                <button
                  onClick={() => navigate('/lead-generators')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium theme-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                  title="Manage lead generators"
                >
                  <UsersIcon className="w-4 h-4" />
                  <span className="hidden xl:inline">Lead Generators</span>
                </button>
              </>
            )}

            {(isAdmin || isFinanceUser) && (
              <>
                <button
                  onClick={() => navigate('/financial')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium theme-text-secondary hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden xl:inline">Financial</span>
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => navigate('/documents/manage')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="View all documents and manage matches"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden xl:inline">Doc Management</span>
                </button>
                <button
                  onClick={() => navigate('/users')}
                  className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <UsersIcon className="w-4 h-4" />
                  <span className="hidden xl:inline">Users</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden xl:inline">Settings</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showSettingsMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSettingsMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSettingsMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/tasks/by-user');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ListTodo className="w-4 h-4" />
                          <span>Tasks by User</span>
                        </button>
                        <div className="h-px bg-gray-200 my-1" />
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/tenant');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Organization</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/master-data');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Database className="w-4 h-4" />
                          <span>Master Data</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/lookups');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Dropdown Values</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/locations');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <MapPin className="w-4 h-4" />
                          <span>Location Master Data</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/custom-status');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Custom Status</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/drive-mapping');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FolderOpen className="w-4 h-4" />
                          <span>Drive Folder Mapping</span>
                        </button>
                        <div className="h-px bg-gray-200 my-1" />
                        <button
                          onClick={() => {
                            setShowSettingsMenu(false);
                            navigate('/settings/system-health');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors font-medium"
                        >
                          <Activity className="w-4 h-4 text-emerald-600" />
                          <span>DB & System Health</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            </>
            )}

            {canShowSuperAdmin && (
              <button
                onClick={() => navigate('/super-admin')}
                className="flex items-center gap-2 px-3 xl:px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden xl:inline">Super Admin</span>
              </button>
            )}

            <InstallButton label="Install App" />

            {/* Time Spent & User Activity Button */}
            <button
              type="button"
              onClick={openActivityModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all text-xs font-bold cursor-pointer shadow-2xs"
              title="Work Time Spent & Activity (Click to view detailed breakdown)"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono text-xs">{formatDuration(activeSeconds)}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isIdle ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'
                }`}
                title={isIdle ? 'Idle' : 'Active'}
              />
            </button>

            {/* Personal Sticky Notes Button */}
            <button
              type="button"
              onClick={toggleStickyNotes}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all text-xs font-bold cursor-pointer shadow-2xs"
              title="Personal Sticky Notes (1-Click Copy)"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
              <span className="hidden xl:inline">Notes</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 xl:gap-3 px-3 xl:px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <div className="text-sm hidden xl:block text-left">
                  <p className="font-medium text-gray-900 leading-tight">{profile?.full_name || profile?.email?.split('@')[0] || 'User'}</p>
                  {profile?.phone ? (
                    <p className="text-[10px] text-emerald-700 font-mono font-semibold">{profile.phone}</p>
                  ) : (
                    <p className="text-[10px] text-gray-500 font-medium capitalize">{(profile?.role || 'Staff').replace('_', ' ')}</p>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        openActivityModal();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Activity & Time Spent</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        openStickyNotes();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <StickyNote className="w-4 h-4 text-amber-600" />
                      <span>Personal Sticky Notes</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/documentation');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>User Guide</span>
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </nav>

      {/* Mobile bottom navigation bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="flex items-stretch h-16">
          {showJspNav ? (
            <>
              <button onClick={() => { navigate('/jsp'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp')}>
                <Home className="w-5 h-5" />
                <span className="text-xs font-medium">Home</span>
              </button>
              <button onClick={() => { navigate('/jsp/members'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/members')}>
                <UsersIcon className="w-5 h-5" />
                <span className="text-xs font-medium">Members</span>
              </button>
              <button onClick={() => { navigate('/jsp/hierarchy'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/hierarchy')}>
                <Layers className="w-5 h-5" />
                <span className="text-xs font-medium">Hierarchy</span>
              </button>
              {showJspIncharges && (
                <button onClick={() => { navigate('/jsp/incharges'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/incharges')}>
                  <Network className="w-5 h-5" />
                  <span className="text-xs font-medium">Incharges</span>
                </button>
              )}
              {showJspReports && (
                <button onClick={() => { navigate('/jsp/import'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/import')}>
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-medium">Import</span>
                </button>
              )}
            </>
          ) : (
            <>
          <button onClick={() => { navigate('/'); setShowMobileMenu(false); }} className={mobileTabClass('/')}>
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>
          <button onClick={() => { navigate('/customers'); setShowMobileMenu(false); }} className={mobileTabClass('/customers')}>
            <UsersIcon className="w-5 h-5" />
            <span className="text-xs font-medium">Customers</span>
          </button>
          <button onClick={() => { navigate('/prospects'); setShowMobileMenu(false); }} className={mobileTabClass('/prospects')}>
            <Phone className="w-5 h-5" />
            <span className="text-xs font-medium">Prospects</span>
          </button>
          <button onClick={() => { navigate('/eb-customers'); setShowMobileMenu(false); }} className={mobileTabClass('/eb-customers')}>
            <Zap className="w-5 h-5" />
            <span className="text-xs font-medium">EB Customers</span>
          </button>
          {(isAdmin || canManageLeadGenerators()) && (
            <button onClick={() => { navigate('/tasks'); setShowMobileMenu(false); }} className={mobileTabClass('/tasks')}>
              <ListTodo className="w-5 h-5" />
              <span className="text-xs font-medium">Tasks</span>
            </button>
          )}
          {(isAdmin || canManageLeadGenerators()) && (
            <button onClick={() => { navigate('/attendance'); setShowMobileMenu(false); }} className={mobileTabClass('/attendance')}>
              <Clock className="w-5 h-5" />
              <span className="text-xs font-medium">Attendance</span>
            </button>
          )}
            </>
          )}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 flex-1 transition-colors ${showMobileMenu ? (showJspNav ? 'text-amber-600' : 'text-blue-600') : 'text-gray-500 hover:text-gray-700'}`}
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Mobile "More" drawer */}
      {showMobileMenu && (
        <>
          <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setShowMobileMenu(false)} />
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-gray-200 rounded-t-2xl shadow-xl max-h-[70vh] overflow-y-auto">
            <div className="p-4 space-y-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

              <button
                onClick={() => { navigate('/profile'); setShowMobileMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">{profile?.full_name || profile?.email?.split('@')[0] || 'User'}</p>
                  {profile?.phone && (
                    <p className="text-xs text-emerald-700 font-mono font-medium">{profile.phone}</p>
                  )}
                  <p className="text-[11px] text-gray-500">{profile?.email || ''}</p>
                </div>
              </button>

              <div className="h-px bg-gray-100 my-2" />

              <div className="grid grid-cols-2 gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    openActivityModal();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Time: {formatDuration(activeSeconds)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openStickyNotes();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <StickyNote className="w-4 h-4 text-amber-600 fill-amber-300" />
                  <span>Sticky Notes</span>
                </button>
              </div>

              {showJspNav && (
                <>
                  <p className="px-4 py-1 text-xs font-semibold text-amber-600 uppercase tracking-wider">JSP</p>
                  <button onClick={() => { navigate('/jsp'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors">
                    <Home className="w-5 h-5" /> Dashboard
                  </button>
                  <button onClick={() => { navigate('/jsp/members'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 rounded-xl transition-colors">
                    <UsersIcon className="w-5 h-5" /> Members
                  </button>
                  <button onClick={() => { navigate('/jsp/hierarchy'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 rounded-xl transition-colors">
                    <Layers className="w-5 h-5" /> Hierarchy
                  </button>
                  {showJspIncharges && (
                    <button onClick={() => { navigate('/jsp/incharges'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 rounded-xl transition-colors">
                      <Network className="w-5 h-5" /> Incharges
                    </button>
                  )}
                  {showJspReports && (
                    <button onClick={() => { navigate('/jsp/reports'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 rounded-xl transition-colors">
                      <BarChart3 className="w-5 h-5" /> Reports
                    </button>
                  )}
                  {showJspReports && (
                    <button onClick={() => { navigate('/jsp/import'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 rounded-xl transition-colors">
                      <Upload className="w-5 h-5" /> Import Members
                    </button>
                  )}
                  <div className="h-px bg-gray-100 my-2" />
                </>
              )}

              {showSolarNav && (isAdmin || isLeadGen || isEmployee || isFinanceUser || isNagarjuna) && (
                <>
                  <button onClick={() => { navigate('/documents/solar-upload'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
                    <Upload className="w-5 h-5" /> Quick Add Customer
                  </button>
                  <button onClick={() => { navigate('/quotations'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <DollarSign className="w-5 h-5" /> Quotations
                  </button>
                  <button onClick={() => { navigate('/items'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Package className="w-5 h-5" /> Items
                  </button>
                  <button onClick={() => { navigate('/documents/upload'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Upload className="w-5 h-5" /> Upload Documents
                  </button>
                  {canAccessWhatsApp && (
                    <button onClick={() => { navigate('/whatsapp'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl transition-colors">
                      <MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp Hub
                    </button>
                  )}
                  <button onClick={() => { navigate('/eb-customers/import'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Zap className="w-5 h-5" /> Import EB Customers
                  </button>
                </>
              )}

              {showSolarNav && (isAdmin || canManageLeadGenerators()) && (
                <button onClick={() => { navigate('/lead-generators'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                  <UsersIcon className="w-5 h-5" /> Lead Generators
                </button>
              )}

              {showSolarNav && (isAdmin || isFinanceUser) && (
                <button onClick={() => { navigate('/financial'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                  <DollarSign className="w-5 h-5" /> Financial
                </button>
              )}

              {showSolarNav && isAdmin && (
                <>
                  <div className="h-px bg-gray-100 my-2" />
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                  <button onClick={() => { navigate('/documents/manage'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Upload className="w-5 h-5" /> Document Management
                  </button>
                  <button onClick={() => { navigate('/users'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <UsersIcon className="w-5 h-5" /> Users
                  </button>
                  <div className="h-px bg-gray-100 my-2" />
                  <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Settings</p>
                  <button onClick={() => { navigate('/settings/tenant'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Building2 className="w-5 h-5" /> Organization
                  </button>
                  <button onClick={() => { navigate('/settings/master-data'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Database className="w-5 h-5" /> Master Data
                  </button>
                  <button onClick={() => { navigate('/settings/lookups'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Settings className="w-5 h-5" /> Dropdown Values
                  </button>
                  <button onClick={() => { navigate('/settings/locations'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <MapPin className="w-5 h-5" /> Location Data
                  </button>
                  <button onClick={() => { navigate('/settings/custom-status'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Settings className="w-5 h-5" /> Custom Status
                  </button>
                  <button onClick={() => { navigate('/settings/drive-mapping'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <FolderOpen className="w-5 h-5" /> Drive Folder Mapping
                  </button>
                  <button onClick={() => { navigate('/tasks/by-user'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <ListTodo className="w-5 h-5" /> Tasks by User
                  </button>
                </>
              )}

              {canShowSuperAdmin && (
                <button onClick={() => { navigate('/super-admin'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors">
                  <Shield className="w-5 h-5" /> Super Admin
                </button>
              )}

              <button onClick={() => { navigate('/documentation'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                <FileText className="w-5 h-5" /> User Guide
              </button>

              <InstallButton label="Install App" className="w-full justify-center bg-green-600 text-white hover:bg-green-700 rounded-xl" />

              <div className="h-px bg-gray-100 my-2" />
              <button
                onClick={() => { setShowMobileMenu(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
              <div className="h-4" />
            </div>
          </div>
        </>
      )}
    </>
  );
}

