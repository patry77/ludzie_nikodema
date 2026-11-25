import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Avatar } from '../quiz/Avatar';
import { HexBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import { K, LETTERS } from '../kahoot/KahootBits';
import { BigTimer, TvFrame, TvPlayerRow, VoteReveal, VoteWait, nameOf, playerOf, useFinaleConfetti } from '../party/PartyBits';

const Ladder = ({ ladder, chain, roundBank, pot }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.6vh, 8px)', minWidth: 'clamp(110px, 14vw, 280px)' }}>
    <Box sx={{ display: 'flex', flexDirection: 'column-reverse', gap: 'clamp(2px, 0.5vh, 6px)' }}>
      {ladder.map((v, i) => {
        const done = i < chain;
        const now = i === chain - 1;
        return (
          <Box
            key={v}
            sx={{
              textAlign: 'center',
              fontWeight: 800,
              fontSize: 'clamp(0.8rem, min(1.5vw, 2.6vh), 1.9rem)',
              py: 'clamp(1px, 0.5vh, 6px)',
              borderRadius: '8px',
              color: done ? '#1a1205' : 'var(--ink-dim)',
              background: done ? 'linear-gradient(120deg, var(--gold-light), var(--gold))' : 'rgba(255,255,255,0.08)',
              border: now ? '2px solid #fff' : '2px solid transparent',
              boxShadow: now ? '0 0 18px rgba(var(--accent-rgb),0.8)' : 'none',
              transition: 'all .25s',
            }}
          >
            {v}
          </Box>
        );
      })}
    </Box>
    <Box sx={{ mt: 'clamp(4px, 1vh, 12px)', p: 'clamp(4px, 1vh, 12px)', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', textAlign: 'center' }}>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.7rem, 1vw, 1.1rem)', letterSpacing: 2, textTransform: 'uppercase' }}>💰 Bank rundy</Typography>
      <Typography sx={{ fontWeight: 800, color: 'var(--gold)', fontSize: 'clamp(1.2rem, min(2.6vw, 4.6vh), 3.4rem)', lineHeight: 1.1 }}>{roundBank}</Typography>
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.7rem, 1vw, 1.1rem)' }}>razem w grze: {pot}</Typography>
    </Box>
  </Box>
);

