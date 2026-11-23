import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { LogoMark } from '../components/Logo';
import FireworksCanvas from '../components/FireworksCanvas';
import { useSiteTheme } from '../ThemeContext';
import StageBackdrop from './StageBackdrop';
import { Avatar } from './Avatar';
import { HexBar, QuestionPanel, TimerBar, describeNow, playerName, stageHint } from './QuizBits';
import TvPodiums from './TvPodiums';
import { useSecondsLeft } from './quizApi';
import { IntroTv } from './IntroCam';
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
    <Box className="pop-in">
      <Typography sx={{ color: 'var(--gold)', letterSpacing: 6, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)' }}>Dołącz z telefonu</Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 12vw, 12rem)', letterSpacing: 'clamp(6px, 1.4vw, 24px)', lineHeight: 1 }}>
        {state.code}
      </Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)', mt: 1 }}>
        Zeskanuj kod QR lub wejdź na stronę i wpisz kod
      </Typography>
      <Typography sx={{ color: 'var(--ink)', fontWeight: 700, fontSize: 'clamp(0.9rem, 1.5vw, 1.8rem)', wordBreak: 'break-all' }}>{joinUrl(state.code)}</Typography>
    </Box>
    <Box className="pop-in glow-pulse" sx={{ p: 2, borderRadius: '20px', background: '#fff', animationDelay: '0.15s' }}>
      <QRCodeSVG value={joinUrl(state.code)} size={Math.min(320, Math.round(window.innerWidth * 0.25) || 240)} level="M" />
    </Box>
    <Box sx={{ width: { xs: '100%', lg: 'clamp(260px, 26vw, 520px)' } }}>
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, mb: 1, fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>
        Gracze ({state.players.length}/10)
      </Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {state.players.map((p, i) => (
          <Box key={p.id} className="pop-in" sx={{ animationDelay: '0.05s' }}>
            <Box className="float-name" sx={{ animationDelay: `${(i % 5) * 0.4}s` }}>
              <HexBar minHeight={46}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar code={state.code} player={p} size="clamp(34px, 3vw, 56px)" />
                  <Typography sx={{ fontWeight: 700, fontSize: 'clamp(0.95rem, 1.5vw, 1.8rem)' }}>
                    {p.hasPhoto ? '' : <Box component="span" sx={{ color: 'var(--primary-light)', mr: 1 }}>{p.seat}.</Box>}
                    {p.name}
                  </Typography>
                </Box>
              </HexBar>
            </Box>
          </Box>
        ))}
        {state.players.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Jeszcze nikogo nie ma...</Typography>}
      </Box>
    </Box>
  </Box>
);

