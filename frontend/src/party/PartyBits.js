import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { LogoMark } from '../components/Logo';
import { useSiteTheme } from '../ThemeContext';
import StageBackdrop from '../quiz/StageBackdrop';
import { Avatar } from '../quiz/Avatar';
import { HexBar } from '../quiz/QuizBits';
import { IntroHost, IntroTv } from '../quiz/IntroCam';

// Wspolne elementy trybow "Najslabsze ogniwo" i "Klamczuch"

export const field = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.35)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

export const goldBtn = { background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))', color: '#1a1205', fontWeight: 800 };
export const greenBtn = { fontWeight: 800, color: '#1a1205', background: 'linear-gradient(120deg, #b6ffc9, #19b857)' };
export const redBtn = { fontWeight: 800, color: '#fff', background: 'linear-gradient(120deg, #ff8d8d, #c42b2b)' };

export const Panel = ({ title, children, sx }) => (
  <Box className="glass" sx={{ p: { xs: 2, md: 3 }, ...sx }}>
    {title && <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1.5 }}>{title}</Typography>}
    {children}
  </Box>
);

export const nameOf = (state, id) => {
  const p = state.players.find((x) => x.id === id);
  return p ? p.name : '?';
};
export const playerOf = (state, id) => state.players.find((x) => x.id === id) || {};

export const joinUrl = (code) => `${window.location.origin}/teleturniej/gra/${code}`;

// ---------- Panel prowadzacego: gorna belka ----------
export const HostTop = ({ state, title, subtitle, act, busy, error, onResetError, pauseNote }) => {
  const paused = !!state.paused;
  const [copied, setCopied] = useState(false);
  const url = joinUrl(state.code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      window.prompt('Skopiuj link dla uczestników:', url);
    }
  };
  return (
    <Panel>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase' }}>Panel prowadzącego {state.test && '· tryb testowy'}</Typography>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--gold)', lineHeight: 1.1 }}>{title} · kod {state.code}</Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>{subtitle}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" component="a" href={`${url}/tv`} target="_blank" rel="noopener noreferrer" sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>📺 Otwórz widok TV</Button>
          <Button variant="outlined" onClick={copy} sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>{copied ? '✔ Skopiowano' : '🔗 Link dla uczestników'}</Button>
          {state.status === 'running' && (
            <Button variant="contained" onClick={() => act(paused ? 'resume' : 'pause')} disabled={busy} sx={paused ? greenBtn : goldBtn}>
              {paused ? '▶ Wznów grę' : '⏸ Pauza'}
            </Button>
          )}
          {state.status === 'running' && (
            <Button variant="outlined" color="error" onClick={() => window.confirm('Zakończyć grę teraz?') && act('end')} disabled={busy}>Zakończ grę</Button>
          )}
        </Box>
      </Box>
      {paused && state.status === 'running' && <Alert severity="warning" icon={false} sx={{ mt: 2, fontWeight: 700 }}>⏸ {pauseNote || 'Gra jest wstrzymana – czas stoi.'}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }} onClose={onResetError}>{error}</Alert>}
    </Panel>
  );
};

// Lista graczy w panelu prowadzacego. `extra(p)` zwraca dodatkowy element po prawej.
export const HostPlayers = ({ state, act, busy, extra }) => (
  <Panel title={`Gracze (${state.players.length})`}>
    <Box sx={{ display: 'grid', gap: 1 }}>
      {state.players.map((p) => (
        <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: '12px', background: 'rgba(255,255,255,0.06)', opacity: p.active === false ? 0.5 : 1 }}>
          <Avatar code={state.code} player={p} size={34} badge={false} />
          <Typography noWrap sx={{ flex: 1, fontWeight: 700, textDecoration: p.active === false ? 'line-through' : 'none' }}>
            {p.name}{p.isBot ? ' 🤖' : ''}
          </Typography>
          {extra && extra(p)}
          {state.status === 'lobby' && <Button size="small" color="error" onClick={() => act('kick', { playerId: p.id })} disabled={busy}>Usuń</Button>}
        </Box>
      ))}
      {state.players.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Jeszcze nikt nie dołączył.</Typography>}
    </Box>
  </Panel>
);

export const HostIntro = ({ state }) => (state.status === 'lobby' ? <IntroHost code={state.code} intro={state.intro} people={state.players} /> : null);

