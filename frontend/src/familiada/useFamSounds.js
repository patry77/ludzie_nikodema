import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Slider, Typography } from '@mui/material';
import { useSoundSettings } from '../quiz/useQuizSounds';
import { FAM_SOUND_LIST, playFamSound, preloadFamCustom } from './famSound';

export { useSoundSettings };

const vibrate = (p) => {
  try {
    if (navigator.vibrate) navigator.vibrate(p);
  } catch (e) {
    /* ignorujemy */
  }
};

const snap = (s) => ({
  status: s.status,
  phase: s.phase,
  paused: s.paused,
  members: s.teams.reduce((n, t) => n + t.members.length, 0) + (s.unassigned ? s.unassigned.length : 0),
  seq: { ...s.seq },
  first: s.round && s.round.fo ? s.round.fo.first : null,
  consult: !!(s.round && s.round.consult),
  finalStep: s.final ? s.final.step : null,
  roundN: s.round ? s.round.n : null,
  canBuzz: !!(s.you && s.you.canBuzz),
  isSpeaker: !!(s.you && (s.you.isSpeaker || s.you.isRep)),
});

// Zdarzenia gry -> dzwieki Familiady
export function useFamSounds(state, { role, enabled, secondsLeft }) {
  const prev = useRef(null);
  const lastTick = useRef(null);

  useEffect(() => {
    if (enabled) preloadFamCustom();
  }, [enabled]);

  useEffect(() => {
    if (!state) return;
    const p = prev.current;
    const s = snap(state);
    prev.current = s;
    if (!p) return;
    const ev = [];
    const add = (name, delay = 0) => ev.push({ name, delay });

    if (role === 'player') {
      if (s.canBuzz && !p.canBuzz) {
        add('decision');
        vibrate([150, 60, 150]);
      }
      if (s.seq.strike !== p.seq.strike) vibrate(300);
      if (s.status === 'finished' && p.status !== 'finished') add('winner', 300);
    } else {
      if (p.status === 'lobby' && s.status === 'lobby' && s.members > p.members) add('join');
      if (p.status === 'lobby' && s.status === 'running') add('intro');
      if (s.seq.round !== p.seq.round && s.status === 'running' && p.status === 'running') add('roundStart');
      if (s.seq.reveal !== p.seq.reveal) add('reveal');
      if (s.seq.strike !== p.seq.strike) add('strike');
      if (s.seq.repeat !== p.seq.repeat) add('repeat');
      if (s.first !== null && p.first === null && s.roundN === p.roundN) add('buzzIn');
      if (s.phase === 'decision' && p.phase !== 'decision') add('decision', 500);
      if (s.consult && !p.consult) add('consult', 900);
      if (s.phase === 'steal' && p.phase !== 'steal') add('steal', 900);
      if (s.phase === 'roundEnd' && p.phase !== 'roundEnd') add('roundWin', 700);
      if (s.phase === 'stageEnd' && p.phase !== 'stageEnd') add('stageWin', 200);
      if (s.phase === 'final' && p.phase !== 'final') add('finalIntro');
      if ((s.finalStep === 'p1' && p.finalStep !== 'p1') || (s.finalStep === 'p2' && p.finalStep !== 'p2')) add('finalGo');
      if ((p.finalStep === 'p1' && s.finalStep === 'p1done') || (p.finalStep === 'p2' && s.finalStep === 'p2done')) add('timeUp');
      if (s.status === 'finished' && p.status !== 'finished') {
        const win = state.result && state.result.final && state.result.final.win;
        const lose = state.result && state.result.final && !state.result.final.win;
        add(win ? 'finalWin' : lose ? 'finalLose' : 'winner', 900);
      }
    }
    if (enabled) ev.forEach((e) => setTimeout(() => playFamSound(e.name), e.delay));
  }, [state, role, enabled]);

  useEffect(() => {
    if (!enabled || secondsLeft === null || secondsLeft === undefined) {
      lastTick.current = null;
      return;
    }
    const sec = Math.ceil(secondsLeft);
    if (sec > 5 || sec <= 0) {
      lastTick.current = null;
      return;
    }
    if (lastTick.current !== sec) {
      lastTick.current = sec;
      playFamSound('tick');
    }
  }, [secondsLeft, enabled]);
}

export const FamSoundControl = ({ sound, variant = 'floating' }) => {
  const { settings, update, unlocked, unlock } = sound;
  const [open, setOpen] = useState(false);
  const toggle = async () => {
    const next = !settings.enabled;
    update({ enabled: next });
    if (next) {
      const ok = await unlock();
      if (ok) playFamSound('join');
    }
  };
  const needsClick = settings.enabled && !unlocked;
  const wrapperSx = variant === 'floating' ? { position: 'fixed', right: 16, bottom: 16, zIndex: 60 } : { display: 'inline-flex', position: 'relative' };
  const btn = { minWidth: 0, px: 1.5, borderRadius: 999, color: 'var(--ink)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(var(--accent-rgb),0.4)' };
  return (
    <>
      {needsClick && variant === 'floating' && (
        <Box
          onClick={unlock}
          role="button"
          tabIndex={0}
          className="glow-pulse"
          sx={{ position: 'fixed', left: '50%', bottom: 'clamp(16px, 3vh, 40px)', transform: 'translateX(-50%)', zIndex: 70, px: 3, py: 1.5, borderRadius: 999, cursor: 'pointer', fontWeight: 800, fontSize: 'clamp(1rem, 1.6vw, 1.6rem)', color: '#031a0c', background: 'linear-gradient(120deg, #9dffba, #39ff6a 55%, #17b84a)', boxShadow: '0 0 30px rgba(57,255,106,0.6)' }}
        >
          🔊 Kliknij, aby włączyć dźwięk
        </Box>
      )}
      <Box sx={wrapperSx}>
        {open && (
          <Box className="glass" sx={{ position: 'absolute', right: 0, bottom: 52, width: 240, p: 2, zIndex: 61 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Głośność</Typography>
            <Slider size="small" value={Math.round(settings.volume * 100)} onChange={(e, v) => update({ volume: v / 100 })} aria-label="Głośność" sx={{ color: '#39ff6a' }} />
            <Button size="small" onClick={() => playFamSound('reveal')} disabled={!unlocked} sx={{ color: '#39ff6a' }}>▶ Próbka dźwięku</Button>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button onClick={toggle} aria-label={settings.enabled ? 'Wyłącz dźwięk' : 'Włącz dźwięk'} aria-pressed={settings.enabled} sx={btn}>{settings.enabled ? '🔊' : '🔇'}</Button>
          {settings.enabled && <Button onClick={() => setOpen((o) => !o)} aria-label="Ustawienia głośności" sx={{ ...btn, px: 1.25 }}>⚙</Button>}
        </Box>
      </Box>
    </>
  );
};

export { FAM_SOUND_LIST, playFamSound };
