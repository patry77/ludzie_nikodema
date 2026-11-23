import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { LogoMark } from '../components/Logo';
import { HexBar, PodiumCard, QuestionPanel, TimerBar, describeNow, playerName, stageHint } from './QuizBits';
import { useSecondsLeft } from './quizApi';
import { SoundControl, useQuizSounds, useSoundSettings } from './useQuizSounds';

const joinUrl = (code) => `${window.location.origin}/teleturniej/gra/${code}`;

const timerTotal = (state) => {
  const c = state.current;
  if (!c) return 0;
  if (c.kind === 'single' || c.status === 'answering') return state.config.answerSeconds;
  return state.config.buzzSeconds;
};

const Lobby = ({ state }) => (
  <Box sx={{ flex: 1, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 'clamp(16px, 3vw, 60px)', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <Box>
      <Typography sx={{ color: 'var(--gold)', letterSpacing: 6, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)' }}>Dołącz z telefonu</Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 12vw, 12rem)', letterSpacing: 'clamp(6px, 1.4vw, 24px)', lineHeight: 1 }}>
        {state.code}
      </Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)', mt: 1 }}>
        Zeskanuj kod QR lub wejdź na stronę i wpisz kod
      </Typography>
      <Typography sx={{ color: 'var(--ink)', fontWeight: 700, fontSize: 'clamp(0.9rem, 1.5vw, 1.8rem)', wordBreak: 'break-all' }}>{joinUrl(state.code)}</Typography>
    </Box>
    <Box sx={{ p: 2, borderRadius: '20px', background: '#fff', boxShadow: '0 0 40px rgba(var(--accent-rgb), 0.5)' }}>
      <QRCodeSVG value={joinUrl(state.code)} size={Math.min(320, Math.round(window.innerWidth * 0.25) || 240)} level="M" />
    </Box>
    <Box sx={{ width: { xs: '100%', lg: 'clamp(260px, 26vw, 520px)' } }}>
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, mb: 1, fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>
        Gracze ({state.players.length}/10)
      </Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {state.players.map((p) => (
          <HexBar key={p.id} minHeight={46}>
            <Typography sx={{ fontWeight: 700, fontSize: 'clamp(0.95rem, 1.5vw, 1.8rem)' }}>
              <Box component="span" sx={{ color: 'var(--primary-light)', mr: 1 }}>{p.seat}.</Box>
              {p.name}
            </Typography>
          </HexBar>
        ))}
        {state.players.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Jeszcze nikogo nie ma...</Typography>}
      </Box>
    </Box>
  </Box>
);

const Winner = ({ state }) => {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
    const t = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 } }), 700);
    const t2 = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 } }), 1200);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);
  const r = state.result;
  const names = r.winnerIds.map((id) => playerName(state, id)).join(' i ');
  return (
    <Box sx={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Typography sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>
        {r.winnerIds.length > 1 ? 'Remis! Zwycięzcy' : 'Zwycięzca'}
      </Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, 9vw, 10rem)', lineHeight: 1.05 }}>
        🏆 {names}
      </Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>{r.reason}</Typography>
      <Box sx={{ mt: 2, width: 'min(900px, 95%)', display: 'grid', gap: 1 }}>
        {r.ranking.slice(0, 5).map((row, i) => (
          <HexBar key={row.id} minHeight={52} state={r.winnerIds.includes(row.id) ? 'good' : 'default'}>
            <Typography sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'clamp(1rem, 1.7vw, 2rem)' }}>
              <span>{i + 1}. {row.name} <small style={{ opacity: 0.7 }}>(stanowisko {row.seat})</small></span>
              <span>{row.total} pkt</span>
            </Typography>
          </HexBar>
        ))}
      </Box>
    </Box>
  );
};

// Widok na telewizor: pytanie, stan graczy, odliczanie. Nie zawiera zadnych sekretow (poprawna odpowiedz tylko po ujawnieniu).
const GameTv = ({ state, offsetRef }) => {
  const c = state.current;
  const showTimer = c && (c.status === 'asking' || c.status === 'answering');
  const left = useSecondsLeft(showTimer ? c.deadline : null, offsetRef);
  const designLeft = useSecondsLeft(state.awaiting ? state.awaiting.deadline : null, offsetRef);
  const sound = useSoundSettings('tv', true);
  useQuizSounds(state, { role: 'tv', enabled: sound.active, secondsLeft: left !== null ? left : designLeft });

  const answerer = c && c.result && c.result.playerId ? playerName(state, c.result.playerId) : null;
  const resultColor = c && c.result ? (c.result.correct === true ? '#19b857' : c.result.correct === false ? '#d63a3a' : 'var(--ink-dim)') : 'inherit';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        p: 'clamp(12px, 2vh, 32px) clamp(16px, 2.4vw, 56px)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 20,
        gap: 'clamp(10px, 1.6vh, 24px)',
      }}
    >
      {/* Pasek gorny */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LogoMark size={52} glyph="quiz" />
          <Box>
            <Typography className="gold-text" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem, 3vw, 3.4rem)', lineHeight: 1 }}>
              1 z 10 {state.test && <small style={{ fontSize: '0.4em', color: 'var(--primary-light)', WebkitTextFillColor: 'var(--primary-light)' }}>TRYB TESTOWY</small>}
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.85rem, 1.3vw, 1.5rem)' }}>{state.status === 'lobby' ? 'Poczekalnia' : stageHint(state)}</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.7rem, 1vw, 1.1rem)', letterSpacing: 3, textTransform: 'uppercase' }}>Kod gry</Typography>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--gold)', fontSize: 'clamp(1.4rem, 2.4vw, 2.8rem)', letterSpacing: 4 }}>{state.code}</Typography>
        </Box>
      </Box>

      {/* Srodek */}
      {state.status === 'lobby' && <Lobby state={state} />}
      {state.status === 'finished' && state.result && <Winner state={state} />}
      {state.status === 'running' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(10px, 1.6vh, 22px)', maxWidth: 1500, width: '100%', mx: 'auto' }}>
          <Typography sx={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.2rem, 2.2vw, 2.6rem)', color: c && c.status === 'revealed' ? resultColor : 'var(--gold)' }}>
            {describeNow(state)}
            {c && c.status === 'revealed' && answerer ? ` – ${answerer}` : ''}
          </Typography>

          {showTimer && <TimerBar left={left} total={timerTotal(state)} />}

          {c && <QuestionPanel current={c} size="tv" />}

          {state.awaiting && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ fontSize: 'clamp(1.6rem, 3.4vw, 4rem)', fontWeight: 800 }}>
                ☝ {playerName(state, state.awaiting.byId)} wskazuje przeciwnika...
              </Typography>
              {state.awaiting.first && state.stage === 2 && (
                <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>Pierwsze wyznaczenie – na przeciwną stronę studia (1–5 ↔ 6–10)</Typography>
              )}
              <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
                <TimerBar left={designLeft} total={state.config.designateSeconds} />
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Stanowiska */}
      {state.status !== 'lobby' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' }, gap: 'clamp(8px, 1vw, 18px)' }}>
          {state.players.map((p) => (
            <PodiumCard key={p.id} player={p} stage={state.stage} tv />
          ))}
        </Box>
      )}

      {/* Przebieg gry */}
      {state.status === 'running' && state.log.length > 0 && (
        <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 'clamp(0.8rem, 1.2vw, 1.4rem)' }}>
          {state.log[state.log.length - 1].text}
        </Typography>
      )}

      <SoundControl sound={sound} />
    </Box>
  );
};

export default GameTv;
