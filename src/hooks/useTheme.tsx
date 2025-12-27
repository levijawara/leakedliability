// Theme hook wrapper for next-themes
// Re-exports useTheme from next-themes for convenience

import { useTheme as useNextTheme } from 'next-themes';

export interface ThemeConfig {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  resolvedTheme: string | undefined;
  themes: string[];
  systemTheme: string | undefined;
}

/**
 * Hook to access and control theme
 * Wraps next-themes useTheme for consistent API
 */
export function useTheme(): ThemeConfig {
  const { theme, setTheme, resolvedTheme, themes, systemTheme } = useNextTheme();

  return {
    theme,
    setTheme,
    resolvedTheme,
    themes,
    systemTheme,
  };
}

/**
 * Check if current theme is dark
 */
export function useIsDarkTheme(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark';
}

/**
 * Toggle between light and dark theme
 */
export function useThemeToggle(): () => void {
  const { resolvedTheme, setTheme } = useTheme();

  return () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };
}

// Re-export the hook as default as well
export { useTheme as default };