const Winner = ({ state, colors }) => {
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
  const r = state.result;
  const names = r.winnerIds.map((id) => playerName(state, id)).join(' i ');
  return (
    <Box sx={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' }}>
      <FireworksCanvas colors={colors} />
      <Typography className="pop-in" sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>
        {r.winnerIds.length > 1 ? 'Remis! Zwycięzcy' : 'Zwycięzca'}
      </Typography>
      {r.winnerIds.length === 1 && (() => {
        const w = state.players.find((p) => p.id === r.winnerIds[0]);
        return w && w.hasPhoto ? (
          <Box className="pop-in bounce" sx={{ position: 'relative' }}>
            <Avatar code={state.code} player={w} size="clamp(120px, 14vw, 260px)" />
          </Box>
        ) : null;
      })()}
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Box
          aria-hidden="true"
          className="halo-spin"
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 'clamp(300px, 52vw, 900px)',
            height: 'clamp(300px, 52vw, 900px)',
            marginLeft: 'calc(clamp(300px, 52vw, 900px) / -2)',
            marginTop: 'calc(clamp(300px, 52vw, 900px) / -2)',
            background: 'repeating-conic-gradient(from 0deg, rgba(var(--accent-rgb), 0.18) 0deg 8deg, transparent 8deg 24deg)',
            WebkitMaskImage: 'radial-gradient(circle, #000 0, transparent 65%)',
            maskImage: 'radial-gradient(circle, #000 0, transparent 65%)',
          }}
        />
        <Typography className="gold-text neon-title pop-in" sx={{ position: 'relative', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, 9vw, 10rem)', lineHeight: 1.05 }}>
          <span className="bounce" style={{ WebkitTextFillColor: 'initial' }}>🏆</span> {names}
        </Typography>
      </Box>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>{r.reason}</Typography>
      <Box sx={{ mt: 2, width: 'min(900px, 95%)', display: 'grid', gap: 1, position: 'relative' }}>
        {r.ranking.slice(0, 5).map((row, i) => (
          <Box key={row.id} className="pop-in" sx={{ animationDelay: `${0.4 + i * 0.12}s` }}>
            <HexBar minHeight={52} state={r.winnerIds.includes(row.id) ? 'good' : 'default'}>
              <Typography sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'clamp(1rem, 1.7vw, 2rem)' }}>
                <span>{i + 1}. {row.name} <small style={{ opacity: 0.7 }}>(stanowisko {row.seat})</small></span>
                <span>{row.total} pkt</span>
              </Typography>
            </HexBar>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// Pelnoekranowa plansza przy starcie i zmianie etapu
const StageBanner = ({ banner }) => {
  if (!banner) return null;
  return (
    <Box
      key={banner.key}
      className="stage-banner"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'radial-gradient(circle at 50% 50%, rgba(5,8,38,0.88), rgba(5,8,38,0.96))',
      }}
    >
      <Typography
        className="stage-banner-title gold-text neon-title"
        sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 15vw, 18rem)', letterSpacing: 'clamp(4px, 1vw, 20px)', lineHeight: 1 }}
      >
        {banner.title}
      </Typography>
      <Typography sx={{ color: 'var(--ink)', fontSize: 'clamp(1.2rem, 2.6vw, 3.2rem)', mt: 2, textAlign: 'center', px: 3 }}>{banner.sub}</Typography>
    </Box>
  );
};

