import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import StageBackdrop from '../quiz/StageBackdrop';
import { Avatar } from '../quiz/Avatar';
import { useSecondsLeft } from '../quiz/quizApi';
import { FamBoard, FinalBoard, BoardFrame, ScoreDisplay } from './FamBoard';
import DotDisplay from './DotMatrix';
import { SeatedMember, teamColor, useFlash } from './FamBits';
import { FamSoundControl, useFamSounds, useSoundSettings } from './useFamSounds';

const joinUrl = (code) => `${window.location.origin}/teleturniej/gra/${code}`;

const TableTop = ({ color }) => (
  <Box
    aria-hidden="true"
    sx={{
      height: 'clamp(26px, 4vw, 70px)',
      borderRadius: '50% / 60%',
      background: `radial-gradient(ellipse at 50% 30%, ${color.light}, ${color.main} 45%, ${color.dark})`,
      boxShadow: `0 14px 26px rgba(0,0,0,0.55), 0 0 30px ${color.glow}`,
      border: '2px solid rgba(255,255,255,0.25)',
    }}
  />
);

// Stolik druzyny: zdjecia osob, blat, tabliczka z nazwa i licznik punktow
const TeamTable = ({ state, team, side }) => {
  const color = teamColor(team);
  const active = team.isCtrl;
  const r = state.round;
  const faceoffTurn = state.phase === 'faceoff' && r && r.fo.turn === team.idx;
  const won = state.phase === 'roundEnd' && r && r.winner === team.idx;
  const flash = useFlash(team.score, 1600);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 'clamp(6px, 1vw, 16px)', minWidth: 0, alignItems: 'stretch' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          className={active || faceoffTurn || won ? 'glow-pulse' : undefined}
          sx={{
            display: 'inline-block',
            maxWidth: '100%',
            px: 'clamp(10px, 1.4vw, 28px)',
            py: 'clamp(2px, 0.4vw, 8px)',
            borderRadius: '14px',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1rem, 2.2vw, 2.8rem)',
            color: '#fff',
            background: `linear-gradient(180deg, ${color.main}, ${color.dark})`,
            border: `2px solid ${active || faceoffTurn || won ? '#fff' : 'rgba(255,255,255,0.3)'}`,
            boxShadow: active || faceoffTurn || won ? `0 0 34px ${color.glow}` : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {team.name}
        </Typography>
        {(active || faceoffTurn) && (
          <Typography sx={{ mt: 0.5, color: '#39ff6a', fontWeight: 800, letterSpacing: 3, fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>
            {state.phase === 'steal' && active ? 'PRZEJĘCIE' : state.phase === 'faceoff' ? 'ODPOWIADA' : 'GRA'}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(6px, 1vw, 18px)', minHeight: 'clamp(70px, 9vw, 170px)', alignItems: 'flex-end', px: 1 }}>
        {team.members.map((m) => (
          <SeatedMember key={m.id} code={state.code} member={m} color={color} />
        ))}
        {team.members.length === 0 && <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>brak osób</Typography>}
      </Box>

      <TableTop color={color} />

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box className={flash ? 'bump' : undefined} sx={{ width: 'clamp(110px, 13vw, 240px)' }}>
          <BoardFrame sx={{ p: 'clamp(6px, 0.8vw, 14px)', borderRadius: '14px' }}>
            <ScoreDisplay value={team.score} digits={4} label={`Wynik drużyny ${team.name}`} />
          </BoardFrame>
        </Box>
      </Box>
    </Box>
  );
};

// Trzy pola "X" pod tablica
const Strikes = ({ n, big }) => (
  <Box sx={{ display: 'flex', gap: 'clamp(8px, 1.2vw, 24px)', justifyContent: 'center' }} aria-label={`Błędy: ${n} z 3`}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: big ? 'clamp(60px, 9vw, 160px)' : 'clamp(34px, 3.6vw, 70px)',
          height: big ? 'clamp(60px, 9vw, 160px)' : 'clamp(34px, 3.6vw, 70px)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: big ? 'clamp(2.5rem, 6vw, 7rem)' : 'clamp(1.2rem, 2.4vw, 3rem)',
          lineHeight: 1,
          color: i < n ? '#ff3b3b' : 'rgba(255,255,255,0.15)',
          background: '#050505',
          border: `2px solid ${i < n ? '#ff3b3b' : 'rgba(255,255,255,0.15)'}`,
          boxShadow: i < n ? '0 0 22px rgba(255,59,59,0.7)' : 'none',
          transition: 'all .2s ease',
        }}
      >
        ✖
      </Box>
    ))}
  </Box>
);

