import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { api } from '../quiz/quizApi';

const fieldSx = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.35)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

// Karta startu gry Kahoot w hubie teleturniejow
export const KahootCard = ({ onCreated }) => {
  const [source, setSource] = useState('sample');
  const [inside, setInside] = useState(true);
  const [seconds, setSeconds] = useState(20);
  const [total, setTotal] = useState(10);
  const [stats, setStats] = useState({ abcd: null, insideAbcd: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const res = await api('/games/bank-stats', { admin: true });
      if (res.ok) setStats({ abcd: res.data.abcd, insideAbcd: res.data.insideAbcd });
    })();
  }, []);

  const create = async (test) => {
    setBusy(true);
    setError('');
    const res = await api('/games', {
      method: 'POST',
      admin: true,
      body: { format: 'kahoot', test, source, ...(source === 'bank' ? { inside } : {}), config: { questionSeconds: seconds, totalQuestions: total } },
    });
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
        <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '3rem', lineHeight: 1 }} className="gold-text">Kahoot</Typography>
        <Typography sx={{ color: 'var(--ink-dim)' }}>1–20 graczy · wszyscy odpowiadają naraz z telefonów</Typography>
      </Box>
      <Box component="ul" sx={{ color: 'var(--ink-dim)', pl: 3, m: 0, lineHeight: 1.7 }}>
        <li>Pytania <strong style={{ color: 'var(--ink)' }}>ABCD</strong> z tej samej puli co „1 z 10” (pytania otwarte są pomijane), muzyczne i wideo grają na TV.</li>
        <li>Punkty za poprawną odpowiedź: <strong style={{ color: 'var(--ink)' }}>do 1000</strong>, im szybciej, tym więcej. Seria poprawnych odpowiedzi daje bonus do +500.</li>
        <li>Po każdym pytaniu: punkty zdobyte w rundzie, najszybszy gracz, serie i ranking.</li>
        <li>Prowadzący może tylko przejść do następnego pytania albo wstrzymać grę.</li>
      </Box>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box className="glass-strong" sx={{ mt: 3, p: 2.5, borderRadius: '18px', border: '1px solid rgba(var(--accent-rgb),0.4)', display: 'grid', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' }, gap: 1.5 }}>
          <FormControl size="small" fullWidth sx={fieldSx}>
            <InputLabel id="kah-src-label">Pula pytań</InputLabel>
            <Select labelId="kah-src-label" label="Pula pytań" value={source} onChange={(e) => setSource(e.target.value)} sx={{ color: 'var(--ink)', '& .MuiSvgIcon-root': { color: 'var(--ink)' } }}>
              <MenuItem value="sample">Wbudowana (pytania wiedzy ogólnej ABCD)</MenuItem>
              <MenuItem value="music">Muzyczna z YouTube (wbudowana)</MenuItem>
              <MenuItem value="bank">Moje pytania z formularza{stats.abcd !== null ? ` (ABCD: ${stats.abcd})` : ''}</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" type="number" label="Liczba pytań" value={total} onChange={(e) => setTotal(Number(e.target.value))} sx={fieldSx} inputProps={{ min: 3, max: 50 }} />
          <TextField size="small" type="number" label="Czas na pytanie (s)" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} sx={fieldSx} inputProps={{ min: 5, max: 120 }} />
        </Box>
        {source === 'bank' && (
          <Box>
            <FormControlLabel
              control={<Checkbox checked={inside} onChange={(e) => setInside(e.target.checked)} sx={{ color: 'var(--ink-dim)' }} />}
              label={`Pytania „inside” (zrozumiałe tylko dla paczki znajomych) – ${stats.insideAbcd}`}
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

export default KahootCard;
