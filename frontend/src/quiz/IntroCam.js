import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { API, api } from './quizApi';

// Przedstawianie z kamera przed startem gry (WebRTC, obraz idzie prosto z telefonu do widoku TV).
// Serwer przekazuje tylko wiadomosci sygnalizacyjne. Przeplyw: TV wysyla "hello", telefon (ktory ma juz kamere) odpowiada "offer",
// TV odsyla "answer", obie strony wymieniaja "ice". Kazdy "hello" otwiera nowa sesje (sid), wiec odswiezenie TV nie psuje polaczenia.

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const rid = () => Math.random().toString(36).slice(2, 10);

const signalUrl = (code, role, rev, since, extra) => {
  const p = new URLSearchParams({ role, rev, since: String(since) });
  if (extra && extra.token) p.set('token', extra.token);
  if (extra && extra.as) p.set('as', extra.as);
  return `/games/${code}/signal?${p.toString()}`;
};

const sendSignal = (code, body, extra) =>
  api(`/games/${code}/signal`, { method: 'POST', admin: !!(extra && extra.as), body: { ...body, token: extra && extra.token, as: extra && extra.as } });

const sendFrame = (code, rev, frame, extra) =>
  api(`/games/${code}/intro-frame`, { method: 'POST', admin: !!(extra && extra.as), body: { rev, frame, token: extra && extra.token, as: extra && extra.as } });