const StrikeOverlay = ({ seq, n }) => {
  const on = useFlash(seq, 1700);
  if (!on) return null;
  return (
    <Box aria-hidden="true" sx={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(0,0,0,0.35)' }}>
      <Box className="pop-in" sx={{ transform: 'scale(1)' }}>
        <Strikes n={Math.max(1, Math.min(3, n || 1))} big />
      </Box>
    </Box>
  );
};

const QuestionStrip = ({ text }) => (
  <Box sx={{ textAlign: 'center', px: 2 }}>
    <Typography
      key={text}
      className="pop-in"
      sx={{ display: 'inline-block', fontWeight: 700, fontSize: 'clamp(1.1rem, 2.4vw, 3rem)', lineHeight: 1.25, color: '#fff', px: 'clamp(16px, 3vw, 60px)', py: 'clamp(4px, 0.8vw, 14px)', borderRadius: '999px', background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(57,255,106,0.55)', boxShadow: '0 0 24px rgba(57,255,106,0.25)' }}
    >
      {text}
    </Typography>
  </Box>
);

const Lobby = ({ state }) => (
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(12px, 2vw, 40px)', textAlign: 'center' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 60px)', flexWrap: 'wrap', justifyContent: 'center' }}>
      <Box className="pop-in">
        <Box sx={{ width: 'clamp(280px, 46vw, 820px)', mx: 'auto' }}>
          <BoardFrame>
            <DotDisplay lines={['FAMILIADA']} charCols={9} gap={0} animKeys={['t']} label="Familiada" />
          </BoardFrame>
        </Box>
        <Typography sx={{ color: 'var(--ink-dim)', letterSpacing: 6, textTransform: 'uppercase', mt: 2, fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)' }}>Dołącz z telefonu (opcjonalnie – do narady w drużynie)</Typography>
        <Typography className="gold-text neon-title" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, 8vw, 9rem)', letterSpacing: 'clamp(6px, 1.4vw, 24px)', lineHeight: 1 }}>
          {state.code}
        </Typography>
        <Typography sx={{ color: 'var(--ink)', fontWeight: 700, fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)', wordBreak: 'break-all' }}>{joinUrl(state.code)}</Typography>
      </Box>
      <Box className="pop-in glow-pulse" sx={{ p: 2, borderRadius: '20px', background: '#fff' }}>
        <QRCodeSVG value={joinUrl(state.code)} size={Math.min(280, Math.round(window.innerWidth * 0.2) || 200)} level="M" />
      </Box>
    </Box>
    <Box sx={{ width: 'min(1500px, 96%)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(12px, 3vw, 60px)' }}>
      {state.teams.map((t) => {
        const color = teamColor(t);
        return (
          <Box key={t.idx} sx={{ p: 'clamp(8px, 1.2vw, 20px)', borderRadius: '18px', background: 'rgba(0,0,0,0.4)', border: `2px solid ${color.main}`, boxShadow: `0 0 26px ${color.glow}` }}>
            <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff', fontSize: 'clamp(1.2rem, 2.6vw, 3rem)', mb: 1 }}>{t.name}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(8px, 1.4vw, 24px)', minHeight: 'clamp(60px, 8vw, 150px)' }}>
              {t.members.map((m) => (
                <SeatedMember key={m.id} code={state.code} member={m} color={color} />
              ))}
              {t.members.length === 0 && <Typography sx={{ color: 'var(--ink-dim)', alignSelf: 'center' }}>Czekamy na zawodników...</Typography>}
            </Box>
          </Box>
        );
      })}
    </Box>
    {state.unassigned.length > 0 && (
      <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(0.9rem, 1.4vw, 1.6rem)' }}>Bez drużyny: {state.unassigned.map((m) => m.name).join(', ')}</Typography>
    )}
  </Box>
);

