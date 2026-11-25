import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { api } from '../quiz/quizApi';

const fieldSx = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.35)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

// Wspolna karta startu gry w hubie (Najslabsze ogniwo / Klamczuch)
export const PartyCard = ({ format, title, tagline, bullets, sources, usesBank, onCreated }) => {
  const [source, setSource] = useState(sources[0].value);
  const [inside, setInside] = useState(true);
  const [stats, setStats] = useState({ total: null, inside: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!usesBank) return;
    (async () => {
      const res = await api('/games/bank-stats', { admin: true });
      if (res.ok) setStats({ total: res.data.total, inside: res.data.inside });
    })();
  }, [usesBank]);

  const create = async (test) => {
    setBusy(true);
    setError('');
    const res = await api('/games', { method: 'POST', admin: true, body: { format, test, source, ...(source === 'bank' ? { inside } : {}) } });
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
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', lineHeight: 1 }} className="gold-text">{title}</Typography>
        <Typography sx={{ color: 'var(--ink-dim)' }}>{tagline}</Typography>
      </Box>
      <Box component="ul" sx={{ color: 'var(--ink-dim)', pl: 3, m: 0, lineHeight: 1.7 }}>
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box className="glass-strong" sx={{ mt: 3, p: 2.5, borderRadius: '18px', border: '1px solid rgba(var(--accent-rgb),0.4)', display: 'grid', gap: 2 }}>
        <FormControl size="small" fullWidth sx={fieldSx}>
          <InputLabel id={`${format}-src-label`}>Pula pytań</InputLabel>
          <Select labelId={`${format}-src-label`} label="Pula pytań" value={source} onChange={(e) => setSource(e.target.value)} sx={{ color: 'var(--ink)', '& .MuiSvgIcon-root': { color: 'var(--ink)' } }}>
            {sources.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}{s.value === 'bank' && stats.total !== null ? ` (${stats.total})` : ''}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {source === 'bank' && (
          <Box>
            <FormControlLabel
              control={<Checkbox checked={inside} onChange={(e) => setInside(e.target.checked)} sx={{ color: 'var(--ink-dim)' }} />}
              label={`Pytania „inside” (zrozumiałe tylko dla paczki znajomych) – ${stats.inside}`}
              sx={{ color: 'var(--ink)', alignItems: 'flex-start', m: 0 }}
            />
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)', ml: 4 }}>Odznacz, jeśli w grze są osoby spoza paczki.</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="contained" size="large" onClick={() => create(false)} disabled={busy}>▶ Utwórz grę</Button>
          <Button variant="outlined" size="large" onClick={() => create(true)} disabled={busy} sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)', fontWeight: 800 }}>
            🧪 Tryb testowy (z botami)
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export const OgniwoCard = ({ onCreated }) => (
  <PartyCard
    format="ogniwo"
    title="Najsłabsze ogniwo"
    tagline="3–12 graczy · odpowiadacie po kolei, potem głosujecie, kto odpada"
    usesBank
    onCreated={onCreated}
    sources={[
      { value: 'sample', label: 'Wbudowana (wiedza ogólna, ABCD i otwarte)' },
      { value: 'bank', label: 'Moje pytania z formularza (bez filmów i muzyki)' },
    ]}
    bullets={[
      <>Pytania z tej samej puli co „1 z 10”: ABCD odpowiada się na telefonie, <strong style={{ color: 'var(--ink)' }}>otwarte – głosem</strong> (ocenia prowadzący).</>,
      <>Poprawne odpowiedzi budują <strong style={{ color: 'var(--ink)' }}>łańcuch</strong> (20 → 1000), błąd zrywa go do zera. <strong style={{ color: 'var(--ink)' }}>BANK</strong> zabezpiecza dotychczasową kwotę.</>,
      <>Po rundzie wszyscy głosują na <strong style={{ color: 'var(--ink)' }}>najsłabsze ogniwo</strong> – odpada. Każda runda jest krótsza.</>,
      <>Gdy zostanie dwoje graczy: <strong style={{ color: 'var(--ink)' }}>pojedynek</strong> o cały bank (po 5 pytań, potem nagła śmierć).</>,
    ]}
  />
);

export default OgniwoCard;
