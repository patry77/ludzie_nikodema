import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, Slider, TextField, Typography } from '@mui/material';
import { api } from '../quiz/quizApi';
import { isAudioUnlocked, setMasterVolume, unlockAudio } from '../quiz/sound';
import { FAM_SOUND_LIST, playFamSound } from './famSound';

const GREEN = '#39ff6a';
const fieldSx = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.45)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
  '& .MuiInputLabel-root.Mui-focused': { color: GREEN },
};
const label = { color: GREEN, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem' };

// ---------- Karta formatu: Familiada ----------
export const FamiliadaCard = ({ onCreated }) => {
  const [source, setSource] = useState('sample');
  const [counts, setCounts] = useState({ custom: 0, sample: 40 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await api('/familiada/questions', { admin: true });
      if (res.ok) setCounts({ custom: res.data.custom.length, sample: res.data.sampleCount });
    })();
  }, []);

  const create = async (test) => {
    setBusy(true);
    setError('');
    const res = await api('/games', { method: 'POST', admin: true, body: { format: 'familiada', test, source: test ? 'sample' : source } });
    setBusy(false);
    if (!res.ok) {
      setError(res.data.error || 'Nie udało się utworzyć gry');
      return;
    }
    if (onCreated) onCreated();
    if (test) {
      try {
        sessionStorage.setItem(`quizTester:${res.data.code}`, JSON.stringify({ playerId: res.data.playerId, token: res.data.token }));
      } catch (e) {
        /* ignorujemy */
      }
      navigate(`/teleturniej/gra/${res.data.code}/test`);
    } else {
      navigate(`/teleturniej/gra/${res.data.code}/prowadzacy`);
    }
  };

  return (
    <Box className="glass" sx={{ p: { xs: 2.5, md: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.6rem', lineHeight: 1, color: GREEN, textShadow: '0 0 18px rgba(57,255,106,0.6)' }}>Familiada</Typography>
        <Typography sx={{ color: 'var(--ink-dim)' }}>2 drużyny · prowadzący, widok TV z tablicą · telefony tylko do narady</Typography>
      </Box>
      <Box component="ul" sx={{ color: 'var(--ink-dim)', pl: 3, m: 0, lineHeight: 1.7 }}>
        <li>Pytania z ankiety: na <strong style={{ color: 'var(--ink)' }}>tablicy</strong> ukryte odpowiedzi z punktami. Prowadzący zatwierdza każdą odpowiedź uczestnika.</li>
        <li><strong style={{ color: 'var(--ink)' }}>Pojedynek</strong> przedstawicieli o przycisk: najwyżej punktowana odpowiedź wygrywa; zwycięzca decyduje, czy gra, czy oddaje pytanie.</li>
        <li><strong style={{ color: 'var(--ink)' }}>Gra drużyny:</strong> odpowiadają po kolei; <strong style={{ color: 'var(--ink)' }}>3 błędy</strong> = przejęcie (rywale mają jedną szansę na całą pulę).</li>
        <li>Runda 4 – punkty ×2, runda 5 i dalej – ×3. Kto pierwszy zbierze 300 pkt, gra w <strong style={{ color: 'var(--ink)' }}>finale</strong>: 5 pytań, dwóch graczy (15 s i 20 s), potrzeba 200 pkt.</li>
        <li>Na telefonach uczestnicy wpisują propozycje odpowiedzi, a lider drużyny wybiera tę, którą poda.</li>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, mt: 3 }}>
        <Box className="glass-strong" sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(57,255,106,0.4)' }}>
          <Typography sx={{ fontWeight: 800, color: GREEN, mb: 0.5 }}>🧪 Tryb testowy</Typography>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2 }}>
            Sam sprawdzisz całą grę: jesteś prowadzącym i kapitanem pierwszej drużyny, pozostałe osoby to boty (podpowiadają na telefonach). Wbudowana pula {counts.sample} pytań. Panel, TV i telefon na jednym ekranie.
          </Typography>
          <Button variant="contained" size="large" onClick={() => create(true)} disabled={busy} sx={{ background: `linear-gradient(120deg, #9dffba, ${GREEN} 55%, #17b84a)`, color: '#031a0c', fontWeight: 800 }}>
            🧪 Uruchom tryb testowy
          </Button>
        </Box>
        <Box className="glass-strong" sx={{ p: 2.5, borderRadius: '18px', border: '1px solid rgba(57,255,106,0.4)' }}>
          <Typography sx={{ fontWeight: 800, color: GREEN, mb: 0.5 }}>🎮 Nowa gra z uczestnikami</Typography>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2 }}>Dostaniesz kod i QR dla telefonów. Nazwy drużyn i liderów ustawisz w poczekalni.</Typography>
          <FormControl size="small" fullWidth sx={{ ...fieldSx, mb: 2 }}>
            <InputLabel id="fam-src-label">Pula pytań</InputLabel>
            <Select labelId="fam-src-label" label="Pula pytań" value={source} onChange={(e) => setSource(e.target.value)} sx={{ color: 'var(--ink)', '& .MuiSvgIcon-root': { color: 'var(--ink)' } }}>
              <MenuItem value="sample">Wbudowana ({counts.sample} pytań)</MenuItem>
              <MenuItem value="custom" disabled={counts.custom < 1}>Moje pytania ({counts.custom})</MenuItem>
              <MenuItem value="all">Wbudowane + moje ({counts.sample + counts.custom})</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" size="large" onClick={() => create(false)} disabled={busy}>▶ Utwórz grę</Button>
        </Box>
      </Box>
    </Box>
  );
};

// ---------- Edytor wlasnych pytan ----------
const emptyRows = () => Array.from({ length: 5 }, () => ({ tekst: '', punkty: '' }));