const RoundHeader = ({ state }) => {
  const r = state.round;
  if (!r) return null;
  return (
    <Typography sx={{ textAlign: 'center', color: '#39ff6a', fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase', fontSize: 'clamp(0.8rem, 1.4vw, 1.7rem)', textShadow: '0 0 14px rgba(57,255,106,0.6)' }}>
      Runda {r.n}
      {r.multiplier > 1 ? ` · punkty ×${r.multiplier}` : ''}
    </Typography>
  );
};

const phaseCaption = (state) => {
  const r = state.round;
  const name = (i) => (i === null || i === undefined ? '' : state.teams[i].name);
  switch (state.phase) {
    case 'faceoff':
      if (r && r.fo.turn !== null) return `Odpowiada drużyna „${name(r.fo.turn)}”`;
      return 'Pojedynek – kto pierwszy wciśnie przycisk?';
    case 'decision':
      return `Pojedynek wygrywa „${name(r.fo.winner)}” – gramy czy oddajemy pytanie?`;
    case 'play':
      return r.consult ? `Drużyna „${name(1 - r.ctrl)}” może się naradzać` : `Gra drużyna „${name(r.ctrl)}”`;
    case 'steal':
      return `PRZEJĘCIE – jedna szansa dla „${name(r.stealTeam)}”`;
    case 'roundEnd':
      return `Rundę wygrywa „${name(r.winner)}” i zdobywa ${r.bank} pkt`;
    default:
      return '';
  }
};

const Caption = ({ text }) =>
  text ? (
    <Typography key={text} className="pop-in" sx={{ textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 'clamp(1rem, 1.9vw, 2.3rem)', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
      {text}
    </Typography>
  ) : null;

const FinalistCard = ({ state, rep, active, label, color }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
    <Box className={active ? 'podium-active' : undefined} sx={{ borderRadius: '50%', p: '4px', background: active ? color.main : 'transparent', boxShadow: active ? `0 0 36px 6px ${color.glow}` : 'none' }}>
      <Avatar code={state.code} player={{ id: rep.id, name: rep.name, hasPhoto: rep.hasPhoto, photoV: rep.photoV, seat: '' }} size="clamp(70px, 9vw, 190px)" badge={false} />
    </Box>
    <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 'clamp(1rem, 1.8vw, 2.2rem)' }}>{rep.name}</Typography>
    <Typography sx={{ color: active ? '#39ff6a' : 'var(--ink-dim)', fontWeight: 700, letterSpacing: 3, fontSize: 'clamp(0.7rem, 1.1vw, 1.3rem)' }}>{label}</Typography>
  </Box>
);

const FinalStage = ({ state, offsetRef }) => {
  const f = state.final;
  const team = state.teams[f.team];
  const color = teamColor(team);
  const left = useSecondsLeft(f.deadline, offsetRef, state.paused ? state.pausedAt : null);
  const timing = f.step === 'p1' || f.step === 'p2';
  const [a, b] = f.reps;
  const secs = left === null || left === undefined ? (f.step === 'ready' ? f.total || 0 : 0) : Math.ceil(left);
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.2vw, 24px)', justifyContent: 'center', minHeight: 0 }}>
      <Typography sx={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, color: '#fff', fontSize: 'clamp(1.2rem, 2.6vw, 3.2rem)' }}>
        FINAŁ · drużyna „{team.name}” · potrzeba {f.target} pkt
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,3.2fr) minmax(0,1fr)', gap: 'clamp(8px, 2vw, 40px)', alignItems: 'center' }}>
        {a ? <FinalistCard state={state} rep={a} active={f.step === 'p1'} label="PIERWSZY GRACZ" color={color} /> : <span />}
        <Box>
          <BoardFrame>
            <FinalBoard final={f} target={f.target} />
          </BoardFrame>
        </Box>
        {b ? <FinalistCard state={state} rep={b} active={f.step === 'p2'} label="DRUGI GRACZ" color={color} /> : <span />}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box className={timing && secs <= 5 ? 'timer-urgent' : undefined} sx={{ width: 'clamp(120px, 14vw, 260px)' }}>
          <BoardFrame sx={{ p: 'clamp(6px, 0.8vw, 14px)', borderRadius: '14px' }}>
            <ScoreDisplay value={secs} digits={2} label="Pozostały czas" />
          </BoardFrame>
        </Box>
      </Box>
      {f.step === 'result' && f.result && (
        <Typography className="pop-in" sx={{ textAlign: 'center', fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 4rem)', color: f.result.win ? '#39ff6a' : '#ff8a8e', textShadow: '0 0 24px currentColor' }}>
          {f.result.win ? `WYGRANA! ${f.result.total} punktów` : `Zdobyto ${f.result.total} z ${f.result.target} punktów`}
        </Typography>
      )}
    </Box>
  );
};

