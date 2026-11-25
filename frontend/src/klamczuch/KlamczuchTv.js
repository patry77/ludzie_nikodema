import React from 'react';
import { Box, Typography } from '@mui/material';
import { Avatar } from '../quiz/Avatar';
import { HexBar } from '../quiz/QuizBits';
import { useSecondsLeft } from '../quiz/quizApi';
import { BigTimer, TvFrame, TvPlayerRow, VoteReveal, VoteWait, nameOf, playerOf, useFinaleConfetti } from '../party/PartyBits';

// Tablica odpowiedzi: odkryte pokazuja tekst, punkty i kto je podal; nieodkryte - tylko numer
export const Board = ({ state, board, compact }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 'clamp(3px, 0.8vh, 9px)' : 'clamp(4px, 1vh, 12px)', flex: 1, minHeight: 0, justifyContent: 'center' }}>
    {board.map((b, i) => (
      <Box
        key={i}
        className={b.revealed ? 'pop-in' : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(8px, 1vw, 20px)',
          minHeight: compact ? 'clamp(30px, 6.4vh, 70px)' : 'clamp(36px, 8.4vh, 96px)',
          px: 'clamp(10px, 1.4vw, 28px)',
          borderRadius: '14px',
          background: b.revealed ? 'linear-gradient(90deg, rgba(var(--accent-rgb),0.45), rgba(255,255,255,0.12))' : 'rgba(255,255,255,0.07)',
          border: b.revealed ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.1)',
          opacity: !b.revealed && b.text ? 0.75 : 1,
          fontSize: 'clamp(1rem, min(2.2vw, 4.2vh), 2.6rem)',
        }}
      >
        <Typography component="span" sx={{ fontWeight: 800, color: 'var(--gold)', width: '1.4em', fontSize: 'inherit' }}>{i + 1}</Typography>
        <Typography component="span" sx={{ flex: 1, minWidth: 0, fontWeight: 800, letterSpacing: 1, fontSize: 'inherit', textTransform: 'uppercase' }} noWrap>
          {b.text || '· · · · · · · ·'}
        </Typography>
        {b.revealed && b.by && <Typography component="span" sx={{ color: 'var(--ink-dim)', fontSize: '0.55em' }} noWrap>{nameOf(state, b.by)}</Typography>}
        {b.points !== null && b.points !== undefined && <Typography component="span" sx={{ fontWeight: 800, color: 'var(--gold)', minWidth: '2em', textAlign: 'right', fontSize: 'inherit' }}>{b.points}</Typography>}
      </Box>
    ))}
  </Box>
);

