import React, { useState } from 'react';
import {
  Clock,
  Activity,
  Users,
  CheckCircle2,
  X,
  Flame,
  PieChart,
  MessageSquare,
  Users2,
  Zap,
  DollarSign,
  FileText,
  ListTodo,
  Calendar,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserActivity } from '../../contexts/UserActivityContext';
import { AppModule } from '../../types/userActivity';
import { formatDuration } from '../../lib/userActivityTracker';

const MODULE_ICONS: Record<AppModule, React.ComponentType<{ className?: string }>> = {
  dashboard: Activity,
  whatsapp: MessageSquare,
  prospects: Users2,
  eb_customers: Zap,
  customers: Users,
  quotations: DollarSign,
  documents: FileText,
  tasks: ListTodo,
  attendance: Calendar,
  settings: Settings,
  jsp: Flame,
  other: Sparkles,
};

const MODULE_NAMES: Record<AppModule, string> = {
  dashboard: 'Executive Dashboard',
  whatsapp: 'WhatsApp Business Hub',
  prospects: 'PM Surya Prospects',
  eb_customers: 'EB DISCOM Customers',
  customers: 'CRM Clients & Solar Works',
  quotations: 'Quotations & Pricing',
  documents: 'Documents & KYC Hub',
  tasks: 'Team Tasks & To-Dos',
  attendance: 'Staff Attendance',
  settings: 'System & Master Settings',
  jsp: 'JSP Constituency Hub',
  other: 'General Pages',
};

const MODULE_COLORS: Record<AppModule, string> = {
  dashboard: 'bg-blue-500',
  whatsapp: 'bg-emerald-500',
  prospects: 'bg-amber-500',
  eb_customers: 'bg-violet-500',
  customers: 'bg-teal-500',
  quotations: 'bg-green-600',
  documents: 'bg-indigo-500',
  tasks: 'bg-orange-500',
  attendance: 'bg-cyan-500',
  settings: 'bg-gray-500',
  jsp: 'bg-red-500',
  other: 'bg-slate-400',
};

