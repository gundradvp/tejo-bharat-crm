export interface ThemeDefinition {
  name: string;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    headerBg: string;
    headerText: string;
    pageBg: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    inputBg: string;
    inputBorder: string;
    success: string;
    warning: string;
    error: string;
    badgeBg: string;
    badgeText: string;
  };
  isDark: boolean;
  swatch: string[];
}

export const THEMES: ThemeDefinition[] = [
  {
    name: 'teal',
    displayName: 'Teal',
    description: 'Clean teal with light gray backgrounds',
    isDark: false,
    swatch: ['#0d9488', '#14b8a6', '#f0fdfa'],
    colors: {
      primary: '#0d9488',
      primaryHover: '#0f766e',
      primaryLight: '#ccfbf1',
      primaryDark: '#134e4a',
      accent: '#f59e0b',
      accentLight: '#fef3c7',
      headerBg: '#ffffff',
      headerText: '#1f2937',
      pageBg: '#f8fafc',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      inputBg: '#ffffff',
      inputBorder: '#d1d5db',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      badgeBg: '#f1f5f9',
      badgeText: '#475569',
    },
  },
  {
    name: 'ocean',
    displayName: 'Ocean Blue',
    description: 'Deep blue with soft blue-tinted backgrounds',
    isDark: false,
    swatch: ['#1e40af', '#3b82f6', '#dbeafe'],
    colors: {
      primary: '#1e40af',
      primaryHover: '#1e3a8a',
      primaryLight: '#dbeafe',
      primaryDark: '#1e3a8a',
      accent: '#06b6d4',
      accentLight: '#cffafe',
      headerBg: '#ffffff',
      headerText: '#1e293b',
      pageBg: '#eff6ff',
      cardBg: '#ffffff',
      cardBorder: '#bfdbfe',
      textPrimary: '#1e293b',
      textSecondary: '#475569',
      textMuted: '#94a3b8',
      inputBg: '#ffffff',
      inputBorder: '#93c5fd',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      badgeBg: '#e0e7ff',
      badgeText: '#3730a3',
    },
  },
  {
    name: 'forest',
    displayName: 'Forest Green',
    description: 'Emerald green with warm cream backgrounds',
    isDark: false,
    swatch: ['#15803d', '#22c55e', '#fefce8'],
    colors: {
      primary: '#15803d',
      primaryHover: '#166534',
      primaryLight: '#dcfce7',
      primaryDark: '#14532d',
      accent: '#ca8a04',
      accentLight: '#fef9c3',
      headerBg: '#ffffff',
      headerText: '#1f2937',
      pageBg: '#fefce8',
      cardBg: '#fffff5',
      cardBorder: '#d4d4aa',
      textPrimary: '#1f2937',
      textSecondary: '#525252',
      textMuted: '#a3a3a3',
      inputBg: '#ffffff',
      inputBorder: '#d4d4aa',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      badgeBg: '#ecfdf5',
      badgeText: '#065f46',
    },
  },
  {
    name: 'sunset',
    displayName: 'Sunset Orange',
    description: 'Burnt orange with warm sand backgrounds',
    isDark: false,
    swatch: ['#c2410c', '#f97316', '#fff7ed'],
    colors: {
      primary: '#c2410c',
      primaryHover: '#9a3412',
      primaryLight: '#ffedd5',
      primaryDark: '#7c2d12',
      accent: '#0891b2',
      accentLight: '#cffafe',
      headerBg: '#ffffff',
      headerText: '#1c1917',
      pageBg: '#fff7ed',
      cardBg: '#ffffff',
      cardBorder: '#fed7aa',
      textPrimary: '#1c1917',
      textSecondary: '#44403c',
      textMuted: '#a8a29e',
      inputBg: '#ffffff',
      inputBorder: '#fdba74',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      badgeBg: '#fff0e6',
      badgeText: '#9a3412',
    },
  },
  {
    name: 'slate',
    displayName: 'Slate Dark',
    description: 'Charcoal dark mode with elevated dark cards',
    isDark: true,
    swatch: ['#334155', '#64748b', '#1e293b'],
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryLight: '#1e3a5f',
      primaryDark: '#60a5fa',
      accent: '#f59e0b',
      accentLight: '#3a2e1a',
      headerBg: '#1e293b',
      headerText: '#f1f5f9',
      pageBg: '#0f172a',
      cardBg: '#1e293b',
      cardBorder: '#334155',
      textPrimary: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      inputBg: '#334155',
      inputBorder: '#475569',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      badgeBg: '#334155',
      badgeText: '#cbd5e1',
    },
  },
  {
    name: 'rose',
    displayName: 'Rose',
    description: 'Rose-pink with blush-tinted backgrounds',
    isDark: false,
    swatch: ['#be185d', '#ec4899', '#fdf2f8'],
    colors: {
      primary: '#be185d',
      primaryHover: '#9d174d',
      primaryLight: '#fce7f3',
      primaryDark: '#831843',
      accent: '#8b5cf6',
      accentLight: '#ede9fe',
      headerBg: '#ffffff',
      headerText: '#1f2937',
      pageBg: '#fdf2f8',
      cardBg: '#ffffff',
      cardBorder: '#fbcfe8',
      textPrimary: '#1f2937',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      inputBg: '#ffffff',
      inputBorder: '#f9a8d4',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      badgeBg: '#fce7f3',
      badgeText: '#9d174d',
    },
  },
];

export const DEFAULT_THEME = 'teal';

export function getTheme(name: string): ThemeDefinition {
  return THEMES.find(t => t.name === name) || THEMES[0];
}

export function applyThemeToCSS(theme: ThemeDefinition) {
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

export function applyThemeByName(name: string) {
  const theme = getTheme(name);
  applyThemeToCSS(theme);
  return theme;
}
