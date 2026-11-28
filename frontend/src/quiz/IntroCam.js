import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { API, api } from './quizApi';

// Przedstawianie z kamera przed startem gry (WebRTC, obraz idzie prosto z telefonu do widoku TV).
// Serwer przekazuje tylko wiadomosci sygnalizacyjne. Przeplyw: TV wysyla "hello", telefon (ktory ma juz kamere) odpowiada "offer",
// TV odsyla "answer", obie strony wymieniaja "ice". Kazdy "hello" otwiera nowa sesje (sid), wiec odswiezenie TV nie psuje polaczenia.

const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
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

  // Ekran nie moze sie wygasic, bo telefon wstrzymuje wtedy kamere i obraz na TV zamarza
  useEffect(() => {
    if (!stream) return undefined;
    let lock = null;
    let alive = true;
    const acquire = async () => {
      try {
        if (alive && navigator.wakeLock && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen');
      } catch (e) {
        /* przegladarka nie pozwala - trudno */
      }
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible') acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    // kamera zabrana przez inna aplikacje / odlaczona
    const vt = stream.getVideoTracks()[0];
    if (vt) vt.onended = () => setError('Kamera została wyłączona (inna aplikacja albo blokada ekranu). Włącz ją ponownie.');
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      if (lock) lock.release().catch(() => {});
      if (vt) vt.onended = null;
    };
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
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>Nie blokuj ekranu i nie przełączaj aplikacji, dopóki się przedstawiasz.</Typography>
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
  const lastLiveAt = useRef(0);
  const lastT = useRef(0);
  const lastProg = useRef(Date.now());
  const trackMuted = useRef(false);
  // ?debug w adresie widoku TV pokazuje w rogu stan polaczenia (przydatne, gdy obraz sie zacina)
  const debug = typeof window !== 'undefined' && /[?&]debug\b/.test(window.location.search);
  const [dbg, setDbg] = useState('');
  const [evs, setEvs] = useState([]);
  const logEv = (t) => {
    if (debug) setEvs((e) => [...e.slice(-7), `${new Date().toTimeString().slice(0, 8)} ${t}`]);
  };
  const [hadVideo, setHadVideo] = useState(false); // obraz juz raz dotarl - wtedy przy przerwie zostawiamy ostatnia klatke
  const [camPaused, setCamPaused] = useState(false); // telefon wstrzymal kamere (np. zablokowany ekran)
  const [live, setLive] = useState(false);
  const [frames, setFrames] = useState(false);
  const [frameN, setFrameN] = useState(0);
  const [gotFrame, setGotFrame] = useState(false);
  // Prawdziwe proporcje obrazu z telefonu (pion / poziom) - ramka dopasowuje sie do nich, wiec nic nie jest przycinane
  const [ar, setAr] = useState(4 / 3);
  const setRatio = (w, h) => {
    if (w > 0 && h > 0) setAr(Math.min(2.4, Math.max(0.4, w / h)));
  };
  const rev = intro.rev;
  const modeRef = useRef(intro.mode || 'auto');
  modeRef.current = intro.mode || 'auto';

  const setStatus = (value) => {
    if (framesRef.current && value !== 'live') return; // w trybie zastepczym nie nadpisujemy statusu
    if (lastStatus.current === value) return;
    lastStatus.current = value;
    sendSignal(code, { role: 'tv', rev, type: 'status', value });
  };

  // Przegladarka telewizora moze nie obslugiwac WebRTC - wtedy odbieramy klatki JPEG z telefonu (bez dzwieku)
  const startFrames = () => {
    if (framesRef.current) return;
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        /* ignorujemy */
      }
      pcRef.current = null;
      liveRef.current = false;
      setLive(false);
    }
    setStatus('connecting');
    logEv('przelaczenie na tryb poklatkowy');
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
      setHadVideo(true);
      if (e.track.kind === 'video') {
        e.track.onmute = () => {
          trackMuted.current = true;
          setCamPaused(true);
        };
        e.track.onunmute = () => {
          trackMuted.current = false;
          lastProg.current = Date.now();
          setCamPaused(false);
        };
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(code, { role: 'tv', rev, type: 'ice', sid, data: e.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return; // zdarzenie starego, juz zamknietego polaczenia
      const st = pc.connectionState;
      logEv(`polaczenie: ${st}`);
      liveRef.current = st === 'connected';
      setLive(st === 'connected');
      if (st === 'connected') {
        framesRef.current = false;
        lastLiveAt.current = Date.now();
        lastProg.current = Date.now();
      }
      if (st === 'closed') return;
      setStatus(st === 'connected' ? 'live' : st === 'failed' ? 'failed' : 'connecting');
      // "disconnected" jest zwykle chwilowe (zmiana sieci, krotka przerwa) i samo mija - dajemy mu 8 s zanim zaczniemy od nowa;
      // dopiero "failed" oznacza prawdziwa awarie
      if (st === 'failed') setTimeout(() => sidRef.current === sid && !liveRef.current && hello(), 1500);
      else if (st === 'disconnected') setTimeout(() => sidRef.current === sid && !liveRef.current && hello(), 8000);
    };
    pc.oniceconnectionstatechange = () => logEv(`ICE: ${pc.iceConnectionState}`);
    logEv('hello (nowa negocjacja)');
    sendSignal(code, { role: 'tv', rev, type: 'hello', sid });
    setStatus('connecting');
  };

  useEffect(() => {
    lastStatus.current = '';
    framesRef.current = false;
    setFrames(false);
    setHadVideo(false);
    setCamPaused(false);
    lastLiveAt.current = 0;
    trackMuted.current = false;
    const startedAt = Date.now();
    try {
      if (modeRef.current === 'frames') startFrames();
      else hello();
    } catch (e) {
      startFrames();
    }
    // telefon moze wlaczyc kamere pozniej niz TV powie "hello" - powtarzamy, dopoki nie ma polaczenia
    const again = setInterval(() => {
      if (liveRef.current) return;
      if (modeRef.current === 'frames') return; // tryb poklatkowy wybrany recznie
      // zastepczy tryb poklatkowy dopiero, gdy WebRTC nie dziala dluzej (od startu albo od ostatniego polaczenia)
      if (modeRef.current === 'auto' && Date.now() - (lastLiveAt.current || startedAt) > 16000) startFrames();
      // nie przerywamy polaczenia, ktore wlasnie sie nawiazuje (moze trwac kilkanascie sekund) ani chwilowej przerwy
      const pc = pcRef.current;
      const state = pc ? pc.connectionState : 'none';
      const sinceHello = Date.now() - helloAt.current;
      const busy = (state === 'new' || state === 'connecting') && sinceHello < 22000;
      if (state === 'disconnected' && sinceHello < 30000) return;
      if (!busy && sinceHello > 9000) {
        try {
          hello();
        } catch (e) {
          startFrames();
        }
      }
    }, 3000);
    // polaczenie "connected", ale obraz stoi (telefon uspiony / siec): po 8 s negocjujemy od nowa
    // (currentTime strumienia na zywo rosnie zawsze, wiec liczymy klatki faktycznie odebrane przez WebRTC)
    const stall = setInterval(async () => {
      // przegladarka wstrzymuje wyciszone wideo, gdy karta/ramka jest niewidoczna - wznawiamy odtwarzanie
      const v0 = videoRef.current;
      if (v0 && v0.srcObject && v0.paused && !v0.ended) v0.play().catch(() => {});
      const pc = pcRef.current;
      if (!pc || !pc.getStats) return;
      if (!liveRef.current && !debug) return;
      try {
        const stats = await pc.getStats();
        let frames = null;
        let lost = 0;
        const cands = {};
        let pair = null;
        stats.forEach((r) => {
          if (r.type === 'inbound-rtp' && (r.kind === 'video' || r.mediaType === 'video')) {
            frames = r.framesDecoded !== undefined ? r.framesDecoded : r.framesReceived;
            lost = r.packetsLost || 0;
          }
          if (r.type === 'local-candidate' || r.type === 'remote-candidate') cands[r.id] = r;
          if (r.type === 'candidate-pair' && (r.nominated || r.selected) && r.state === 'succeeded') pair = r;
        });
        if (debug) {
          const l = pair && cands[pair.localCandidateId];
          const rm = pair && cands[pair.remoteCandidateId];
          setDbg(`${pc.connectionState}/${pc.iceConnectionState} | ${l ? l.candidateType : '?'}→${rm ? rm.candidateType : '?'} ${l ? l.protocol : ''} | klatki=${frames} utracone=${lost} | wideo: ${v0 ? (v0.paused ? 'PAUZA' : 'gra') : '-'} ${v0 && v0.muted ? 'wyciszone' : 'z dzwiekiem'} ${v0 ? v0.videoWidth + 'x' + v0.videoHeight : ''}`);
        }
        if (!liveRef.current) return;
        if (frames === null) return;
        if (frames !== lastT.current) {
          lastT.current = frames;
          lastProg.current = Date.now();
        } else if (!trackMuted.current && Date.now() - lastProg.current > 8000 && pcRef.current === pc) {
          lastProg.current = Date.now();
          hello();
        }
      } catch (e) {
        /* sprobujemy przy nastepnym obiegu */
      }
    }, 2000);
    return () => {
      clearInterval(again);
      clearInterval(stall);
      if (pcRef.current) pcRef.current.close();
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, code]);

  // Tryb poklatkowy: gdy zadanie klatki zawiesi sie (brak odpowiedzi i bledu), po 3 s prosimy o nastepna
  useEffect(() => {
    if (!frames || live) return undefined;
    const t = setTimeout(() => setFrameN((n) => n + 1), 3000);
    return () => clearTimeout(t);
  }, [frameN, frames, live]);

  // Reczna zmiana trybu przez prowadzacego
  const prevMode = useRef(intro.mode || 'auto');
  useEffect(() => {
    const m = intro.mode || 'auto';
    if (prevMode.current === m) return;
    prevMode.current = m;
    if (m === 'frames') {
      startFrames();
    } else if (framesRef.current) {
      // wracamy do WebRTC (live albo auto)
      framesRef.current = false;
      lastStatus.current = '';
      setFrames(false);
      setGotFrame(false);
      try {
        hello();
      } catch (e) {
        startFrames();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intro.mode]);

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
      {debug && (
        <Box sx={{ position: 'absolute', top: 6, left: 8, zIndex: 5, fontFamily: 'monospace', fontSize: '0.7rem', color: '#9dff9d', background: 'rgba(0,0,0,0.65)', p: 0.75, borderRadius: '6px', maxWidth: '60vw', textAlign: 'left' }}>
          <div>{dbg || '(brak danych WebRTC)'}</div>
          {evs.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </Box>
      )}
      <Typography className="pop-in" sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.6vw, 1.8rem)' }}>Przedstawia się</Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 6rem)', lineHeight: 1 }}>{intro.name}</Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.8rem, 1.2vw, 1.4rem)' }}>
        {live ? 'Tryb: na żywo' : frames ? 'Tryb: poklatkowy (bez dźwięku)' : 'Łączenie…'}
      </Typography>
      <Box sx={{ position: 'relative', height: `min(60vh, ${86 / ar}vw)`, aspectRatio: String(ar), maxWidth: '92vw', borderRadius: '24px', overflow: 'hidden', border: '4px solid var(--gold)', boxShadow: '0 0 60px rgba(var(--accent-rgb),0.45)', background: '#000' }}>
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          onLoadedMetadata={(e) => setRatio(e.target.videoWidth, e.target.videoHeight)}
          onResize={(e) => setRatio(e.target.videoWidth, e.target.videoHeight)}
          onPause={(e) => {
            // wideo wstrzymane przez przegladarke (np. niewidoczna ramka) - od razu wznawiamy
            const el = e.target;
            setTimeout(() => el.srcObject && el.paused && el.play().catch(() => {}), 300);
          }}
          sx={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }}
        />
        {frames && !live && (
          <Box
            component="img"
            alt=""
            src={`${API}/games/${code}/intro-frame?rev=${rev}&n=${frameN}`}
            onLoad={(e) => {
              setRatio(e.target.naturalWidth, e.target.naturalHeight);
              setGotFrame(true);
              setTimeout(() => setFrameN((n) => n + 1), 250);
            }}
            onError={() => setTimeout(() => setFrameN((n) => n + 1), 700)}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)', opacity: gotFrame ? 1 : 0 }}
          />
        )}
        {!live && !(frames && gotFrame) && !hadVideo && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 3 }}>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>Czekamy na włączenie kamery na telefonie...</Typography>
          </Box>
        )}
        {/* przerwa w trakcie: zostaje ostatnia klatka, a napis jest tylko dyskretna plakietka */}
        {hadVideo && (!live || camPaused) && !(frames && gotFrame && !live) && (
          <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, py: 0.75, textAlign: 'center', background: 'rgba(0,0,0,0.72)', color: '#ffd76a', fontWeight: 700, fontSize: 'clamp(0.8rem, 1.4vw, 1.6rem)' }}>
            {camPaused ? '📱 Telefon wstrzymał obraz – odblokuj ekran telefonu' : '⏳ Łączenie ponownie…'}
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
      ) : null}
      {intro ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1.5 }}>
          <Typography sx={{ color: 'var(--ink-dim)', mr: 1 }}>Tryb obrazu na TV:</Typography>
          {[['auto', 'Automatycznie'], ['live', '🔴 Na żywo (z dźwiękiem)'], ['frames', '🖼 Poklatkowo (bez dźwięku)']].map(([m, label]) => (
            <Button
              key={m}
              size="small"
              variant={(intro.mode || 'auto') === m ? 'contained' : 'outlined'}
              onClick={() => call({ action: 'mode', mode: m })}
              disabled={busy}
              sx={(intro.mode || 'auto') === m ? undefined : { color: 'var(--ink)', borderColor: 'rgba(var(--accent-rgb),0.5)' }}
            >
              {label}
            </Button>
          ))}
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
