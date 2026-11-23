import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Chip, Collapse, TextField, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar, PhotoPicker } from '../quiz/Avatar';
import { useSecondsLeft } from '../quiz/quizApi';
import { IntroHost } from '../quiz/IntroCam';
import { teamColor } from './FamBits';
import { FamSoundControl, useFamSounds, useSoundSettings } from './useFamSounds';

const joinUrl = (code) => `${window.location.origin}/teleturniej/gra/${code}`;
const GREEN = '#39ff6a';

const fieldSx = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.45)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

const Panel = ({ title, children, sx, right }) => (
  <Box className="glass" sx={{ p: { xs: 2, md: 2.5 }, ...sx }}>
    {(title || right) && (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Typography sx={{ color: GREEN, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>{title}</Typography>
        {right}
      </Box>
    )}
    {children}
  </Box>
);

const Big = ({ children, color = 'primary', sx, ...rest }) => (
  <Button variant="contained" color={color} size="large" sx={{ fontWeight: 800, borderRadius: '14px', py: 1.4, ...sx }} {...rest}>
    {children}
  </Button>
);

// ---------- Poczekalnia ----------
const TeamEditor = ({ state, team, act, busy }) => {
  const color = teamColor(team);
  const [name, setName] = useState(team.name);
  const [photoFor, setPhotoFor] = useState(null);
  const [newName, setNewName] = useState('');
  useEffect(() => setName(team.name), [team.name]);
  const other = state.teams[1 - team.idx];
  const save = () => {
    if (name.trim() && name.trim() !== team.name) act('teamName', { team: team.idx, name: name.trim() });
  };
  const add = async () => {
    if (!newName.trim()) return;
    const res = await act('addMember', { name: newName.trim(), team: team.idx });
    if (res.ok) setNewName('');
  };
  return (
    <Box sx={{ p: 2, borderRadius: '16px', border: `2px solid ${color.main}`, background: 'rgba(0,0,0,0.25)' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
        <TextField size="small" fullWidth label={`Nazwa drużyny ${team.idx + 1}`} value={name} onChange={(e) => setName(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && save()} inputProps={{ maxLength: 24 }} sx={fieldSx} />
        <Button onClick={save} disabled={busy} sx={{ color: GREEN }}>Zapisz</Button>
      </Box>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {team.members.map((m) => (
          <Box key={m.id} sx={{ p: 1, borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Avatar code={state.code} player={m} size={38} badge={false} />
              <Typography sx={{ flex: 1, minWidth: 90, fontWeight: 700 }}>
                {m.name}
                {m.isBot ? ' 🤖' : ''}
              </Typography>
              <Button size="small" onClick={() => act('leader', { team: team.idx, playerId: m.id })} disabled={busy || m.isLeader} sx={{ color: m.isLeader ? GREEN : 'var(--ink-dim)' }}>
                {m.isLeader ? '★ lider' : '☆ lider'}
              </Button>
              <Button size="small" onClick={() => act('move', { playerId: m.id, team: other.idx })} disabled={busy} sx={{ color: 'var(--ink-dim)' }}>→ {other.name}</Button>
              <Button size="small" onClick={() => setPhotoFor(photoFor === m.id ? null : m.id)} sx={{ color: 'var(--ink-dim)' }}>📷</Button>
              <Button size="small" color="error" onClick={() => act('kick', { playerId: m.id })} disabled={busy}>✕</Button>
            </Box>
            <Collapse in={photoFor === m.id} unmountOnExit>
              <Box sx={{ mt: 1 }}>
                <PhotoPicker hasPhoto={m.hasPhoto} compact onPick={(photo) => act('memberPhoto', { playerId: m.id, photo })} onRemove={() => act('removeMemberPhoto', { playerId: m.id })} />
              </Box>
            </Collapse>
          </Box>
        ))}
        {team.members.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>Brak osób – uczestnicy mogą dołączyć z telefonu albo dodasz ich tutaj.</Typography>}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <TextField size="small" fullWidth label="Dodaj osobę" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} inputProps={{ maxLength: 24 }} sx={fieldSx} />
        <Button onClick={add} disabled={busy || !newName.trim()} variant="outlined" sx={{ color: GREEN, borderColor: GREEN }}>Dodaj</Button>
      </Box>
    </Box>
  );
};

const ConfigEditor = ({ state, act, busy }) => {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState(state.config);
  useEffect(() => setCfg(state.config), [state.config]);
  const field = (key, label) => (
    <TextField size="small" type="number" label={label} value={cfg[key]} onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })} sx={fieldSx} />
  );
  return (
    <Box sx={{ mt: 2 }}>
      <Button size="small" onClick={() => setOpen(!open)} sx={{ color: 'var(--ink-dim)' }}>⚙ Ustawienia punktacji i czasu {open ? '▲' : '▼'}</Button>
      <Collapse in={open}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mt: 1 }}>
          {field('targetScore', 'Punkty do finału')}
          {field('finalTarget', 'Punkty w finale')}
          {field('final1Seconds', 'Czas 1. gracza (s)')}
          {field('final2Seconds', 'Czas 2. gracza (s)')}
        </Box>
        <Button size="small" onClick={() => act('config', { config: cfg })} disabled={busy} sx={{ mt: 1, color: GREEN }}>Zapisz ustawienia</Button>
      </Collapse>
    </Box>
  );
};

const Lobby = ({ state, act, busy }) => (
  <Box sx={{ display: 'grid', gap: 3 }}>
    <Panel title="Poczekalnia">
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ p: 1.5, borderRadius: '14px', background: '#fff' }}>
          <QRCodeSVG value={joinUrl(state.code)} size={130} level="M" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography sx={{ color: 'var(--ink-dim)' }}>Kod do telefonów (opcjonalnych – służą do narady w drużynie):</Typography>
          <Typography className="gold-text" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', letterSpacing: 8, lineHeight: 1.1 }}>{state.code}</Typography>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', wordBreak: 'break-all' }}>{joinUrl(state.code)}</Typography>
          <Button component={Link} to={`/teleturniej/gra/${state.code}/tv`} target="_blank" size="small" sx={{ mt: 1, color: GREEN }}>📺 Otwórz widok TV</Button>
        </Box>
      </Box>
      <ConfigEditor state={state} act={act} busy={busy} />
    </Panel>
    <IntroHost code={state.code} intro={state.intro} people={[...state.teams.flatMap((t) => t.members), ...state.unassigned]} />
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
      {state.teams.map((t) => (
        <TeamEditor key={t.idx} state={state} team={t} act={act} busy={busy} />
      ))}
    </Box>
    {state.unassigned.length > 0 && (
      <Panel title="Bez drużyny">
        <Box sx={{ display: 'grid', gap: 1 }}>
          {state.unassigned.map((m) => (
            <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Avatar code={state.code} player={m} size={34} badge={false} />
              <Typography sx={{ flex: 1, fontWeight: 700 }}>{m.name}</Typography>
              {state.teams.map((t) => (
                <Button key={t.idx} size="small" onClick={() => act('move', { playerId: m.id, team: t.idx })} disabled={busy} sx={{ color: teamColor(t).light }}>→ {t.name}</Button>
              ))}
              <Button size="small" color="error" onClick={() => act('kick', { playerId: m.id })}>✕</Button>
            </Box>
          ))}
        </Box>
      </Panel>
    )}
    <Big onClick={() => act('start')} disabled={busy || state.teams.some((t) => t.members.length === 0)} sx={{ background: `linear-gradient(120deg, #9dffba, ${GREEN} 55%, #17b84a)`, color: '#031a0c', fontSize: '1.2rem' }}>
      ▶ Rozpocznij grę (do {state.config.targetScore} pkt)
    </Big>
    {state.teams.some((t) => t.members.length === 0) && <Typography sx={{ color: 'var(--ink-dim)', textAlign: 'center' }}>Każda drużyna potrzebuje przynajmniej jednej osoby.</Typography>}
  </Box>
);

