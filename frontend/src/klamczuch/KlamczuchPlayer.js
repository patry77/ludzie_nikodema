import React, { useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Avatar, PhotoPicker } from '../quiz/Avatar';
import { TimerBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import StageBackdrop from '../quiz/StageBackdrop';
import { PhoneHeader, VoteList, nameOf, playerOf } from '../party/PartyBits';

// Karta roli: domyslnie zakryta, zeby nikt nie zerknal przez ramie
const RoleCard = ({ you }) => {
  const [open, setOpen] = useState(false);
  const cheater = you.role === 'cheater';
  return (
    <Box className="glass" sx={{ p: 2.5, textAlign: 'center', border: open ? `2px solid ${cheater ? '#ff6b6b' : '#19b857'}` : '2px solid rgba(255,255,255,0.15)' }}>
      {open ? (
        <>
          <Typography sx={{ fontSize: '2.2rem' }} aria-hidden="true">{cheater ? '🕵' : '😇'}</Typography>
          <Typography variant="h5" sx={{ color: cheater ? '#ff9b9b' : '#7dff9d', fontWeight: 800 }}>{cheater ? 'Jesteś KŁAMCZUCHEM!' : 'Jesteś uczciwy(a)'}</Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mt: 0.5 }}>
            {cheater ? 'Widzisz wszystkie odpowiedzi poniżej. Zdobywaj punkty, ale nie dawaj się złapać!' : 'Odpowiadaj z głowy i obserwuj, kto zdobywa podejrzanie dużo punktów.'}
          </Typography>
        </>
      ) : (
        <Typography sx={{ color: 'var(--ink-dim)' }}>🔒 Twoja rola jest ukryta</Typography>
      )}
      <Button size="small" onClick={() => setOpen((o) => !o)} sx={{ mt: 1, color: 'var(--gold)', fontWeight: 800 }}>{open ? 'Ukryj rolę' : 'Pokaż moją rolę'}</Button>
    </Box>
  );
};

