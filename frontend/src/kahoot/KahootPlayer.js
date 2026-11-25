import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { Avatar, PhotoPicker } from '../quiz/Avatar';
import { TimerBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import StageBackdrop from '../quiz/StageBackdrop';
import { K, LETTERS, Leaderboard, RankMove, fmtMs } from './KahootBits';

// Telefon uczestnika w trybie Kahoot
const KahootPlayer = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const you = state.you;
  const c = state.current;
  const left = useSecondsLeft(c && c.status === 'question' ? c.deadline : null, offsetRef, state.pausedAt);
  const paused = !!state.paused && state.status === 'running';
  const answered = you.answer ? you.answer.letter : null;

  const send = (letter) => act('answer', { value: letter });
  const savePhoto = async (photo) => {
    await act('photo', { photo });
  };
  const removePhoto = () => act('removePhoto');

  const my = c && c.status === 'results' ? you.myResult : null;
  const results = c && c.status === 'results' ? c.results : null;

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <Box className="glass" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Avatar code={state.code} player={you} size={52} badge={false} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: '1.15rem' }}>{you.name}</Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>Kahoot · kod {state.code}{state.test && ' · test'}</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1 }}>{you.score} pkt</Typography>
          {state.status !== 'lobby' && (
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>
              miejsce {you.rank}{you.streak >= 2 ? ` · 🔥${you.streak}` : ''}
            </Typography>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" onClose={onResetError}>{error}</Alert>}
      {paused && (
        <Alert severity="warning" icon={false} className="pop-in" sx={{ textAlign: 'center', fontWeight: 800 }}>⏸ Gra wstrzymana przez prowadzącego – czekaj na wznowienie</Alert>
      )}

      {state.status === 'lobby' && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Avatar code={state.code} player={you} size={110} badge={false} />
          </Box>
          <Typography variant="h5" sx={{ color: 'var(--gold)', mb: 1 }}>Jesteś w grze!</Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>Czekaj, aż prowadzący rozpocznie grę. Na każde pytanie odpowiadasz na telefonie – liczy się poprawność i szybkość.</Typography>
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.85rem', mb: 1 }}>Dodaj swoje zdjęcie – zobaczą je wszyscy na ekranie TV:</Typography>
            <PhotoPicker hasPhoto={you.hasPhoto} onPick={savePhoto} onRemove={removePhoto} busy={busy} />
          </Box>
          <Typography sx={{ mt: 2.5, color: 'var(--ink-dim)', fontSize: '0.9rem' }}>W grze: {state.players.map((p) => p.name).join(' · ')}</Typography>
        </Box>
      )}

      {state.status === 'running' && c && c.status === 'question' && (
        <Box key={`q${c.n}`} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TimerBar left={left} total={state.config.questionSeconds} />
          <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: '0.9rem' }}>Pytanie {c.n} z {c.total} · odpowiedziało {c.answered}/{c.players}</Typography>
          {answered ? (
            <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">{K[answered].shape}</Typography>
              <Typography variant="h6" sx={{ color: 'var(--gold)' }}>Odpowiedź przyjęta ✔</Typography>
              <Typography sx={{ color: 'var(--ink-dim)', mt: 0.5 }}>Wybrałeś(aś): <strong style={{ color: '#fff' }}>{c.question.options[answered]}</strong>. Czekaj na wyniki…</Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 }}>{c.question.pytanie}</Typography>
              {c.question.link && (
                <Typography sx={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 700 }}>
                  {c.question.media === 'wideo' ? '🎬 Film leci na ekranie TV' : '🎵 Utwór leci na ekranie TV'}
                </Typography>
              )}
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                {LETTERS.map((l) => (
                  <Box
                    key={l}
                    component="button"
                    type="button"
                    disabled={busy || paused || left === 0}
                    onClick={() => send(l)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      minHeight: 72,
                      px: 2.5,
                      textAlign: 'left',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: K[l].fg,
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      border: '3px solid rgba(255,255,255,0.4)',
                      borderRadius: '16px',
                      background: K[l].bg,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
                      '&:active': { transform: 'scale(0.98)' },
                      '&:disabled': { opacity: 0.5, cursor: 'default' },
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>{K[l].shape}</span>
                    <span>{c.question.options[l]}</span>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {state.status === 'running' && c && c.status === 'results' && results && (
        <Box className="pop-in" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box className="glass" sx={{ p: 3, textAlign: 'center', border: `2px solid ${my && my.correct ? '#19b857' : '#d63a3a'}` }}>
            <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">{my && my.correct ? '✅' : my && my.letter ? '❌' : '⏰'}</Typography>
            <Typography variant="h5" sx={{ color: my && my.correct ? '#7dff9d' : '#ff9b9b', fontWeight: 800 }}>
              {my && my.correct ? 'Dobrze!' : my && my.letter ? 'Niestety źle' : 'Brak odpowiedzi'}
            </Typography>
            {my && (
              <>
                <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold)' }}>+{my.points} pkt</Typography>
                {my.correct && <Typography sx={{ color: 'var(--ink-dim)' }}>Czas: {fmtMs(my.ms)}{my.bonus ? ` · w tym seria +${my.bonus}` : ''}</Typography>}
                <Typography sx={{ mt: 1 }}>
                  Miejsce <strong>{my.rank}</strong> <RankMove now={my.rank} prev={my.prevRank} />
                  {my.streak >= 2 && <span> · 🔥 seria {my.streak}</span>}
                </Typography>
              </>
            )}
            {!(my && my.correct) && (
              <Typography sx={{ color: 'var(--ink-dim)', mt: 1 }}>
                Poprawna odpowiedź: <strong style={{ color: '#fff' }}>{K[results.correct].shape} {c.question.options[results.correct]}</strong>
              </Typography>
            )}
          </Box>
          {results.fastest && (
            <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)' }}>
              ⚡ Najszybszy: <strong style={{ color: 'var(--gold)' }}>{(state.players.find((p) => p.id === results.fastest.playerId) || {}).name}</strong> ({fmtMs(results.fastest.ms)})
            </Typography>
          )}
          <Box className="glass" sx={{ p: 2 }}>
            <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1 }}>Ranking</Typography>
            <Leaderboard state={state} rows={results.rows.slice(0, 5)} compact />
          </Box>
          <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)' }}>Czekaj na następne pytanie…</Typography>
        </Box>
      )}

      {state.status === 'finished' && state.result && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">🏆</Typography>
          <Typography variant="h5" sx={{ color: 'var(--gold)' }}>
            {state.result.winnerIds.includes(you.id) ? 'Wygrywasz!' : `Twoje miejsce: ${you.rank}`}
          </Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mb: 2 }}>Wynik: <strong style={{ color: '#fff' }}>{you.score} pkt</strong></Typography>
          <Leaderboard state={state} rows={state.result.ranking.slice(0, 8).map((x) => ({ playerId: x.id, rank: x.rank, score: x.score, streak: x.bestStreak }))} compact showGain={false} />
        </Box>
      )}
    </Box>
  );
};

export default KahootPlayer;