// ---------- Plansza odpowiedzi (do klikania) ----------
const AnswerPicker = ({ round, onPick, disabled, hint }) => (
  <Box sx={{ display: 'grid', gap: 1 }}>
    {hint && <Typography variant="body2" sx={{ color: 'var(--ink-dim)' }}>{hint}</Typography>}
    {round.answers.map((a) => (
      <Button
        key={a.i}
        onClick={() => onPick(a.i)}
        disabled={disabled || a.revealed}
        sx={{
          justifyContent: 'space-between',
          textAlign: 'left',
          px: 2,
          py: 1.25,
          borderRadius: '12px',
          fontWeight: 800,
          fontSize: '1.05rem',
          color: a.revealed ? '#0b2a14' : '#fff',
          background: a.revealed ? `linear-gradient(120deg, #9dffba, ${GREEN})` : 'rgba(255,255,255,0.08)',
          border: `1px solid ${a.revealed ? GREEN : 'rgba(255,255,255,0.2)'}`,
          '&.Mui-disabled': { color: a.revealed ? '#0b2a14' : 'rgba(255,255,255,0.4)', opacity: a.revealed ? 0.85 : 1 },
        }}
      >
        <span>
          {a.i + 1}. {a.text}
        </span>
        <span>
          {a.points}
          {a.revealed && a.late ? ' (po rundzie)' : ''}
        </span>
      </Button>
    ))}
  </Box>
);

