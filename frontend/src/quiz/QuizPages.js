import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Container, FormControl, InputLabel, MenuItem, Select, Slider, TextField, Typography } from '@mui/material';
import { SOUND_LIST, isAudioUnlocked, playSound, setMasterVolume, unlockAudio } from './sound';
import GameTv from './GameTv';
import GameHost from './GameHost';
import GamePlayer from './GamePlayer';
import StageBackdrop from './StageBackdrop';
import MarqueeSign from './MarqueeSign';
import { Avatar, PhotoPicker } from './Avatar';
import { HexBar } from './QuizBits';
import { IntroPhone } from './IntroCam';
import FamTv from '../familiada/FamTv';
import FamHost from '../familiada/FamHost';
import FamPlayer, { FamJoinForm } from '../familiada/FamPlayer';
import { FamiliadaCard, FamiliadaQuestionEditor, FamiliadaSoundTester } from '../familiada/FamPages';
import { api, clearStoredPlayer, getStoredPlayer, hasAdminSession, setStoredPlayer, useGameState } from './quizApi';

const fieldSx = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.45)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--gold)' },
};

// Pasek nawigacji miedzy podstronami teleturnieju
export const QuizNav = ({ current }) => {
  const items = [
    { to: '/teleturniej', key: 'pytania', label: '➕ Dodaj pytania' },
    { to: '/teleturniej/gry', key: 'gry', label: '🎮 Gry' },
    { to: '/teleturniej/dolacz', key: 'dolacz', label: '📱 Dołącz do gry' },
  ];
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
      {items.map((it) => (
        <Button
          key={it.key}
          component={Link}
          to={it.to}
          sx={{
            color: current === it.key ? '#1a1205' : 'var(--ink)',
            background: current === it.key ? 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(var(--accent-rgb),0.4)',
            fontWeight: 700,
          }}
        >
          {it.label}
        </Button>
      ))}
    </Box>
  );
};

// Wymaga sesji administratora (to samo logowanie co w panelu admina)
const AdminGateInner = ({ children }) => {
  const [ok, setOk] = useState(hasAdminSession());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (ok) return children;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await api('/admin/login', { method: 'POST', body: { password } });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error || 'Nie udało się zalogować');
      setPassword('');
      return;
    }
    try {
      sessionStorage.setItem('adminAuth', 'true');
      sessionStorage.setItem('adminPass', password);
    } catch (err) {
      /* ignorujemy */
    }
    setOk(true);
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <Box component="form" onSubmit={submit} className="glass pop-in" sx={{ p: 4, display: 'grid', gap: 2 }}>
        <Typography variant="h5" sx={{ color: 'var(--gold)' }}>🔐 Panel prowadzącego</Typography>
        <Typography sx={{ color: 'var(--ink-dim)' }}>Tę stronę obsługuje prowadzący – podaj hasło administratora.</Typography>
        <TextField type="password" label="Hasło" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} sx={fieldSx} error={!!error} helperText={error || ' '} />
        <Button type="submit" variant="contained" disabled={busy || !password}>{busy ? 'Logowanie...' : 'Zaloguj'}</Button>
      </Box>
    </Container>
  );
};

// Panel gier jest otwarty (strona prywatna). Zeby wrocic do hasla: GAMES_OPEN = false oraz GAMES_REQUIRE_PASSWORD=1 na serwerze.
const GAMES_OPEN = true;
const AdminGate = ({ children }) => (GAMES_OPEN ? children : <AdminGateInner>{children}</AdminGateInner>);

const Loading = ({ text = 'Ładowanie...' }) => (
  <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', py: 10, position: 'relative', zIndex: 20 }}>{text}</Typography>
);

const GameError = ({ error }) => (
  <Container maxWidth="sm" sx={{ py: 8, position: 'relative', zIndex: 20 }}>
    <Alert severity="error">{error.status === 404 ? 'Nie znaleziono gry o takim kodzie.' : error.message}</Alert>
    <Box sx={{ textAlign: 'center', mt: 3 }}>
      <Button component={Link} to="/teleturniej/dolacz" variant="outlined" sx={{ color: 'var(--gold)' }}>Wpisz kod gry</Button>
    </Box>
  </Container>
);

