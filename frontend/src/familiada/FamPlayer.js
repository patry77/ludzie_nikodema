import React, { useState } from 'react';
import { Alert, Box, Button, Chip, TextField, Typography } from '@mui/material';
import { Avatar, PhotoPicker } from '../quiz/Avatar';
import { teamColor } from './FamBits';
import { FamSoundControl, useFamSounds, useSoundSettings } from './useFamSounds';

const GREEN = '#39ff6a';
const fieldSx = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.45)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

// Formularz dolaczenia: imie, druzyna, zdjecie. `teams` pochodzi z publicznego stanu gry.
export const FamJoinForm = ({ code, teams, onSubmit, joining, error }) => {
  const [name, setName] = useState('');
  const [team, setTeam] = useState(null);
  const [photo, setPhoto] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    onSubmit({ name, team, photo });
  };
  return (
    <Box component="form" onSubmit={submit} className="glass pop-in" sx={{ p: 4, display: 'grid', gap: 2.5, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '2.6rem' }} aria-hidden="true">👨‍👩‍👧‍👦</Typography>
      <Typography variant="h4" className="gold-text">Familiada</Typography>
      <Typography sx={{ color: 'var(--ink-dim)' }}>
        Gra <strong style={{ color: GREEN, letterSpacing: 3 }}>{code}</strong> – na telefonie możesz podpowiadać swojej drużynie odpowiedzi. Przy tablicy gra prowadzący.
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Avatar src={photo} size={96} player={photo ? null : { seat: '?', name: name || 'gracz' }} badge={false} />
      </Box>
      <PhotoPicker hasPhoto={!!photo} onPick={async (d) => setPhoto(d)} onRemove={() => setPhoto(null)} compact />
      <TextField value={name} onChange={(e) => setName(e.target.value)} label="Twoje imię" autoFocus inputProps={{ maxLength: 24 }} sx={fieldSx} />
      <Box>
        <Typography sx={{ color: 'var(--ink-dim)', mb: 1 }}>Twoja drużyna</Typography>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {teams.map((t) => {
            const c = teamColor(t);
            const sel = team === t.idx;
            return (
              <Button key={t.idx} onClick={() => setTeam(t.idx)} disabled={t.members.length >= 5} sx={{ py: 1.4, fontWeight: 800, fontSize: '1.05rem', borderRadius: '14px', color: '#fff', background: sel ? c.main : 'rgba(255,255,255,0.08)', border: `2px solid ${c.main}`, boxShadow: sel ? `0 0 20px ${c.glow}` : 'none' }}>
                {sel ? '✔ ' : ''}
                {t.name} ({t.members.length})
              </Button>
            );
          })}
          <Button onClick={() => setTeam(null)} sx={{ color: 'var(--ink-dim)' }}>{team === null ? '✔ ' : ''}Wybiorę później</Button>
        </Box>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={joining || !name.trim()}>{joining ? 'Dołączanie...' : 'Dołączam!'}</Button>
    </Box>
  );
};

const phaseText = (state) => {
  const r = state.round;
  const you = state.you;
  const name = (i) => (i === null || i === undefined ? '' : state.teams[i].name);
  if (state.status === 'lobby') return 'Czekamy na start gry...';
  if (state.status === 'finished') return 'Koniec gry!';
  switch (state.phase) {
    case 'faceoff':
      if (!r) return '';
      if (you.canBuzz) return 'Twój pojedynek – naciśnij przycisk, gdy znasz odpowiedź!';
      if (r.fo.turn !== null) return `Odpowiada drużyna „${name(r.fo.turn)}”`;
      return 'Pojedynek – przedstawiciele walczą o przycisk';
    case 'decision':
      return `Pojedynek wygrywa „${name(r.fo.winner)}” – decydują, czy grają`;
    case 'play':
      return r.consult ? `Drużyna „${name(1 - r.ctrl)}” może się naradzać` : `Gra drużyna „${name(r.ctrl)}”`;
    case 'steal':
      return `Przejęcie! „${name(r.stealTeam)}” ma jedną szansę`;
    case 'roundEnd':
      return `Rundę wygrywa „${name(r.winner)}”`;
    case 'stageEnd':
      return `Finał dla „${name(state.stageWinner)}”`;
    case 'final':
      return 'Finał!';
    default:
      return '';
  }
};

