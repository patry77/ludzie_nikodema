import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { LogoMark } from '../components/Logo';
import { useSiteTheme } from '../ThemeContext';
import StageBackdrop from '../quiz/StageBackdrop';
import { Avatar } from '../quiz/Avatar';
import { HexBar, TvMedia } from '../quiz/QuizBits';
import { hasPlayableMedia, useSecondsLeft } from '../quiz/quizApi';
import { IntroTv } from '../quiz/IntroCam';
import { K, LETTERS, Leaderboard, RoundHighlights, fmtMs, nameOf } from './KahootBits';

const joinUrl = (code) => `${window.location.origin}/teleturniej/gra/${code}`;

const Lobby = ({ state }) => (
  <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 'clamp(16px, 3vw, 60px)', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <Box className="pop-in">
      <Typography sx={{ color: 'var(--gold)', letterSpacing: 6, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)' }}>Dołącz z telefonu</Typography>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, min(10vw, 18vh), 12rem)', letterSpacing: 'clamp(6px, 1.4vw, 24px)', lineHeight: 1 }}>
        {state.code}
      </Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)', mt: 1 }}>Zeskanuj kod QR lub wejdź na stronę i wpisz kod</Typography>
      <Typography sx={{ color: 'var(--ink)', fontWeight: 700, fontSize: 'clamp(0.9rem, 1.5vw, 1.8rem)', wordBreak: 'break-all' }}>{joinUrl(state.code)}</Typography>
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

const AnswerTile = ({ letter, text }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 'clamp(8px, 1vw, 18px)',
      minHeight: 'clamp(46px, 10vh, 120px)',
      px: 'clamp(10px, 1.4vw, 28px)',
      borderRadius: '14px',
      background: K[letter].bg,
      color: K[letter].fg,
      border: '3px solid rgba(255,255,255,0.35)',
      boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
    }}
  >
    <Typography component="span" sx={{ fontSize: 'clamp(1.2rem, min(2.4vw, 4.4vh), 2.8rem)', lineHeight: 1 }}>{K[letter].shape}</Typography>
    <Typography component="span" sx={{ fontWeight: 700, fontSize: 'clamp(0.95rem, min(1.9vw, 3.6vh), 2.1rem)', lineHeight: 1.2, wordBreak: 'break-word' }}>{text}</Typography>
  </Box>
);

const QuestionView = ({ state, offsetRef }) => {
  const c = state.current;
  const q = c.question;
  const left = useSecondsLeft(c.deadline, offsetRef, state.pausedAt);
  const total = state.config.questionSeconds;
  const pct = left === null ? 100 : Math.max(0, Math.min(100, (left / total) * 100));
  const urgent = left !== null && left <= 5;
  const hasMedia = hasPlayableMedia(q.link, q.media);
  const sideBySide = hasMedia && (q.media === 'wideo' || q.media === 'zdjecie');

  const answers = (
    <Box sx={{ display: 'grid', gridTemplateColumns: sideBySide ? '1fr' : '1fr 1fr', gap: 'clamp(6px, 1vh, 14px)', mt: sideBySide ? 0 : 'clamp(6px, 1.2vh, 16px)', ...(sideBySide ? { width: 'min(40%, 620px)', flexShrink: 0, alignContent: 'center' } : {}) }}>
      {LETTERS.map((l) => (
        <AnswerTile key={l} letter={l} text={q.options[l]} />
      ))}
    </Box>
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vh, 18px)', maxWidth: 1500, width: '100%', mx: 'auto', position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography
          className={urgent ? 'timer-urgent' : undefined}
          sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.8rem, 4.4vw, 5rem)', lineHeight: 1, minWidth: '2.2em', textAlign: 'center', color: urgent ? '#ff6b6b' : 'var(--gold)' }}
        >
          {left === null ? total : Math.ceil(left)}
        </Typography>
        <Box sx={{ flex: 1, height: 'clamp(10px, 1.6vh, 18px)', borderRadius: 999, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
          <Box sx={{ width: `${pct}%`, height: '100%', background: urgent ? 'linear-gradient(90deg, #ff6b6b, #d63a3a)' : 'linear-gradient(90deg, var(--gold-light), var(--gold))', transition: 'width .2s linear' }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 'clamp(1rem, 2vw, 2.4rem)', whiteSpace: 'nowrap' }}>
          ✋ {c.answered}/{c.players}
        </Typography>
      </Box>

      <HexBar minHeight="clamp(52px, 11vh, 120px)" px={{ xs: 4, sm: 6 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 'clamp(1.1rem, min(2.6vw, 4.4vh), 3rem)', lineHeight: 1.3, py: 1, width: '100%', textAlign: 'center' }}>{q.pytanie}</Typography>
      </HexBar>

      {sideBySide ? (
        <Box sx={{ display: 'flex', gap: 'clamp(8px, 1.4vw, 24px)', flex: 1, minHeight: 0, alignItems: 'stretch' }}>
          <TvMedia key={q.id} media={q.media} link={q.link} qid={q.id} mediaCmd={null} start={q.start || 0} end={q.end || 0} paused={!!state.paused} />
          {answers}
        </Box>
      ) : (
        <>
          {hasMedia ? <TvMedia key={q.id} media={q.media} link={q.link} qid={q.id} mediaCmd={null} start={q.start || 0} end={q.end || 0} paused={!!state.paused} /> : <Box sx={{ flex: 1 }} />}
          {answers}
        </>
      )}
    </Box>
  );
};

