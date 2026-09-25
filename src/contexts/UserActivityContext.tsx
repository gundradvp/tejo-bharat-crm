import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  AppModule,
  UserSessionData,
  TeamMemberActivitySummary,
} from '../types/userActivity';
import {
  pathToModule,
  loadUserSession,
  saveUserSession,
  logUserActivityEvent,
  getTeamActivitySummaries,
} from '../lib/userActivityTracker';

interface UserActivityContextType {
  session: UserSessionData | null;
  activeSeconds: number;
  todayActiveSeconds: number;
  currentModule: AppModule;
  isIdle: boolean;
  logActivity: (action: string, description: string, metadata?: Record<string, any>) => Promise<void>;
  getTeamSummaries: () => TeamMemberActivitySummary[];
  isActivityModalOpen: boolean;
  openActivityModal: () => void;
  closeActivityModal: () => void;
  isStickyNotesOpen: boolean;
  openStickyNotes: () => void;
  closeStickyNotes: () => void;
  toggleStickyNotes: () => void;
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined);

export const UserActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const location = useLocation();

  const currentModule = pathToModule(location.pathname);
  const currentModuleRef = useRef<AppModule>(currentModule);
  currentModuleRef.current = currentModule;

  const [session, setSession] = useState<UserSessionData | null>(null);
  const [activeSeconds, setActiveSeconds] = useState<number>(0);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [isStickyNotesOpen, setIsStickyNotesOpen] = useState<boolean>(false);

  const lastInteractionTimeRef = useRef<number>(Date.now());
  const sessionRef = useRef<UserSessionData | null>(null);
  sessionRef.current = session;

  // Initialize or re-hydrate user session upon login/profile load
  useEffect(() => {
    if (!user && !profile) {
      setSession(null);
      return;
    }

    const userId = profile?.id || user?.id || '00000000-0000-0000-0000-000000000001';
    const userName = profile?.full_name || 'Durga Rao';
    const userEmail = profile?.email || user?.email || 'admin@tejobharat.com';
    const userRole = profile?.role || 'admin';

    const loaded = loadUserSession(userId, userName, userEmail, userRole);
    setSession(loaded);
    setActiveSeconds(loaded.activeSeconds);

    // Record login navigation
    logUserActivityEvent(loaded, currentModule, 'navigation', `Active on ${currentModule.toUpperCase()}`);
  }, [user?.id, profile?.id]);

  // Track user activity & interactions to detect idle status (2 minutes without interaction)
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTimeRef.current = Date.now();
      if (isIdle) {
        setIsIdle(false);
      }
    };

    window.addEventListener('mousemove', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });
    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [isIdle]);

  // Main active timer tick: increments activeSeconds every second if document is visible and not idle
  useEffect(() => {
    const interval = setInterval(() => {
      // Check if tab is hidden
      if (document.hidden) return;

      // Check if idle for more than 120 seconds
      const elapsedSinceInteraction = (Date.now() - lastInteractionTimeRef.current) / 1000;
      if (elapsedSinceInteraction > 120) {
        setIsIdle(true);
        return;
      }

      setActiveSeconds((prev) => prev + 1);

      if (sessionRef.current) {
        const curMod = currentModuleRef.current;
        const currentModSeconds = sessionRef.current.timeSpentByModule[curMod] || 0;

        const updated: UserSessionData = {
          ...sessionRef.current,
          activeSeconds: sessionRef.current.activeSeconds + 1,
          lastActiveTime: new Date().toISOString(),
          isOnline: true,
          timeSpentByModule: {
            ...sessionRef.current.timeSpentByModule,
            [curMod]: currentModSeconds + 1,
          },
        };

        sessionRef.current = updated;
        setSession(updated);

        // Persist to storage every 10 seconds to minimize IO
        if (updated.activeSeconds % 10 === 0) {
          saveUserSession(updated);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track module route changes
  useEffect(() => {
    if (!sessionRef.current) return;
    const mod = pathToModule(location.pathname);
    logUserActivityEvent(sessionRef.current, mod, 'navigation', `Opened ${mod.replace('_', ' ').toUpperCase()}`);
  }, [location.pathname]);

  const logActivity = useCallback(
    async (action: string, description: string, metadata?: Record<string, any>) => {
      if (!sessionRef.current) return;
      const mod = currentModuleRef.current;
      const updated = await logUserActivityEvent(sessionRef.current, mod, action, description, metadata);
      setSession(updated);
    },
    []
  );

  const getTeamSummaries = useCallback(() => {
    return getTeamActivitySummaries();
  }, []);

  return (
    <UserActivityContext.Provider
      value={{
        session,
        activeSeconds,
        todayActiveSeconds: session?.activeSeconds || activeSeconds,
        currentModule,
        isIdle,
        logActivity,
        getTeamSummaries,
        isActivityModalOpen,
        openActivityModal: () => setIsActivityModalOpen(true),
        closeActivityModal: () => setIsActivityModalOpen(false),
        isStickyNotesOpen,
        openStickyNotes: () => setIsStickyNotesOpen(true),
        closeStickyNotes: () => setIsStickyNotesOpen(false),
        toggleStickyNotes: () => setIsStickyNotesOpen((prev) => !prev),
      }}
    >
      {children}
    </UserActivityContext.Provider>
  );
};

export const useUserActivity = () => {
  const context = useContext(UserActivityContext);
  if (!context) {
    throw new Error('useUserActivity must be used within a UserActivityProvider');
  }
  return context;
};
