export type Theme = 'light' | 'dark';

const THEME_KEY = 'swypemeal_theme';

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme, persist = false): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode) — the theme still applies.
    }
  }
}

/** Apply the saved theme before the first render. Light is the default. */
export function initTheme(): Theme {
  const theme = getStoredTheme() ?? 'light';
  applyTheme(theme);
  return theme;
}

export function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