const ResultsView = ({ state }) => {
  const c = state.current;
  const r = c.results;
  const many = r.rows.length > 10;
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1.5fr)' }, gap: 'clamp(10px, 1.8vw, 36px)', maxWidth: 1600, width: '100%', mx: 'auto', alignItems: 'center', position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.4vh, 18px)' }}>
        <HexBar minHeight="clamp(44px, 9vh, 90px)" px={{ xs: 3, sm: 5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 'clamp(1rem, min(2vw, 3.6vh), 2.2rem)', lineHeight: 1.25, py: 0.5, width: '100%', textAlign: 'center' }}>{c.question.pytanie}</Typography>
        </HexBar>
        <RoundHighlights state={state} results={r} compact />
      </Box>
      <Box>
        <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', fontSize: 'clamp(0.8rem, 1.3vw, 1.5rem)', mb: 'clamp(4px, 1vh, 12px)' }}>
          🏆 Ranking po pytaniu {c.n}/{c.total}
        </Typography>
        <Leaderboard state={state} rows={r.rows} compact columns={many ? 2 : 1} />
      </Box>
    </Box>
  );
};

const FinalView = ({ state, colors }) => {
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
  const winners = r.winnerIds.map((id) => nameOf(state, id)).join(' i ');
  const win = state.players.find((p) => p.id === r.winnerIds[0]);
  const rows = r.ranking.map((x) => ({ playerId: x.id, rank: x.rank, score: x.score, streak: x.bestStreak }));
  const many = rows.length > 8;
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(6px, 1.4vh, 20px)', textAlign: 'center', position: 'relative' }}>
      <Typography className="pop-in" sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.8vw, 2.2rem)' }}>
        {r.winnerIds.length > 1 ? 'Remis! Zwycięzcy' : 'Zwycięzca'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {win && win.hasPhoto && <Avatar code={state.code} player={win} size="clamp(70px, 12vh, 200px)" badge={false} />}
        <Typography className="gold-text neon-title pop-in" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, min(7vw, 11vh), 8rem)', lineHeight: 1.05 }}>
          🏆 {winners}
        </Typography>
      </Box>
      <Box sx={{ width: 'min(1100px, 96%)' }}>
        <Leaderboard state={state} rows={rows} compact columns={many ? 2 : 1} showGain={false} />
      </Box>
      <Box sx={{ display: 'flex', gap: 'clamp(10px, 3vw, 60px)', flexWrap: 'wrap', justifyContent: 'center', color: 'var(--ink)', fontSize: 'clamp(0.85rem, min(1.5vw, 2.8vh), 1.8rem)' }}>
        {r.awards.quickest && <span>⚡ Najszybszy (średnio): <strong style={{ color: 'var(--gold)' }}>{nameOf(state, r.awards.quickest.id)}</strong> – {fmtMs(r.awards.quickest.avgMs)}</span>}
        {r.awards.streak && <span>🔥 Najdłuższa seria: <strong style={{ color: 'var(--gold)' }}>{nameOf(state, r.awards.streak.id)}</strong> ×{r.awards.streak.value}</span>}
        <span style={{ color: 'var(--ink-dim)' }}>Pytań: {r.questions}</span>
      </Box>
    </Box>
  );
};

const KahootTv = ({ state, offsetRef }) => {
  const { preset } = useSiteTheme();
  const colors = preset.colors.confetti;
  const c = state.current;
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
              Kahoot {state.test && <small style={{ fontSize: '0.4em', color: 'var(--primary-light)', WebkitTextFillColor: 'var(--primary-light)' }}>TRYB TESTOWY</small>}
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.8rem, 1.2vw, 1.4rem)' }}>
              {state.status === 'lobby' ? 'Poczekalnia' : state.status === 'finished' ? 'Koniec gry' : `Pytanie ${c ? c.n : ''} z ${state.config.totalQuestions}`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.7rem, 1vw, 1.1rem)', letterSpacing: 3, textTransform: 'uppercase' }}>Kod gry</Typography>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--gold)', fontSize: 'clamp(1.2rem, 2.2vw, 2.6rem)', letterSpacing: 4 }}>{state.code}</Typography>
        </Box>
      </Box>

      {state.status === 'lobby' && <Lobby state={state} />}
      {state.status === 'lobby' && state.intro && <IntroTv code={state.code} intro={state.intro} />}
      {running && c && c.status === 'question' && <QuestionView key={c.question.id + c.n} state={state} offsetRef={offsetRef} />}
      {running && c && c.status === 'results' && c.results && <ResultsView key={`r${c.n}`} state={state} />}
      {state.status === 'finished' && state.result && <FinalView state={state} colors={colors} />}

      {state.paused && running && (
        <Box role="status" sx={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,38,0.78)', backdropFilter: 'blur(6px)' }}>
          <Typography className="gold-text neon-title turn-pulse" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(4rem, 14vw, 16rem)', lineHeight: 1 }}>⏸ PAUZA</Typography>
          <Typography sx={{ color: 'var(--ink)', fontSize: 'clamp(1.2rem, 2.4vw, 3rem)', mt: 2 }}>Gra wstrzymana przez prowadzącego</Typography>
        </Box>
      )}
    </Box>
  );
};

export default KahootTv;
