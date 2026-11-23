import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { buildMuiTheme } from './theme';
import { DEFAULT_SETTINGS, getCountdown, getTheme } from './themes';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const CACHE_KEY = 'siteSettings';

const SiteThemeContext = createContext(null);

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : null;
  } catch (e) {
    return null;
  }
};

const writeCache = (settings) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch (e) {
    /* localStorage moze byc niedostepny - nie ma znaczenia */
  }
};

// Zmienne CSS aktywnego motywu (uzywane w index.css i komponentach)
const applyCssVars = (preset) => {
  const c = preset.colors;
  const root = document.documentElement;
  const vars = {
    '--night': c.night,
    '--night-2': c.night2,
    '--primary': c.primary,
    '--primary-dark': c.primaryDark,
    '--primary-light': c.primaryLight,
    '--secondary': c.secondary,
    '--secondary-dark': c.secondaryDark,
    '--gold': c.gold,
    '--gold-light': c.goldLight,
    '--gold-deep': c.goldDeep,
    '--accent-rgb': c.accentRgb,
    '--glow-1': c.glow1,
    '--glow-2': c.glow2,
    '--glow-3': c.glow3,
  };
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', preset.id);
};

export const SiteThemeProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => readCache() || DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) throw new Error('settings');
      const data = { ...DEFAULT_SETTINGS, ...(await response.json()) };
      setSettings(data);
      writeCache(data);
    } catch (e) {
      /* zostajemy przy wartosciach z cache / domyslnych */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const preset = getTheme(settings.theme);

  useEffect(() => {
    applyCssVars(preset);
  }, [preset]);

  const muiTheme = useMemo(() => buildMuiTheme(preset.colors), [preset]);

  const value = useMemo(
    () => ({
      settings,
      preset,
      loaded,
      countdown: getCountdown(settings),
      refresh,
      applySettings: (next) => {
        const merged = { ...DEFAULT_SETTINGS, ...next };
        setSettings(merged);
        writeCache(merged);
      },
    }),
    [settings, preset, loaded, refresh]
  );

  return (
    <SiteThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
    </SiteThemeContext.Provider>
  );
};

export const useSiteTheme = () => {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) throw new Error('useSiteTheme musi byc uzyty wewnatrz SiteThemeProvider');
  return ctx;
};
