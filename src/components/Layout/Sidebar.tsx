import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useSidebar } from '../../contexts/SidebarContext';
import {
  Home,
  Users as UsersIcon,
  Phone,
  Zap,
  ListTodo,
  Clock,
  DollarSign,
  Package,
  Receipt,
  Upload,
  MessageSquare,
  Layers,
  Building2,
  Settings,
  Shield,
  FileText,
  ChevronDown,
  ChevronRight,
  Database,
  MapPin,
  FolderOpen,
  Activity,
  BarChart3,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  isJSPUser,
  isJSPAdmin,
  isSolarUser,
  hasAnyRole,
  isNagarjunaUser,
  type Profile,
} from '../../lib/supabase';
import { canAccessWhatsAppHub } from '../../lib/whatsappApi';

export default function Sidebar() {
  const { profile, canManageLeadGenerators } = useAuth();
  const { tenant, isSuperAdmin } = useTenant();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const [openSettings, setOpenSettings] = useState(() =>
    location.pathname.startsWith('/settings') || location.pathname.startsWith('/tasks/by-user')
  );

  const isAdmin = profile?.roles?.includes('admin') || profile?.role === 'admin';
  const isLeadGen = profile?.roles?.includes('lead_generator') || profile?.role === 'lead_generator';
  const isEmployee = profile?.roles?.includes('employee') || profile?.role === 'employee';
  const isFinanceUser = profile?.roles?.includes('finance') || profile?.role === 'finance';
  const isNagarjuna = isNagarjunaUser(profile as Profile | null);
  const showSolarNav = isSolarUser(profile as Profile | null);
  const showJspNav = isAdmin && isJSPUser(profile as Profile | null);
  const showJspIncharges =
    showJspNav && (isJSPAdmin(profile as Profile | null) || hasAnyRole(profile as Profile | null, ['jsp_assembly_incharge']));
  const showJspReports = showJspNav && isJSPAdmin(profile as Profile | null);
  const canAccessWhatsApp = canAccessWhatsAppHub(profile as Profile | null);
  const canShowSuperAdmin = isSuperAdmin && !isNagarjuna && isAdmin;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItemSubClass = (path: string) => {
    const active = isActive(path);
    return `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
      active
        ? 'bg-blue-100 text-blue-900 font-semibold'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;
  };

  const renderNavItem = (
    path: string,
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    variant: 'default' | 'special' | 'purple' = 'default'
  ) => {
    const active = isActive(path);
    let buttonClasses = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ';

    if (variant === 'special') {
      buttonClasses += active
        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80 font-semibold';
    } else if (variant === 'purple') {
      buttonClasses += active
        ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30 font-semibold'
        : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/80 font-semibold';
    } else {
      buttonClasses += active
        ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
    }

    if (isCollapsed) {
      buttonClasses += ' justify-center px-2';
    }

    return (
      <div className="relative group" key={path}>
        <button
          onClick={() => navigate(path)}
          className={buttonClasses}
          aria-label={label}
        >
          <Icon className={`w-5 h-5 flex-shrink-0 ${variant === 'special' && !active ? 'text-emerald-600' : ''}`} />
          {!isCollapsed && <span className="truncate">{label}</span>}
        </button>

        {/* Hover Popover Tooltip for Collapsed Sidebar */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 flex items-center">
            <span>{label}</span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 shadow-xs ${
        isCollapsed ? 'w-20 overflow-visible' : 'w-64'
      }`}
    >
      {/* Sidebar Header: Logo & Company Name */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 overflow-hidden text-left hover:opacity-90 transition-opacity"
          title={tenant?.name || 'Solar CRM'}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-2xs p-1 flex-shrink-0">
            {tenant?.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML =
                    '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                }}
              />
            ) : (
              <Building2 className="w-6 h-6 text-gray-400" />
            )}
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1
                className="text-sm font-bold truncate leading-tight"
                style={{ color: tenant?.primary_color || '#1F2937' }}
              >
                {tenant?.name || 'Solar CRM'}
              </h1>
              <p className="text-[10px] text-gray-500 font-medium truncate">Management Portal</p>
            </div>
          )}
        </button>

        {/* Toggle Collapse */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-auto flex-shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className={`flex-1 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'} no-scrollbar py-3 px-3 space-y-4`}>
        {showJspNav ? (
          <>
            {/* JSP Section */}
            <div>
              {!isCollapsed && (
                <p className="px-3 pb-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                  JSP Election System
                </p>
              )}
              <div className="space-y-1">
                {renderNavItem('/jsp', 'Dashboard', Home)}
                {renderNavItem('/jsp/members', 'Members', UsersIcon)}
                {renderNavItem('/jsp/hierarchy', 'Hierarchy', Layers)}
                {showJspIncharges && renderNavItem('/jsp/incharges', 'Incharges', Network)}
                {showJspReports && renderNavItem('/jsp/reports', 'Reports', BarChart3)}
                {showJspReports && renderNavItem('/jsp/import', 'Import Members', Upload)}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Core & Sales */}
            <div>
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Core & Sales
                </p>
              )}
              <div className="space-y-1">
                {renderNavItem('/', 'Dashboard', Home)}

                {(isAdmin || isLeadGen || isFinanceUser) &&
                  renderNavItem('/documents/solar-upload', 'Quick Add Customer', Upload, 'special')}

                {renderNavItem('/customers', 'Customers', UsersIcon)}

                {(isAdmin || isLeadGen || isFinanceUser) &&
                  renderNavItem('/quotations', 'Quotations', DollarSign)}

                {isAdmin && renderNavItem('/items', 'Items & Products', Package)}

                {(isAdmin || isEmployee || isLeadGen || isNagarjuna) &&
                  renderNavItem('/prospects', 'Lead Prospects', Phone)}

                {(isAdmin || isEmployee || isLeadGen || isFinanceUser) &&
                  renderNavItem('/eb-customers', 'EB Customers', Zap)}

                {(isAdmin || isLeadGen || isFinanceUser) &&
                  renderNavItem('/documents/upload', 'Upload Documents', Upload)}
              </div>
            </div>

            {/* Operations */}
            <div>
              {!isCollapsed && (
                <p className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Operations
                </p>
              )}
              <div className="space-y-1">
                {canAccessWhatsApp &&
                  renderNavItem('/whatsapp', 'WhatsApp Hub', MessageSquare)}

                {(isAdmin || canManageLeadGenerators()) && (
                  <>
                    {renderNavItem('/tasks', 'Tasks', ListTodo)}
                    {renderNavItem('/attendance', 'Staff Attendance', Clock)}
                    {renderNavItem('/lead-generators', 'Lead Generators', UsersIcon)}
                  </>
                )}
              </div>
            </div>

            {/* Finance & Invoices */}
            {(isAdmin || isFinanceUser) && (
              <div>
                {!isCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Finance & Billing
                  </p>
                )}
                <div className="space-y-1">
                  {isAdmin && renderNavItem('/gst/itc', 'GST ITC Hub', Receipt)}
                  {renderNavItem('/customers/second-tranche', '2nd Tranches', Layers)}
                  {renderNavItem('/financial', 'Financial Reports', DollarSign)}
                </div>
              </div>
            )}

            {/* Administration */}
            {isAdmin && (
              <div>
                {!isCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Administration
                  </p>
                )}
                <div className="space-y-1">
                  {renderNavItem('/documents/manage', 'Doc Management', Upload)}
                  {renderNavItem('/users', 'Users', UsersIcon)}

                  {/* Settings Menu with Popover Flyout in Collapsed Mode */}
                  <div className="relative group">
                    <button
                      onClick={() => {
                        if (isCollapsed) {
                          toggleSidebar();
                          setOpenSettings(true);
                        } else {
                          setOpenSettings(!openSettings);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        location.pathname.startsWith('/settings') || location.pathname.startsWith('/tasks/by-user')
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      } ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}
                      aria-label="Settings"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="truncate">Settings</span>}
                      </div>
                      {!isCollapsed && (
                        openSettings ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )
                      )}
                    </button>

                    {/* Flyout Submenu in Collapsed Mode */}
                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 w-60 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 z-50 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto before:absolute before:-left-4 before:top-0 before:bottom-0 before:w-4 before:content-['']">
                        <div className="px-3.5 py-1.5 border-b border-gray-100 flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-gray-500" />
                            Settings
                          </span>
                        </div>
                        <div className="space-y-0.5 px-1.5">
                          <button onClick={() => navigate('/settings/tenant')} className={navItemSubClass('/settings/tenant')}>
                            <Building2 className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Organization</span>
                          </button>
                          <button onClick={() => navigate('/settings/master-data')} className={navItemSubClass('/settings/master-data')}>
                            <Database className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Master Data</span>
                          </button>
                          <button onClick={() => navigate('/settings/lookups')} className={navItemSubClass('/settings/lookups')}>
                            <Settings className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Dropdown Values</span>
                          </button>
                          <button onClick={() => navigate('/settings/locations')} className={navItemSubClass('/settings/locations')}>
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Location Data</span>
                          </button>
                          <button onClick={() => navigate('/settings/custom-status')} className={navItemSubClass('/settings/custom-status')}>
                            <Settings className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Custom Status</span>
                          </button>
                          <button onClick={() => navigate('/settings/drive-mapping')} className={navItemSubClass('/settings/drive-mapping')}>
                            <FolderOpen className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Drive Folders</span>
                          </button>
                          <button onClick={() => navigate('/tasks/by-user')} className={navItemSubClass('/tasks/by-user')}>
                            <ListTodo className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Tasks by User</span>
                          </button>
                          <button onClick={() => navigate('/settings/system-health')} className={navItemSubClass('/settings/system-health')}>
                            <Activity className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                            <span className="truncate text-emerald-700 font-medium">DB & System Health</span>
                          </button>
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-6 border-transparent border-r-white" />
                      </div>
                    )}

                    {/* Accordion Submenu in Expanded Mode */}
                    {!isCollapsed && openSettings && (
                      <div className="pl-6 pr-1 pt-1 pb-1 space-y-0.5 border-l-2 border-gray-100 ml-5 my-1">
                        <button
                          onClick={() => navigate('/settings/tenant')}
                          className={navItemSubClass('/settings/tenant')}
                        >
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Organization</span>
                        </button>
                        <button
                          onClick={() => navigate('/settings/master-data')}
                          className={navItemSubClass('/settings/master-data')}
                        >
                          <Database className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Master Data</span>
                        </button>
                        <button
                          onClick={() => navigate('/settings/lookups')}
                          className={navItemSubClass('/settings/lookups')}
                        >
                          <Settings className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Dropdown Values</span>
                        </button>
                        <button
                          onClick={() => navigate('/settings/locations')}
                          className={navItemSubClass('/settings/locations')}
                        >
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Location Data</span>
                        </button>
                        <button
                          onClick={() => navigate('/settings/custom-status')}
                          className={navItemSubClass('/settings/custom-status')}
                        >
                          <Settings className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Custom Status</span>
                        </button>
                        <button
                          onClick={() => navigate('/settings/drive-mapping')}
                          className={navItemSubClass('/settings/drive-mapping')}
                        >
                          <FolderOpen className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Drive Folders</span>
                        </button>
                        <button
                          onClick={() => navigate('/tasks/by-user')}
                          className={navItemSubClass('/tasks/by-user')}
                        >
                          <ListTodo className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Tasks by User</span>
                        </button>
                        <button
                          onClick={() => navigate('/settings/system-health')}
                          className={navItemSubClass('/settings/system-health')}
                        >
                          <Activity className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                          <span className="truncate text-emerald-700 font-medium">DB & System Health</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {canShowSuperAdmin &&
                    renderNavItem('/super-admin', 'Super Admin', Shield, 'purple')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 space-y-1">
        <div className="relative group">
          <button
            onClick={() => navigate('/documentation')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
            aria-label="User Guide"
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>User Guide</span>}
          </button>
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 flex items-center">
              <span>User Guide</span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={toggleSidebar}
            className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
          {isCollapsed && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-50 flex items-center">
              <span>Expand Sidebar</span>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