const Winner = ({ state }) => {
  const fired = useRef(false);
  const r = state.result || {};
  const winner = r.winnerTeam === null || r.winnerTeam === undefined ? null : state.teams[r.winnerTeam];
  const color = teamColor(winner);
  useEffect(() => {
    if (fired.current) return undefined;
    fired.current = true;
    const colors = ['#39ff6a', '#ffd23f', color.main, '#ffffff'];
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.2, y: 0.6 }, colors }), 700);
    const t2 = setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { x: 0.8, y: 0.6 }, colors }), 1200);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [color.main]);
  const fin = r.final;
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
      <Typography className="pop-in" sx={{ color: '#39ff6a', letterSpacing: 8, textTransform: 'uppercase', fontSize: 'clamp(1rem, 2vw, 2.4rem)' }}>
        {winner ? 'Zwycięża drużyna' : 'Remis'}
      </Typography>
      {winner && (
        <>
          <Box sx={{ width: 'clamp(300px, 56vw, 1100px)' }} className="pop-in">
            <BoardFrame>
              <DotDisplay lines={[winner.name.toUpperCase().slice(0, 16)]} charCols={Math.max(8, Math.min(16, [...winner.name].length))} gap={0} animKeys={['w']} label={winner.name} />
            </BoardFrame>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(10px, 2vw, 36px)' }}>
            {winner.members.map((m) => (
              <SeatedMember key={m.id} code={state.code} member={{ ...m, isRep: false, isSpeaker: false }} color={color} size="clamp(60px, 8vw, 160px)" fontSize="clamp(0.9rem, 1.6vw, 2rem)" />
            ))}
          </Box>
        </>
      )}
      <Typography sx={{ color: 'var(--ink)', fontSize: 'clamp(1.1rem, 2vw, 2.4rem)' }}>
        {state.teams[0].name} {r.scores ? r.scores[0] : state.teams[0].score} : {r.scores ? r.scores[1] : state.teams[1].score} {state.teams[1].name}
      </Typography>
      {fin && <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.6vw, 2rem)' }}>{fin.win ? `Finał: ${fin.total} pkt – wygrana!` : `Finał: ${fin.total} z ${fin.target} pkt`}</Typography>}
      {r.reason && <Typography sx={{ color: 'var(--ink-dim)' }}>{r.reason}</Typography>}
    </Box>
  );
};

const FamTv = ({ state, offsetRef }) => {
  const sound = useSoundSettings('fam-tv', true);
  const left = useSecondsLeft(state.final ? state.final.deadline : null, offsetRef, state.paused ? state.pausedAt : null);
  useFamSounds(state, { role: 'tv', enabled: sound.active, secondsLeft: left });

  const r = state.round;
  const inRound = state.status === 'running' && ['faceoff', 'decision', 'play', 'steal', 'roundEnd', 'stageEnd'].includes(state.phase);
  const showStrikes = r && ['play', 'steal'].includes(state.phase);

  return (
    <Box sx={{ position: 'relative', minHeight: '100vh', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: 'var(--ink)', padding: 'clamp(8px, 1.2vw, 24px)', zIndex: 10 }}>
      <StageBackdrop variant="full" />
      <Box sx={{ position: 'relative', zIndex: 5, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {state.status === 'lobby' && <Lobby state={state} />}

        {inRound && (
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2.5fr) minmax(0,1fr)', gap: 'clamp(8px, 1.6vw, 36px)', alignItems: 'end', minHeight: 0 }}>
            <TeamTable state={state} team={state.teams[0]} side="left" />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1vw, 18px)', justifyContent: 'center', alignSelf: 'stretch' }}>
              <RoundHeader state={state} />
              {r && <QuestionStrip text={r.question} />}
              {r && (
                <BoardFrame>
                  <FamBoard round={r} />
                </BoardFrame>
              )}
              {showStrikes ? <Strikes n={r.strikes} /> : <Box sx={{ height: 'clamp(34px, 3.6vw, 70px)' }} />}
              <Caption text={phaseCaption(state)} />
              {state.phase === 'stageEnd' && (
                <Typography className="pop-in" sx={{ textAlign: 'center', color: '#39ff6a', fontWeight: 800, fontSize: 'clamp(1.2rem, 2.6vw, 3.2rem)', textShadow: '0 0 20px rgba(57,255,106,0.7)' }}>
                  Do finału przechodzi „{state.teams[state.stageWinner].name}”!
                </Typography>
              )}
            </Box>
            <TeamTable state={state} team={state.teams[1]} side="right" />
          </Box>
        )}

        {state.status !== 'lobby' && state.phase === 'final' && state.final && <FinalStage state={state} offsetRef={offsetRef} />}
        {state.status === 'finished' && <Winner state={state} />}
      </Box>

      {r && <StrikeOverlay seq={state.seq.strike} n={state.phase === 'steal' || (r && r.stealHit === false) ? 3 : r.strikes} />}

      {state.paused && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(3,8,5,0.82)', backdropFilter: 'blur(4px)' }}>
          <Typography className="pop-in" sx={{ color: '#39ff6a', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(3rem, 9vw, 10rem)', textShadow: '0 0 30px rgba(57,255,106,0.7)' }}>⏸ PRZERWA</Typography>
        </Box>
      )}

      <FamSoundControl sound={sound} />
    </Box>
  );
};

export default FamTv;
