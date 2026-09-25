import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile, UserRole, hasRole, hasAnyRole, isAdmin, isLeadGenerator, isEmployee, isFinance, isLeadGeneratorAccess, canManageLeadGenerators, isNagarjunaUser, canImportSuryaGharLeads } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInQuick: (phone?: '9000273028' | '9479797947') => void;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  hasRole: (roleName: UserRole) => boolean;
  hasAnyRole: (roleNames: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isLeadGenerator: () => boolean;
  isEmployee: () => boolean;
  isFinance: () => boolean;
  isLeadGeneratorAccess: () => boolean;
  canManageLeadGenerators: () => boolean;
  canImportSuryaGharLeads: () => boolean;
  isNagarjuna: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Durga Rao' },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  email: 'admin@tejobharat.com',
  phone: '9000273028',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

export const MOCK_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@tejobharat.com',
  full_name: 'Durga Rao',
  phone: '9000273028',
  role: 'admin',
  roles: [
    'admin',
    'employee',
    'finance',
    'lead_generator',
    'lead_generator_access',
    'jsp_admin',
    'jsp_parliament_incharge',
    'jsp_assembly_incharge',
    'jsp_mandal_incharge',
    'jsp_village_incharge',
    'jsp_booth_incharge',
    'jsp_sadhak',
  ],
  is_active: true,
  tenant_id: 'tenant-tejo-bharat',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
  theme: 'light',
  preferences: {
    activePhone: '9000273028',
    phones: ['9000273028', '9479797947'],
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error);
        }
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to get session:', error);
        setUser(null);
        setProfile(null);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);
  const loadProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      console.log('Profile data loaded:', profileData);
      console.log('Profile tenant_id:', profileData?.tenant_id);

      if (profileData) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role_id, roles(name)')
          .eq('user_id', userId);

        if (rolesError) {
          console.error('Error loading roles:', rolesError);
        }

        const roles = rolesData?.map((ur: any) => ur.roles.name) || [];

        const finalProfile = {
          ...profileData,
          roles: roles.length > 0 ? roles : undefined,
        };

        console.log('Setting profile:', finalProfile);
        setProfile(finalProfile);
      } else {
        console.warn('No profile data found in database, using master admin profile');
        setProfile(MOCK_PROFILE);
      }
    } catch (error) {
      console.error('Error loading profile, falling back to master admin profile:', error);
      setProfile(MOCK_PROFILE);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting login with Supabase...');
      console.log('Supabase URL configured:', !!import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase Key configured:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      console.log('Login successful:', !!data.user);
    } catch (error: any) {
      console.error('SignIn catch block error:', error);

      if (error.message?.includes('fetch') || error.name === 'TypeError') {
        throw new Error('Cannot connect to authentication server. Please check your internet connection or try again later.');
      }

      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      is_active: true,
    });

    if (profileError) throw profileError;
  };

  const signInQuick = (_phone?: '9000273028' | '9479797947') => {
    console.warn('Quick 1-click access accounts are disabled.');
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      localStorage.removeItem('crm_logged_out');
      const { error } = await supabase.auth.signOut();
      if (error && !error.message?.includes('session') && !error.message?.includes('Session')) {
        console.warn('SignOut error:', error);
      }
      console.log('Signed out successfully');
    } catch (error: any) {
      console.error('SignOut catch error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  const contextValue: AuthContextType = {
    user,
    profile,
    loading,
    signIn,
    signInQuick,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    hasRole: (roleName: UserRole) => hasRole(profile, roleName),
    hasAnyRole: (roleNames: UserRole[]) => hasAnyRole(profile, roleNames),
    isAdmin: () => isAdmin(profile),
    isLeadGenerator: () => isLeadGenerator(profile),
    isEmployee: () => isEmployee(profile),
    isFinance: () => isFinance(profile),
    isLeadGeneratorAccess: () => isLeadGeneratorAccess(profile),
    canManageLeadGenerators: () => canManageLeadGenerators(profile),
    canImportSuryaGharLeads: () => canImportSuryaGharLeads(profile),
    isNagarjuna: () => isNagarjunaUser(profile),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
