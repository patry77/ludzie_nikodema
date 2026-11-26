import React, { useState } from 'react';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { Avatar } from '../quiz/Avatar';
import { TimerBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import { IntroHost } from '../quiz/IntroCam';
import { K, LETTERS, Leaderboard, RoundHighlights, fmtMs, nameOf } from './KahootBits';

const Panel = ({ title, children, sx }) => (
  <Box className="glass" sx={{ p: { xs: 2, md: 3 }, ...sx }}>
    {title && <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1.5 }}>{title}</Typography>}
    {children}
  </Box>
);

const field = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.35)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

const goldBtn = { background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))', color: '#1a1205', fontWeight: 800 };

// Panel prowadzacego w trybie Kahoot: prowadzacy tylko przechodzi dalej albo wstrzymuje gre.
const KahootHost = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const c = state.current;
  const paused = !!state.paused;
  const left = useSecondsLeft(c && c.status === 'question' ? c.deadline : null, offsetRef, state.pausedAt);
  const [copied, setCopied] = useState(false);
  const joinUrl = `${window.location.origin}/teleturniej/gra/${state.code}`;
  const tvUrl = `${joinUrl}/tv`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      window.prompt('Skopiuj link dla uczestników:', joinUrl);
    }
  };
  const last = c && c.status === 'results' && c.results && c.results.last;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <Panel>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase' }}>Panel prowadzącego {state.test && '· tryb testowy'}</Typography>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--gold)', lineHeight: 1.1 }}>Kahoot · kod {state.code}</Typography>
              <Typography sx={{ color: 'var(--ink-dim)' }}>
                {state.status === 'lobby' ? 'Poczekalnia' : state.status === 'finished' ? 'Koniec gry' : `Pytanie ${c ? c.n : ''} z ${state.config.totalQuestions}`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" component="a" href={tvUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>📺 Otwórz widok TV</Button>
              <Button variant="outlined" onClick={copy} sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>{copied ? '✔ Skopiowano' : '🔗 Link dla uczestników'}</Button>
              {state.status === 'running' && (
                <Button variant="contained" onClick={() => act(paused ? 'resume' : 'pause')} disabled={busy} sx={paused ? { fontWeight: 800, color: '#1a1205', background: 'linear-gradient(120deg, #b6ffc9, #19b857)' } : goldBtn}>
                  {paused ? '▶ Wznów grę' : '⏸ Pauza'}
                </Button>
              )}
              {state.status === 'running' && (
                <Button variant="outlined" color="error" onClick={() => window.confirm('Zakończyć grę teraz?') && act('end')} disabled={busy}>Zakończ grę</Button>
              )}
            </Box>
          </Box>
          {paused && state.status === 'running' && (
            <Alert severity="warning" icon={false} sx={{ mt: 2, fontWeight: 700 }}>⏸ Gra jest wstrzymana – czas stoi, uczestnicy nie mogą odpowiadać (film na TV też stoi).</Alert>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }} onClose={onResetError}>{error}</Alert>}
        </Panel>

        {state.status === 'lobby' && <IntroHost code={state.code} intro={state.intro} people={state.players} />}

        {state.status === 'lobby' && (
          <Panel title="Przed startem">
            <Typography sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
              Wszyscy odpowiadają na każde pytanie jednocześnie z telefonów – im szybciej i poprawniej, tym więcej punktów (do 1000), a seria poprawnych odpowiedzi daje bonus.
              Kahoot używa tylko pytań zamkniętych (ABCD). Prowadzący może tylko przechodzić do następnego pytania i wstrzymywać grę.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
              <TextField size="small" type="number" label="Czas na odpowiedź (s)" value={state.config.questionSeconds} disabled={busy}
                onChange={(e) => act('config', { config: { questionSeconds: Number(e.target.value) } })} sx={field} inputProps={{ min: 5, max: 120 }} />
              <TextField size="small" type="number" label="Liczba pytań" value={state.config.totalQuestions} disabled={busy}
                onChange={(e) => act('config', { config: { totalQuestions: Number(e.target.value) } })} sx={field} inputProps={{ min: 3, max: 50 }} />
              {state.test && (
                <TextField select size="small" label="Tempo botów" value={state.config.botSpeed || 1} disabled={busy} onChange={(e) => act('config', { config: { botSpeed: Number(e.target.value) } })} sx={field}>
                  <MenuItem value={0.15}>bardzo szybko</MenuItem>
                  <MenuItem value={0.4}>szybko</MenuItem>
                  <MenuItem value={1}>normalnie</MenuItem>
                  <MenuItem value={2}>wolno</MenuItem>
                </TextField>
              )}
              {state.test && (
                <TextField select size="small" label="Skuteczność botów" value={state.config.botAccuracy} disabled={busy} onChange={(e) => act('config', { config: { botAccuracy: Number(e.target.value) } })} sx={field}>
                  <MenuItem value={0.3}>niska (30%)</MenuItem>
                  <MenuItem value={0.5}>średnia (50%)</MenuItem>
                  <MenuItem value={0.75}>wysoka (75%)</MenuItem>
                  <MenuItem value={0.9}>bardzo wysoka (90%)</MenuItem>
                </TextField>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
              <Button variant="contained" size="large" onClick={() => act('start')} disabled={busy || state.players.length < 1} sx={goldBtn}>
                ▶ Start gry ({state.players.length} {state.players.length === 1 ? 'gracz' : 'graczy'})
              </Button>
              <Button variant="outlined" onClick={() => act('addBot')} disabled={busy || state.players.length >= 20} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>🤖 Dodaj bota</Button>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 2 }}>
              Pula pytań ABCD: {state.poolSize}
              {state.insideIncluded === true && ' · z pytaniami „inside”'}
              {state.insideIncluded === false && ' · bez pytań „inside”'}
              {state.poolSize < state.config.totalQuestions && ' · (pula mniejsza niż liczba pytań – pytania się powtórzą)'}
            </Typography>
          </Panel>
        )}

        {state.status === 'running' && c && (
          <Panel title={`Pytanie ${c.n} z ${c.total}`}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 1.5 }}>{c.question.pytanie}</Typography>
            {c.status === 'question' && (
              <Box sx={{ mb: 2 }}>
                <TimerBar left={left} total={state.config.questionSeconds} />
                <Typography sx={{ mt: 0.75, color: 'var(--ink-dim)' }}>Odpowiedziało: <strong style={{ color: 'var(--ink)' }}>{c.answered}/{c.players}</strong></Typography>
              </Box>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              {LETTERS.map((l) => {
                const good = (c.status === 'results' ? c.results.correct : c.correct) === l;
                return (
                  <Box key={l} sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.25, borderRadius: '10px', background: K[l].bg, color: K[l].fg, outline: good ? '4px solid #fff' : 'none', opacity: good ? 1 : 0.9 }}>
                    <span>{K[l].shape}</span>
                    <span style={{ fontWeight: 600 }}>{c.question.options[l]}{good ? ' ✔' : ''}</span>
                  </Box>
                );
              })}
            </Box>
            {c.question.link && <Typography variant="body2" sx={{ mt: 1.5, color: 'var(--ink-dim)' }}>{c.question.media === 'wideo' ? '🎬 Film gra' : c.question.media === 'zdjecie' ? '📷 Zdjęcie jest' : '🎵 Utwór gra'} automatycznie na ekranie TV.</Typography>}

            {c.status === 'results' && c.results && (
              <Box sx={{ mt: 3 }}>
                <RoundHighlights state={state} results={c.results} />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3, alignItems: 'center' }}>
              <Button variant="contained" size="large" onClick={() => act('next')} disabled={busy || paused} sx={goldBtn}>
                {c.status === 'question' ? 'Zakończ pytanie (pokaż wyniki) ▶' : last ? 'Pokaż wyniki końcowe 🏆' : 'Następne pytanie ▶'}
              </Button>
              {c.status === 'question' && <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.85rem' }}>Pytanie kończy się też samo, gdy wszyscy odpowiedzą lub minie czas.</Typography>}
            </Box>
          </Panel>
        )}

        {state.status === 'finished' && state.result && (
          <Panel title="Wyniki końcowe">
            <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--gold)', mb: 1.5 }}>🏆 {state.result.winnerIds.map((id) => nameOf(state, id)).join(' i ')}</Typography>
            <Leaderboard state={state} rows={state.result.ranking.map((x) => ({ playerId: x.id, rank: x.rank, score: x.score, streak: x.bestStreak }))} showGain={false} />
            <Typography sx={{ mt: 2, color: 'var(--ink-dim)' }}>
              {state.result.awards.quickest && <>⚡ Najszybszy: {nameOf(state, state.result.awards.quickest.id)} ({fmtMs(state.result.awards.quickest.avgMs)}) </>}
              {state.result.awards.streak && <>· 🔥 Seria: {nameOf(state, state.result.awards.streak.id)} ×{state.result.awards.streak.value}</>}
            </Typography>
          </Panel>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <Panel title={`Gracze (${state.players.length})`}>
          <Box sx={{ display: 'grid', gap: 1 }}>
            {[...state.players].sort((a, b) => (state.status === 'lobby' ? a.seat - b.seat : a.rank - b.rank)).map((p) => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}>
                <Avatar code={state.code} player={p} size={34} badge={false} />
                <Typography noWrap sx={{ flex: 1, fontWeight: 700 }}>
                  {state.status !== 'lobby' && <span style={{ color: 'var(--ink-dim)', marginRight: 6 }}>{p.rank}.</span>}
                  {p.name}{p.isBot ? ' 🤖' : ''}
                </Typography>
                {state.status === 'running' && c && c.status === 'question' && <span title={p.answered ? 'Odpowiedział(a)' : 'Jeszcze nie'}>{p.answered ? '✅' : '⏳'}</span>}
                {state.status !== 'lobby' && <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{p.score}</span>}
                {p.streak >= 2 && <span>🔥{p.streak}</span>}
                {state.status === 'lobby' && (
                  <Button size="small" color="error" onClick={() => act('kick', { playerId: p.id })} disabled={busy}>Usuń</Button>
                )}
              </Box>
            ))}
            {state.players.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Jeszcze nikt nie dołączył.</Typography>}
          </Box>
        </Panel>
      </Box>
    </Box>
  );
};

export default KahootHost;