const Suggestions = ({ state }) => {
  if (!state.suggestions) return null;
  const any = state.suggestions.some((l) => l.length);
  return (
    <Panel title="📱 Narada drużyn (propozycje z telefonów)">
      {!any && <Typography sx={{ color: 'var(--ink-dim)' }}>Na razie brak propozycji. Uczestnicy mogą je wpisywać na telefonach, a lider wybiera tę, którą poda.</Typography>}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {state.suggestions.map((list, t) =>
          list.length ? (
            <Box key={t}>
              <Typography sx={{ fontWeight: 800, color: teamColor(state.teams[t]).light, mb: 0.5 }}>{state.teams[t].name}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {list.map((s) => (
                  <Chip key={s.id} label={`${s.text} · ${s.by.length}`} title={s.by.join(', ')} sx={{ fontWeight: 700, color: s.chosen ? '#031a0c' : '#fff', background: s.chosen ? GREEN : 'rgba(255,255,255,0.14)' }} />
                ))}
              </Box>
            </Box>
          ) : null
        )}
      </Box>
    </Panel>
  );
};

const LogPanel = ({ log }) => (
  <Panel title="Przebieg">
    <Box sx={{ display: 'grid', gap: 0.5, maxHeight: 260, overflowY: 'auto' }}>
      {[...log].reverse().map((l, i) => (
        <Typography key={i} variant="body2" sx={{ color: l.kind === 'bad' ? '#ff9b9b' : l.kind === 'good' ? '#8dffaf' : l.kind === 'stage' ? '#ffd23f' : 'var(--ink-dim)' }}>
          {l.text}
        </Typography>
      ))}
      {log.length === 0 && <Typography sx={{ color: 'var(--ink-dim)' }}>—</Typography>}
    </Box>
  </Panel>
);

