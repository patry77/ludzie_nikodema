import { useCallback, useEffect, useRef, useState } from 'react';

export const API = process.env.REACT_APP_API_URL || '/api';

export const getAdminPass = () => {
  try {
    return sessionStorage.getItem('adminPass') || '';
  } catch (e) {
    return '';
  }
};

export const hasAdminSession = () => {
  try {
    return sessionStorage.getItem('adminAuth') === 'true' && !!sessionStorage.getItem('adminPass');
  } catch (e) {
    return false;
  }
};

export async function api(path, { method = 'GET', admin = false, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers['x-admin-password'] = getAdminPass();
  try {
    const response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'Brak połączenia z serwerem' } };
  }
}

// ----- zapamietany gracz (telefon) -----
const playerKey = (code) => `quizPlayer:${String(code).toUpperCase()}`;

export const getStoredPlayer = (code) => {
  try {
    const raw = localStorage.getItem(playerKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredPlayer = (code, player) => {
  try {
    localStorage.setItem(playerKey(code), JSON.stringify(player));
  } catch (e) {
    /* localStorage moze byc niedostepny */
  }
};

export const clearStoredPlayer = (code) => {
  try {
    localStorage.removeItem(playerKey(code));
  } catch (e) {
    /* ignorujemy */
  }
};

// Odpytuje serwer o stan gry. Gdy nic sie nie zmienilo, serwer odsyla krotka odpowiedz (since=version).
// `offset` = roznica miedzy zegarem serwera a zegarem przegladarki (do liczenia odliczania).
export function useGameState({ code, role, token, as, interval = 1000 }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const offsetRef = useRef(0);
  const versionRef = useRef(null);
  const [, force] = useState(0);

  const poll = useCallback(
    async (forceFull) => {
      const params = new URLSearchParams({ role });
      if (token) params.set('token', token);
      if (as) params.set('as', as);
      if (versionRef.current !== null && !forceFull) params.set('since', String(versionRef.current));
      const res = await api(`/games/${code}/state?${params.toString()}`, { admin: role === 'host' || !!as });
      if (!res.ok) {
        setError({ status: res.status, message: res.data.error || 'Nie udało się pobrać stanu gry' });
        return;
      }
      setError(null);
      if (res.data.now) offsetRef.current = res.data.now - Date.now();
      if (res.data.unchanged) return;
      versionRef.current = res.data.version;
      setState(res.data);
      force((n) => n + 1);
    },
    [code, role, token, as]
  );

  useEffect(() => {
    versionRef.current = null;
    setState(null);
    poll(true);
    const id = setInterval(() => poll(false), interval);
    return () => clearInterval(id);
  }, [poll, interval]);

  const refresh = useCallback(() => poll(true), [poll]);
  return { state, error, offsetRef, refresh };
}

// Sekundy do terminu (aktualizowane 5x na sekunde), z korekta zegara serwera.
export function useSecondsLeft(deadline, offsetRef) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!deadline) {
      setLeft(null);
      return undefined;
    }
    const tick = () => setLeft(Math.max(0, (deadline - (Date.now() + offsetRef.current)) / 1000));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline, offsetRef]);
  return left;
}

export const youtubeEmbedUrl = (link) => {
  if (!link) return null;
  try {
    const u = new URL(link);
    let id = null;
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}?rel=0` : null;
  } catch (e) {
    return null;
  }
};