// ---------------- Lista gier / start ----------------
const FormatCard = ({ onCreated }) => {
  const [source, setSource] = useState('sample');
  const [bankCount, setBankCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await api('/questions', { admin: true });
      if (res.ok) setBankCount((res.data.questions || []).length);
    })();
  }, []);

  const create = async (test) => {
    setBusy(true);
    setError('');
    const res = await api('/games', { method: 'POST', admin: true, body: { format: 'jeden-z-dziesieciu', test, source: test ? 'sample' : source } });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error || 'Nie udało się utworzyć gry');
      return;
    }
    if (onCreated) onCreated();
    if (test) {
      try {
        sessionStorage.setItem(`quizTester:${res.data.code}`, JSON.stringify({ playerId: res.data.playerId, token: res.data.token }));
      } catch (e) {
        /* ignorujemy */
      }
      navigate(`/teleturniej/gra/${res.data.code}/test`);
    } else {
      navigate(`/teleturniej/gra/${res.data.code}/prowadzacy`);
    }
  };

  return (
    <Box className="glass" sx={{ p: { xs: 2.5, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', lineHeight: 1 }} className="gold-text">1 z 10</Typography>
        <Typography sx={{ color: 'var(--ink-dim)' }}>2–10 graczy · prowadzący, widok TV, odpowiadanie z telefonów</Typography>
      </Box>
      <Box component="ul" sx={{ color: 'var(--ink-dim)', pl: 3, m: 0, lineHeight: 1.7 }}>
        <li>Każdy gracz ma <strong style={{ color: 'var(--ink)' }}>3 szanse</strong> – traci je za złą odpowiedź lub brak odpowiedzi w czasie.</li>
        <li><strong style={{ color: 'var(--ink)' }}>Etap I:</strong> dwie kolejki pytań po numerach 1–10. Kto nie odpowie dobrze ani razu – odpada.</li>
        <li><strong style={{ color: 'var(--ink)' }}>Etap II:</strong> dobra odpowiedź daje prawo wskazania, kto odpowiada dalej (pierwsze wskazanie – na przeciwną stronę studia). Gramy do trzech osób.</li>
        <li><strong style={{ color: 'var(--ink)' }}>Finał:</strong> do 40 pytań, odpowiada najszybszy po zgłoszeniu; punkty, wskazywanie, zwycięzca – ostatni z szansami lub najwięcej punktów.</li>
        <li>Pytania ABCD, otwarte, muzyczne i wideo – wszystkie rodzaje pasują.</li>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 3 }}>
        <Box className="glass-strong" sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(var(--accent-rgb),0.4)' }}>
          <Typography sx={{ fontWeight: 800, color: 'var(--gold)', mb: 0.5 }}>🧪 Tryb testowy</Typography>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2 }}>
            Sam sprawdzisz całą grę: jesteś prowadzącym i graczem nr 1, a pozostałych 9 graczy to boty (odpowiadają same). Wbudowana pula 100 pytań. Widok TV, panel prowadzącego i telefon na jednym ekranie.
          </Typography>
          <Button variant="contained" size="large" onClick={() => create(true)} disabled={busy}
            sx={{ background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))', color: '#1a1205', fontWeight: 800 }}>
            🧪 Uruchom tryb testowy
          </Button>
        </Box>

        <Box className="glass-strong" sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(var(--accent-rgb),0.4)' }}>
          <Typography sx={{ fontWeight: 800, color: 'var(--gold)', mb: 0.5 }}>🎮 Nowa gra z uczestnikami</Typography>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2 }}>
            Dostaniesz kod i kod QR dla uczestników. Pytania losowane są z wybranej puli.
          </Typography>
          <FormControl size="small" fullWidth sx={{ ...fieldSx, mb: 2 }}>
            <InputLabel id="src-label">Pula pytań</InputLabel>
            <Select labelId="src-label" label="Pula pytań" value={source} onChange={(e) => setSource(e.target.value)} sx={{ color: 'var(--ink)', '& .MuiSvgIcon-root': { color: 'var(--ink)' } }}>
              <MenuItem value="sample">Wbudowana (100 pytań wiedzy ogólnej)</MenuItem>
              <MenuItem value="bank">Moje pytania z formularza{bankCount !== null ? ` (${bankCount})` : ''}</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" size="large" onClick={() => create(false)} disabled={busy}>▶ Utwórz grę</Button>
        </Box>
      </Box>
    </Box>
  );
};

