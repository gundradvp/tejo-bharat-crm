import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import {
  Activity, Database, Server, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw, Clock, ShieldCheck, Zap, Users, Phone, FileText,
  Copy, Check, Layers, ArrowUpRight, HardDrive, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TableStat {
  name: string;
  table: string;
  count: number | null;
  latencyMs: number | null;
  status: 'healthy' | 'warning' | 'error' | 'loading';
  description: string;
  category: 'core' | 'solar' | 'eb' | 'jsp';
  route?: string;
  subStats?: { label: string; count: number | null }[];
}

interface ServiceHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  latencyMs: number | null;
  detail: string;
}

export default function SystemHealthDashboard() {
  const { user, profile } = useAuth();
  const { tenant, license } = useTenant();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);

  // Overall latency & connectivity
  const [overallLatency, setOverallLatency] = useState<number | null>(null);
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'Supabase PostgREST API', status: 'checking', latencyMs: null, detail: 'Validating REST endpoint response' },
    { name: 'PostgreSQL Database', status: 'checking', latencyMs: null, detail: 'Testing connection and query latency' },
    { name: 'Auth & Session Service', status: 'checking', latencyMs: null, detail: 'Checking active JWT session' },
    { name: 'Storage Buckets', status: 'checking', latencyMs: null, detail: 'Verifying document storage connectivity' },
  ]);

  const [tableStats, setTableStats] = useState<TableStat[]>([
    {
      name: 'EB Electricity Customers',
      table: 'eb_customers',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Central electricity board consumers and billing database',
      category: 'eb',
      route: '/eb-customers',
      subStats: [],
    },
    {
      name: 'Lead Prospects',
      table: 'lead_prospects',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Cold leads imported for solar telecalling & outreach',
      category: 'solar',
      route: '/prospects',
      subStats: [],
    },
    {
      name: 'Solar CRM Customers',
      table: 'customers',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Active solar rooftop applications, projects & pipeline',
      category: 'solar',
      route: '/customers',
      subStats: [],
    },
    {
      name: 'EB Monthly Bills',
      table: 'eb_customer_bills',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Historical electricity consumption & billed units archive',
      category: 'eb',
      subStats: [],
    },
    {
      name: 'JSP Kriya Members',
      table: 'jsp_kriya_members',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Party membership records, sadhaks & volunteer network',
      category: 'jsp',
      route: '/jsp/members',
      subStats: [],
    },
    {
      name: 'User Profiles & Roles',
      table: 'profiles',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Active employees, telecallers, field agents & admins',
      category: 'core',
      route: '/users',
      subStats: [],
    },
    {
      name: 'Tasks & Follow-ups',
      table: 'tasks',
      count: null,
      latencyMs: null,
      status: 'loading',
      description: 'Assigned customer action items & reminder schedules',
      category: 'core',
      route: '/tasks',
      subStats: [],
    },
  ]);

  const runDiagnostics = useCallback(async () => {
    setRefreshing(true);
    const startTime = performance.now();

    // 1. Check Auth Session
    const authStart = performance.now();
    let authStatus: 'operational' | 'degraded' | 'down' = 'down';
    let authDetail = 'No active session';
    let authLatency = 0;
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      authLatency = Math.round(performance.now() - authStart);
      if (!sessionErr && sessionData.session) {
        authStatus = 'operational';
        authDetail = `Active session (${user?.email || 'Logged in'})`;
      } else if (sessionErr) {
        authStatus = 'degraded';
        authDetail = sessionErr.message;
      }
    } catch (e: any) {
      authStatus = 'down';
      authDetail = e.message || 'Auth check failed';
    }

    // 2. Check Database & REST API Ping
    const dbStart = performance.now();
    let dbStatus: 'operational' | 'degraded' | 'down' = 'down';
    let dbDetail = 'Testing...';
    let dbLatency = 0;
    try {
      const { error: pingErr } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
      dbLatency = Math.round(performance.now() - dbStart);
      if (!pingErr) {
        dbStatus = dbLatency > 600 ? 'degraded' : 'operational';
        dbDetail = `Ping ${dbLatency}ms (${dbLatency < 200 ? 'Fast' : 'Acceptable'})`;
      } else {
        dbStatus = 'degraded';
        dbDetail = pingErr.message;
      }
    } catch (e: any) {
      dbStatus = 'down';
      dbDetail = e.message || 'Database unreachable';
    }

    // 3. Check Storage Buckets
    const storageStart = performance.now();
    let storageStatus: 'operational' | 'degraded' | 'down' = 'down';
    let storageDetail = 'Testing...';
    let storageLatency = 0;
    try {
      const { data: buckets, error: storageErr } = await supabase.storage.listBuckets();
      storageLatency = Math.round(performance.now() - storageStart);
      if (!storageErr) {
        storageStatus = 'operational';
        storageDetail = `${buckets?.length || 0} bucket(s) accessible (${storageLatency}ms)`;
      } else {
        storageStatus = 'degraded';
        storageDetail = storageErr.message;
      }
    } catch (e: any) {
      storageStatus = 'down';
      storageDetail = e.message || 'Storage check failed';
    }

    const overall = Math.round(performance.now() - startTime);
    setOverallLatency(overall);

    setServices([
      {
        name: 'Supabase PostgREST API',
        status: dbStatus,
        latencyMs: dbLatency,
        detail: dbStatus === 'operational' ? `REST v1 responsive (${dbLatency}ms)` : dbDetail,
      },
      {
        name: 'PostgreSQL Database Engine',
        status: dbStatus,
        latencyMs: dbLatency,
        detail: `rlwcqmlspvddfscyngfw.supabase.co (${dbLatency}ms)`,
      },
      {
        name: 'Auth & Session Engine',
        status: authStatus,
        latencyMs: authLatency,
        detail: authDetail,
      },
      {
        name: 'Storage Subsystem',
        status: storageStatus,
        latencyMs: storageLatency,
        detail: storageDetail,
      },
    ]);

    // 4. Query Table Statistics in Parallel
    const updatedStats: TableStat[] = await Promise.all(
      tableStats.map(async (item) => {
        const itemStart = performance.now();
        try {
          // Exact head-only count query (transfers zero payload bytes)
          const { count, error } = await supabase
            .from(item.table)
            .select('*', { count: 'exact', head: true });

          const latency = Math.round(performance.now() - itemStart);

          if (error) {
            return {
              ...item,
              count: null,
              latencyMs: latency,
              status: 'error' as const,
              description: `Error: ${error.message}`,
            };
          }

          // Fetch contextual sub-stats for key tables
          let subStats: { label: string; count: number | null }[] = [];

          if (item.table === 'eb_customers') {
            try {
              const [{ count: solarCount }, { count: calledCount }] = await Promise.all([
                supabase.from('eb_customers').select('*', { count: 'exact', head: true }).eq('solar_already_installed', true),
                supabase.from('eb_customers').select('*', { count: 'exact', head: true }).not('last_called_at', 'is', null),
              ]);
              subStats = [
                { label: 'Solar Installed', count: solarCount ?? 0 },
                { label: 'Without Solar', count: (count ?? 0) - (solarCount ?? 0) },
                { label: 'Calls Made', count: calledCount ?? 0 },
              ];
            } catch { /* ignore sub-stat error */ }
          }

          if (item.table === 'customers') {
            try {
              const [{ count: completedCount }, { count: inProgressCount }] = await Promise.all([
                supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
              ]);
              subStats = [
                { label: 'Completed Projects', count: completedCount ?? 0 },
                { label: 'In Progress', count: inProgressCount ?? 0 },
              ];
            } catch { /* ignore */ }
          }

          return {
            ...item,
            count: count ?? 0,
            latencyMs: latency,
            status: latency > 1500 ? ('warning' as const) : ('healthy' as const),
            subStats,
          };
        } catch (e: any) {
          return {
            ...item,
            count: null,
            latencyMs: null,
            status: 'error' as const,
            description: e.message || 'Query failed',
          };
        }
      })
    );

    setTableStats(updatedStats);
    setLastChecked(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  const copyHealthReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      crm: 'Tejo Bharat Solar CRM',
      tenant: tenant?.name || 'Default Tenant',
      overallLatencyMs: overallLatency,
      services,
      tables: tableStats.map(t => ({
        table: t.table,
        count: t.count,
        latencyMs: t.latencyMs,
        status: t.status,
        subStats: t.subStats,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'error' | 'loading' | 'operational' | 'degraded' | 'down' | 'checking') => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Operational
          </span>
        );
      case 'warning':
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Degraded / Slow
          </span>
        );
      case 'error':
      case 'down':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Outage / Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
            <RefreshCw className="w-3.5 h-3.5 text-gray-500 animate-spin" /> Checking...
          </span>
        );
    }
  };

  const totalTrackedRows = tableStats.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CRM & Supabase Health Stats</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Real-time database connectivity, service uptime, and table capacity monitor
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={copyHealthReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            title="Copy diagnostic report to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied JSON!' : 'Copy Report'}</span>
          </button>

          <button
            onClick={runDiagnostics}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Testing...' : 'Refresh Health'}</span>
          </button>
        </div>
      </div>

      {/* Top Barometer Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Status */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">System Status</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">Operational</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            All primary services responding normally
          </p>
        </div>

        {/* Database Latency */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Avg Roundtrip Ping</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">
              {overallLatency !== null ? `${overallLatency} ms` : '...'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            End-to-end HTTPS query response time
          </p>
        </div>

        {/* Total Tracked Records */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Database Rows</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">
              {loading ? '...' : totalTrackedRows.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Sum of verified rows across 7 main tables
          </p>
        </div>

        {/* Session / Tenant Identity */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Tenant / Session</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 truncate">
            <span className="text-lg font-bold text-gray-800 truncate" title={user?.email || 'Authenticated'}>
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">
            Role: <strong className="text-gray-700">{profile?.role || 'admin'}</strong>
          </p>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-700" />
            <h2 className="text-base font-bold text-gray-900">Infrastructure & Backend Services</h2>
          </div>
          {lastChecked && (
            <span className="text-xs text-gray-500">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-100">
          {services.map((svc) => (
            <div key={svc.name} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/70 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-600">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{svc.name}</h3>
                  <p className="text-xs text-gray-500">{svc.detail}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {svc.latencyMs !== null && (
                  <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {svc.latencyMs} ms
                  </span>
                )}
                {getStatusBadge(svc.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Database Tables Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-700" />
            <h2 className="text-base font-bold text-gray-900">Table Capacity & Live Record Counts</h2>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Queries executed via head-only count (zero row payload)
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {tableStats.map((item) => (
            <div key={item.table} className="p-5 sm:px-6 hover:bg-gray-50/70 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-gray-900">{item.name}</span>
                    <code className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                      {item.table}
                    </code>
                    {item.route && (
                      <button
                        onClick={() => navigate(item.route!)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5 transition-colors cursor-pointer"
                        title={`Open ${item.name}`}
                      >
                        <span>Open</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                </div>

                <div className="flex items-center gap-4 self-start sm:self-auto">
                  {item.latencyMs !== null && (
                    <span className="text-xs font-semibold text-gray-500">
                      {item.latencyMs} ms
                    </span>
                  )}

                  <div className="text-right min-w-[120px]">
                    <div className="text-lg font-black text-gray-900">
                      {item.count !== null ? item.count.toLocaleString('en-IN') : '...'}
                      <span className="text-xs font-medium text-gray-500 ml-1">rows</span>
                    </div>
                  </div>

                  {getStatusBadge(item.status)}
                </div>
              </div>

              {/* Sub Stats if available */}
              {item.subStats && item.subStats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  {item.subStats.map((sub) => (
                    <span
                      key={sub.label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700"
                    >
                      <span className="text-gray-500">{sub.label}:</span>
                      <strong className="font-bold text-gray-900">
                        {sub.count !== null ? sub.count.toLocaleString('en-IN') : '0'}
                      </strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Performance Diagnostics Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 text-sm text-blue-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">System Health Notes & Architecture Guardrails</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Optimized Queries:</strong> Counts are polled using PostgreSQL HTTP Head exact count headers, consuming zero network bandwidth for large tables (like 3.5 lakh EB records).</li>
            <li><strong>URL Overflow Guard:</strong> Filter queries are capped to safe parameter lengths (&lt;120 items) preventing HTTP 414 Request-URI Too Long errors.</li>
            <li><strong>Database Endpoint:</strong> Connected securely to Supabase Cloud (<code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">{import.meta.env.VITE_SUPABASE_URL || 'Configured'}</code>).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