export default function UserActivityModal() {
  const { profile, isAdmin } = useAuth();
  const {
    session,
    activeSeconds,
    isIdle,
    currentModule,
    isActivityModalOpen,
    closeActivityModal,
    getTeamSummaries,
  } = useUserActivity();

  const [activeTab, setActiveTab] = useState<'my_activity' | 'team_roster'>('my_activity');

  if (!isActivityModalOpen) return null;

  const teamSummaries = getTeamSummaries();
  const timeSpentMap = session?.timeSpentByModule || ({} as Record<AppModule, number>);
  const totalModuleSeconds = Object.values(timeSpentMap).reduce((a, b) => a + b, 0) || activeSeconds || 1;

  // Format digital clock HH:MM:SS
  const formatDigital = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-emerald-400 shadow-inner">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">User Activity & Time Tracker</h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isIdle
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isIdle ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  {isIdle ? 'Idle' : 'Active Now'}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Tracking logged-in session duration, module usage & productivity logs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeActivityModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-gray-200 flex items-center gap-4 bg-gray-50/70">
          <button
            type="button"
            onClick={() => setActiveTab('my_activity')}
            className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'my_activity'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            My Time Spent & Activity
          </button>

          {(isAdmin || profile?.role === 'admin') && (
            <button
              type="button"
              onClick={() => setActiveTab('team_roster')}
              className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'team_roster'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Team Productivity & Roster ({teamSummaries.length})
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'my_activity' ? (
            <>
              {/* Digital Timer Hero Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Today's Active Work Time
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-gray-900 font-mono tracking-tight mt-1">
                    {formatDigital(activeSeconds)}
                  </div>
                  <p className="text-xs text-emerald-900/70 mt-1">
                    Logged in as: <span className="font-bold">{profile?.full_name || 'Durga Rao'}</span> (
                    {profile?.role || 'Admin'})
                  </p>
                </div>

                <div className="flex sm:flex-col gap-2 w-full sm:w-auto text-center sm:text-right">
                  <div className="flex-1 p-2.5 rounded-lg bg-white/90 border border-emerald-100 shadow-2xs">
                    <div className="text-[10px] text-gray-500 font-medium">Current Module</div>
                    <div className="text-xs font-bold text-gray-900 capitalize">
                      {MODULE_NAMES[currentModule]}
                    </div>
                  </div>
                  <div className="flex-1 p-2.5 rounded-lg bg-white/90 border border-emerald-100 shadow-2xs">
                    <div className="text-[10px] text-gray-500 font-medium">Session Status</div>
                    <div className="text-xs font-bold text-emerald-700 flex items-center justify-center sm:justify-end gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Active & Tracking
                    </div>
                  </div>
                </div>
              </div>

              {/* Module Time Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-gray-500" /> Time Spent by CRM Section
                  </h3>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Total: {formatDuration(activeSeconds)}
                  </span>
                </div>

                {/* Progress multi-bar */}
                <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                  {Object.entries(timeSpentMap).map(([mod, sec]) => {
                    if (sec <= 0) return null;
                    const pct = Math.max(1, Math.round((sec / totalModuleSeconds) * 100));
                    const color = MODULE_COLORS[mod as AppModule] || 'bg-gray-400';
                    return (
                      <div
                        key={mod}
                        style={{ width: `${pct}%` }}
                        className={`${color} transition-all`}
                        title={`${MODULE_NAMES[mod as AppModule]}: ${formatDuration(sec)} (${pct}%)`}
                      />
                    );
                  })}
                </div>

                {/* Module List Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(timeSpentMap)
                    .filter(([_, sec]) => sec > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([mod, sec]) => {
                      const appMod = mod as AppModule;
                      const Icon = MODULE_ICONS[appMod] || Activity;
                      const pct = Math.round((sec / totalModuleSeconds) * 100);
                      const color = MODULE_COLORS[appMod];

                      return (
                        <div
                          key={mod}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50/80 border border-gray-200/60"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                            <Icon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                            <span className="font-medium text-gray-800 truncate">
                              {MODULE_NAMES[appMod]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-gray-900">
                              {formatDuration(sec)}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-gray-500" /> Recent Actions Performed
                </h3>

                {session?.recentActivities && session.recentActivities.length > 0 ? (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100 pr-1">
                    {session.recentActivities.slice(0, 15).map((act) => {
                      const Icon = MODULE_ICONS[act.module] || Activity;
                      return (
                        <div key={act.id} className="pt-1.5 flex items-start gap-2.5 text-xs">
                          <div className="p-1 rounded bg-gray-100 text-gray-600 mt-0.5">
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 font-medium leading-snug">
                              {act.description}
                            </p>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(act.timestamp).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-3 text-center">
                    Actions performed in this session will appear here in real-time.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Team Productivity Roster Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Team Active Time & Status</h3>
                  <p className="text-[11px] text-gray-500">
                    Track staff member login durations and active CRM engagement
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {teamSummaries.filter((t) => t.isOnline).length} Active Online
                </span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {teamSummaries.map((member) => (
                  <div key={member.userId} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white font-bold flex items-center justify-center text-xs">
                          {member.userName.charAt(0)}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            member.isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-gray-900 truncate">
                            {member.userName}
                          </h4>
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                            {member.userRole || 'Staff'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {member.userEmail || 'Team Member'}
                        </p>
                        {member.latestActivity && (
                          <p className="text-[10px] text-emerald-800 font-medium truncate mt-0.5">
                            Last: {member.latestActivity.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-sm text-gray-900">
                        {formatDuration(member.todayActiveSeconds)}
                      </div>
                      <div className="text-[10px] text-gray-400 capitalize">
                        Top: {MODULE_NAMES[member.topModule]}
                      </div>
                      <span className="text-[9px] font-mono text-gray-400">
                        Active {new Date(member.lastActiveTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span className="text-[11px]">
            ⚡ Time tracking pauses automatically after 2 minutes of idle time.
          </span>
          <button
            type="button"
            onClick={closeActivityModal}
            className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