const statusLabel = { lobby: 'poczekalnia', running: 'trwa', finished: 'zakończona' };

const GamesList = ({ reloadKey }) => {
  const [games, setGames] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await api('/games', { admin: true });
      if (alive && res.ok) setGames(res.data);
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey, tick]);

  const remove = async (g) => {
    if (!window.confirm(`Usunąć grę ${g.code}?`)) return;
    await api(`/games/${g.code}`, { method: 'DELETE', admin: true });
    setTick((t) => t + 1);
  };

  if (!games) return null;
  return (
    <Box className="glass" sx={{ p: { xs: 2, md: 3 }, mt: 3 }}>
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1.5 }}>Twoje gry ({games.length})</Typography>
      {games.length === 0 ? (
        <Typography sx={{ color: 'var(--ink-dim)' }}>Nie ma jeszcze żadnych gier.</Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 1.25 }}>
          {games.map((g) => (
            <Box key={g.code} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', p: 1.5, borderRadius: '14px', background: 'rgba(255,255,255,0.06)' }}>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--gold)', letterSpacing: 3 }}>{g.code}</Typography>
              <Typography sx={{ color: 'var(--ink-dim)', flex: 1, minWidth: 160 }}>
                {g.format === 'familiada' ? `Familiada · ${statusLabel[g.status]} · ${(g.teams || []).join(' vs ')}` : `1 z 10 · ${statusLabel[g.status]} · ${g.players} graczy`}{g.test ? ' · test' : ''}
              </Typography>
              {g.test && <Button size="small" component={Link} to={`/teleturniej/gra/${g.code}/test`} sx={{ color: 'var(--gold)' }}>Konsola testowa</Button>}
              <Button size="small" component={Link} to={`/teleturniej/gra/${g.code}/prowadzacy`} sx={{ color: 'var(--gold)' }}>Prowadzący</Button>
              <Button size="small" component={Link} to={`/teleturniej/gra/${g.code}/tv`} target="_blank" sx={{ color: 'var(--gold)' }}>TV</Button>
              <Button size="small" color="error" onClick={() => remove(g)}>Usuń</Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Odsluch wszystkich efektow dzwiekowych
const SoundTester = () => {
  const [volume, setVolume] = useState(0.6);
  const [ready, setReady] = useState(isAudioUnlocked());

  const play = async (name) => {
    const ok = await unlockAudio();
    setReady(ok);
    setMasterVolume(volume);
    if (ok) playSound(name);
  };

  return (
    <Box className="glass" sx={{ p: { xs: 2, md: 3 }, mt: 3 }}>
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1 }}>🔊 Test dźwięków</Typography>
      <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
        Efekty są generowane w przeglądarce (oryginalne, bez plików). Na widoku TV dźwięk włącza się jednym kliknięciem; na telefonie i w panelu prowadzącego jest opcjonalny.
        Chcesz własne nagrania? Wrzuć plik o nazwie efektu (np. <code>correct.mp3</code>) do folderu <code>frontend/public/sounds/</code> i przebuduj stronę – zastąpi dźwięk wbudowany.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, maxWidth: 360 }}>
        <Typography sx={{ minWidth: 80 }}>Głośność</Typography>
        <Slider size="small" value={Math.round(volume * 100)} onChange={(e, v) => { setVolume(v / 100); setMasterVolume(v / 100); }} aria-label="Głośność" sx={{ color: 'var(--gold)' }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
        {SOUND_LIST.map((s) => (
          <Button key={s.name} onClick={() => play(s.name)} sx={{ justifyContent: 'flex-start', textAlign: 'left', color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', px: 2, py: 1 }}>
            <span style={{ marginRight: 10 }}>▶</span>
            <span>
              <strong>{s.label}</strong>
              <br />
              <small style={{ opacity: 0.7 }}>{s.hint}</small>
            </span>
          </Button>
        ))}
      </Box>
      {!ready && <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 1.5 }}>Kliknij dowolny efekt, aby odblokować dźwięk w przeglądarce.</Typography>}
    </Box>
  );
};

