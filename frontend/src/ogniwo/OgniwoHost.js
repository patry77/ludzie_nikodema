import React from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { TimerBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import { K, LETTERS } from '../kahoot/KahootBits';
import { HostIntro, HostPlayers, HostTop, Panel, field, goldBtn, greenBtn, nameOf, redBtn } from '../party/PartyBits';

const phaseLabel = (state) => {
  if (state.status === 'lobby') return 'Poczekalnia';
  if (state.status === 'finished') return 'Koniec gry';
  if (state.phase === 'duel') return 'Pojedynek';
  return `Runda ${state.round}`;
};

const QuestionBox = ({ state, cur, busy, act, inRound }) => {
  const q = cur.question;
  const who = nameOf(state, cur.playerId);
  return (
    <Panel title={`Odpowiada: ${who}`}>
      <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', mb: 1.5 }}>{q.pytanie}</Typography>
      {q.typ === 'abcd' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1, mb: 2 }}>
          {LETTERS.map((l) => {
            const good = cur.correct && cur.correct.letter === l;
            return (
              <Box key={l} sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1.25, borderRadius: '10px', background: K[l].bg, color: K[l].fg, outline: good ? '4px solid #fff' : 'none' }}>
                <span>{K[l].shape}</span>
                <span style={{ fontWeight: 600 }}>{q.options[l]}{good ? ' ✔' : ''}</span>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.08)' }}>
          <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase' }}>Poprawna odpowiedź</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--gold)' }}>{cur.correct ? cur.correct.text : ''}</Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
        {q.typ === 'otwarte' && (
          <>
            <Button variant="contained" onClick={() => act('judge', { correct: true })} disabled={busy || state.paused} sx={{ ...greenBtn, minWidth: 130 }}>✔ Dobrze</Button>
            <Button variant="contained" onClick={() => act('judge', { correct: false })} disabled={busy || state.paused} sx={{ ...redBtn, minWidth: 130 }}>✘ Źle</Button>
          </>
        )}
        {q.typ === 'abcd' && <Typography sx={{ color: 'var(--ink-dim)' }}>Gracz odpowiada na telefonie – ocena jest automatyczna.</Typography>}
        {inRound && (
          <Button variant="outlined" onClick={() => act('bank')} disabled={busy || state.paused || state.r.chain <= 0} sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)', fontWeight: 800 }}>
            💰 BANK (+{state.r.chainValue})
          </Button>
        )}
        <Button variant="outlined" onClick={() => act('skip')} disabled={busy || state.paused} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>↻ Inne pytanie</Button>
      </Box>
    </Panel>
  );
};