// ---------- TV ----------
export const TvLobby = ({ state, hint }) => (
  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 'clamp(16px, 3vw, 60px)', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <Box className="pop-in">
      <Typography sx={{ color: 'var(--gold)', letterSpacing: 6, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)' }}>Dołącz z telefonu</Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, min(10vw, 18vh), 12rem)', letterSpacing: 'clamp(6px, 1.4vw, 24px)', lineHeight: 1 }}>
        {state.code}
      </Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)', mt: 1 }}>Zeskanuj kod QR lub wejdź na stronę i wpisz kod</Typography>
      <Typography sx={{ color: 'var(--ink)', fontWeight: 700, fontSize: 'clamp(0.9rem, 1.5vw, 1.8rem)', wordBreak: 'break-all' }}>{joinUrl(state.code)}</Typography>
      {hint && <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.9rem, 1.3vw, 1.6rem)', mt: 2, maxWidth: 760 }}>{hint}</Typography>}
    </Box>
    <Box className="pop-in glow-pulse" sx={{ p: 2, borderRadius: '20px', background: '#fff', animationDelay: '0.15s' }}>
      <QRCodeSVG value={joinUrl(state.code)} size={Math.min(320, Math.round(window.innerWidth * 0.25) || 240)} level="M" />
    </Box>
    <Box sx={{ width: { xs: '100%', lg: 'clamp(300px, 36vw, 760px)' } }}>
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, mb: 1, fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>Gracze ({state.players.length})</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: state.players.length > 6 ? '1fr 1fr' : '1fr', gap: 'clamp(4px, 0.8vh, 10px) clamp(6px, 0.8vw, 14px)' }}>
        {state.players.map((p, i) => (
          <Box key={p.id} className="pop-in float-name" sx={{ animationDelay: `${(i % 5) * 0.4}s` }}>
            <HexBar minHeight="clamp(30px, 5vh, 52px)">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <Avatar code={state.code} player={p} size="clamp(22px, 3.4vh, 44px)" badge={false} />
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 'clamp(0.8rem, min(1.3vw, 2.4vh), 1.6rem)' }}>{p.name}</Typography>
              </Box>
            </HexBar>
          </Box>
        ))}
        {state.players.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Jeszcze nikogo nie ma...</Typography>}
      </Box>
    </Box>
  </Box>
);

// Rama ekranu TV: tlo, swiatelka, naglowek z kodem gry, nakladka pauzy
export const TvFrame = ({ state, title, subtitle, children, lobbyHint }) => {
  const running = state.status === 'running';
  return (
    <Box
      sx={{
        minHeight: '100vh',
        ...(running ? { height: '100vh', overflow: 'hidden' } : {}),
        display: 'flex',
        flexDirection: 'column',
        p: 'clamp(12px, 2vh, 32px) clamp(16px, 2.4vw, 56px)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 20,
        gap: 'clamp(6px, 1.2vh, 20px)',
      }}
    >
      <StageBackdrop variant="full" />
      <Box aria-hidden="true" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
        <div className="marquee-lights" />
      </Box>
      <Box aria-hidden="true" sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
        <div className="marquee-lights alt" />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 1.5, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LogoMark size={44} glyph="quiz" />
          <Box>
            <Typography className="gold-text" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.4rem, 2.6vw, 3rem)', lineHeight: 1 }}>
              {title} {state.test && <small style={{ fontSize: '0.4em', color: 'var(--primary-light)', WebkitTextFillColor: 'var(--primary-light)' }}>TRYB TESTOWY</small>}
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.8rem, 1.2vw, 1.4rem)' }}>{subtitle}</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.7rem, 1vw, 1.1rem)', letterSpacing: 3, textTransform: 'uppercase' }}>Kod gry</Typography>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--gold)', fontSize: 'clamp(1.2rem, 2.2vw, 2.6rem)', letterSpacing: 4 }}>{state.code}</Typography>
        </Box>
      </Box>

      {state.status === 'lobby' && <TvLobby state={state} hint={lobbyHint} />}
      {state.status === 'lobby' && state.intro && <IntroTv code={state.code} intro={state.intro} />}
      {children}

      {state.paused && running && (
        <Box role="status" sx={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,38,0.78)', backdropFilter: 'blur(6px)' }}>
          <Typography className="gold-text neon-title turn-pulse" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 14vw, 16rem)', lineHeight: 1 }}>⏸ PAUZA</Typography>
          <Typography sx={{ color: 'var(--ink)', fontSize: 'clamp(1.2rem, 2.4vw, 3rem)', mt: 2 }}>Gra wstrzymana przez prowadzącego</Typography>
        </Box>
      )}
    </Box>
  );
};