const SuggestionBox = ({ state, act, busy }) => {
  const [text, setText] = useState('');
  const you = state.you;
  const open = state.status === 'running' && ['faceoff', 'play', 'steal'].includes(state.phase) && you.team !== null;
  if (!open) return null;
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await act('suggest', { text: text.trim() });
    if (res.ok) setText('');
  };
  return (
    <Box className="glass" sx={{ p: 2, display: 'grid', gap: 1.5 }}>
      <Typography sx={{ color: GREEN, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.8rem' }}>Narada drużyny</Typography>
      <Box component="form" onSubmit={send} sx={{ display: 'flex', gap: 1 }}>
        <TextField size="small" fullWidth placeholder="Twoja propozycja odpowiedzi" value={text} onChange={(e) => setText(e.target.value)} inputProps={{ maxLength: 40 }} sx={fieldSx} />
        <Button type="submit" variant="contained" disabled={busy || !text.trim()}>Wyślij</Button>
      </Box>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {state.suggestions.map((s) => (
          <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: '12px', background: s.chosen ? 'rgba(57,255,106,0.2)' : 'rgba(255,255,255,0.07)', border: `1px solid ${s.chosen ? GREEN : 'transparent'}` }}>
            <Typography sx={{ flex: 1, fontWeight: 700 }}>{s.chosen ? '✔ ' : ''}{s.text}</Typography>
            <Button size="small" onClick={() => act('vote', { id: s.id })} disabled={busy} sx={{ minWidth: 0, color: s.mine ? GREEN : 'var(--ink-dim)' }}>
              👍 {s.count}
            </Button>
            {you.isLeader && (
              <Button size="small" variant={s.chosen ? 'contained' : 'outlined'} onClick={() => act('choose', { id: s.id })} disabled={busy} sx={{ minWidth: 0, color: s.chosen ? '#031a0c' : GREEN, borderColor: GREEN, background: s.chosen ? GREEN : 'transparent' }}>
                Wybieram
              </Button>
            )}
          </Box>
        ))}
        {state.suggestions.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Wpisz, co Waszym zdaniem odpowiedziało sto osób. Podobne propozycje łączą się i zbierają głosy.</Typography>}
      </Box>
      {!you.isLeader && <Typography variant="body2" sx={{ color: 'var(--ink-dim)' }}>Lider drużyny wybiera odpowiedź, którą poda na głos.</Typography>}
    </Box>
  );
};

const FamPlayer = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const sound = useSoundSettings('fam-player', false);
  useFamSounds(state, { role: 'player', enabled: sound.active, secondsLeft: null });
  const you = state.you;
  const team = you.team !== null ? state.teams[you.team] : null;
  const color = teamColor(team);
  const r = state.round;

  return (
    <Box sx={{ p: 2, display: 'grid', gap: 2, maxWidth: 520, mx: 'auto', position: 'relative', zIndex: 20 }}>
      <Box className="glass" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, border: `2px solid ${team ? color.main : 'rgba(255,255,255,0.2)'}` }}>
        <Avatar code={state.code} player={you} size={52} badge={false} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 800 }}>{you.name}{you.isLeader ? ' ★ lider' : ''}</Typography>
          <Typography noWrap sx={{ color: team ? color.light : 'var(--ink-dim)', fontWeight: 700 }}>{team ? team.name : 'Bez drużyny'}</Typography>
        </Box>
        <FamSoundControl sound={sound} variant="inline" />
      </Box>

      {error && <Alert severity="error" onClose={onResetError}>{error}</Alert>}
      {state.paused && <Alert severity="warning">⏸ Przerwa w grze</Alert>}

      <Box className="glass" sx={{ p: 2, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 1 }}>
          {state.teams.map((t) => (
            <Typography key={t.idx} sx={{ fontWeight: 800, color: teamColor(t).light }}>
              {t.name}: <span style={{ color: '#fff' }}>{t.score}</span>
            </Typography>
          ))}
        </Box>
        <Typography sx={{ fontWeight: 700, color: '#fff' }}>{phaseText(state)}</Typography>
        {r && state.status === 'running' && state.phase !== 'final' && (
          <Typography sx={{ mt: 1.5, fontWeight: 800, fontSize: '1.25rem', lineHeight: 1.3 }}>{r.question}</Typography>
        )}
      </Box>

      {state.status === 'lobby' && (
        <Box className="glass" sx={{ p: 2, display: 'grid', gap: 1.5 }}>
          <Typography sx={{ color: GREEN, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.8rem' }}>Twoja drużyna</Typography>
          {state.teams.map((t) => (
            <Button key={t.idx} onClick={() => act('team', { team: t.idx })} disabled={busy || t.members.length >= 5} sx={{ py: 1.3, fontWeight: 800, borderRadius: '14px', color: '#fff', background: you.team === t.idx ? teamColor(t).main : 'rgba(255,255,255,0.08)', border: `2px solid ${teamColor(t).main}` }}>
              {you.team === t.idx ? '✔ ' : ''}{t.name} ({t.members.length})
            </Button>
          ))}
          <Box>
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 1, textAlign: 'center' }}>Zdjęcie widoczne na ekranie TV</Typography>
            <PhotoPicker hasPhoto={you.hasPhoto} compact onPick={(photo) => act('photo', { photo })} onRemove={() => act('removePhoto')} />
          </Box>
          {team && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {team.members.map((m) => <Chip key={m.id} label={m.name} sx={{ color: '#fff', background: 'rgba(255,255,255,0.14)' }} />)}
            </Box>
          )}
        </Box>
      )}

      {state.status === 'running' && state.phase === 'faceoff' && you.canBuzz && (
        <Button
          onClick={() => act('buzz')}
          disabled={busy || state.paused}
          className="glow-pulse"
          sx={{ py: 5, fontSize: '2rem', fontWeight: 900, borderRadius: '28px', color: '#fff', background: `radial-gradient(circle at 50% 30%, ${color.light}, ${color.main} 55%, ${color.dark})`, border: '4px solid #fff', boxShadow: `0 0 40px ${color.glow}` }}
        >
          🔔 ZGŁASZAM SIĘ!
        </Button>
      )}
      {state.status === 'running' && state.phase === 'faceoff' && you.isRep && !you.canBuzz && (
        <Alert severity="info">Zgłoszenie zostało przyjęte.</Alert>
      )}

      <SuggestionBox state={state} act={act} busy={busy} />

      {state.status === 'finished' && state.result && (
        <Box className="glass" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem' }}>
            {state.result.winnerTeam === null || state.result.winnerTeam === undefined ? 'Remis' : `Wygrywa „${state.teams[state.result.winnerTeam].name}”!`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FamPlayer;