// Panel prowadzacego: Najslabsze ogniwo
const OgniwoHost = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const r = state.r;
  const roundLeft = useSecondsLeft(state.phase === 'round' && r ? r.endsAt : null, offsetRef, state.pausedAt);
  const voteLeft = useSecondsLeft(state.v ? state.v.deadline : null, offsetRef, state.pausedAt);
  const cfg = state.config;
  const set = (patch) => act('config', { config: patch });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3, alignItems: 'start' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <HostTop state={state} title="Najsłabsze ogniwo" subtitle={`${phaseLabel(state)} · w banku ${state.pot}`} act={act} busy={busy} error={error} onResetError={onResetError} pauseNote="Gra jest wstrzymana – czas rundy stoi." />
        <HostIntro state={state} />

        {state.status === 'lobby' && (
          <Panel title="Przed startem">
            <Typography sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
              Gracze odpowiadają po kolei i budują łańcuch poprawnych odpowiedzi (pytania z puli „1 z 10”, bez filmów i muzyki). Przed odpowiedzią mogą powiedzieć BANK – prowadzący lub gracz na telefonie zabezpiecza kwotę.
              Po rundzie wszyscy głosują na najsłabsze ogniwo, a gdy zostanie dwoje graczy, odbywa się pojedynek o cały bank.
              Pytania otwarte oceniasz Ty, ABCD są oceniane automatycznie.
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              <TextField size="small" type="number" label="Pierwsza runda (s)" value={cfg.roundSeconds} disabled={busy} onChange={(e) => set({ roundSeconds: Number(e.target.value) })} sx={field} inputProps={{ min: 30, max: 300 }} />
              <TextField size="small" type="number" label="Skrócenie rundy (s)" value={cfg.roundShrink} disabled={busy} onChange={(e) => set({ roundShrink: Number(e.target.value) })} sx={field} inputProps={{ min: 0, max: 30 }} />
              <TextField size="small" type="number" label="Czas na ABCD (s)" value={cfg.answerSeconds} disabled={busy} onChange={(e) => set({ answerSeconds: Number(e.target.value) })} sx={field} inputProps={{ min: 5, max: 60 }} />
              <TextField size="small" type="number" label="Czas głosowania (s)" value={cfg.voteSeconds} disabled={busy} onChange={(e) => set({ voteSeconds: Number(e.target.value) })} sx={field} inputProps={{ min: 10, max: 180 }} />
              <TextField size="small" type="number" label="Pytań w pojedynku (na gracza)" value={cfg.duelQuestions} disabled={busy} onChange={(e) => set({ duelQuestions: Number(e.target.value) })} sx={field} inputProps={{ min: 2, max: 10 }} />
              {state.test && (
                <TextField select size="small" label="Skuteczność botów" value={cfg.botAccuracy} disabled={busy} onChange={(e) => set({ botAccuracy: Number(e.target.value) })} sx={field}>
                  <MenuItem value={0.3}>niska (30%)</MenuItem>
                  <MenuItem value={0.5}>średnia (50%)</MenuItem>
                  <MenuItem value={0.75}>wysoka (75%)</MenuItem>
                  <MenuItem value={0.9}>bardzo wysoka (90%)</MenuItem>
                </TextField>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
              <Button variant="contained" size="large" onClick={() => act('start')} disabled={busy || state.players.length < 3} sx={goldBtn}>
                ▶ Start gry ({state.players.length} graczy)
              </Button>
              <Button variant="outlined" onClick={() => act('addBot')} disabled={busy || state.players.length >= 12} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>🤖 Dodaj bota</Button>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 2 }}>
              Potrzeba co najmniej 3 graczy (maks. 12). Pula pytań: {state.poolSize}
              {state.insideIncluded === true && ' · z pytaniami „inside”'}
              {state.insideIncluded === false && ' · bez pytań „inside”'}
            </Typography>
          </Panel>
        )}

        {state.status === 'running' && state.phase === 'round' && r && (
          <>
            <Panel title={`Runda ${r.n}`}>
              <TimerBar left={roundLeft} total={r.seconds} />
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1.5, color: 'var(--ink-dim)' }}>
                <span>⛓ Łańcuch: <strong style={{ color: 'var(--ink)' }}>{r.chain}</strong> ({r.chainValue} pkt)</span>
                <span>💰 Bank rundy: <strong style={{ color: 'var(--gold)' }}>{r.roundBank}</strong></span>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={() => act('next')} disabled={busy} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>⏭ Zakończ rundę teraz</Button>
              </Box>
            </Panel>
            {r.cur && <QuestionBox state={state} cur={r.cur} busy={busy} act={act} inRound />}
          </>
        )}

        {state.status === 'running' && state.phase === 'roundEnd' && r && r.summary && (
          <Panel title="Podsumowanie rundy">
            <Typography sx={{ mb: 1.5 }}>
              💰 Do banku trafia <strong style={{ color: 'var(--gold)' }}>{r.summary.roundBank}</strong> · razem: <strong style={{ color: 'var(--gold)' }}>{r.summary.pot}</strong>
            </Typography>
            <Box sx={{ display: 'grid', gap: 0.75, mb: 2 }}>
              {r.summary.rows.map((x) => (
                <Typography key={x.playerId}>
                  {x.playerId === r.summary.strongestId ? '💪 ' : x.playerId === r.summary.weakestId ? '🐌 ' : ''}
                  <strong>{nameOf(state, x.playerId)}</strong>: {x.correct} dobrze, {x.wrong} źle, w banku {x.banked}
                </Typography>
              ))}
            </Box>
            <Button variant="contained" size="large" onClick={() => act('next')} disabled={busy} sx={goldBtn}>🗳 Przejdź do głosowania</Button>
          </Panel>
        )}

        {state.status === 'running' && state.phase === 'vote' && state.v && (
          <Panel title="Głosowanie">
            <TimerBar left={voteLeft} total={cfg.voteSeconds} />
            <Typography sx={{ my: 1.5 }}>Zagłosowało: <strong>{state.v.voted.length}/{state.v.total}</strong></Typography>
            <Button variant="contained" onClick={() => act('next')} disabled={busy} sx={goldBtn}>Zamknij głosowanie teraz</Button>
          </Panel>
        )}

        {state.status === 'running' && state.phase === 'voteEnd' && state.ve && (
          <Panel title="Wynik głosowania">
            <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', mb: 1 }}>Odpada: <span style={{ color: 'var(--gold)' }}>{nameOf(state, state.ve.eliminatedId)}</span></Typography>
            <Typography sx={{ color: 'var(--ink-dim)', mb: 2 }}>
              {state.ve.method === 'strongest' && 'Remis rozstrzygnął głos najsilniejszego ogniwa. '}
              {state.ve.method === 'stats' && 'Remis – zdecydowały statystyki rundy. '}
              {state.ve.next === 'duel' ? 'Zostało dwoje graczy – czas na pojedynek.' : 'Gramy kolejną rundę.'}
            </Typography>
            <Button variant="contained" size="large" onClick={() => act('next')} disabled={busy} sx={goldBtn}>
              {state.ve.next === 'duel' ? '⚔ Zaczynamy pojedynek' : '▶ Następna runda'}
            </Button>
          </Panel>
        )}

        {state.status === 'running' && state.phase === 'duel' && state.d && (
          <>
            <Panel title="Pojedynek">
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {state.d.order.map((id) => `${nameOf(state, id)} ${state.d.score[id]}`).join('  :  ')}
              </Typography>
              <Typography sx={{ color: 'var(--ink-dim)' }}>{state.d.suddenDeath ? 'Nagła śmierć – po każdej parze pytań sprawdzamy wynik.' : `Pytanie ${state.d.asked + 1} z ${state.d.perPlayer * 2}`} · stawka {state.pot}</Typography>
            </Panel>
            {state.d.cur && <QuestionBox state={state} cur={state.d.cur} busy={busy} act={act} inRound={false} />}
          </>
        )}

        {state.status === 'finished' && state.result && (
          <Panel title="Wyniki końcowe">
            <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--gold)', mb: 1.5 }}>
              {state.result.winnerId ? `🏆 ${nameOf(state, state.result.winnerId)} – ${state.result.pot} pkt` : state.result.reason}
            </Typography>
            <Box sx={{ display: 'grid', gap: 0.5 }}>
              {state.result.ranking.map((x) => <Typography key={x.id}>{x.rank}. {x.name}</Typography>)}
            </Box>
          </Panel>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <HostPlayers
          state={state}
          act={act}
          busy={busy}
          extra={(p) => {
            if (state.status !== 'running') return null;
            const cur = (state.phase === 'duel' && state.d ? state.d.cur : r && r.cur) || null;
            const s = r && r.stats ? r.stats[p.id] : null;
            return (
              <>
                {cur && cur.playerId === p.id && <span title="Teraz odpowiada">🎤</span>}
                {s && <span style={{ fontSize: '0.85rem' }}>{s.correct}✔ {s.wrong}✘</span>}
                {state.phase === 'vote' && state.v && p.active !== false && <span>{state.v.voted.includes(p.id) ? '✅' : '⏳'}</span>}
                {p.active === false && <span title="Odpadł(a)">❌</span>}
              </>
            );
          }}
        />
      </Box>
    </Box>
  );
};

export default OgniwoHost;