// ---------- Runda ----------
const RoundControls = ({ state, act, busy }) => {
  const r = state.round;
  const t = (i) => state.teams[i];
  const repName = (i) => {
    const m = t(i).members.find((x) => x.isRep || x.isSpeaker);
    return m ? m.name : '';
  };

  if (state.phase === 'faceoff') {
    const fo = r.fo;
    const nothingYet = fo.attempts === 0 && !r.answers.some((a) => a.revealed);
    return (
      <Panel title="Pojedynek">
        <Typography sx={{ color: 'var(--ink-dim)', mb: 1.5 }}>
          Do przycisku stają: {t(0).name} – <strong style={{ color: '#fff' }}>{t(0).members.find((m) => m.isRep)?.name || '—'}</strong>, {t(1).name} – <strong style={{ color: '#fff' }}>{t(1).members.find((m) => m.isRep)?.name || '—'}</strong>.
        </Typography>
        {fo.turn === null ? (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>Kto pierwszy się zgłosił?</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              {state.teams.map((tm) => (
                <Big key={tm.idx} onClick={() => act('buzz', { team: tm.idx })} disabled={busy} sx={{ background: teamColor(tm).main }}>{tm.name}</Big>
              ))}
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)' }}>Przedstawiciel może też wcisnąć przycisk na swoim telefonie – pierwszy wygrywa, a Ty możesz to zmienić ręcznie.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: teamColor(t(fo.turn)).light }}>
              Odpowiada: {t(fo.turn).name}
              {fo.pendingTeam !== null ? ' – musi podać wyżej punktowaną odpowiedź' : ''}
            </Typography>
            <AnswerPicker round={r} onPick={(i) => act('foAnswer', { idx: i })} disabled={busy} hint="Kliknij pozycję z tablicy, którą uczestnik właśnie powiedział (zatwierdzasz jego odpowiedź)." />
            <Big color="error" onClick={() => act('foAnswer', { idx: null })} disabled={busy}>✖ Brak na tablicy</Big>
          </Box>
        )}
        {nothingYet && (
          <Button onClick={() => act('skip')} disabled={busy} sx={{ mt: 1.5, color: 'var(--ink-dim)' }}>🔄 Zmień pytanie</Button>
        )}
      </Panel>
    );
  }

  if (state.phase === 'decision') {
    return (
      <Panel title="Decyzja zwycięzcy pojedynku">
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', mb: 1.5 }}>Pojedynek wygrywa: {t(r.fo.winner).name}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Big onClick={() => act('decide', { play: true })} disabled={busy} sx={{ background: GREEN, color: '#031a0c' }}>GRAMY</Big>
          <Big onClick={() => act('decide', { play: false })} disabled={busy} color="warning">ODDAJEMY</Big>
        </Box>
      </Panel>
    );
  }

  if (state.phase === 'play') {
    return (
      <Panel title="Gra drużyny">
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: teamColor(t(r.ctrl)).light, mb: 0.5 }}>
          Gra: {t(r.ctrl).name}
          {repName(r.ctrl) ? ` – odpowiada ${repName(r.ctrl)}` : ''}
        </Typography>
        <Typography sx={{ mb: 1.5, color: r.strikes ? '#ff9b9b' : 'var(--ink-dim)' }}>
          Błędy: {r.strikes}/3{r.consult ? ` · drużyna „${t(1 - r.ctrl).name}” może się naradzać` : ''}
        </Typography>
        <AnswerPicker round={r} onPick={(i) => act('answer', { idx: i })} disabled={busy} hint="Kliknij pozycję z tablicy, jeśli odpowiedź jest dobra." />
        <Big color="error" onClick={() => act('strike')} disabled={busy} sx={{ mt: 1.5, width: '100%' }}>✖ Błąd</Big>
      </Panel>
    );
  }

  if (state.phase === 'steal') {
    return (
      <Panel title="Przejęcie – jedna szansa">
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: teamColor(t(r.stealTeam)).light, mb: 1 }}>Odpowiada: {t(r.stealTeam).name} (lider: {t(r.stealTeam).members.find((m) => m.isLeader)?.name || '—'})</Typography>
        <AnswerPicker round={r} onPick={(i) => act('steal', { idx: i })} disabled={busy} hint="Trafiona odpowiedź = cała pula dla przejmujących. Nietrafiona = pula dla drużyny, która grała." />
        <Big color="error" onClick={() => act('steal', { idx: null })} disabled={busy} sx={{ mt: 1.5, width: '100%' }}>✖ Nietrafiona</Big>
      </Panel>
    );
  }

  if (state.phase === 'roundEnd') {
    const hidden = r.answers.some((a) => !a.revealed);
    return (
      <Panel title="Koniec rundy">
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', mb: 1.5 }}>
          Rundę wygrywa {t(r.winner).name}: +{r.bank} pkt
        </Typography>
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {hidden && <Big variant="outlined" onClick={() => act('revealRest')} disabled={busy} sx={{ background: 'rgba(255,255,255,0.1)' }}>👁 Pokaż pozostałe odpowiedzi</Big>}
          <Big onClick={() => act('next')} disabled={busy} sx={{ background: GREEN, color: '#031a0c' }}>
            {state.stageWinner !== null ? `Zakończ etap – finał dla „${t(state.stageWinner).name}”` : 'Następna runda ▶'}
          </Big>
        </Box>
      </Panel>
    );
  }
  return null;
};

