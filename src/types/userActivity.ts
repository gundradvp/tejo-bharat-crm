export type AppModule =
  | 'dashboard'
  | 'whatsapp'
  | 'prospects'
  | 'eb_customers'
  | 'customers'
  | 'quotations'
  | 'documents'
  | 'tasks'
  | 'attendance'
  | 'settings'
  | 'jsp'
  | 'other';

export interface UserActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  module: AppModule;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface UserSessionData {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  loginTime: string;
  lastActiveTime: string;
  activeSeconds: number; // strictly tracked active seconds (excludes idle)
  isOnline: boolean;
  timeSpentByModule: Record<AppModule, number>; // in seconds
  recentActivities: UserActivityEvent[];
}

export interface TeamMemberActivitySummary {
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  isOnline: boolean;
  lastActiveTime: string;
  todayActiveSeconds: number;
  weekActiveSeconds: number;
  currentSessionSeconds: number;
  topModule: AppModule;
  timeSpentByModule: Record<AppModule, number>;
  latestActivity?: UserActivityEvent;
}