export const FamiliadaQuestionEditor = () => {
  const [list, setList] = useState([]);
  const [pytanie, setPytanie] = useState('');
  const [rows, setRows] = useState(emptyRows());
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api('/familiada/questions', { admin: true });
    if (res.ok) setList(res.data.custom);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const setRow = (i, patch) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const sum = rows.reduce((s, r) => s + (Number(r.punkty) || 0), 0);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const odpowiedzi = rows.filter((r) => r.tekst.trim()).map((r) => ({ tekst: r.tekst.trim(), punkty: Number(r.punkty) }));
    const res = await api('/familiada/questions', { method: 'POST', admin: true, body: { pytanie: pytanie.trim(), odpowiedzi } });
    setBusy(false);
    if (!res.ok) {
      setMsg({ severity: 'error', text: res.data.error || 'Nie udało się dodać pytania' });
      return;
    }
    setMsg({ severity: 'success', text: 'Dodano pytanie.' });
    setPytanie('');
    setRows(emptyRows());
    load();
  };

  const remove = async (q) => {
    if (!window.confirm(`Usunąć pytanie „${q.pytanie}”?`)) return;
    await api(`/familiada/questions/${q.id}`, { method: 'DELETE', admin: true });
    load();
  };

  return (
    <Box className="glass" sx={{ p: { xs: 2, md: 3 }, mt: 3 }}>
      <Typography sx={{ ...label, mb: 1 }}>➕ Własne pytania do Familiady ({list.length})</Typography>
      <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
        Pytanie ankietowe: 3–6 odpowiedzi, każda do 16 znaków (tyle mieści tablica), z punktami 1–99 (zwykle sumują się do ok. 100). Odpowiedzi ułożą się od najwyżej punktowanej.
      </Typography>
      <Box component="form" onSubmit={add} sx={{ display: 'grid', gap: 1.5 }}>
        <TextField label="Pytanie (np. „Podaj coś, co robimy w Wigilię”)" value={pytanie} onChange={(e) => setPytanie(e.target.value)} sx={fieldSx} inputProps={{ maxLength: 200 }} />
        {rows.map((r, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 1.5 }}>
            <TextField size="small" label={`Odpowiedź ${i + 1}`} value={r.tekst} onChange={(e) => setRow(i, { tekst: e.target.value })} inputProps={{ maxLength: 16 }} helperText={r.tekst ? `${[...r.tekst].length}/16` : ' '} sx={fieldSx} />
            <TextField size="small" type="number" label="Punkty" value={r.punkty} onChange={(e) => setRow(i, { punkty: e.target.value })} inputProps={{ min: 1, max: 99 }} sx={fieldSx} />
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button type="button" onClick={() => setRows((rs) => (rs.length < 6 ? [...rs, { tekst: '', punkty: '' }] : rs))} disabled={rows.length >= 6} sx={{ color: GREEN }}>+ odpowiedź</Button>
          <Typography variant="body2" sx={{ color: 'var(--ink-dim)', flex: 1 }}>Suma punktów: {sum}</Typography>
          <Button type="submit" variant="contained" disabled={busy || !pytanie.trim()}>Dodaj pytanie</Button>
        </Box>
        {msg && <Alert severity={msg.severity}>{msg.text}</Alert>}
      </Box>

      {list.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, mt: 3 }}>
          {list.map((q) => (
            <Box key={q.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1.5, borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }}>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{q.pytanie}</Typography>
                <Typography variant="body2" sx={{ color: 'var(--ink-dim)' }}>{q.odpowiedzi.map((a) => `${a.tekst} (${a.punkty})`).join(' · ')}</Typography>
              </Box>
              <IconButton aria-label="Usuń pytanie" onClick={() => remove(q)} sx={{ color: '#ff9b9b' }}>✕</IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// ---------- Test dzwiekow Familiady ----------
export const FamiliadaSoundTester = () => {
  const [volume, setVolume] = useState(0.6);
  const [ready, setReady] = useState(isAudioUnlocked());
  const play = async (name) => {
    const ok = await unlockAudio();
    setReady(ok);
    setMasterVolume(volume);
    if (ok) playFamSound(name);
  };
  return (
    <Box className="glass" sx={{ p: { xs: 2, md: 3 }, mt: 3 }}>
      <Typography sx={{ ...label, mb: 1 }}>🔊 Dźwięki Familiady</Typography>
      <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
        Osobny zestaw niż w „1 z 10” (generowany w przeglądarce). Własne nagrania: plik o nazwie efektu (np. <code>strike.mp3</code>) w folderze <code>frontend/public/sounds/familiada/</code> – zastąpi dźwięk wbudowany.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, maxWidth: 360 }}>
        <Typography sx={{ minWidth: 80 }}>Głośność</Typography>
        <Slider size="small" value={Math.round(volume * 100)} onChange={(e, v) => { setVolume(v / 100); setMasterVolume(v / 100); }} aria-label="Głośność" sx={{ color: GREEN }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
        {FAM_SOUND_LIST.map((s) => (
          <Button key={s.name} onClick={() => play(s.name)} sx={{ justifyContent: 'flex-start', textAlign: 'left', color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', px: 2, py: 1 }}>
            <span style={{ marginRight: 10 }}>▶</span>
            <span>
              <strong>{s.label}</strong>
              <br />
              <small style={{ opacity: 0.7 }}>{s.hint}</small>
            </span>
          </Button>
        ))}
      </Box>
      {!ready && <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 1.5 }}>Kliknij dowolny efekt, aby odblokować dźwięk w przeglądarce.</Typography>}
    </Box>
  );
};