const StageEnd = ({ state, act, busy }) => {
  const team = state.teams[state.stageWinner];
  const [sel, setSel] = useState([]);
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]));
  return (
    <Panel title="Finał">
      <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', mb: 1 }}>
        Drużyna „{team.name}” ma {team.score} pkt i gra w finale!
      </Typography>
      <Typography sx={{ color: 'var(--ink-dim)', mb: 1.5 }}>Wybierz dwóch finalistów (kolejność kliknięcia = kolejność odpowiadania). Bez wyboru: lider + kolejna osoba.</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {team.members.map((m) => (
          <Chip key={m.id} onClick={() => toggle(m.id)} label={`${sel.includes(m.id) ? `${sel.indexOf(m.id) + 1}. ` : ''}${m.name}`} sx={{ fontWeight: 700, fontSize: '1rem', py: 2.2, color: sel.includes(m.id) ? '#031a0c' : '#fff', background: sel.includes(m.id) ? GREEN : 'rgba(255,255,255,0.14)' }} />
        ))}
      </Box>
      <Big onClick={() => act('startFinal', { repIds: sel })} disabled={busy} sx={{ background: GREEN, color: '#031a0c' }}>▶ Rozpocznij finał</Big>
    </Panel>
  );
};

// ---------- Final ----------
const FinalControls = ({ state, offsetRef, act, busy }) => {
  const f = state.final;
  const left = useSecondsLeft(f.deadline, offsetRef, state.paused ? state.pausedAt : null);
  const timing = f.step === 'p1' || f.step === 'p2';
  const key = f.step === 'p1' ? 'p1' : 'p2';
  const team = state.teams[f.team];

  return (
    <Panel title={`Finał – „${team.name}”, potrzeba ${f.target} pkt`}>
      <Typography sx={{ color: 'var(--ink-dim)', mb: 1.5 }}>
        Pierwszy: <strong style={{ color: '#fff' }}>{f.reps[0] && f.reps[0].name}</strong> · drugi: <strong style={{ color: '#fff' }}>{f.reps[1] && f.reps[1].name}</strong>
      </Typography>

      {f.step === 'ready' && <Big onClick={() => act('finalStart')} disabled={busy} sx={{ background: GREEN, color: '#031a0c', width: '100%' }}>▶ Start – pierwszy gracz ({state.config.final1Seconds} s)</Big>}
      {f.step === 'p1done' && (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Alert severity="info">Pierwszy gracz skończył – {f.sum1} pkt. Drugi gracz nie widzi tych odpowiedzi.</Alert>
          <Big onClick={() => act('finalStart')} disabled={busy} sx={{ background: GREEN, color: '#031a0c' }}>▶ Start – drugi gracz ({state.config.final2Seconds} s)</Big>
        </Box>
      )}
      {timing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', color: left !== null && left <= 5 ? '#ff6b6b' : GREEN, minWidth: 80 }}>{left === null ? '—' : Math.ceil(left)}</Typography>
          <Big color="warning" onClick={() => act('finalStop')} disabled={busy}>⏹ Zakończ odliczanie</Big>
        </Box>
      )}
      {f.step === 'p2done' && (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Alert severity="info">Obaj gracze skończyli. Punkty: {f.sum1} + {f.sum2} = {(f.sum1 || 0) + (f.sum2 || 0)} (próg {f.target}).</Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Big onClick={() => act('finalRevealNext')} disabled={busy} sx={{ background: GREEN, color: '#031a0c' }}>Odkryj pierwszy wiersz</Big>
            <Big onClick={() => act('finalRevealAll')} disabled={busy} color="warning">Odkryj wszystko</Big>
          </Box>
        </Box>
      )}
      {f.step === 'revealing' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
          <Big onClick={() => act('finalRevealNext')} disabled={busy} sx={{ background: GREEN, color: '#031a0c' }}>Odkryj kolejny wiersz ({f.revealed}/{f.rows.length})</Big>
          <Big onClick={() => act('finalRevealAll')} disabled={busy} color="warning">Odkryj resztę</Big>
        </Box>
      )}
      {f.step === 'result' && f.result && <Alert severity={f.result.win ? 'success' : 'warning'}>{f.result.win ? 'Wygrana!' : 'Nie tym razem.'} {f.result.s1} + {f.result.s2} = {f.result.total} z {f.result.target}</Alert>}

      <Box sx={{ display: 'grid', gap: 1.5, mt: 1.5 }}>
        {f.rows.map((row) => (
          <Box key={row.i} sx={{ p: 1.5, borderRadius: '14px', background: 'rgba(255,255,255,0.06)' }}>
            <Typography sx={{ fontWeight: 700, mb: 0.75 }}>
              {row.i + 1}. {row.question}
            </Typography>
            {timing ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {row.answers.map((a, ai) => {
                  const mine = row[key];
                  const picked = mine && mine.idx === ai;
                  const repeated = key === 'p2' && row.p1 && row.p1.idx === ai;
                  return (
                    <Chip
                      key={ai}
                      disabled={busy || repeated}
                      onClick={() => act('finalSet', { qi: row.i, idx: ai, text: a.text })}
                      label={`${a.text} (${a.points})${repeated ? ' – było' : ''}`}
                      sx={{ fontWeight: 700, color: picked ? '#031a0c' : '#fff', background: picked ? GREEN : 'rgba(255,255,255,0.14)' }}
                    />
                  );
                })}
                <Chip
                  onClick={() => act('finalSet', { qi: row.i, idx: null, text: '—' })}
                  label="✖ spoza tablicy"
                  sx={{ fontWeight: 700, color: row[key] && row[key].idx === null ? '#fff' : '#ffb4b4', background: row[key] && row[key].idx === null ? '#b32a2a' : 'rgba(255,100,100,0.15)' }}
                />
                {row[key] && <Chip onClick={() => act('finalClear', { qi: row.i })} label="wyczyść" variant="outlined" sx={{ color: 'var(--ink-dim)' }} />}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'var(--ink-dim)' }}>
                1: {row.p1 ? `${row.a1 ? row.a1.text : '—'} (${row.a1 ? row.a1.points : 0})` : '—'} · 2: {row.p2 ? `${row.a2 ? row.a2.text : '—'} (${row.a2 ? row.a2.points : 0})` : '—'}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Panel>
  );
};