// Wspolna petla odpytywania: wywoluje onMsgs(lista) dla kazdej partii wiadomosci; konczy sie, gdy serwer zglosi koniec przedstawiania.
function useSignalLoop({ code, role, rev, extra, enabled, onMsgs, onEnd }) {
  const handlers = useRef({});
  handlers.current = { onMsgs, onEnd };
  useEffect(() => {
    if (!enabled || !rev) return undefined;
    let alive = true;
    let since = 0;
    let timer = null;
    const loop = async () => {
      const res = await api(signalUrl(code, role, rev, since, extra), { admin: !!(extra && extra.as) });
      if (!alive) return;
      if (res.ok && res.data.active === false) {
        handlers.current.onEnd && handlers.current.onEnd();
        return;
      }
      if (res.ok && res.data.msgs && res.data.msgs.length) {
        since = Math.max(since, ...res.data.msgs.map((m) => m.id));
        await handlers.current.onMsgs(res.data.msgs);
      }
      if (alive) timer = setTimeout(loop, 600);
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, role, rev, enabled, extra && extra.token, extra && extra.as]);
}

// ---------- Telefon osoby przedstawiajacej sie ----------
export const IntroPhone = ({ code, intro, token, as }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const sidRef = useRef('');
  const pendingIce = useRef([]);
  const extra = { token, as };
  const rev = intro.rev;

  const closePc = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        /* ignorujemy */
      }
      pcRef.current = null;
    }
    setLive(false);
  };

  const stopAll = useCallback(() => {
    closePc();
    setStream((s) => {
      if (s) s.getTracks().forEach((t) => t.stop());
      return null;
    });
  }, []);

  useEffect(() => () => stopAll(), [stopAll, rev]);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  // Tryb zastepczy: gdy TV nie umie odebrac WebRTC, wysylamy klatki JPEG (kilka na sekunde, bez dzwieku)
  const framesMode = intro.status === 'frames';
  useEffect(() => {
    if (!stream || !framesMode) return undefined;
    let alive = true;
    const canvas = document.createElement('canvas');
    const loop = async () => {
      const v = videoRef.current;
      if (alive && v && v.videoWidth) {
        const w = 400;
        const h = Math.round((w * v.videoHeight) / v.videoWidth);
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(v, 0, 0, w, h);
        await sendFrame(code, rev, canvas.toDataURL('image/jpeg', 0.6), { token, as });
      }
      if (alive) setTimeout(loop, 350);
    };
    loop();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, framesMode, code, rev, token, as]);

  const enable = async () => {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Ta przeglądarka nie udostępnia kamery (potrzebne jest połączenie HTTPS).');
      return;
    }
    try {
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: true });
      } catch (e) {
        // brak mikrofonu albo odmowa - probujemy sam obraz
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      }
      setStream(s);
    } catch (e) {
      setError(e && e.name === 'NotAllowedError' ? 'Nie zezwolono na kamerę. Zezwól w ustawieniach przeglądarki i spróbuj ponownie.' : 'Nie udało się włączyć kamery.');
    }
  };

  const handle = async (msgs) => {
    const lastHello = [...msgs].reverse().find((m) => m.type === 'hello');
    for (const m of msgs) {
      try {
        if (m.type === 'hello') {
          if (m !== lastHello || !stream) continue;
          closePc();
          pendingIce.current = [];
          sidRef.current = m.sid;
          const pc = new RTCPeerConnection(RTC_CONFIG);
          pcRef.current = pc;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          pc.onicecandidate = (e) => {
            if (e.candidate) sendSignal(code, { role: 'phone', rev, type: 'ice', sid: m.sid, data: e.candidate.toJSON() }, extra);
          };
          pc.onconnectionstatechange = () => setLive(pc.connectionState === 'connected');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal(code, { role: 'phone', rev, type: 'offer', sid: m.sid, data: pc.localDescription.toJSON() }, extra);
        } else if (m.type === 'answer' && m.sid === sidRef.current && pcRef.current) {
          await pcRef.current.setRemoteDescription(m.data);
          for (const c of pendingIce.current) await pcRef.current.addIceCandidate(c).catch(() => {});
          pendingIce.current = [];
        } else if (m.type === 'ice' && m.sid === sidRef.current && pcRef.current) {
          if (pcRef.current.remoteDescription) await pcRef.current.addIceCandidate(m.data).catch(() => {});
          else pendingIce.current.push(m.data);
        }
      } catch (e) {
        /* pojedyncza wiadomosc moze byc nieaktualna */
      }
    }
  };

  useSignalLoop({ code, role: 'phone', rev, extra, enabled: !!stream, onMsgs: handle, onEnd: stopAll });

  return (
    <Box className="glass" sx={{ p: 2, display: 'grid', gap: 1.5, textAlign: 'center', border: '2px solid var(--gold)' }}>
      <Typography sx={{ fontWeight: 800, color: 'var(--gold)' }}>🎥 Teraz Ty się przedstawiasz!</Typography>
      {!stream ? (
        <>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)' }}>
            Prowadzący wybrał Cię do przedstawienia się. Po włączeniu kamery wszyscy zobaczą Cię na ekranie TV (razem z dźwiękiem). Możesz w każdej chwili przerwać.
          </Typography>
          <Button variant="contained" size="large" onClick={enable}>📹 Włącz kamerę</Button>
        </>
      ) : (
        <>
          <Box component="video" ref={videoRef} autoPlay playsInline muted sx={{ width: '100%', maxHeight: 280, borderRadius: '14px', background: '#000', transform: 'scaleX(-1)' }} />
          <Typography variant="body2" sx={{ color: live ? '#8dffaf' : 'var(--ink-dim)', fontWeight: 700 }}>
            {live ? '● Jesteś na żywo na ekranie TV' : framesMode ? '● Obraz idzie na TV w trybie zastępczym (bez dźwięku)' : 'Łączenie z ekranem TV...'}
          </Typography>
          <Button onClick={stopAll} sx={{ color: '#ff9b9b' }}>Wyłącz kamerę</Button>
        </>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
};

// ---------- Widok TV ----------
export const IntroTv = ({ code, intro }) => {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const sidRef = useRef('');
  const pendingIce = useRef([]);
  const lastStatus = useRef('');
  const helloAt = useRef(0);
  const liveRef = useRef(false);
  const framesRef = useRef(false);
  const [live, setLive] = useState(false);
  const [frames, setFrames] = useState(false);
  const [frameN, setFrameN] = useState(0);
  const [gotFrame, setGotFrame] = useState(false);
  const rev = intro.rev;

  const setStatus = (value) => {
    if (framesRef.current && value !== 'live') return; // w trybie zastepczym nie nadpisujemy statusu
    if (lastStatus.current === value) return;
    lastStatus.current = value;
    sendSignal(code, { role: 'tv', rev, type: 'status', value });
  };

  // Przegladarka telewizora moze nie obslugiwac WebRTC - wtedy odbieramy klatki JPEG z telefonu (bez dzwieku)
  const startFrames = () => {
    if (framesRef.current) return;
    setStatus('connecting');
    framesRef.current = true;
    lastStatus.current = 'frames';
    sendSignal(code, { role: 'tv', rev, type: 'status', value: 'frames' });
    setFrames(true);
  };

  const hello = () => {
    if (typeof RTCPeerConnection === 'undefined') {
      startFrames();
      return;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        /* ignorujemy */
      }
    }
    pendingIce.current = [];
    sidRef.current = rid();
    helloAt.current = Date.now();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    const sid = sidRef.current;
    pc.ontrack = (e) => {
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = e.streams[0];
      v.muted = false;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(code, { role: 'tv', rev, type: 'ice', sid, data: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      liveRef.current = st === 'connected';
      setLive(st === 'connected');
      if (st === 'connected') framesRef.current = false;
      setStatus(st === 'connected' ? 'live' : st === 'failed' || st === 'disconnected' ? 'failed' : 'connecting');
      if (st === 'failed' || st === 'disconnected') setTimeout(() => sidRef.current === sid && !liveRef.current && hello(), 2500);
    };
    sendSignal(code, { role: 'tv', rev, type: 'hello', sid });
    setStatus('connecting');
  };

  useEffect(() => {
    lastStatus.current = '';
    framesRef.current = false;
    setFrames(false);
    const startedAt = Date.now();
    try {
      hello();
    } catch (e) {
      startFrames();
    }
    // telefon moze wlaczyc kamere pozniej niz TV powie "hello" - powtarzamy, dopoki nie ma polaczenia
    const again = setInterval(() => {
      if (liveRef.current) return;
      if (Date.now() - startedAt > 14000) startFrames();
      if (Date.now() - helloAt.current > 9000) {
        try {
          hello();
        } catch (e) {
          startFrames();
        }
      }
    }, 3000);
    return () => {
      clearInterval(again);
      if (pcRef.current) pcRef.current.close();
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, code]);

  const handle = async (msgs) => {
    for (const m of msgs) {
      try {
        if (m.sid !== sidRef.current || !pcRef.current) continue;
        const pc = pcRef.current;
        if (m.type === 'offer') {
          await pc.setRemoteDescription(m.data);
          for (const c of pendingIce.current) await pc.addIceCandidate(c).catch(() => {});
          pendingIce.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(code, { role: 'tv', rev, type: 'answer', sid: m.sid, data: pc.localDescription.toJSON() });
        } else if (m.type === 'ice') {
          if (pc.remoteDescription) await pc.addIceCandidate(m.data).catch(() => {});
          else pendingIce.current.push(m.data);
        }
      } catch (e) {
        /* nieaktualna wiadomosc */
      }
    }
  };

  useSignalLoop({ code, role: 'tv', rev, enabled: true, onMsgs: handle });

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(10px, 2vh, 28px)', background: 'rgba(3,5,20,0.92)', backdropFilter: 'blur(6px)' }}>
      <Typography className="pop-in" sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.6vw, 1.8rem)' }}>Przedstawia się</Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 6rem)', lineHeight: 1 }}>{intro.name}</Typography>
      <Box sx={{ position: 'relative', width: 'min(70vw, 120vh)', aspectRatio: '4 / 3', maxHeight: '62vh', borderRadius: '24px', overflow: 'hidden', border: '4px solid var(--gold)', boxShadow: '0 0 60px rgba(var(--accent-rgb),0.45)', background: '#000' }}>
        <Box component="video" ref={videoRef} autoPlay playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        {frames && !live && (
          <Box
            component="img"
            alt=""
            src={`${API}/games/${code}/intro-frame?rev=${rev}&n=${frameN}`}
            onLoad={() => {
              setGotFrame(true);
              setTimeout(() => setFrameN((n) => n + 1), 250);
            }}
            onError={() => setTimeout(() => setFrameN((n) => n + 1), 700)}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', opacity: gotFrame ? 1 : 0 }}
          />
        )}
        {!live && !(frames && gotFrame) && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 3 }}>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>Czekamy na włączenie kamery na telefonie...</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ---------- Panel prowadzacego ----------
