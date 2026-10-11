import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Users as UsersIcon, ListTodo, DollarSign, Upload, Settings, Building2, Shield, ChevronDown, ChevronLeft, ChevronRight, Database, Clock, Menu, X, Package, MapPin, Home, MoreHorizontal, HelpCircle, FileText, Phone, Zap, Layers, BarChart3, Network, FolderOpen, Activity, MessageSquare, StickyNote, Sun, Receipt } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
    `flex flex-col items-center justify-center gap-0.5 px-0.5 sm:px-1 py-1 flex-1 min-w-[48px] max-w-[76px] flex-shrink-0 transition-colors ${
      isActive(path)
        ? (showJspNav ? 'text-amber-600 font-semibold' : 'text-blue-600 font-semibold')
        : 'text-gray-500 hover:text-gray-700'
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

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/customers/second-tranche') || pathname.startsWith('/customers/tranches')) return '2nd Tranche Pending List';
    if (pathname.startsWith('/customers')) return 'Customers';
    if (pathname.startsWith('/prospects')) return 'Lead Prospects';
    if (pathname.startsWith('/eb-customers')) return 'EB Customers';
    if (pathname.startsWith('/quotations')) return 'Quotations';
    if (pathname.startsWith('/items')) return 'Items & Products';
    if (pathname.startsWith('/gst/itc')) return 'GST ITC Hub';
    if (pathname.startsWith('/tasks')) return 'Tasks';
    if (pathname.startsWith('/attendance')) return 'Staff Attendance';
    if (pathname.startsWith('/lead-generators')) return 'Lead Generators';
    if (pathname.startsWith('/whatsapp')) return 'WhatsApp Business Hub';
    if (pathname.startsWith('/financial')) return 'Financial Reports';
    if (pathname.startsWith('/documents/solar-upload')) return 'Quick Add Customer';
    if (pathname.startsWith('/documents')) return 'Document Management';
    if (pathname.startsWith('/users')) return 'User Management';
    if (pathname.startsWith('/settings/tenant')) return 'Organization Settings';
    if (pathname.startsWith('/settings/master-data')) return 'Master Data Settings';
    if (pathname.startsWith('/settings/lookups')) return 'Dropdown Values Settings';
    if (pathname.startsWith('/settings/locations')) return 'Location Master Data';
    if (pathname.startsWith('/settings/custom-status')) return 'Custom Status Settings';
    if (pathname.startsWith('/settings/drive-mapping')) return 'Drive Folder Mapping';
    if (pathname.startsWith('/settings/system-health')) return 'DB & System Health';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/super-admin')) return 'Super Admin Dashboard';
    if (pathname.startsWith('/jsp')) return 'Jana Sena Party (JSP) Portal';
    if (pathname.startsWith('/documentation')) return 'User Guide & Documentation';
    if (pathname.startsWith('/profile')) return 'My Profile';
    return tenant?.name || 'Solar CRM';
  };

  return (
    <>
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
          {/* Mobile Brand & Logo */}
          <div className="flex lg:hidden items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 hover:opacity-90 transition-all"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden shadow-xs bg-white p-1 border border-gray-200 flex-shrink-0">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <h1
                className="text-base font-bold truncate"
                style={{ color: tenant?.primary_color || '#1F2937' }}
              >
                {tenant?.name || 'Solar CRM'}
              </h1>
            </button>
          </div>

          {/* Desktop Breadcrumb / Title */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {showJspNav ? 'JSP' : (tenant?.name || 'Solar CRM')}
            </span>
            <span className="text-gray-300">/</span>
            <h2 className="text-sm font-bold text-gray-900">
              {getPageTitle(location.pathname)}
            </h2>
          </div>

          {/* Right: Actions, Work Timer, Notes, Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
            {/* Quick Add Customer shortcut on desktop */}
            {!showJspNav && (isAdmin || isLeadGen || isFinanceUser) && (
              <button
                onClick={() => navigate('/documents/solar-upload')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-colors"
                title="Quick Add Customer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Quick Add</span>
              </button>
            )}

            {/* Quick Switcher to Billing & Quotes Suite */}
            <button
              onClick={() => navigate('/billing')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-all text-xs font-bold cursor-pointer shadow-2xs whitespace-nowrap"
              title="Open Billing, Invoices & Quotations Suite"
            >
              <Receipt className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">Billing Suite</span>
            </button>

            <InstallButton label="Install App" />

            {/* Time Spent & User Activity Button */}
            <button
              type="button"
              onClick={openActivityModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 transition-all text-xs font-bold cursor-pointer shadow-2xs whitespace-nowrap"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all text-xs font-bold cursor-pointer shadow-2xs whitespace-nowrap"
              title="Personal Sticky Notes (1-Click Copy)"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-600 fill-amber-300" />
              <span className="hidden sm:inline">Notes</span>
            </button>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap border border-gray-200/80"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                  {(profile?.full_name || profile?.email || 'U')[0].toUpperCase()}
                </div>
                <div className="text-xs hidden sm:block text-left">
                  <p className="font-semibold text-gray-900 leading-tight max-w-[120px] truncate">
                    {profile?.full_name || profile?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-medium capitalize truncate">
                    {(profile?.role || 'Staff').replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="flex items-stretch justify-around h-16 px-0.5 overflow-x-auto no-scrollbar overscroll-x-contain">
          {showJspNav ? (
            <>
              <button onClick={() => { navigate('/jsp'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp')}>
                <Home className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Home</span>
              </button>
              <button onClick={() => { navigate('/jsp/members'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/members')}>
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Members</span>
              </button>
              <button onClick={() => { navigate('/jsp/hierarchy'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/hierarchy')}>
                <Layers className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Hierarchy</span>
              </button>
              {showJspIncharges && (
                <button onClick={() => { navigate('/jsp/incharges'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/incharges')}>
                  <Network className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Incharges</span>
                </button>
              )}
              {showJspReports && (
                <button onClick={() => { navigate('/jsp/import'); setShowMobileMenu(false); }} className={mobileTabClass('/jsp/import')}>
                  <Upload className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Import</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => { navigate('/'); setShowMobileMenu(false); }} className={mobileTabClass('/')}>
                <Home className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Home</span>
              </button>
              <button onClick={() => { navigate('/customers'); setShowMobileMenu(false); }} className={mobileTabClass('/customers')}>
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Customers</span>
              </button>
              <button onClick={() => { navigate('/prospects'); setShowMobileMenu(false); }} className={mobileTabClass('/prospects')}>
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Prospects</span>
              </button>
              <button onClick={() => { navigate('/eb-customers'); setShowMobileMenu(false); }} className={mobileTabClass('/eb-customers')}>
                <Zap className="w-5 h-5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">EB Customers</span>
              </button>
              {(isAdmin || canManageLeadGenerators()) && (
                <button onClick={() => { navigate('/tasks'); setShowMobileMenu(false); }} className={mobileTabClass('/tasks')}>
                  <ListTodo className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Tasks</span>
                </button>
              )}
              {(isAdmin || canManageLeadGenerators()) && (
                <button onClick={() => { navigate('/attendance'); setShowMobileMenu(false); }} className={mobileTabClass('/attendance')}>
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium text-center leading-tight truncate max-w-full">Attendance</span>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`flex flex-col items-center justify-center gap-0.5 px-0.5 sm:px-1 py-1 flex-1 min-w-[48px] max-w-[76px] flex-shrink-0 transition-colors ${
              showMobileMenu
                ? (showJspNav ? 'text-amber-600 font-semibold' : 'text-blue-600 font-semibold')
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {showMobileMenu ? <X className="w-5 h-5 flex-shrink-0" /> : <MoreHorizontal className="w-5 h-5 flex-shrink-0" />}
            <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">More</span>
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
                  {isAdmin && (
                    <>
                      <button onClick={() => { navigate('/items'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                        <Package className="w-5 h-5" /> Items
                      </button>
                      <button onClick={() => { navigate('/gst/itc'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors border border-teal-200">
                        <Receipt className="w-5 h-5 text-teal-600" /> GST ITC Hub
                      </button>
                    </>
                  )}
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
                <>
                  <button onClick={() => { navigate('/tasks'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <ListTodo className="w-5 h-5" /> Tasks
                  </button>
                  <button onClick={() => { navigate('/attendance'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <Clock className="w-5 h-5" /> Attendance
                  </button>
                  <button onClick={() => { navigate('/lead-generators'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <UsersIcon className="w-5 h-5" /> Lead Generators
                  </button>
                </>
              )}

              {showSolarNav && (isAdmin || isFinanceUser) && (
                <>
                  <button onClick={() => { navigate('/customers/second-tranche'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200">
                    <Layers className="w-5 h-5 text-amber-600" /> 2nd Tranche Pending List
                  </button>
                  <button onClick={() => { navigate('/financial'); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                    <DollarSign className="w-5 h-5" /> Financial
                  </button>
                </>
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