const AnswerView = ({ state, offsetRef }) => {
  const r = state.r;
  const cur = r.cur;
  const left = useSecondsLeft(cur ? cur.deadline : null, offsetRef, state.pausedAt);
  const curP = cur ? playerOf(state, cur.playerId) : null;
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.4vh, 20px)', width: '100%', maxWidth: 1700, mx: 'auto', position: 'relative' }}>
      <BigTimer left={left} total={state.config.answerSeconds} label={`Runda ${r.n}`} />
      <HexBar minHeight="clamp(56px, 12vh, 140px)" px={{ xs: 4, sm: 6 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 'clamp(1.2rem, min(2.8vw, 5vh), 3.4rem)', lineHeight: 1.3, py: 1, width: '100%', textAlign: 'center' }}>{r.question}</Typography>
      </HexBar>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 'clamp(10px, 1.8vw, 36px)' }}>
        <Box sx={{ flex: 1.5, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Board state={state} board={r.board} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(3px, 0.8vh, 10px)' }}>
          {curP && (
            <Box key={curP.id} className="pop-in" sx={{ textAlign: 'center', mb: 'clamp(4px, 1vh, 14px)' }}>
              <Typography sx={{ color: 'var(--ink-dim)', letterSpacing: 4, textTransform: 'uppercase', fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>Teraz odpowiada</Typography>
              <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.6rem, min(4.2vw, 7.5vh), 4.6rem)', lineHeight: 1.05 }}>{curP.name}</Typography>
            </Box>
          )}
          {r.order.map((id) => {
            const p = playerOf(state, id);
            const pts = r.scores[id];
            return (
              <TvPlayerRow key={id} state={state} p={p} highlight={cur && cur.playerId === id}>
                {pts !== null && pts !== undefined && <span style={{ color: pts > 0 ? '#7dff9d' : '#ff9b9b', fontWeight: 800 }}>{pts > 0 ? `+${pts}` : 'pudło'}</span>}
                <span style={{ color: 'var(--gold)', fontWeight: 800, minWidth: '2.6em', textAlign: 'right' }}>{p.score}</span>
              </TvPlayerRow>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

const RoundEndView = ({ state }) => {
  const r = state.r;
  const rows = [...r.summary.rows].sort((a, b) => b.points - a.points);
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1.4vh, 20px)', width: '100%', maxWidth: 1700, mx: 'auto', position: 'relative' }}>
      <Typography sx={{ textAlign: 'center', color: 'var(--gold)', letterSpacing: 6, textTransform: 'uppercase', fontSize: 'clamp(0.9rem, 1.8vw, 2.2rem)' }}>Koniec rundy {r.n} – kto jest kłamczuchem?</Typography>
      <HexBar minHeight="clamp(46px, 9vh, 110px)" px={{ xs: 4, sm: 6 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 'clamp(1.1rem, min(2.4vw, 4.4vh), 3rem)', lineHeight: 1.3, py: 1, width: '100%', textAlign: 'center' }}>{r.question}</Typography>
      </HexBar>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 'clamp(10px, 1.8vw, 36px)' }}>
        <Box sx={{ flex: 1.5, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Board state={state} board={r.board} compact />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(3px, 0.8vh, 10px)' }}>
          {rows.map((x) => (
            <TvPlayerRow key={x.playerId} state={state} p={playerOf(state, x.playerId)}>
              <span style={{ color: 'var(--ink-dim)', fontSize: '0.8em', maxWidth: '40%' }}>{x.text ? x.text : 'pudło'}</span>
              <span style={{ color: x.points > 0 ? '#7dff9d' : '#ff9b9b', fontWeight: 800 }}>{x.points > 0 ? `+${x.points}` : '0'}</span>
              <span style={{ color: 'var(--gold)', fontWeight: 800, minWidth: '2.6em', textAlign: 'right' }}>{playerOf(state, x.playerId).score}</span>
            </TvPlayerRow>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

const FinalView = ({ state }) => {
  useFinaleConfetti();
  const r = state.result;
  const cheater = playerOf(state, r.cheaterId);
  const honestWin = r.winner === 'honest';
  const winnerLine = r.winner === 'honest' ? 'Wygrywają UCZCIWI!' : r.winner === 'cheater' ? 'Wygrywa KŁAMCZUCH!' : 'Koniec gry';
  const detectives = r.detectives.filter((d) => d.votes > 0).slice(0, 5);
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(8px, 1.6vh, 24px)', textAlign: 'center', position: 'relative' }}>
      <Typography className="gold-text neon-title pop-in" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(2rem, min(7vw, 11vh), 8rem)', lineHeight: 1.05 }}>{winnerLine}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar code={state.code} player={cheater} size="clamp(60px, 12vh, 180px)" badge={false} />
        <Typography sx={{ fontSize: 'clamp(1.2rem, 2.8vw, 3.4rem)', fontWeight: 800 }}>🕵 Kłamczuchem był(a): <span style={{ color: 'var(--gold)' }}>{cheater.name}</span></Typography>
      </Box>
      <Typography sx={{ fontSize: 'clamp(1.1rem, 2.2vw, 2.8rem)' }}>
        {honestWin ? 'Kłamczuch zdemaskowany – pula ' : 'Kłamczuch ucieka z pulą '}
        <span style={{ color: 'var(--gold)', fontWeight: 800 }}>{r.pot}</span> pkt
      </Typography>
      {r.winner === 'honest' && r.survivors.length > 0 && <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.8vw, 2.2rem)' }}>Uczciwi do końca: {r.survivors.map((id) => nameOf(state, id)).join(', ')}</Typography>}
      {detectives.length > 0 && (
        <Typography sx={{ fontSize: 'clamp(0.9rem, 1.6vw, 2rem)' }}>
          🔎 Najlepsi detektywi: {detectives.map((d) => `${nameOf(state, d.id)} (${d.votes}×)`).join(' · ')}
        </Typography>
      )}
    </Box>
  );
};

const subtitleOf = (state) => (state.status === 'lobby' ? 'Poczekalnia' : state.status === 'finished' ? 'Koniec gry' : `Runda ${state.round}`);

const KlamczuchTv = ({ state, offsetRef }) => {
  const running = state.status === 'running';
  const voteLeft = useSecondsLeft(state.v ? state.v.deadline : null, offsetRef, state.pausedAt);
  const ve = state.ve;
  return (
    <TvFrame state={state} title="Kłamczuch" subtitle={subtitleOf(state)} lobbyHint="Jeden z was dostaje odpowiedzi z góry. Odpowiadajcie na pytania i obserwujcie – kto idzie podejrzanie dobrze? Po każdej rundzie głosujecie na kłamczucha.">
      {running && state.phase === 'answer' && state.r && <AnswerView state={state} offsetRef={offsetRef} />}
      {running && state.phase === 'roundEnd' && state.r && state.r.summary && <RoundEndView state={state} />}
      {running && state.phase === 'vote' && state.v && <VoteWait state={state} left={voteLeft} total={state.config.voteSeconds} title="Kto jest kłamczuchem?" hint="Głosujcie na telefonach. Najwięcej głosów – odpada i ujawnia rolę." />}
      {running && state.phase === 'voteEnd' && ve && (
        <VoteReveal
          state={state}
          ve={ve}
          title="Odpada z gry"
          resultLine={ve.wasCheater ? '🕵 TO BYŁ KŁAMCZUCH!' : ve.next === 'end' ? 'Był uczciwy… a kłamczuch dotarł do finału!' : 'Był uczciwy. Kłamczuch wciąż jest wśród was…'}
        />
      )}
      {state.status === 'finished' && state.result && <FinalView state={state} />}
    </TvFrame>
  );
};

export default KlamczuchTv;