const FORMAT_TABS = [
  { id: 'jeden-z-dziesieciu', label: '1 z 10' },
  { id: 'familiada', label: 'Familiada' },
];

export const QuizHubPage = () => {
  const [reloadKey, setReloadKey] = useState(0);
  const [format, setFormat] = useState(() => {
    try {
      return sessionStorage.getItem('quizHubFormat') === 'familiada' ? 'familiada' : 'jeden-z-dziesieciu';
    } catch (e) {
      return 'jeden-z-dziesieciu';
    }
  });
  const pick = (id) => {
    setFormat(id);
    try {
      sessionStorage.setItem('quizHubFormat', id);
    } catch (e) {
      /* ignorujemy */
    }
  };
  return (
    <AdminGate>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, position: 'relative', zIndex: 20 }}>
        <StageBackdrop variant="soft" />
        <MarqueeSign kicker="🎮 Wybierz format" title="TELETURNIEJE" sx={{ mb: 3 }} />
        <QuizNav current="gry" />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }} role="tablist" aria-label="Format teleturnieju">
          {FORMAT_TABS.map((t) => (
            <Button
              key={t.id}
              role="tab"
              aria-selected={format === t.id}
              onClick={() => pick(t.id)}
              sx={{ px: 3, fontWeight: 800, color: format === t.id ? '#1a1205' : 'var(--ink)', background: format === t.id ? 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb),0.4)' }}
            >
              {t.label}
            </Button>
          ))}
        </Box>
        {format === 'familiada' ? <FamiliadaCard onCreated={() => setReloadKey((k) => k + 1)} /> : <FormatCard onCreated={() => setReloadKey((k) => k + 1)} />}
        <GamesList reloadKey={reloadKey} />
        {format === 'familiada' ? (
          <>
            <FamiliadaQuestionEditor />
            <FamiliadaSoundTester />
          </>
        ) : (
          <SoundTester />
        )}
      </Container>
    </AdminGate>
  );
};

// ---------------- Panel prowadzacego ----------------
const useHostActions = (code, as) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (action, payload) => {
    setBusy(true);
    const res = await api(`/games/${code}/host`, { method: 'POST', admin: true, body: { action, ...(payload || {}) } });
    setBusy(false);
    if (!res.ok) setError(res.data.error || 'Nie udało się wykonać akcji');
    else setError('');
    return res;
  };
  return { act, busy, error, setError };
};

export const HostPage = () => {
  const { code } = useParams();
  return (
    <AdminGate>
      <HostInner code={code.toUpperCase()} />
    </AdminGate>
  );
};

const HostInner = ({ code }) => {
  const { state, error: loadError, offsetRef } = useGameState({ code, role: 'host', interval: 900 });
  const { act, busy, error, setError } = useHostActions(code);
  if (loadError && !state) return <GameError error={loadError} />;
  if (!state) return <Loading />;
  const HostView = state.format === 'familiada' ? FamHost : GameHost;
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 }, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <HostView state={state} offsetRef={offsetRef} act={act} busy={busy} error={error} onResetError={() => setError('')} />
    </Container>
  );
};

// ---------------- Widok TV ----------------
export const TvPage = () => {
  const { code } = useParams();
  const { state, error, offsetRef } = useGameState({ code: code.toUpperCase(), role: 'tv', interval: 800 });
  if (error && !state) return <GameError error={error} />;
  if (!state) return <Loading />;
  return state.format === 'familiada' ? <FamTv state={state} offsetRef={offsetRef} /> : <GameTv state={state} offsetRef={offsetRef} />;
};

