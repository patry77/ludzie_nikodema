import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Avatar, PhotoPicker } from '../quiz/Avatar';
import { TimerBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import StageBackdrop from '../quiz/StageBackdrop';
import { K, LETTERS } from '../kahoot/KahootBits';
import { PhoneHeader, VoteList, goldBtn, nameOf, playerOf } from '../party/PartyBits';

// Telefon uczestnika w trybie "Najslabsze ogniwo"
const OgniwoPlayer = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const you = state.you;
  const r = state.r;
  const paused = !!state.paused && state.status === 'running';
  const cur = state.phase === 'duel' ? (state.d && state.d.cur) : state.phase === 'round' ? (r && r.cur) : null;
  const roundLeft = useSecondsLeft(state.phase === 'round' && r ? r.endsAt : null, offsetRef, state.pausedAt);
  const qLeft = useSecondsLeft(cur && cur.deadline ? cur.deadline : null, offsetRef, state.pausedAt);
  const voteLeft = useSecondsLeft(state.phase === 'vote' && state.v ? state.v.deadline : null, offsetRef, state.pausedAt);

  const savePhoto = async (photo) => {
    await act('photo', { photo });
  };
  const myStats = r && r.stats ? r.stats[you.id] : null;

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      <PhoneHeader
        state={state}
        you={you}
        label="Najsłabsze ogniwo"
        right={
          <>
            <Typography sx={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1 }}>💰 {state.pot}</Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>{!you.active && state.status === 'running' ? 'odpadłeś(aś)' : state.status === 'running' ? `runda ${state.round}` : ''}</Typography>
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
          <Typography sx={{ color: 'var(--ink-dim)' }}>Odpowiadacie po kolei. Poprawne odpowiedzi budują łańcuch, a błąd go zrywa. Po rundzie głosujecie, kto jest najsłabszym ogniwem.</Typography>
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.85rem', mb: 1 }}>Dodaj swoje zdjęcie – zobaczą je wszyscy na ekranie TV:</Typography>
            <PhotoPicker hasPhoto={you.hasPhoto} onPick={savePhoto} onRemove={() => act('removePhoto')} busy={busy} />
          </Box>
          <Typography sx={{ mt: 2.5, color: 'var(--ink-dim)', fontSize: '0.9rem' }}>W grze: {state.players.map((p) => p.name).join(' · ')}</Typography>
        </Box>
      )}

      {state.status === 'running' && (state.phase === 'round' || state.phase === 'duel') && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {state.phase === 'round' && r && <TimerBar left={roundLeft} total={r.seconds} />}
          {state.phase === 'round' && r && (
            <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)' }}>⛓ Łańcuch: <strong style={{ color: 'var(--ink)' }}>{r.chain}</strong> ({r.chainValue} pkt) · 💰 bank rundy: <strong style={{ color: 'var(--gold)' }}>{r.roundBank}</strong></Typography>
          )}
          {state.phase === 'duel' && state.d && (
            <Typography sx={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 800 }}>⚔ Pojedynek · {state.d.order.map((id) => `${nameOf(state, id)} ${state.d.score[id]}`).join(' : ')}</Typography>
          )}

          {you.isTurn && cur ? (
            <Box key={cur.question.id} className="glass pop-in" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.75, border: '2px solid var(--gold)' }}>
              <Typography sx={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.85rem' }}>Twoja kolej!</Typography>
              {cur.deadline && <TimerBar left={qLeft} total={state.config.answerSeconds} />}
              <Typography sx={{ textAlign: 'center', fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.3 }}>{cur.question.pytanie}</Typography>
              {cur.question.typ === 'abcd' ? (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {LETTERS.map((l) => (
                    <Box
                      key={l}
                      component="button"
                      type="button"
                      disabled={busy || paused}
                      onClick={() => act('answer', { value: l })}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 66, px: 2.5, textAlign: 'left', cursor: 'pointer', font: 'inherit', color: K[l].fg, fontWeight: 700, fontSize: '1.05rem', border: '3px solid rgba(255,255,255,0.4)', borderRadius: '16px', background: K[l].bg, '&:active': { transform: 'scale(0.98)' }, '&:disabled': { opacity: 0.5, cursor: 'default' } }}
                    >
                      <span style={{ fontSize: '1.6rem' }}>{K[l].shape}</span>
                      <span>{cur.question.options[l]}</span>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)' }}>🎤 Odpowiedz głośno – prowadzący oceni Twoją odpowiedź.</Typography>
              )}
              {state.phase === 'round' && (
                <Button variant="contained" size="large" onClick={() => act('bank')} disabled={busy || paused || !you.canBank} sx={goldBtn}>
                  💰 BANK {you.canBank ? `(+${r.chainValue})` : '(łańcuch pusty)'}
                </Button>
              )}
            </Box>
          ) : (
            <Box className="glass" sx={{ p: 3, textAlign: 'center' }}>
              {cur ? (
                <>
                  <Avatar code={state.code} player={playerOf(state, cur.playerId)} size={72} badge={false} />
                  <Typography variant="h6" sx={{ color: 'var(--gold)', mt: 1 }}>Teraz odpowiada: {nameOf(state, cur.playerId)}</Typography>
                  <Typography sx={{ mt: 1, color: 'var(--ink-dim)' }}>{cur.question.pytanie}</Typography>
                </>
              ) : (
                <Typography sx={{ color: 'var(--ink-dim)' }}>Czekaj na następne pytanie…</Typography>
              )}
              {state.phase === 'round' && myStats && you.active && <Typography sx={{ mt: 1.5, color: 'var(--ink-dim)' }}>Twój wynik w rundzie: {myStats.correct}✔ {myStats.wrong}✘</Typography>}
              {!you.active && <Typography sx={{ mt: 1.5, color: 'var(--ink-dim)' }}>Odpadłeś(aś) – kibicuj pozostałym!</Typography>}
            </Box>
          )}
        </Box>
      )}

      {state.status === 'running' && state.phase === 'roundEnd' && r && r.summary && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: 'var(--gold)' }}>Koniec rundy {r.n}</Typography>
          <Typography sx={{ mt: 1 }}>💰 do banku: <strong>{r.summary.roundBank}</strong> · razem: <strong>{r.summary.pot}</strong></Typography>
          {myStats && <Typography sx={{ mt: 1, color: 'var(--ink-dim)' }}>Ty: {myStats.correct}✔ {myStats.wrong}✘ · zabankowane {myStats.banked}</Typography>}
          <Typography sx={{ mt: 1 }}>💪 Najsilniejsze ogniwo: <strong>{nameOf(state, r.summary.strongestId)}</strong></Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mt: 1 }}>Za chwilę głosowanie…</Typography>
        </Box>
      )}

      {state.status === 'running' && state.phase === 'vote' && state.v && (
        <>
          <TimerBar left={voteLeft} total={state.config.voteSeconds} />
          {you.active ? (
            <VoteList state={state} you={you} busy={busy} title="Kto jest najsłabszym ogniwem?" onVote={(id) => act('vote', { targetId: id })} />
          ) : (
            <Box className="glass" sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: 'var(--ink-dim)' }}>Odpadłeś(aś) – głosują pozostali ({state.v.voted.length}/{state.v.total}).</Typography>
            </Box>
          )}
        </>
      )}

      {state.status === 'running' && state.phase === 'voteEnd' && state.ve && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">{state.ve.eliminatedId === you.id ? '👋' : '🗳'}</Typography>
          <Typography variant="h5" sx={{ color: state.ve.eliminatedId === you.id ? '#ff9b9b' : 'var(--gold)' }}>
            {state.ve.eliminatedId === you.id ? 'Jesteś najsłabszym ogniwem. Żegnaj!' : `Odpada: ${nameOf(state, state.ve.eliminatedId)}`}
          </Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mt: 1 }}>{state.ve.next === 'duel' ? 'Zostało dwoje graczy – czas na pojedynek.' : 'Za chwilę kolejna runda.'}</Typography>
        </Box>
      )}

      {state.status === 'finished' && state.result && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.4rem' }} aria-hidden="true">🏆</Typography>
          <Typography variant="h5" sx={{ color: 'var(--gold)' }}>
            {state.result.winnerId === you.id ? `Wygrywasz ${state.result.pot} pkt!` : state.result.winnerId ? `Wygrywa ${nameOf(state, state.result.winnerId)}` : 'Koniec gry'}
          </Typography>
          <Box sx={{ mt: 1.5, display: 'grid', gap: 0.5 }}>
            {state.result.ranking.slice(0, 8).map((x) => <Typography key={x.id} sx={{ color: x.id === you.id ? 'var(--gold)' : 'var(--ink)', fontWeight: x.id === you.id ? 800 : 500 }}>{x.rank}. {x.name}</Typography>)}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OgniwoPlayer;