// Telefon uczestnika w trybie "Klamczuch"
const KlamczuchPlayer = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const you = state.you;
  const r = state.r;
  const paused = !!state.paused && state.status === 'running';
  const cur = r && r.cur;
  const left = useSecondsLeft(cur ? cur.deadline : null, offsetRef, state.pausedAt);
  const voteLeft = useSecondsLeft(state.v ? state.v.deadline : null, offsetRef, state.pausedAt);
  const savePhoto = async (photo) => {
    await act('photo', { photo });
  };
  const running = state.status === 'running';

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <PhoneHeader
        state={state}
        you={you}
        label="Kłamczuch"
        right={
          <>
            <Typography sx={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1 }}>{you.score} pkt</Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>{!you.active && running ? 'odpadłeś(aś)' : running ? `runda ${state.round}` : ''}</Typography>
          </>
        }
      />
      {error && <Alert severity="error" onClose={onResetError}>{error}</Alert>}
      {paused && <Alert severity="warning" icon={false} className="pop-in" sx={{ textAlign: 'center', fontWeight: 800 }}>⏸ Gra wstrzymana przez prowadzącego</Alert>}

      {state.status === 'lobby' && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Avatar code={state.code} player={you} size={110} badge={false} />
          </Box>
          <Typography variant="h5" sx={{ color: 'var(--gold)', mb: 1 }}>Jesteś w grze!</Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>Po starcie jedna osoba po cichu zostanie kłamczuchem i dostanie odpowiedzi z góry. Reszta musi go wykryć.</Typography>
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.85rem', mb: 1 }}>Dodaj swoje zdjęcie – zobaczą je wszyscy na ekranie TV:</Typography>
            <PhotoPicker hasPhoto={you.hasPhoto} onPick={savePhoto} onRemove={() => act('removePhoto')} busy={busy} />
          </Box>
          <Typography sx={{ mt: 2.5, color: 'var(--ink-dim)', fontSize: '0.9rem' }}>W grze: {state.players.map((p) => p.name).join(' · ')}</Typography>
        </Box>
      )}

      {running && you.role && you.active && <RoleCard you={you} />}

      {running && you.role === 'cheater' && you.active && you.cheat && (
        <Box className="glass" sx={{ p: 2, border: '2px solid rgba(255,107,107,0.6)' }}>
          <Typography sx={{ color: '#ff9b9b', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1 }}>🕵 Twoja ściąga (tylko Ty to widzisz)</Typography>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{r.question}</Typography>
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            {you.cheat.map((c, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, p: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.08)', opacity: c.revealed ? 0.4 : 1, textDecoration: c.revealed ? 'line-through' : 'none' }}>
                <strong style={{ color: 'var(--gold)', width: 20 }}>{i + 1}</strong>
                <span style={{ flex: 1, fontWeight: 700 }}>{c.text}</span>
                <strong style={{ color: 'var(--gold)' }}>{c.points}</strong>
              </Box>
            ))}
          </Box>
          <Typography sx={{ mt: 1, color: 'var(--ink-dim)', fontSize: '0.85rem' }}>Wskazówka: nie bierz zawsze najlepszej odpowiedzi – to Cię zdradzi.</Typography>
        </Box>
      )}

      {running && state.phase === 'answer' && r && (
        <Box className="glass" sx={{ p: 2.5, textAlign: 'center', ...(you.isTurn ? { border: '2px solid var(--gold)' } : {}) }}>
          {cur && <TimerBar left={left} total={state.config.answerSeconds} />}
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', my: 1.5 }}>{r.question}</Typography>
          {you.isTurn ? (
            <>
              <Typography variant="h6" sx={{ color: 'var(--gold)' }}>Twoja kolej!</Typography>
              <Typography sx={{ color: 'var(--ink-dim)' }}>Powiedz swoją odpowiedź głośno – prowadzący wskaże ją na tablicy.</Typography>
            </>
          ) : cur ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
              <Avatar code={state.code} player={playerOf(state, cur.playerId)} size={48} badge={false} />
              <Typography sx={{ color: 'var(--ink-dim)' }}>Teraz odpowiada <strong style={{ color: 'var(--ink)' }}>{nameOf(state, cur.playerId)}</strong> – obserwuj!</Typography>
            </Box>
          ) : null}
        </Box>
      )}

      {running && state.phase === 'roundEnd' && r && r.summary && (
        <Box className="glass pop-in" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ color: 'var(--gold)', textAlign: 'center', mb: 1 }}>Koniec rundy {r.n}</Typography>
          <Box sx={{ display: 'grid', gap: 0.5 }}>
            {[...r.summary.rows].sort((a, b) => b.points - a.points).map((x) => (
              <Typography key={x.playerId} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <span>{nameOf(state, x.playerId)}</span>
                <span style={{ color: x.points > 0 ? '#7dff9d' : '#ff9b9b', fontWeight: 800 }}>{x.text ? `${x.text} (+${x.points})` : 'pudło'}</span>
              </Typography>
            ))}
          </Box>
          <Typography sx={{ color: 'var(--ink-dim)', textAlign: 'center', mt: 1.5 }}>Za chwilę głosowanie na kłamczucha…</Typography>
        </Box>
      )}

      {running && state.phase === 'vote' && state.v && (
        <>
          <TimerBar left={voteLeft} total={state.config.voteSeconds} />
          {you.active ? (
            <VoteList state={state} you={you} busy={busy} title="Kto jest kłamczuchem?" onVote={(id) => act('vote', { targetId: id })} />
          ) : (
            <Box className="glass" sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: 'var(--ink-dim)' }}>Odpadłeś(aś) – głosują pozostali ({state.v.voted.length}/{state.v.total}).</Typography>
            </Box>
          )}
        </>
      )}

      {running && state.phase === 'voteEnd' && state.ve && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">{state.ve.wasCheater ? '🕵' : '🗳'}</Typography>
          <Typography variant="h5" sx={{ color: 'var(--gold)' }}>
            {state.ve.eliminatedId === you.id ? 'Odpadasz z gry' : `Odpada: ${nameOf(state, state.ve.eliminatedId)}`}
          </Typography>
          <Typography sx={{ mt: 1, color: state.ve.wasCheater ? '#7dff9d' : 'var(--ink-dim)' }}>
            {state.ve.wasCheater ? 'To był kłamczuch!' : state.ve.next === 'end' ? 'Był uczciwy – kłamczuch dotarł do finału.' : 'Był uczciwy. Kłamczuch wciąż jest wśród nas…'}
          </Typography>
        </Box>
      )}

      {state.status === 'finished' && state.result && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">{state.result.winner === 'cheater' ? '🕵' : '🏆'}</Typography>
          <Typography variant="h5" sx={{ color: 'var(--gold)' }}>
            {state.result.winner === 'cheater' ? 'Wygrywa kłamczuch!' : state.result.winner === 'honest' ? 'Wygrywają uczciwi!' : 'Koniec gry'}
          </Typography>
          <Typography sx={{ mt: 1 }}>Kłamczuchem był(a): <strong style={{ color: 'var(--gold)' }}>{state.result.cheaterName}</strong></Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mt: 0.5 }}>
            {state.result.cheaterId === you.id ? (state.result.winner === 'cheater' ? 'Brawo – nikt Cię nie złapał!' : 'Tym razem Cię wykryli.') : state.result.winner === 'honest' ? 'Gratulacje, wykryliście oszusta!' : 'Oszust Was przechytrzył.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default KlamczuchPlayer;