// ---------------- Telefon uczestnika ----------------
export const PlayerPage = () => {
  const { code: rawCode } = useParams();
  const code = rawCode.toUpperCase();
  const [stored, setStored] = useState(() => getStoredPlayer(code));
  const [name, setName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (stored) return undefined;
    let alive = true;
    (async () => {
      const res = await api(`/games/${code}/state?role=tv`);
      if (alive && res.ok) setPreview(res.data);
    })();
    return () => {
      alive = false;
    };
  }, [code, stored]);

  const joinFam = async ({ name: n, team, photo: ph }) => {
    setJoining(true);
    setJoinError('');
    const res = await api(`/games/${code}/join`, { method: 'POST', body: { name: n, team } });
    setJoining(false);
    if (!res.ok) {
      setJoinError(res.data.error || 'Nie udało się dołączyć');
      return;
    }
    const player = { playerId: res.data.playerId, token: res.data.token, name: res.data.name, team: res.data.team };
    if (ph) await api(`/games/${code}/player`, { method: 'POST', body: { token: player.token, action: 'photo', photo: ph } });
    setStoredPlayer(code, player);
    setStored(player);
  };

  const join = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError('');
    const res = await api(`/games/${code}/join`, { method: 'POST', body: { name } });
    setJoining(false);
    if (!res.ok) {
      setJoinError(res.data.error || 'Nie udało się dołączyć');
      return;
    }
    const player = { playerId: res.data.playerId, token: res.data.token, name: res.data.name, seat: res.data.seat };
    if (photo) {
      // zdjecie wybrane przed dolaczeniem - wysylamy zaraz po otrzymaniu tokenu
      await api(`/games/${code}/player`, { method: 'POST', body: { token: player.token, action: 'photo', photo } });
    }
    setStoredPlayer(code, player);
    setStored(player);
  };

  if (!stored && preview && preview.format === 'familiada') {
    return (
      <Container maxWidth="xs" sx={{ py: 6, position: 'relative', zIndex: 20 }}>
        <StageBackdrop variant="soft" />
        <FamJoinForm code={code} teams={preview.teams} onSubmit={joinFam} joining={joining} error={joinError} />
      </Container>
    );
  }
  if (!stored && !preview) return <Loading />;
  if (!stored) {
    return (
      <Container maxWidth="xs" sx={{ py: 6, position: 'relative', zIndex: 20 }}>
        <StageBackdrop variant="soft" />
        <Box component="form" onSubmit={join} className="glass pop-in" sx={{ p: 4, display: 'grid', gap: 2.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.6rem' }} aria-hidden="true">🎤</Typography>
          <Typography variant="h4" className="gold-text">1 z 10</Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>Gra <strong style={{ color: 'var(--gold)', letterSpacing: 3 }}>{code}</strong> – wpisz swoje imię, żeby dołączyć.</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar src={photo} size={96} player={photo ? null : { seat: '?', name: name || 'gracz' }} />
          </Box>
          <PhotoPicker hasPhoto={!!photo} onPick={async (d) => setPhoto(d)} onRemove={() => setPhoto(null)} compact />
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: -1 }}>Zdjęcie jest opcjonalne – zobaczą je wszyscy na ekranie TV.</Typography>
          <TextField value={name} onChange={(e) => setName(e.target.value)} label="Twoje imię" autoFocus inputProps={{ maxLength: 24 }} sx={fieldSx} error={!!joinError} helperText={joinError || ' '} />
          <Button type="submit" variant="contained" size="large" disabled={joining || !name.trim()}>{joining ? 'Dołączanie...' : 'Dołączam!'}</Button>
        </Box>
      </Container>
    );
  }
  return <PlayerInner code={code} stored={stored} onLost={() => { clearStoredPlayer(code); setStored(null); }} />;
};

