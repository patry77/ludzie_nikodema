import React, { useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { TimerBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import { HostIntro, HostPlayers, HostTop, Panel, field, goldBtn, nameOf } from '../party/PartyBits';

const subtitleOf = (state) => (state.status === 'lobby' ? 'Poczekalnia' : state.status === 'finished' ? 'Koniec gry' : `Runda ${state.round} · pula ${state.pot}`);

// Panel prowadzacego: Klamczuch
const KlamczuchHost = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const r = state.r;
  const cur = r && r.cur;
  const left = useSecondsLeft(cur ? cur.deadline : null, offsetRef, state.pausedAt);
  const voteLeft = useSecondsLeft(state.v ? state.v.deadline : null, offsetRef, state.pausedAt);
  const [showCheater, setShowCheater] = useState(false);
  const cfg = state.config;
  const set = (patch) => act('config', { config: patch });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <HostTop state={state} title="Kłamczuch" subtitle={subtitleOf(state)} act={act} busy={busy} error={error} onResetError={onResetError} pauseNote="Gra jest wstrzymana – czas na odpowiedź stoi." />
        <HostIntro state={state} />

        {state.status === 'lobby' && (
          <Panel title="Przed startem">
            <Typography sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
              Po starcie losowany jest jeden <strong style={{ color: 'var(--ink)' }}>kłamczuch</strong> – na swoim telefonie widzi całą tablicę odpowiedzi (jak w Familiadzie). Pozostali odpowiadają z głowy.
              W każdej rundzie jedno pytanie: gracze podają po jednej odpowiedzi głosem, a Ty wskazujesz, która pozycja z tablicy pasuje (albo pudło).
              Potem wszyscy głosują na kłamczucha – kto dostanie najwięcej głosów, odpada i ujawnia rolę. Kłamczuch w finałowej dwójce wygrywa.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              <TextField size="small" type="number" label="Czas na odpowiedź (s)" value={cfg.answerSeconds} disabled={busy} onChange={(e) => set({ answerSeconds: Number(e.target.value) })} sx={field} inputProps={{ min: 8, max: 90 }} />
              <TextField size="small" type="number" label="Czas głosowania (s)" value={cfg.voteSeconds} disabled={busy} onChange={(e) => set({ voteSeconds: Number(e.target.value) })} sx={field} inputProps={{ min: 15, max: 240 }} />
              {state.test && (
                <TextField select size="small" label="Skuteczność botów" value={cfg.botAccuracy} disabled={busy} onChange={(e) => set({ botAccuracy: Number(e.target.value) })} sx={field}>
                  <MenuItem value={0.3}>niska (30%)</MenuItem>
                  <MenuItem value={0.5}>średnia (50%)</MenuItem>
                  <MenuItem value={0.75}>wysoka (75%)</MenuItem>
                </TextField>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
              <Button variant="contained" size="large" onClick={() => act('start')} disabled={busy || state.players.length < 4} sx={goldBtn}>
                ▶ Start gry ({state.players.length} graczy)
              </Button>
              <Button variant="outlined" onClick={() => act('addBot')} disabled={busy || state.players.length >= 10} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>🤖 Dodaj bota</Button>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 2 }}>Potrzeba co najmniej 4 graczy (maks. 10). Pula pytań: {state.poolSize}</Typography>
          </Panel>
        )}

        {state.status === 'running' && r && (
          <Panel title={`Runda ${r.n}`}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', mb: 1.5 }}>{r.question}</Typography>
            <Box sx={{ display: 'grid', gap: 0.75, mb: 2 }}>
              {r.board.map((b, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1, borderRadius: '10px', background: b.revealed ? 'rgba(var(--accent-rgb),0.3)' : 'rgba(255,255,255,0.07)' }}>
                  <strong style={{ color: 'var(--gold)', width: 22 }}>{i + 1}</strong>
                  <span style={{ flex: 1, fontWeight: 700 }}>{b.text}</span>
                  {b.revealed && b.by && <span style={{ color: 'var(--ink-dim)', fontSize: '0.85rem' }}>{nameOf(state, b.by)}</span>}
                  <strong style={{ color: 'var(--gold)' }}>{b.points}</strong>
                  {state.phase === 'answer' && cur && !b.revealed && (
                    <Button size="small" variant="contained" onClick={() => act('mark', { idx: i })} disabled={busy || state.paused} sx={goldBtn}>To ta</Button>
                  )}
                </Box>
              ))}
            </Box>

            {state.phase === 'answer' && cur && (
              <Box>
                <TimerBar left={left} total={cfg.answerSeconds} />
                <Typography sx={{ my: 1.5 }}>
                  Teraz odpowiada: <strong style={{ color: 'var(--gold)' }}>{nameOf(state, cur.playerId)}</strong> ({r.turn + 1}/{r.order.length}). Wskaż pozycję z tablicy, którą podał(a):
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
                  <Button variant="outlined" onClick={() => act('mark', { idx: null })} disabled={busy || state.paused} sx={{ color: '#ff9b9b', borderColor: 'rgba(255,155,155,0.6)', fontWeight: 800 }}>✘ Pudło (brak na tablicy)</Button>
                  {r.log.length === 0 && <Button variant="outlined" onClick={() => act('skip')} disabled={busy} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>↻ Inne pytanie</Button>}
                </Box>
              </Box>
            )}

            {state.phase === 'roundEnd' && (
              <Button variant="contained" size="large" onClick={() => act('next')} disabled={busy} sx={goldBtn}>🗳 Przejdź do głosowania</Button>
            )}
            {state.phase === 'vote' && state.v && (
              <Box>
                <TimerBar left={voteLeft} total={cfg.voteSeconds} />
                <Typography sx={{ my: 1.5 }}>Zagłosowało: <strong>{state.v.voted.length}/{state.v.total}</strong></Typography>
                <Button variant="contained" onClick={() => act('next')} disabled={busy} sx={goldBtn}>Zamknij głosowanie teraz</Button>
              </Box>
            )}
            {state.phase === 'voteEnd' && state.ve && (
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', mb: 0.5 }}>Odpada: <span style={{ color: 'var(--gold)' }}>{nameOf(state, state.ve.eliminatedId)}</span></Typography>
                <Typography sx={{ mb: 2, color: state.ve.wasCheater ? '#7dff9d' : 'var(--ink-dim)' }}>
                  {state.ve.wasCheater ? '🕵 To był kłamczuch – uczciwi wygrywają!' : state.ve.next === 'end' ? 'Był uczciwy – a kłamczuch dotarł do finałowej dwójki i wygrywa.' : 'Był uczciwy. Gramy dalej.'}
                  {state.ve.method === 'score' && ' (remis – odpadł ten z większą liczbą punktów)'}
                  {state.ve.method === 'random' && ' (remis – losowanie)'}
                </Typography>
                <Button variant="contained" size="large" onClick={() => act('next')} disabled={busy} sx={goldBtn}>
                  {state.ve.next === 'end' ? '🏁 Pokaż wynik gry' : '▶ Następna runda'}
                </Button>
              </Box>
            )}
          </Panel>
        )}

        {state.status === 'running' && (
          <Panel title="Kto jest kłamczuchem?">
            {showCheater ? (
              <Typography sx={{ fontWeight: 800 }}>🕵 {nameOf(state, state.cheaterId)} <Button size="small" onClick={() => setShowCheater(false)} sx={{ ml: 1, color: 'var(--ink-dim)' }}>ukryj</Button></Typography>
            ) : (
              <Button variant="outlined" onClick={() => setShowCheater(true)} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>Pokaż (tylko dla prowadzącego)</Button>
            )}
          </Panel>
        )}

        {state.status === 'finished' && state.result && (
          <Panel title="Wynik">
            <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--gold)', mb: 1 }}>
              {state.result.winner === 'honest' ? 'Wygrywają uczciwi' : state.result.winner === 'cheater' ? 'Wygrywa kłamczuch' : state.result.reason}
            </Typography>
            <Typography>🕵 Kłamczuch: <strong>{state.result.cheaterName}</strong> · pula {state.result.pot} pkt</Typography>
            <Typography sx={{ color: 'var(--ink-dim)', mt: 1 }}>
              Detektywi: {state.result.detectives.filter((d) => d.votes > 0).map((d) => `${nameOf(state, d.id)} (${d.votes}×)`).join(', ') || 'nikt nie trafił'}
            </Typography>
          </Panel>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <HostPlayers
          state={state}
          act={act}
          busy={busy}
          extra={(p) => {
            if (state.status === 'lobby') return null;
            return (
              <>
                {cur && cur.playerId === p.id && <span title="Teraz odpowiada">🎤</span>}
                {state.phase === 'vote' && state.v && p.active !== false && <span>{state.v.voted.includes(p.id) ? '✅' : '⏳'}</span>}
                {p.active === false && <span title={p.wasCheater ? 'Kłamczuch' : 'Uczciwy'}>{p.wasCheater ? '🕵' : '❌'}</span>}
                <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{p.score}</span>
              </>
            );
          }}
        />
      </Box>
    </Box>
  );
};

export default KlamczuchHost;
