import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Slider, Typography } from '@mui/material';
import { isAudioUnlocked, loadSoundSettings, playSound, saveSoundSettings, setMasterVolume, unlockAudio } from './sound';

// ---------- Ustawienia dzwieku (per widok: tv / host / player) ----------
export function useSoundSettings(role, defaultEnabled) {
  const [settings, setSettings] = useState(() => loadSoundSettings(role, { enabled: defaultEnabled, volume: 0.6 }));
  const [unlocked, setUnlocked] = useState(isAudioUnlocked());

  useEffect(() => {
    setMasterVolume(settings.volume);
  }, [settings.volume]);

  const update = useCallback(
    (patch) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        saveSoundSettings(role, next);
        return next;
      });
    },
    [role]
  );

  const unlock = useCallback(async () => {
    const ok = await unlockAudio();
    setUnlocked(ok);
    return ok;
  }, []);

  // Przegladarki wymagaja gestu uzytkownika - odblokowujemy przy pierwszym kliknieciu/klawiszu
  useEffect(() => {
    if (!settings.enabled || unlocked) return undefined;
    const handler = () => unlock();
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [settings.enabled, unlocked, unlock]);

  return { settings, update, unlocked, unlock, active: settings.enabled && unlocked };
}

// ---------- Zdarzenia gry -> dzwieki ----------
const snapshot = (s) => ({
  status: s.status,
  stage: s.stage,
  playerCount: s.players.length,
  qKey: s.current ? `${s.current.n}:${s.current.question.id}` : null,
  qStatus: s.current ? s.current.status : null,
  resultKey: s.current && s.current.status === 'revealed' ? `${s.current.n}:${s.current.question.id}` : null,
  awaitingBy: s.awaiting ? s.awaiting.byId : null,
  eliminated: s.players.filter((p) => p.eliminated).map((p) => p.id),
  lives: Object.fromEntries(s.players.map((p) => [p.id, p.lives])),
  youTarget: !!(s.you && s.you.isTarget),
});

const vibrate = (pattern) => {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {
    /* nie wszystkie urzadzenia wspieraja */
  }
};

export function useQuizSounds(state, { role, enabled, secondsLeft }) {
  const prev = useRef(null);
  const lastTick = useRef(null);

  useEffect(() => {
    if (!state) return;
    const p = prev.current;
    const s = snapshot(state);
    prev.current = s;
    if (!p) return; // pierwszy odczyt (np. odswiezenie strony) - bez dzwiekow

    const events = [];
    const add = (name, delay = 0) => events.push({ name, delay });
    const revealedNow = s.resultKey && s.resultKey !== p.resultKey;
    const result = state.current && state.current.result;
    const livesDropped = state.players.some((pl) => p.lives[pl.id] !== undefined && pl.lives < p.lives[pl.id]);
    const newlyEliminated = s.eliminated.some((id) => !p.eliminated.includes(id));

    if (role === 'player') {
      const you = state.you;
      if (you) {
        if (s.youTarget && !p.youTarget) {
          add('designate');
          vibrate([180, 80, 180]);
        }
        if (s.awaitingBy === you.id && p.awaitingBy !== you.id) {
          add('designate');
          vibrate([180, 80, 180]);
        }
        if (revealedNow && result && result.playerId === you.id) {
          add(result.correct ? 'correct' : 'wrong');
          vibrate(result.correct ? 120 : [300]);
        }
      }
      if (s.status === 'finished' && p.status !== 'finished') add('winner', 200);
    } else {
      if (p.status === 'lobby' && s.status === 'lobby' && s.playerCount > p.playerCount) add('join');
      if (p.status === 'lobby' && s.status === 'running') add('start');
      const stageChanged = s.status === 'running' && p.status === 'running' && s.stage !== p.stage;
      if (stageChanged) add('stage');
      if (s.qKey && s.qKey !== p.qKey && s.qStatus === 'asking') add('question', stageChanged ? 1400 : 0);
      if (s.qKey && s.qKey === p.qKey && p.qStatus !== 'answering' && s.qStatus === 'answering') add('buzz');
      if (revealedNow && result) {
        if (result.correct === true) add('correct');
        else if (result.correct === false) {
          add('wrong');
          if (livesDropped) add('lifeLost', 700);
        }
      }
      if (newlyEliminated && s.status === 'running') add('eliminated', 1300);
      if (s.awaitingBy && !p.awaitingBy) add('designate');
      if (s.status === 'finished' && p.status !== 'finished') add('winner', 500);
    }

    if (enabled) events.forEach((e) => setTimeout(() => playSound(e.name), e.delay));
  }, [state, role, enabled]);

  // Tykanie w ostatnich 5 sekundach
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
      playSound('tick');
    }
  }, [secondsLeft, enabled]);
}

// ---------- Kontrolka ----------
export const SoundControl = ({ sound, variant = 'floating' }) => {
  const { settings, update, unlocked, unlock } = sound;
  const [open, setOpen] = useState(false);

  const toggle = async () => {
    const next = !settings.enabled;
    update({ enabled: next });
    if (next) {
      const ok = await unlock();
      if (ok) playSound('join');
    }
  };

  const needsClick = settings.enabled && !unlocked;
  const wrapperSx =
    variant === 'floating'
      ? { position: 'fixed', right: 16, bottom: 16, zIndex: 60 }
      : { display: 'inline-flex', position: 'relative' };

  return (
    <>
      {needsClick && variant === 'floating' && (
        <Box
          onClick={unlock}
          role="button"
          tabIndex={0}
          sx={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            zIndex: 70,
            px: 3,
            py: 1.5,
            borderRadius: 999,
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 'clamp(1rem, 1.6vw, 1.6rem)',
            color: '#1a1205',
            background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))',
            boxShadow: '0 0 30px rgba(var(--accent-rgb),0.6)',
          }}
          className="glow-pulse"
        >
          🔊 Kliknij, aby włączyć dźwięk
        </Box>
      )}
      <Box sx={wrapperSx}>
        {open && (
          <Box className="glass" sx={{ position: 'absolute', right: 0, bottom: 52, width: 240, p: 2, zIndex: 61 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Głośność</Typography>
            <Slider
              size="small"
              value={Math.round(settings.volume * 100)}
              onChange={(e, v) => update({ volume: v / 100 })}
              aria-label="Głośność"
              sx={{ color: 'var(--gold)' }}
            />
            <Button size="small" onClick={() => playSound('correct')} disabled={!unlocked} sx={{ color: 'var(--gold)' }}>
              ▶ Próbka dźwięku
            </Button>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button
            onClick={toggle}
            aria-label={settings.enabled ? 'Wyłącz dźwięk' : 'Włącz dźwięk'}
            aria-pressed={settings.enabled}
            sx={{ minWidth: 0, px: 1.5, borderRadius: 999, color: 'var(--ink)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(var(--accent-rgb),0.4)' }}
          >
            {settings.enabled ? '🔊' : '🔇'}
          </Button>
          {settings.enabled && (
            <Button
              onClick={() => setOpen((o) => !o)}
              aria-label="Ustawienia głośności"
              sx={{ minWidth: 0, px: 1.25, borderRadius: 999, color: 'var(--ink)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(var(--accent-rgb),0.4)' }}
            >
              ⚙
            </Button>
          )}
        </Box>
      </Box>
    </>
  );
};
