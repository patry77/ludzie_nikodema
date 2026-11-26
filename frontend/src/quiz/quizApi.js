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
// frozenAt = czas serwera, w ktorym gra zostala wstrzymana (wtedy licznik stoi w miejscu)
export function useSecondsLeft(deadline, offsetRef, frozenAt) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!deadline) {
      setLeft(null);
      return undefined;
    }
    const tick = () => setLeft(Math.max(0, (deadline - (frozenAt || Date.now() + offsetRef.current)) / 1000));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [deadline, offsetRef, frozenAt]);
  return left;
}

// ----- wlasne zdjecia / filmy / nagrania wgrane na serwer (link "/api/media/<plik>") -----
export const isOwnMedia = (link) => typeof link === 'string' && link.startsWith('/api/media/');
export const ownMediaSrc = (link) => (isOwnMedia(link) ? `${API}${link.slice(4)}` : link);
// Czy multimedia da sie pokazac w grze: YouTube, wlasny plik albo zdjecie (takze z linku)
export const hasPlayableMedia = (link, media) => !!link && (!!youtubeEmbedUrl(link) || isOwnMedia(link) || media === 'zdjecie');
export const mediaIcon = (media) => (media === 'wideo' ? '🎬' : media === 'zdjecie' ? '📷' : '🎵');
export const mediaNoun = (media) => (media === 'wideo' ? 'Film' : media === 'zdjecie' ? 'Zdjęcie' : 'Utwór');

// Zdjecie zmniejszamy w przegladarce (maks. 1920 px, JPEG), zeby nie wysylac wielu megabajtow. GIF-y zostaja bez zmian.
export async function prepareImage(file) {
  if (!file || !file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    return blob && blob.size < file.size ? blob : file;
  } catch (e) {
    return file;
  }
}

// Wgrywa plik na serwer; zwraca { ok, data: { upload, url, media, size } | { error } }.
// Film serwer kompresuje w tle - czekamy, az bedzie gotowy (onStatus dostaje opis biezacego etapu).
export async function uploadMediaFile(file, onStatus) {
  const say = (t) => {
    if (onStatus) onStatus(t);
  };
  try {
    say('Wgrywanie pliku…');
    const body = await prepareImage(file);
    const response = await fetch(`${API}/media/upload`, { method: 'POST', headers: { 'Content-Type': body.type || file.type || 'application/octet-stream' }, body });
    const data = await response.json().catch(() => ({ error: response.status === 413 ? 'Plik jest za duży' : 'Nie udało się wgrać pliku' }));
    if (!response.ok || !data.processing) {
      say('');
      return { ok: response.ok, data };
    }
    // kompresja filmu: odpytujemy o stan co 1,5 s (maks. 12 minut)
    say('Kompresja filmu… (może potrwać do kilku minut, nie zamykaj strony)');
    const started = Date.now();
    while (Date.now() - started < 12 * 60 * 1000) {
      await new Promise((r) => setTimeout(r, 1500));
      const s = await fetch(`${API}/media/status/${data.upload}`).then((r) => r.json()).catch(() => null);
      if (s && s.state === 'ready') {
        say('');
        return { ok: true, data };
      }
      if (s && (s.state === 'failed' || s.state === 'missing')) {
        say('');
        return { ok: false, data: { error: s.error || 'Nie udało się przetworzyć filmu' } };
      }
    }
    say('');
    return { ok: false, data: { error: 'Przetwarzanie filmu trwa zbyt długo. Spróbuj krótszego pliku.' } };
  } catch (e) {
    say('');
    return { ok: false, data: { error: 'Brak połączenia z serwerem' } };
  }
}

export const youtubeEmbedUrl = (link, params = 'rel=0') => {
  if (!link) return null;
  try {
    const u = new URL(link);
    let id = null;
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else if (u.hostname.includes('youtube.com')) id = u.searchParams.get('v') || (u.pathname.startsWith('/embed/') ? u.pathname.split('/')[2] : null);
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}?${params}` : null;
  } catch (e) {
    return null;
  }
};