const usePlayerActions = (code, token, as) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const act = async (action, payload) => {
    setBusy(true);
    const res = await api(`/games/${code}/player`, { method: 'POST', admin: !!as, body: { token, as, action, ...(payload || {}) } });
    setBusy(false);
    if (!res.ok) setError(res.data.error || 'Nie udało się wykonać akcji');
    else setError('');
    return res;
  };
  return { act, busy, error, setError };
};

const PlayerInner = ({ code, stored, onLost }) => {
  const { state, error: loadError, offsetRef } = useGameState({ code, role: 'player', token: stored.token, interval: 900 });
  const { act, busy, error, setError } = usePlayerActions(code, stored.token);

  useEffect(() => {
    if (loadError && loadError.status === 401) onLost();
  }, [loadError, onLost]);

  if (loadError && !state && loadError.status !== 401) return <GameError error={loadError} />;
  if (!state || !state.you) return <Loading />;
  const introBox = state.intro && state.intro.presenterId === state.you.id ? (
    <Box sx={{ maxWidth: 520, mx: 'auto', px: 2, pt: 2, position: 'relative', zIndex: 30 }}>
      <IntroPhone code={code} intro={state.intro} token={stored.token} />
    </Box>
  ) : null;
  if (state.format === 'familiada') {
    return (
      <>
        <StageBackdrop variant="soft" />
        {introBox}
        <FamPlayer state={state} offsetRef={offsetRef} act={act} busy={busy} error={error} onResetError={() => setError('')} />
      </>
    );
  }
  return (
    <>
      {introBox}
      <GamePlayer state={state} offsetRef={offsetRef} act={act} busy={busy} error={error} onResetError={() => setError('')} />
    </>
  );
};