// Widok na telewizor: pytanie, stan graczy, odliczanie. Nie zawiera zadnych sekretow (poprawna odpowiedz tylko po ujawnieniu).
const GameTv = ({ state, offsetRef }) => {
  const { preset } = useSiteTheme();
  const confettiColors = preset.colors.confetti;
  const c = state.current;
  const showTimer = c && (c.status === 'asking' || c.status === 'answering');
  const left = useSecondsLeft(showTimer ? c.deadline : null, offsetRef, state.pausedAt);
  const designLeft = useSecondsLeft(state.awaiting ? state.awaiting.deadline : null, offsetRef, state.pausedAt);
  const sound = useSoundSettings('tv', true);
  useQuizSounds(state, { role: 'tv', enabled: sound.active, secondsLeft: left !== null ? left : designLeft });

  // Plansze: start gry i zmiana etapu
  const [banner, setBanner] = useState(null);
  const prevRef = useRef(null);
  useEffect(() => {
    const p = prevRef.current;
    prevRef.current = { status: state.status, stage: state.stage };
    if (!p) return undefined;
    let b = null;
    if (p.status === 'lobby' && state.status === 'running') b = { title: 'START!', sub: 'Etap I – dwie kolejki pytań, po jednym dla każdego gracza' };
    else if (state.status === 'running' && p.status === 'running' && state.stage > p.stage && p.stage > 0) {
      b = state.stage === 2 ? { title: 'ETAP II', sub: 'Wyznaczanie – gramy, aż zostanie trzech graczy' } : { title: 'FINAŁ', sub: 'Zgłaszanie przyciskiem – do 40 pytań' };
    }
    if (!b) return undefined;
    setBanner({ ...b, key: Date.now() });
    const t = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(t);
  }, [state.status, state.stage]);

  // Konfetti przy dobrej odpowiedzi (nie przy odswiezeniu strony)
  const lastResult = useRef(undefined);
  const resultKey = c && c.status === 'revealed' ? `${c.n}:${c.question.id}` : null;
  useEffect(() => {
    if (lastResult.current === undefined) {
      lastResult.current = resultKey;
      return;
    }
    if (resultKey && resultKey !== lastResult.current && c.result && c.result.correct === true) {
      confetti({ particleCount: 70, spread: 80, startVelocity: 38, origin: { y: 0.3 }, colors: confettiColors });
    }
    lastResult.current = resultKey;
  }, [resultKey, c, confettiColors]);

  const answerer = c && c.result && c.result.playerId ? playerName(state, c.result.playerId) : null;
  const revealedGood = c && c.status === 'revealed' && c.result && c.result.correct === true;
  const revealedBad = c && c.status === 'revealed' && c.result && c.result.correct === false;
  const resultColor = revealedGood ? '#19b857' : revealedBad ? '#d63a3a' : 'var(--ink-dim)';
  const qKey = c ? `${c.n}:${c.question.id}` : 'none';

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
      <StageBackdrop variant="full" />

      {/* Swiatelka na krawedziach ekranu */}
      <Box aria-hidden="true" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
        <div className="marquee-lights" />
      </Box>
      <Box aria-hidden="true" sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
        <div className="marquee-lights alt" />
      </Box>

      {/* Blysk po odpowiedzi */}
      {(revealedGood || revealedBad) && (
        <Box key={`flash-${qKey}`} aria-hidden="true" className={revealedGood ? 'flash-good' : 'flash-bad'} sx={{ position: 'fixed', inset: 0, zIndex: 75, pointerEvents: 'none' }} />
      )}

      <StageBanner banner={banner} />

      {/* Pasek gorny */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 1.5, position: 'relative' }}>
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
      {state.status === 'lobby' && state.intro && <IntroTv code={state.code} intro={state.intro} />}
      {state.status === 'finished' && state.result && <Winner state={state} colors={confettiColors} />}
      {state.status === 'running' && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(10px, 1.6vh, 22px)', maxWidth: 1500, width: '100%', mx: 'auto', position: 'relative' }}>
          <Typography
            key={`msg-${qKey}-${c ? c.status : ''}`}
            className="pop-in"
            sx={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.2rem, 2.2vw, 2.6rem)', color: c && c.status === 'revealed' ? resultColor : 'var(--gold)' }}
          >
            {describeNow(state)}
            {c && c.status === 'revealed' && answerer ? ` – ${answerer}` : ''}
          </Typography>

          {showTimer && <TimerBar left={left} total={timerTotal(state)} />}

          {c && (
            <Box key={qKey} className={`pop-in ${revealedBad ? 'shake' : ''}`}>
              <QuestionPanel current={c} size="tv" />
            </Box>
          )}

          {state.awaiting && (
            <Box className="pop-in" sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ fontSize: 'clamp(1.6rem, 3.4vw, 4rem)', fontWeight: 800 }}>
                <span className="bounce">☝</span> {playerName(state, state.awaiting.byId)} wskazuje przeciwnika...
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

      {/* Przebieg gry */}
      {state.status === 'running' && state.log.length > 0 && (
        <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 'clamp(0.8rem, 1.2vw, 1.4rem)', position: 'relative' }}>
          {state.log[state.log.length - 1].text}
        </Typography>
      )}

      {/* Stanowiska jak w "1 z 10": zdjecie albo bialy ludek u gory, pulpit z punktami na dole */}
      {state.status !== 'lobby' && <TvPodiums state={state} />}

      {/* Pauza */}
      {state.paused && state.status === 'running' && (
        <Box
          role="status"
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5,8,38,0.78)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Typography className="gold-text neon-title turn-pulse" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 14vw, 16rem)', lineHeight: 1 }}>
            ⏸ PAUZA
          </Typography>
          <Typography sx={{ color: 'var(--ink)', fontSize: 'clamp(1.2rem, 2.4vw, 3rem)', mt: 2 }}>Gra wstrzymana przez prowadzącego</Typography>
        </Box>
      )}

      <SoundControl sound={sound} />
    </Box>
  );
};

export default GameTv;