// Wiersz gracza na TV (avatar + imie + dodatki z prawej)
export const TvPlayerRow = ({ state, p, highlight, dim, children, size = 'clamp(22px, 4vh, 48px)' }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(6px, 0.8vw, 14px)',
      minHeight: 'clamp(30px, 6vh, 64px)',
      px: 'clamp(6px, 0.9vw, 16px)',
      borderRadius: '12px',
      minWidth: 0,
      fontSize: 'clamp(0.85rem, min(1.4vw, 2.6vh), 1.8rem)',
      background: highlight ? 'linear-gradient(90deg, rgba(var(--accent-rgb),0.4), rgba(255,255,255,0.1))' : 'rgba(255,255,255,0.07)',
      border: highlight ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)',
      boxShadow: highlight ? '0 0 22px rgba(var(--accent-rgb),0.55)' : 'none',
      opacity: dim ? 0.45 : 1,
      transition: 'opacity .3s, box-shadow .3s',
    }}
  >
    <Avatar code={state.code} player={p} size={size} badge={false} />
    <Typography noWrap component="span" sx={{ flex: 1, minWidth: 0, textAlign: 'left', fontWeight: 700, fontSize: 'inherit', textDecoration: dim ? 'line-through' : 'none' }}>{p.name}</Typography>
    {children}
  </Box>
);

// Odliczanie (duze liczby + pasek)
export const BigTimer = ({ left, total, label }) => {
  const pct = left === null || left === undefined ? 100 : Math.max(0, Math.min(100, (left / total) * 100));
  const urgent = left !== null && left !== undefined && left <= 10;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography
        className={urgent ? 'timer-urgent' : undefined}
        sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.8rem, 4.4vw, 5rem)', lineHeight: 1, minWidth: '2.2em', textAlign: 'center', color: urgent ? '#ff6b6b' : 'var(--gold)' }}
      >
        {left === null || left === undefined ? total : Math.ceil(left)}
      </Typography>
      <Box sx={{ flex: 1, height: 'clamp(10px, 1.6vh, 18px)', borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', background: urgent ? 'linear-gradient(90deg, #ff6b6b, #d63a3a)' : 'linear-gradient(90deg, var(--gold-light), var(--gold))', transition: 'width .2s linear' }} />
      </Box>
      {label && <Typography sx={{ fontWeight: 800, fontSize: 'clamp(1rem, 2vw, 2.4rem)', whiteSpace: 'nowrap' }}>{label}</Typography>}
    </Box>
  );
};

// Wyniki glosowania na TV: kto na kogo glosowal + wynik
export const VoteReveal = ({ state, ve, title, resultLine }) => {
  const rows = state.players.filter((p) => ve.tally[p.id] !== undefined);
  const out = playerOf(state, ve.eliminatedId);
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(8px, 1.6vh, 24px)', width: '100%', maxWidth: 1500, mx: 'auto', position: 'relative' }}>
      <Typography className="pop-in" sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.6vw, 2rem)' }}>{title}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }} className="pop-in">
        <Avatar code={state.code} player={out} size="clamp(60px, 11vh, 160px)" badge={false} />
        <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, min(6.5vw, 10vh), 7rem)', lineHeight: 1.05 }}>{out.name}</Typography>
      </Box>
      {resultLine && <Typography sx={{ fontSize: 'clamp(1.1rem, 2.4vw, 3rem)', fontWeight: 800, textAlign: 'center' }}>{resultLine}</Typography>}
      <Box sx={{ display: 'grid', gridTemplateColumns: rows.length > 6 ? '1fr 1fr' : '1fr', gap: 'clamp(4px, 0.8vh, 10px) clamp(10px, 1.4vw, 24px)', width: 'min(1200px, 96%)' }}>
        {[...rows].sort((a, b) => ve.tally[b.id] - ve.tally[a.id]).map((p) => {
          const voters = ve.votes.filter((v) => v.targetId === p.id).map((v) => nameOf(state, v.voterId));
          return (
            <TvPlayerRow key={p.id} state={state} p={p} highlight={p.id === ve.eliminatedId}>
              <Typography component="span" sx={{ color: 'var(--ink-dim)', fontSize: '0.8em', maxWidth: '45%' }} noWrap>{voters.join(', ')}</Typography>
              <Typography component="span" sx={{ fontWeight: 800, color: 'var(--gold)', minWidth: '2em', textAlign: 'right', fontSize: '1.2em' }}>{ve.tally[p.id]}</Typography>
            </TvPlayerRow>
          );
        })}
      </Box>
    </Box>
  );
};