// ---------- Glowny panel ----------
const FamHost = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const sound = useSoundSettings('fam-host', false);
  const left = useSecondsLeft(state.final ? state.final.deadline : null, offsetRef, state.paused ? state.pausedAt : null);
  useFamSounds(state, { role: 'host', enabled: sound.active, secondsLeft: left });
  const r = state.round;
  const running = state.status === 'running';

  return (
    <Box sx={{ display: 'grid', gap: 3, position: 'relative', zIndex: 20 }}>
      <Box className="glass" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography className="gold-text" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>Familiada</Typography>
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', letterSpacing: 5, color: GREEN }}>{state.code}</Typography>
        {state.test && <Chip size="small" label="TEST" sx={{ background: '#ffd23f', color: '#1a1205', fontWeight: 800 }} />}
        <Box sx={{ flex: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {state.teams.map((t) => (
            <Typography key={t.idx} sx={{ fontWeight: 800, color: teamColor(t).light }}>
              {t.name}: <span style={{ color: '#fff' }}>{t.score}</span>
            </Typography>
          ))}
          {r && running && (
            <Typography sx={{ color: 'var(--ink-dim)' }}>
              Runda {r.n}
              {r.multiplier > 1 ? ` (×${r.multiplier})` : ''} · pula {r.bank} pkt
            </Typography>
          )}
        </Box>
        <Button component={Link} to={`/teleturniej/gra/${state.code}/tv`} target="_blank" size="small" sx={{ color: GREEN }}>📺 TV</Button>
        {running && (state.paused ? (
          <Button variant="contained" onClick={() => act('resume')} disabled={busy} sx={{ background: GREEN, color: '#031a0c', fontWeight: 800 }}>▶ Wznów</Button>
        ) : (
          <Button variant="outlined" onClick={() => act('pause')} disabled={busy} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}>⏸ Pauza</Button>
        ))}
        {running && (
          <Button color="error" onClick={() => window.confirm('Zakończyć grę teraz?') && act('end')} disabled={busy}>Zakończ</Button>
        )}
        <FamSoundControl sound={sound} variant="inline" />
      </Box>

      {error && <Alert severity="error" onClose={onResetError}>{error}</Alert>}
      {state.paused && <Alert severity="warning">Gra jest wstrzymana – uczestnicy i TV widzą przerwę.</Alert>}

      {state.status === 'lobby' && <Lobby state={state} act={act} busy={busy} />}

      {running && r && state.phase !== 'final' && (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.3fr) minmax(0,1fr)' }, alignItems: 'start' }}>
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Panel title={`Pytanie · runda ${r.n}`}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' }, lineHeight: 1.3 }}>{r.question}</Typography>
              <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 0.5 }}>
                {r.count} odpowiedzi · pula pytań: zostało {state.poolRemaining}/{state.poolSize}
                {state.recycled ? ' (pytania się powtarzają)' : ''}
              </Typography>
            </Panel>
            {state.phase === 'stageEnd' ? <StageEnd state={state} act={act} busy={busy} /> : <RoundControls state={state} act={act} busy={busy} />}
          </Box>
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Suggestions state={state} />
            <LogPanel log={state.log} />
          </Box>
        </Box>
      )}

      {running && state.phase === 'final' && state.final && (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1.5fr) minmax(0,1fr)' }, alignItems: 'start' }}>
          <FinalControls state={state} offsetRef={offsetRef} act={act} busy={busy} />
          <LogPanel log={state.log} />
        </Box>
      )}

      {state.status === 'finished' && (
        <Panel title="Gra zakończona">
          <Typography sx={{ fontWeight: 800, fontSize: '1.4rem', mb: 1 }}>
            {state.result && state.result.winnerTeam !== null && state.result.winnerTeam !== undefined ? `Wygrywa drużyna „${state.teams[state.result.winnerTeam].name}”` : 'Remis'}
          </Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mb: 2 }}>
            {state.teams[0].name} {state.teams[0].score} : {state.teams[1].score} {state.teams[1].name}
          </Typography>
          <Button component={Link} to="/teleturniej/gry" variant="outlined" sx={{ color: GREEN, borderColor: GREEN }}>← Wróć do listy gier</Button>
        </Panel>
      )}
    </Box>
  );
};

export default FamHost;
