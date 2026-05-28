import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

const STORAGE_KEY = 'bytemail-theme';

export type ThemeValue = 'light' | 'dark' | 'system';

export function getStoredTheme(): ThemeValue {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {}
  return 'system';
}

export function setStoredTheme(theme: ThemeValue): void {
  try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  applyTheme(theme);
}

function applyTheme(theme: ThemeValue): void {
  const root = document.documentElement;
  if (theme === 'dark') { root.classList.add('dark'); return; }
  if (theme === 'light') { root.classList.remove('dark'); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) root.classList.add('dark');
  else root.classList.remove('dark');
}

export function useTheme() {
  const { user } = useAuthStore();
  const theme = user?.preferences?.theme ?? getStoredTheme();

  useEffect(() => {
    if (theme === 'dark') { applyTheme('dark'); return; }
    if (theme === 'light') { applyTheme('light'); return; }

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme('system');
    const handler = (e: MediaQueryListEvent) => {
      if (getStoredTheme() === 'system') {
        if (e.matches) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}

export function useSystemThemeToggle() {
  const { user, updateUser } = useAuthStore();

  const currentTheme = user?.preferences?.theme ?? getStoredTheme();

  const toggle = () => {
    const next: ThemeValue =
      currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light';
    setStoredTheme(next);
    if (user) {
      updateUser({ preferences: { ...user.preferences, theme: next } });
    }
  };

  const isDark =
    currentTheme === 'dark' ||
    (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { currentTheme, isDark, toggle };
}
