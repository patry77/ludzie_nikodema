import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import confetti from 'canvas-confetti';
import { useSiteTheme } from '../ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const PersonPage = () => {
  const { preset } = useSiteTheme();
  const { linkId } = useParams();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/person/${linkId}`);
        if (response.ok) {
          setPerson(await response.json());
        } else {
          setError('Nie znaleziono osoby o podanym linku');
        }
      } catch (e) {
        setError('Błąd podczas ładowania danych');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [linkId]);

  const reveal = () => {
    setRevealed(true);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: preset.colors.confetti,
    });
  };

  const shell = (children) => (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, position: 'relative', zIndex: 20 }}>
      {children}
    </Container>
  );

  if (loading) {
    return shell(
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={56} sx={{ color: 'var(--gold)' }} />
      </Box>
    );
  }

  if (error || !person) {
    return shell(<Alert severity="error">{error || 'Nie znaleziono osoby'}</Alert>);
  }

  return shell(
    <Box className="glass rise-in" sx={{ textAlign: 'center', p: { xs: 3, md: 6 } }}>
      <Typography sx={{ letterSpacing: 4, textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--gold)', mb: 1.5 }}>
        {preset.drawEyebrow}
      </Typography>
      <Typography variant="h3" className="gold-text" sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, mb: 4 }}>
        Cześć {person.name}! 🎅
      </Typography>

      {person.assignedTo ? (
        !revealed ? (
          <Box>
            <Typography sx={{ color: 'var(--ink-dim)', mb: 3 }}>
              Twoja wylosowana osoba czeka zapakowana pod choinką. Upewnij się, że nikt nie patrzy! 👀
            </Typography>
            <Box
              component="button"
              type="button"
              onClick={reveal}
              className="glow-pulse"
              sx={{
                cursor: 'pointer',
                border: '2px solid var(--gold)',
                borderRadius: 999,
                px: 5,
                py: 1.75,
                font: 'inherit',
                fontWeight: 700,
                fontSize: '1.1rem',
                color: '#fff6e5',
                background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))',
                '&:hover': { filter: 'brightness(1.12)' },
              }}
            >
              🎁 Rozpakuj losowanie
            </Box>
          </Box>
        ) : (
          <Box className="rise-in">
            <Typography sx={{ color: 'var(--ink-dim)', mb: 1 }}>Obdarowujesz:</Typography>
            <Typography
              variant="h2"
              className="gold-text"
              sx={{ fontSize: { xs: '2.6rem', md: '3.6rem' }, lineHeight: 1.1, mb: 4, wordBreak: 'break-word' }}
            >
              {person.assignedTo.name}
            </Typography>

            {person.assignedTo.wants ? (
              <Box sx={{ textAlign: 'left', p: 3, borderRadius: '18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb),0.35)' }}>
                <Typography sx={{ color: 'var(--gold)', fontWeight: 700, mb: 1 }}>💝 Ta osoba marzy o:</Typography>
                <Typography sx={{ color: 'var(--ink)', fontStyle: 'italic', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {person.assignedTo.wants}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ color: 'var(--ink-dim)' }}>Ta osoba nie podała jeszcze, co chciałaby dostać – zaskocz ją! 🎁</Typography>
            )}

            <Typography sx={{ color: 'var(--ink-dim)', mt: 4 }}>🤫 To tajemnica – nikomu nie mów!</Typography>
          </Box>
        )
      ) : (
        <Box sx={{ p: 3, borderRadius: '18px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb),0.35)' }}>
          <Typography variant="h5" sx={{ color: 'var(--gold)', mb: 1 }}>
            {person.drawDone ? '⏳ Czekasz na dolosowanie' : '⏳ Losowanie jeszcze się nie odbyło'}
          </Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>{person.drawDone ? 'Dołączyłeś/aś po losowaniu – organizator dolosuje Ci osobę. Odśwież tę stronę później.' : 'Poczekaj na losowanie, a następnie odśwież tę stronę.'}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default PersonPage;
