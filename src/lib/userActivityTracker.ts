import { AppModule, UserActivityEvent, UserSessionData, TeamMemberActivitySummary } from '../types/userActivity';
import { supabase } from './supabase';

const SESSIONS_STORAGE_KEY = 'tejo_team_activity_sessions_v1';
const getUserKey = (userId: string) => `tejo_user_time_tracking_${userId || 'guest'}`;

export function pathToModule(pathname: string): AppModule {
  if (!pathname || pathname === '/') return 'dashboard';
  if (pathname.startsWith('/whatsapp')) return 'whatsapp';
  if (pathname.startsWith('/prospects')) return 'prospects';
  if (pathname.startsWith('/eb-customers')) return 'eb_customers';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/quotations')) return 'quotations';
  if (pathname.startsWith('/documents')) return 'documents';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/attendance')) return 'attendance';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/jsp')) return 'jsp';
  return 'other';
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function loadUserSession(userId: string, userName?: string, userEmail?: string, userRole?: string): UserSessionData {
  if (!userId) {
    return createEmptySession('guest', 'Guest User', 'guest@tejobharat.com');
  }

  try {
    const raw = localStorage.getItem(getUserKey(userId));
    if (raw) {
      const parsed: UserSessionData = JSON.parse(raw);
      // Check if session is from today (local date)
      const lastActive = new Date(parsed.lastActiveTime);
      const isToday = new Date().toDateString() === lastActive.toDateString();

      return {
        ...parsed,
        userName: userName || parsed.userName,
        userEmail: userEmail || parsed.userEmail,
        userRole: userRole || parsed.userRole,
        isOnline: true,
        // Reset active seconds if starting a completely new day, but retain weekly history
        activeSeconds: isToday ? parsed.activeSeconds : 0,
        lastActiveTime: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Failed to load user session:', err);
  }

  const newSession = createEmptySession(userId, userName, userEmail, userRole);
  saveUserSession(newSession);
  return newSession;
}

function createEmptySession(userId: string, userName?: string, userEmail?: string, userRole?: string): UserSessionData {
  const now = new Date().toISOString();
  return {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    userName: userName || 'Team Member',
    userEmail: userEmail || '',
    userRole: userRole || 'employee',
    loginTime: now,
    lastActiveTime: now,
    activeSeconds: 0,
    isOnline: true,
    timeSpentByModule: {
      dashboard: 0,
      whatsapp: 0,
      prospects: 0,
      eb_customers: 0,
      customers: 0,
      quotations: 0,
      documents: 0,
      tasks: 0,
      attendance: 0,
      settings: 0,
      jsp: 0,
      other: 0,
    },
    recentActivities: [],
  };
}

export function saveUserSession(session: UserSessionData): void {
  if (!session.userId) return;
  try {
    localStorage.setItem(getUserKey(session.userId), JSON.stringify(session));

    // Also update team roster registry
    const teamRegistry = loadTeamRegistry();
    teamRegistry[session.userId] = {
      userId: session.userId,
      userName: session.userName,
      userEmail: session.userEmail,
      userRole: session.userRole,
      isOnline: session.isOnline,
      lastActiveTime: session.lastActiveTime,
      todayActiveSeconds: session.activeSeconds,
      weekActiveSeconds: session.activeSeconds, // in local tracker
      currentSessionSeconds: session.activeSeconds,
      topModule: getTopModule(session.timeSpentByModule),
      timeSpentByModule: session.timeSpentByModule,
      latestActivity: session.recentActivities[0],
    };
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(teamRegistry));
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
}

function getTopModule(moduleMap: Record<AppModule, number>): AppModule {
  let top: AppModule = 'dashboard';
  let maxTime = -1;
  for (const [mod, sec] of Object.entries(moduleMap)) {
    if (sec > maxTime) {
      maxTime = sec;
      top = mod as AppModule;
    }
  }
  return top;
}

function loadTeamRegistry(): Record<string, TeamMemberActivitySummary> {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse team activity registry:', err);
  }
  return {};
}

export function getTeamActivitySummaries(): TeamMemberActivitySummary[] {
  const registry = loadTeamRegistry();
  const list = Object.values(registry);

  // If empty, supply sample/default staff team summaries for immediate visibility
  if (list.length === 0) {
    const defaultRoster: TeamMemberActivitySummary[] = [
      {
        userId: '00000000-0000-0000-0000-000000000001',
        userName: 'Durga Rao (Admin)',
        userEmail: 'admin@tejobharat.com',
        userRole: 'admin',
        isOnline: true,
        lastActiveTime: new Date().toISOString(),
        todayActiveSeconds: 7420,
        weekActiveSeconds: 38200,
        currentSessionSeconds: 2450,
        topModule: 'whatsapp',
        timeSpentByModule: {
          dashboard: 1200,
          whatsapp: 3600,
          prospects: 1400,
          eb_customers: 820,
          customers: 400,
          quotations: 0,
          documents: 0,
          tasks: 0,
          attendance: 0,
          settings: 0,
          jsp: 0,
          other: 0,
        },
        latestActivity: {
          id: 'act_1',
          userId: '00000000-0000-0000-0000-000000000001',
          userName: 'Durga Rao',
          module: 'whatsapp',
          action: 'whatsapp_broadcast',
          description: 'Filtered campaign replies for CMP-SURYA-2609-040',
          timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        },
      },
      {
        userId: 'user_prasad_9000',
        userName: 'Prasad (Operations)',
        userEmail: 'prasad@tejobharat.com',
        userRole: 'employee',
        isOnline: true,
        lastActiveTime: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        todayActiveSeconds: 5890,
        weekActiveSeconds: 29400,
        currentSessionSeconds: 1820,
        topModule: 'prospects',
        timeSpentByModule: {
          dashboard: 600,
          whatsapp: 1800,
          prospects: 2490,
          eb_customers: 1000,
          customers: 0,
          quotations: 0,
          documents: 0,
          tasks: 0,
          attendance: 0,
          settings: 0,
          jsp: 0,
          other: 0,
        },
        latestActivity: {
          id: 'act_2',
          userId: 'user_prasad_9000',
          userName: 'Prasad',
          module: 'prospects',
          action: 'prospect_update',
          description: 'Updated site survey status for customer in Pithapuram',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
      },
      {
        userId: 'user_venkat_7729',
        userName: 'Venkat (Survey Engineer)',
        userEmail: 'venkat@tejobharat.com',
        userRole: 'employee',
        isOnline: false,
        lastActiveTime: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        todayActiveSeconds: 4300,
        weekActiveSeconds: 21800,
        currentSessionSeconds: 0,
        topModule: 'eb_customers',
        timeSpentByModule: {
          dashboard: 400,
          whatsapp: 900,
          prospects: 1000,
          eb_customers: 2000,
          customers: 0,
          quotations: 0,
          documents: 0,
          tasks: 0,
          attendance: 0,
          settings: 0,
          jsp: 0,
          other: 0,
        },
        latestActivity: {
          id: 'act_3',
          userId: 'user_venkat_7729',
          userName: 'Venkat',
          module: 'eb_customers',
          action: 'customer_update',
          description: 'Uploaded feasibility inspection report for 3kW Rooftop',
          timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        },
      },
    ];

    defaultRoster.forEach((r) => {
      registry[r.userId] = r;
    });
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(registry));
    return defaultRoster;
  }

  return list.sort((a, b) => new Date(b.lastActiveTime).getTime() - new Date(a.lastActiveTime).getTime());
}

export async function logUserActivityEvent(
  session: UserSessionData,
  module: AppModule,
  action: string,
  description: string,
  metadata?: Record<string, any>
): Promise<UserSessionData> {
  const event: UserActivityEvent = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: session.userId,
    userName: session.userName,
    userRole: session.userRole,
    module,
    action,
    description,
    metadata,
    timestamp: new Date().toISOString(),
  };

  const updatedActivities = [event, ...(session.recentActivities || [])].slice(0, 50);
  const updatedSession: UserSessionData = {
    ...session,
    lastActiveTime: event.timestamp,
    recentActivities: updatedActivities,
  };

  saveUserSession(updatedSession);

  // Optional: Also log into Supabase activity_logs table for audit trail
  try {
    await supabase.from('activity_logs').insert({
      entity_type: 'customer',
      entity_id: metadata?.entityId || session.userId,
      user_id: session.userId.includes('-') ? session.userId : null,
      activity_type: 'note_added',
      description: `[${module.toUpperCase()}] ${description}`,
      metadata: {
        action,
        module,
        userName: session.userName,
        ...(metadata || {}),
      },
      created_at: event.timestamp,
    });
  } catch (err) {
    // Non-fatal if schema differs
  }

  return updatedSession;
}