const QuestionBlock = ({ state, cur, chipLabel }) => {
  const q = cur.question;
  const p = playerOf(state, cur.playerId);
  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.6vh, 22px)', justifyContent: 'center' }}>
      <Box className="pop-in" key={cur.playerId + q.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
        <Avatar code={state.code} player={p} size="clamp(50px, 9vh, 130px)" badge={false} />
        <Box>
          <Typography sx={{ color: 'var(--ink-dim)', letterSpacing: 4, textTransform: 'uppercase', fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>{chipLabel || 'Odpowiada'}</Typography>
          <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem, min(4.4vw, 8vh), 5rem)', lineHeight: 1 }}>{p.name}</Typography>
        </Box>
      </Box>
      <HexBar minHeight="clamp(60px, 14vh, 160px)" px={{ xs: 4, sm: 6 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 'clamp(1.2rem, min(2.8vw, 5vh), 3.4rem)', lineHeight: 1.3, py: 1, width: '100%', textAlign: 'center' }}>{q.pytanie}</Typography>
      </HexBar>
      {q.typ === 'abcd' ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(6px, 1vh, 14px)' }}>
          {LETTERS.map((l) => (
            <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1vw, 18px)', minHeight: 'clamp(40px, 8vh, 100px)', px: 'clamp(10px, 1.4vw, 28px)', borderRadius: '14px', background: K[l].bg, color: K[l].fg, border: '3px solid rgba(255,255,255,0.35)' }}>
              <Typography component="span" sx={{ fontSize: 'clamp(1.1rem, min(2.2vw, 4vh), 2.6rem)', lineHeight: 1 }}>{K[l].shape}</Typography>
              <Typography component="span" sx={{ fontWeight: 700, fontSize: 'clamp(0.9rem, min(1.8vw, 3.4vh), 2rem)', lineHeight: 1.2 }}>{q.options[l]}</Typography>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography sx={{ textAlign: 'center', color: 'var(--gold)', fontWeight: 700, fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>🎤 Odpowiedź głosem – ocenia prowadzący</Typography>
      )}
    </Box>
  );
};

const LastLine = ({ state, last }) => {
  if (!last) return <Box sx={{ minHeight: 'clamp(22px, 4vh, 44px)' }} />;
  return (
    <Typography key={last.n} className="pop-in" sx={{ textAlign: 'center', minHeight: 'clamp(22px, 4vh, 44px)', fontSize: 'clamp(0.9rem, min(1.5vw, 2.8vh), 1.9rem)', color: last.correct ? '#7dff9d' : '#ff9b9b', fontWeight: 700 }}>
      {last.correct ? '✅' : '❌'} {nameOf(state, last.playerId)}: {last.correct ? 'dobrze!' : last.timeout ? 'brak odpowiedzi.' : 'źle.'}
      {!last.correct && <span style={{ color: 'var(--ink-dim)', fontWeight: 600 }}> Poprawna: {last.answerText}</span>}
    </Typography>
  );
};

const RoundView = ({ state, offsetRef }) => {
  const r = state.r;
  const left = useSecondsLeft(r.endsAt, offsetRef, state.pausedAt);
  const [flash, setFlash] = useState(null);
  const bankN = r.lastBank ? r.lastBank.n : 0;
  useEffect(() => {
    if (!bankN) return undefined;
    setFlash(r.lastBank);
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [bankN]); // eslint-disable-line react-hooks/exhaustive-deps
  const cur = r.cur;
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vh, 18px)', width: '100%', maxWidth: 1700, mx: 'auto', position: 'relative' }}>
      <BigTimer left={left} total={r.seconds} label={`Runda ${r.n}`} />
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 'clamp(10px, 1.8vw, 36px)', alignItems: 'stretch' }}>
        <Ladder ladder={state.ladder} chain={Math.min(r.chain, state.ladder.length)} roundBank={r.roundBank} pot={state.pot} />
        {cur ? <QuestionBlock state={state} cur={cur} /> : <Box sx={{ flex: 1 }} />}
        <Box sx={{ width: 'clamp(220px, 24vw, 520px)', display: 'flex', flexDirection: 'column', gap: 'clamp(3px, 0.7vh, 9px)', justifyContent: 'center' }}>
          {r.order.map((id) => {
            const p = playerOf(state, id);
            const s = r.stats[id] || {};
            return (
              <TvPlayerRow key={id} state={state} p={p} highlight={cur && cur.playerId === id}>
                <span style={{ color: '#7dff9d', fontWeight: 800 }}>{s.correct || 0}✔</span>
                <span style={{ color: '#ff9b9b', fontWeight: 800 }}>{s.wrong || 0}✘</span>
                {s.banked > 0 && <span style={{ color: 'var(--gold)', fontWeight: 800 }}>💰{s.banked}</span>}
              </TvPlayerRow>
            );
          })}
        </Box>
      </Box>
      <LastLine state={state} last={r.last} />
      {flash && (
        <Box className="pop-in" sx={{ position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)', zIndex: 40, textAlign: 'center', p: 'clamp(10px, 2vh, 30px) clamp(20px, 4vw, 70px)', borderRadius: '24px', background: 'rgba(5,8,38,0.9)', border: '3px solid var(--gold)', boxShadow: '0 0 60px rgba(var(--accent-rgb),0.8)' }}>
          <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, min(6vw, 10vh), 7rem)', lineHeight: 1.05 }}>💰 BANK +{flash.value}</Typography>
          <Typography sx={{ fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>{nameOf(state, flash.playerId)}{flash.auto ? ' – pełny łańcuch!' : ''}</Typography>
        </Box>
      )}
    </Box>
  );
};

const RoundEndView = ({ state }) => {
  const r = state.r;
  const sum = r.summary;
  const rows = [...sum.rows].sort((a, b) => b.correct - a.correct || a.wrong - b.wrong);
  const reason = r.endReason === 'time' ? 'Czas minął!' : 'Runda zakończona';
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.6vh, 24px)', width: '100%', maxWidth: 1400, mx: 'auto', justifyContent: 'center', position: 'relative' }}>
      <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, textAlign: 'center', fontSize: 'clamp(1.8rem, min(5vw, 8vh), 5.5rem)', lineHeight: 1.05 }}>{reason}</Typography>
      <Typography sx={{ textAlign: 'center', fontSize: 'clamp(1.1rem, 2.4vw, 3rem)', fontWeight: 800 }}>
        💰 Do banku trafia <span style={{ color: 'var(--gold)' }}>{sum.roundBank}</span> · w grze: <span style={{ color: 'var(--gold)' }}>{sum.pot}</span>
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: rows.length > 6 ? '1fr 1fr' : '1fr', gap: 'clamp(4px, 0.9vh, 12px) clamp(10px, 1.4vw, 24px)' }}>
        {rows.map((x) => {
          const p = playerOf(state, x.playerId);
          return (
            <TvPlayerRow key={x.playerId} state={state} p={p}>
              {x.playerId === sum.strongestId && <span title="Najsilniejsze ogniwo">💪</span>}
              {x.playerId === sum.weakestId && <span title="Najsłabsze ogniwo">🐌</span>}
              <span style={{ color: '#7dff9d', fontWeight: 800 }}>{x.correct}✔</span>
              <span style={{ color: '#ff9b9b', fontWeight: 800 }}>{x.wrong}✘</span>
              <span style={{ color: 'var(--gold)', fontWeight: 800, minWidth: '4em', textAlign: 'right' }}>💰{x.banked}</span>
            </TvPlayerRow>
          );
        })}
      </Box>
      <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 'clamp(0.9rem, 1.6vw, 2rem)' }}>💪 najsilniejsze ogniwo · 🐌 najsłabsze statystyki – za chwilę głosowanie</Typography>
    </Box>
  );
};