// ---------------- Wpisanie kodu ----------------
export const JoinCodePage = () => {
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get('kod') || '').toUpperCase());
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const go = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const res = await api(`/games/${c}/state?role=tv`);
    if (!res.ok) {
      setError(res.status === 404 ? 'Nie ma gry o takim kodzie.' : res.data.error);
      return;
    }
    navigate(`/teleturniej/gra/${c}`);
  };

  return (
    <Container maxWidth="xs" sx={{ py: 6, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <QuizNav current="dolacz" />
      <Box component="form" onSubmit={go} className="glass pop-in" sx={{ p: 4, display: 'grid', gap: 2.5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2.6rem' }} aria-hidden="true">📱</Typography>
        <Typography variant="h5" sx={{ color: 'var(--gold)' }}>Dołącz do gry</Typography>
        <Typography sx={{ color: 'var(--ink-dim)' }}>Wpisz 4-literowy kod widoczny na ekranie telewizora.</Typography>
        <TextField
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          label="Kod gry"
          autoFocus
          inputProps={{ maxLength: 4, style: { textAlign: 'center', fontSize: '2rem', letterSpacing: '0.4em', fontWeight: 800 } }}
          sx={fieldSx}
          error={!!error}
          helperText={error || ' '}
        />
        <Button type="submit" variant="contained" size="large" disabled={code.trim().length < 4}>Dalej</Button>
      </Box>
    </Container>
  );
};

// ---------------- Konsola trybu testowego ----------------
export const TestConsolePage = () => {
  const { code } = useParams();
  return (
    <AdminGate>
      <TestInner code={code.toUpperCase()} />
    </AdminGate>
  );
};

const TestInner = ({ code }) => {
  const [format, setFormat] = useState(null);
  useEffect(() => {
    (async () => {
      const res = await api(`/games/${code}/state?role=tv`);
      setFormat(res.ok ? res.data.format : 'jeden-z-dziesieciu');
    })();
  }, [code]);
  if (!format) return <Loading />;
  return format === 'familiada' ? <FamTestInner code={code} /> : <TestInnerOne code={code} />;
};

const TestInnerOne = ({ code }) => {
  const host = useGameState({ code, role: 'host', interval: 700 });
  const hostActions = useHostActions(code);

  const tester = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`quizTester:${code}`) || 'null');
    } catch (e) {
      return null;
    }
  }, [code]);
  const [asId, setAsId] = useState(tester ? tester.playerId : '');

  const players = host.state ? host.state.players : [];
  const effectiveAs = asId && players.some((p) => p.id === asId) ? asId : players[0] ? players[0].id : '';
  const phone = useGameState({ code, role: 'player', as: effectiveAs || undefined, interval: 700 });
  const phoneActions = usePlayerActions(code, undefined, effectiveAs);

  if (host.error && !host.state) return <GameError error={host.error} />;
  if (!host.state) return <Loading />;

  const tvUrl = `/teleturniej/gra/${code}/tv`;

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 1.5, md: 3 }, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <Box className="glass" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 800, color: 'var(--gold)', fontSize: '1.1rem' }}>🧪 Konsola trybu testowego · kod {code}</Typography>
        <Typography sx={{ color: 'var(--ink-dim)', flex: 1, minWidth: 260, fontSize: '0.9rem' }}>
          Panel prowadzącego, widok TV i telefon wybranego gracza – wszystko na jednym ekranie. Boty odpowiadają same; w oknie telefonu możesz sterować dowolnym graczem.
          Żeby dołączyć z prawdziwego telefonu, w poczekalni usuń bota (zwolni stanowisko) i wejdź na <strong>/teleturniej/gra/{code}</strong>.
        </Typography>
        <Button component="a" href={tvUrl} target="_blank" rel="noopener noreferrer" variant="outlined" sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>📺 TV w nowej karcie</Button>
        <Button component={Link} to="/teleturniej/gry" variant="outlined" sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>← Gry</Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.5fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <GameHost
          state={host.state}
          offsetRef={host.offsetRef}
          act={hostActions.act}
          busy={hostActions.busy}
          error={hostActions.error}
          onResetError={() => hostActions.setError('')}
        />

        <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
          {/* Telefon */}
          <Box>
            <FormControl size="small" fullWidth sx={{ ...fieldSx, mb: 1.5 }}>
              <InputLabel id="as-label">Telefon gracza</InputLabel>
              <Select labelId="as-label" label="Telefon gracza" value={effectiveAs} onChange={(e) => setAsId(e.target.value)} sx={{ color: 'var(--ink)', '& .MuiSvgIcon-root': { color: 'var(--ink)' } }}>
                {players.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.seat}. {p.name}{p.isBot ? ' (bot)' : ''}{p.eliminated ? ' – odpadł' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ maxWidth: 420, mx: 'auto', borderRadius: '36px', border: '8px solid #0b0f1f', background: 'rgba(7,10,31,0.8)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', maxHeight: 760, overflowY: 'auto' }}>
              {phone.state && phone.state.you ? (
                <Box sx={{ ml: { xs: 0 } }}>
                  {phone.state.intro && phone.state.intro.presenterId === phone.state.you.id && <IntroPhone code={code} intro={phone.state.intro} as={effectiveAs} />}
                  <GamePlayer state={phone.state} offsetRef={phone.offsetRef} act={phoneActions.act} busy={phoneActions.busy} error={phoneActions.error} onResetError={() => phoneActions.setError('')} />
                </Box>
              ) : (
                <Loading text="Ładowanie telefonu..." />
              )}
            </Box>
          </Box>

          {/* TV */}
          <Box>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', mb: 1 }}>Widok TV (podgląd)</Typography>
            <Box sx={{ position: 'relative', paddingTop: '56.25%', borderRadius: '14px', overflow: 'hidden', border: '2px solid rgba(var(--accent-rgb),0.5)', background: '#050826' }}>
              <iframe title="Podgląd widoku TV" src={tvUrl} style={{ position: 'absolute', top: 0, left: 0, width: '250%', height: '250%', border: 0, transform: 'scale(0.4)', transformOrigin: '0 0' }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export { HexBar };

// ---------------- Konsola testowa Familiady ----------------
const FamTestInner = ({ code }) => {
  const host = useGameState({ code, role: 'host', interval: 700 });
  const hostActions = useHostActions(code);
  const tester = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem(`quizTester:${code}`) || 'null');
    } catch (e) {
      return null;
    }
  }, [code]);
  const [asId, setAsId] = useState(tester ? tester.playerId : '');
  const members = host.state ? [...host.state.teams.flatMap((t) => t.members), ...host.state.unassigned] : [];
  const effectiveAs = asId && members.some((p) => p.id === asId) ? asId : members[0] ? members[0].id : '';
  const phone = useGameState({ code, role: 'player', as: effectiveAs || undefined, interval: 700 });
  const phoneActions = usePlayerActions(code, undefined, effectiveAs);

  if (host.error && !host.state) return <GameError error={host.error} />;
  if (!host.state) return <Loading />;
  const tvUrl = `/teleturniej/gra/${code}/tv`;

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 1.5, md: 3 }, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <Box className="glass" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 800, color: '#39ff6a', fontSize: '1.1rem' }}>🧪 Familiada – tryb testowy · kod {code}</Typography>
        <Typography sx={{ color: 'var(--ink-dim)', flex: 1, minWidth: 260, fontSize: '0.9rem' }}>
          Panel prowadzącego, widok TV i telefon wybranej osoby na jednym ekranie. Boty podpowiadają odpowiedzi na telefonach; w oknie telefonu możesz sterować dowolną osobą (np. wcisnąć przycisk w pojedynku).
        </Typography>
        <Button component="a" href={tvUrl} target="_blank" rel="noopener noreferrer" variant="outlined" sx={{ color: '#39ff6a', borderColor: 'rgba(57,255,106,0.6)' }}>📺 TV w nowej karcie</Button>
        <Button component={Link} to="/teleturniej/gry" variant="outlined" sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>← Gry</Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.5fr) minmax(0, 1fr)' }, gap: 3, alignItems: 'start' }}>
        <FamHost state={host.state} offsetRef={host.offsetRef} act={hostActions.act} busy={hostActions.busy} error={hostActions.error} onResetError={() => hostActions.setError('')} />
        <Box sx={{ display: 'grid', gap: 3, minWidth: 0 }}>
          <Box>
            <FormControl size="small" fullWidth sx={{ ...fieldSx, mb: 1.5 }}>
              <InputLabel id="fam-as-label">Telefon osoby</InputLabel>
              <Select labelId="fam-as-label" label="Telefon osoby" value={effectiveAs} onChange={(e) => setAsId(e.target.value)} sx={{ color: 'var(--ink)', '& .MuiSvgIcon-root': { color: 'var(--ink)' } }}>
                {members.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}{p.isBot ? ' (bot)' : ''}{p.team !== null ? ` – ${host.state.teams[p.team].name}` : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ maxWidth: 420, mx: 'auto', borderRadius: '36px', border: '8px solid #0b0f1f', background: 'rgba(7,10,31,0.8)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', maxHeight: 760, overflowY: 'auto' }}>
              {phone.state && phone.state.you ? (
                <>
                {phone.state.intro && phone.state.intro.presenterId === phone.state.you.id && <IntroPhone code={code} intro={phone.state.intro} as={effectiveAs} />}
                <FamPlayer state={phone.state} offsetRef={phone.offsetRef} act={phoneActions.act} busy={phoneActions.busy} error={phoneActions.error} onResetError={() => phoneActions.setError('')} />
                </>
              ) : (
                <Loading text="Ładowanie telefonu..." />
              )}
            </Box>
          </Box>
          <Box>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase', mb: 1 }}>Widok TV (podgląd)</Typography>
            <Box sx={{ position: 'relative', paddingTop: '56.25%', borderRadius: '14px', overflow: 'hidden', border: '2px solid rgba(57,255,106,0.5)', background: '#050826' }}>
              <iframe title="Podgląd widoku TV" src={tvUrl} style={{ position: 'absolute', top: 0, left: 0, width: '250%', height: '250%', border: 0, transform: 'scale(0.4)', transformOrigin: '0 0' }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};