const statusText = { waiting: 'czeka na kamerę', connecting: 'łączenie…', live: 'na żywo', failed: 'brak połączenia – spróbuj ponownie', frames: 'tryb zastępczy (obraz bez dźwięku)' };

export const IntroHost = ({ code, intro, people }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const call = async (body) => {
    setBusy(true);
    const res = await api(`/games/${code}/intro`, { method: 'POST', admin: true, body });
    setBusy(false);
    setError(res.ok ? '' : res.data.error || 'Nie udało się');
  };
  const humans = people.filter((p) => !p.isBot);
  return (
    <Box className="glass" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1 }}>🎥 Przedstawianie (opcjonalne)</Typography>
      <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 1.5, lineHeight: 1.6 }}>
        Wybierz osobę – na jej telefonie pojawi się przycisk włączenia kamery, a obraz i dźwięk pojawią się na ekranie TV. Działa tylko przed startem gry; nic nie jest nagrywane ani zapisywane.
      </Typography>
      {intro ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 800 }}>
            Teraz: {intro.name} · <span style={{ color: intro.status === 'live' ? '#8dffaf' : 'var(--ink-dim)' }}>{statusText[intro.status] || intro.status}</span>
          </Typography>
          <Button variant="contained" color="warning" onClick={() => call({ action: 'stop' })} disabled={busy}>⏹ Zakończ przedstawianie</Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {humans.map((p) => (
            <Button key={p.id} variant="outlined" onClick={() => call({ action: 'start', playerId: p.id })} disabled={busy} sx={{ color: 'var(--ink)', borderColor: 'rgba(var(--accent-rgb),0.5)' }}>
              🎥 {p.name}
            </Button>
          ))}
          {humans.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Nikt jeszcze nie dołączył.</Typography>}
        </Box>
      )}
      {intro && intro.status === 'failed' && (
        <Typography variant="body2" sx={{ color: '#ffb4b4', mt: 1 }}>
          Nie udało się połączyć bezpośrednio (np. telefon na LTE, a TV w Wi-Fi). Spróbuj, gdy oba urządzenia są w tej samej sieci.
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
};