const DuelView = ({ state, offsetRef }) => {
  const d = state.d;
  const cur = d.cur;
  const left = useSecondsLeft(cur ? cur.deadline : null, offsetRef, state.pausedAt);
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.6vh, 22px)', width: '100%', maxWidth: 1600, mx: 'auto', position: 'relative' }}>
      <Typography sx={{ textAlign: 'center', color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.8vw, 2.2rem)' }}>
        ⚔ Pojedynek {d.suddenDeath ? '· nagła śmierć' : `· po ${d.perPlayer} pytań`} · pula {state.pot}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 2vw, 40px)' }}>
        {d.order.map((id) => {
          const p = playerOf(state, id);
          const active = cur && cur.playerId === id;
          return (
            <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 'clamp(6px, 1.2vh, 18px)', borderRadius: '18px', background: active ? 'linear-gradient(90deg, rgba(var(--accent-rgb),0.4), rgba(255,255,255,0.1))' : 'rgba(255,255,255,0.07)', border: active ? '3px solid var(--gold)' : '3px solid transparent', boxShadow: active ? '0 0 30px rgba(var(--accent-rgb),0.6)' : 'none' }}>
              <Avatar code={state.code} player={p} size="clamp(46px, 9vh, 120px)" badge={false} />
              <Typography noWrap sx={{ flex: 1, fontWeight: 800, fontSize: 'clamp(1.2rem, min(3vw, 5.4vh), 3.6rem)' }}>{p.name}</Typography>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--gold)', fontSize: 'clamp(2rem, min(5vw, 9vh), 6rem)', lineHeight: 1 }}>{d.score[id]}</Typography>
            </Box>
          );
        })}
      </Box>
      {cur ? (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.2vh, 16px)' }}>
          {cur.deadline && <BigTimer left={left} total={state.config.answerSeconds} />}
          <QuestionBlock state={state} cur={cur} chipLabel={`Odpowiada · pytanie ${d.asked + 1}`} />
        </Box>
      ) : (
        <Box sx={{ flex: 1 }} />
      )}
      <LastLine state={state} last={d.last} />
    </Box>
  );
};

