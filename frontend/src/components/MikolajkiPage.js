import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Alert, CircularProgress } from '@mui/material';
import confetti from 'canvas-confetti';
import { Navigate } from 'react-router-dom';
import { useSiteTheme } from '../ThemeContext';
import { Countdown } from './menuShared';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Pola formularza na jasnym szkle - czytelne na ciemnym tle
const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: 'var(--ink)',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '14px',
    '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.35)' },
    '&:hover fieldset': { borderColor: 'rgba(var(--accent-rgb),0.7)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--gold)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--gold)' },
  '& .MuiFormHelperText-root': { color: 'var(--ink-dim)' },
};

const MikolajkiPage = () => {
  const { preset, loaded } = useSiteTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [wants, setWants] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Podaj swoje imię.');
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Podaj poprawny adres email.');
      return;
    }
    try {
      setSending(true);
      const response = await fetch(`${API_URL}/mikolajki/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), wants: wants.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się zapisać. Spróbuj ponownie.');
      setDone({ name: data.name, late: !!data.late });
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors: preset.colors.confetti });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setDone(null);
    setName('');
    setEmail('');
    setWants('');
  };

  // Karta Mikolajki istnieje tylko w motywie swiatecznym
  if (loaded && !preset.mikolajki) return <Navigate to="/" replace />;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 7 }, position: 'relative', zIndex: 20 }}>
      <Box className="glass rise-in" sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontSize: '2.6rem', lineHeight: 1 }} aria-hidden="true">🎁</Typography>
          <Typography variant="h3" className="gold-text" sx={{ fontSize: { xs: '2.1rem', md: '2.8rem' }, my: 1 }}>
            Mikołajki 2026
          </Typography>
          <Typography sx={{ color: 'var(--ink-dim)', mb: 3 }}>
            Dołącz do losowania prezentów! Wpisz się, napisz co chciał(a)byś dostać, a po losowaniu poznasz osobę, którą obdarujesz.
          </Typography>
          <Countdown />
        </Box>

        {done ? (
          <Box className="rise-in" sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ color: 'var(--gold)', mb: 1 }}>
              Jesteś na liście, {done.name}! 🎄
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', mb: 3 }}>
              {done.late
                ? 'Losowanie już się odbyło – organizator dolosuje Ci osobę i da znać mailem.'
                : 'Gdy losowanie się odbędzie, dostaniesz swój osobisty link mailem.'}
            </Typography>
            <Button onClick={reset} variant="outlined" sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>
              Dodaj kolejną osobę
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={submit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Twoje imię *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="given-name"
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Email *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              helperText="Wyślemy na niego link z wynikiem losowania."
              fullWidth
              sx={fieldSx}
            />

            <TextField
              label="Co chciał(a)byś dostać pod choinkę? (opcjonalnie)"
              value={wants}
              onChange={(e) => setWants(e.target.value)}
              multiline
              rows={4}
              helperText="Pisz ile chcesz – to zobaczy tylko osoba, która Cię wylosuje."
              fullWidth
              sx={fieldSx}
            />

            <Button
              type="submit"
              size="large"
              disabled={sending || !name.trim() || !email.trim()}
              sx={{
                mt: 1,
                py: 1.5,
                fontWeight: 700,
                color: '#fff6e5',
                border: '2px solid var(--gold)',
                background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))',
                '&:hover': { filter: 'brightness(1.12)', background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))' },
                '&.Mui-disabled': { color: 'rgba(255,246,229,0.5)', borderColor: 'rgba(var(--accent-rgb),0.3)' },
              }}
            >
              {sending ? <CircularProgress size={24} sx={{ color: '#fff6e5' }} /> : '🎅 Dołączam do losowania'}
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default MikolajkiPage;