// Ekran glosowania na TV: kto juz zaglosowal
export const VoteWait = ({ state, left, total, title, hint }) => {
  const act = state.players.filter((p) => p.active !== false);
  const voted = new Set(state.v ? state.v.voted : []);
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.6vh, 24px)', width: '100%', maxWidth: 1400, mx: 'auto', justifyContent: 'center', position: 'relative' }}>
      <BigTimer left={left} total={total} label={`🗳 ${voted.size}/${act.length}`} />
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, textAlign: 'center', fontSize: 'clamp(1.6rem, min(4.6vw, 8vh), 5rem)', lineHeight: 1.1 }}>{title}</Typography>
      {hint && <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.8vw, 2.2rem)' }}>{hint}</Typography>}
      <Box sx={{ display: 'grid', gridTemplateColumns: act.length > 5 ? '1fr 1fr' : '1fr', gap: 'clamp(4px, 1vh, 12px) clamp(10px, 1.4vw, 24px)' }}>
        {act.map((p) => (
          <TvPlayerRow key={p.id} state={state} p={p}>
            <span>{voted.has(p.id) ? '✅' : '⏳'}</span>
          </TvPlayerRow>
        ))}
      </Box>
    </Box>
  );
};

// Konfetti na koniec gry
export const useFinaleConfetti = () => {
  const { preset } = useSiteTheme();
  const colors = preset.colors.confetti;
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return undefined;
    fired.current = true;
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 }, colors }), 700);
    const t2 = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 }, colors }), 1200);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [colors]);
};

// ---------- Telefon ----------
export const PhoneHeader = ({ state, you, label, right }) => (
  <Box className="glass" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <Avatar code={state.code} player={you} size={52} badge={false} />
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 800, fontSize: '1.15rem' }}>{you.name}</Typography>
        <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>{label} · kod {state.code}{state.test && ' · test'}</Typography>
      </Box>
    </Box>
    {right && <Box sx={{ textAlign: 'right' }}>{right}</Box>}
  </Box>
);

// Lista kandydatow do glosowania na telefonie
export const VoteList = ({ state, you, onVote, busy, title }) => {
  const candidates = state.players.filter((p) => p.active !== false && p.id !== you.id);
  return (
    <Box className="glass pop-in" sx={{ p: 2.5, display: 'grid', gap: 1.25 }}>
      <Typography variant="h6" sx={{ color: 'var(--gold)', textAlign: 'center' }}>{title}</Typography>
      {candidates.map((p) => {
        const mine = you.vote === p.id;
        return (
          <Button
            key={p.id}
            onClick={() => onVote(p.id)}
            disabled={busy || state.paused}
            sx={{
              justifyContent: 'flex-start',
              gap: 1.5,
              minHeight: 64,
              px: 2,
              borderRadius: '14px',
              color: 'var(--ink)',
              fontWeight: 800,
              fontSize: '1.1rem',
              textTransform: 'none',
              background: mine ? 'linear-gradient(120deg, rgba(var(--accent-rgb),0.55), rgba(255,255,255,0.12))' : 'rgba(255,255,255,0.08)',
              border: mine ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.15)',
            }}
          >
            <Avatar code={state.code} player={p} size={40} badge={false} />
            <span style={{ flex: 1, textAlign: 'left' }}>{p.name}</span>
            {mine && <span>🗳 Twój głos</span>}
          </Button>
        );
      })}
      {you.vote && <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: '0.9rem' }}>Możesz zmienić głos, dopóki wszyscy nie zagłosują.</Typography>}
    </Box>
  );
};