const FinalView = ({ state }) => {
  useFinaleConfetti();
  const r = state.result;
  const win = r.winnerId ? playerOf(state, r.winnerId) : null;
  const runner = r.runnerUpId ? playerOf(state, r.runnerUpId) : null;
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(6px, 1.4vh, 20px)', textAlign: 'center', position: 'relative' }}>
      <Typography className="pop-in" sx={{ color: 'var(--gold)', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.8vw, 2.2rem)' }}>{win ? 'Najsilniejsze ogniwo' : r.reason}</Typography>
      {win && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar code={state.code} player={win} size="clamp(70px, 14vh, 220px)" badge={false} />
          <Typography className="gold-text neon-title pop-in" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, min(7vw, 11vh), 8rem)', lineHeight: 1.05 }}>🏆 {win.name}</Typography>
        </Box>
      )}
      <Typography sx={{ fontSize: 'clamp(1.2rem, 2.8vw, 3.4rem)', fontWeight: 800 }}>
        {win ? 'zgarnia ' : 'W banku zostało '}<span style={{ color: 'var(--gold)' }}>{r.pot}</span> pkt
      </Typography>
      {runner && r.duel && <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.8vw, 2.2rem)' }}>Pojedynek: {win.name} {r.duel.score[win.id]} : {r.duel.score[runner.id]} {runner.name}{r.duel.suddenDeath ? ' (po nagłej śmierci)' : ''}</Typography>}
      <Box sx={{ display: 'grid', gridTemplateColumns: r.ranking.length > 6 ? '1fr 1fr' : '1fr', gap: 'clamp(3px, 0.8vh, 10px) clamp(10px, 1.4vw, 24px)', width: 'min(1100px, 96%)' }}>
        {r.ranking.map((x) => (
          <TvPlayerRow key={x.id} state={state} p={playerOf(state, x.id)}>
            <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{x.rank}.</span>
          </TvPlayerRow>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 'clamp(10px, 3vw, 60px)', flexWrap: 'wrap', justifyContent: 'center', fontSize: 'clamp(0.85rem, min(1.5vw, 2.8vh), 1.8rem)' }}>
        {r.awards.mostCorrect && <span>🎯 Najwięcej dobrych odpowiedzi: <strong style={{ color: 'var(--gold)' }}>{nameOf(state, r.awards.mostCorrect.id)}</strong> ({r.awards.mostCorrect.value})</span>}
        {r.awards.mostStrongest && <span>💪 Najsilniejsze ogniwo rund: <strong style={{ color: 'var(--gold)' }}>{nameOf(state, r.awards.mostStrongest.id)}</strong> ×{r.awards.mostStrongest.value}</span>}
      </Box>
    </Box>
  );
};

const subtitleOf = (state) => {
  if (state.status === 'lobby') return 'Poczekalnia';
  if (state.status === 'finished') return 'Koniec gry';
  if (state.phase === 'duel') return 'Pojedynek';
  return `Runda ${state.round}`;
};

const OgniwoTv = ({ state, offsetRef }) => {
  const running = state.status === 'running';
  const voteLeft = useSecondsLeft(state.v ? state.v.deadline : null, offsetRef, state.pausedAt);
  return (
    <TvFrame state={state} title="Najsłabsze ogniwo" subtitle={subtitleOf(state)} lobbyHint="Odpowiadacie po kolei – łańcuch poprawnych odpowiedzi rośnie, ale błąd go zrywa. Powiedz BANK, żeby go zabezpieczyć. Po rundzie głosujecie, kto jest najsłabszym ogniwem.">
      {running && state.phase === 'round' && state.r && <RoundView state={state} offsetRef={offsetRef} />}
      {running && state.phase === 'roundEnd' && state.r && state.r.summary && <RoundEndView state={state} />}
      {running && state.phase === 'vote' && state.v && (
        <VoteWait state={state} left={voteLeft} total={state.config.voteSeconds} title="Kto jest najsłabszym ogniwem?" hint="Głosujcie na telefonach. Remis rozstrzyga najsilniejsze ogniwo rundy." />
      )}
      {running && state.phase === 'voteEnd' && state.ve && (
        <VoteReveal state={state} ve={state.ve} title="Najsłabsze ogniwo" resultLine={`Odpada! ${state.ve.method === 'strongest' ? '(remis rozstrzygnął najsilniejszy)' : state.ve.method === 'stats' ? '(remis – decydują statystyki)' : ''}`} />
      )}
      {running && state.phase === 'duel' && state.d && <DuelView state={state} offsetRef={offsetRef} />}
      {state.status === 'finished' && state.result && <FinalView state={state} />}
    </TvFrame>
  );
};

export default OgniwoTv;
