import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { THEMES, DEFAULT_THEME, applyThemeByName, ThemeDefinition, getTheme } from '../lib/themes';

interface ThemeContextType {
  currentTheme: string;
  themeDefinition: ThemeDefinition;
  setTheme: (themeName: string) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'app-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    applyThemeByName(stored);
    setCurrentTheme(stored);

    const loadThemeFromProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('theme')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error || !data) {
          setLoading(false);
          return;
        }

        const profileTheme = data.theme || DEFAULT_THEME;
        localStorage.setItem(STORAGE_KEY, profileTheme);
        applyThemeByName(profileTheme);
        setCurrentTheme(profileTheme);
      } catch (err) {
        console.error('Error loading theme:', err);
      } finally {
        setLoading(false);
      }
    };

    loadThemeFromProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session?.user) {
          const stored = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
          applyThemeByName(stored);
          setCurrentTheme(stored);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setTheme = async (themeName: string) => {
    const theme = getTheme(themeName);
    applyThemeToCSS(theme);
    setCurrentTheme(themeName);
    localStorage.setItem(STORAGE_KEY, themeName);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ theme: themeName })
          .eq('id', session.user.id);
      }
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  const themeDefinition = getTheme(currentTheme);

  return (
    <ThemeContext.Provider value={{ currentTheme, themeDefinition, setTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );

  function applyThemeToCSS(theme: ThemeDefinition) {
    const root = document.documentElement;
    const c = theme.colors;
    root.style.setProperty('--color-primary', c.primary);
    root.style.setProperty('--color-primary-hover', c.primaryHover);
    root.style.setProperty('--color-primary-light', c.primaryLight);
    root.style.setProperty('--color-primary-dark', c.primaryDark);
    root.style.setProperty('--color-accent', c.accent);
    root.style.setProperty('--color-accent-light', c.accentLight);
    root.style.setProperty('--color-header-bg', c.headerBg);
    root.style.setProperty('--color-header-text', c.headerText);
    root.style.setProperty('--color-page-bg', c.pageBg);
    root.style.setProperty('--color-card-bg', c.cardBg);
    root.style.setProperty('--color-card-border', c.cardBorder);
    root.style.setProperty('--color-text-primary', c.textPrimary);
    root.style.setProperty('--color-text-secondary', c.textSecondary);
    root.style.setProperty('--color-text-muted', c.textMuted);
    root.style.setProperty('--color-input-bg', c.inputBg);
    root.style.setProperty('--color-input-border', c.inputBorder);
    root.style.setProperty('--color-success', c.success);
    root.style.setProperty('--color-warning', c.warning);
    root.style.setProperty('--color-error', c.error);
    root.style.setProperty('--color-badge-bg', c.badgeBg);
    root.style.setProperty('--color-badge-text', c.badgeText);
    root.setAttribute('data-theme', theme.name);
    root.setAttribute('data-theme-dark', theme.isDark ? 'true' : 'false');
  }
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { THEMES };
