import React, { useState } from 'react';
import { Alert, Box, Container, InputBase, Typography } from '@mui/material';
import confetti from 'canvas-confetti';
import { useSiteTheme } from '../ThemeContext';
import { QuizNav } from '../quiz/QuizPages';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const LETTERS = ['a', 'b', 'c', 'd'];

const BORDER_GOLD = 'linear-gradient(180deg, var(--gold-light), var(--gold-deep))';
const BORDER_GREEN = 'linear-gradient(180deg, #b6ffc9, #19b857)';
const FILL_BLUE = 'linear-gradient(180deg, #0b1a73 0%, #050f46 100%)';
const FILL_GREEN = 'linear-gradient(180deg, #11994a 0%, #0a6b33 100%)';

// Szesciokatny pasek w stylu teleturnieju: zlota ramka + granatowe (albo zielone) wypelnienie.
const HexBar = ({ selected = false, minHeight = 56, onClick, children, component, ...rest }) => (
  <Box
    component={component}
    onClick={onClick}
    className="hex-bar"
    sx={{
      p: '2px',
      background: selected ? BORDER_GREEN : BORDER_GOLD,
      cursor: onClick ? 'pointer' : 'default',
      border: 0,
      width: '100%',
      transition: 'filter .15s ease, transform .15s ease',
      '&:hover': onClick ? { filter: 'brightness(1.12)', transform: 'translateY(-1px)' } : undefined,
      '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 2 },
    }}
    {...rest}
  >
    <Box
      className="hex-bar"
      sx={{
        background: selected ? FILL_GREEN : FILL_BLUE,
        display: 'flex',
        alignItems: 'center',
        minHeight,
        px: { xs: 3.5, sm: 5 },
        py: 0.5,
        color: '#fff',
        textAlign: 'left',
      }}
    >
      {children}
    </Box>
  </Box>
);

const inputSx = {
  flex: 1,
  color: '#fff',
  fontSize: { xs: '1rem', sm: '1.15rem' },
  fontWeight: 500,
  '& input::placeholder, & textarea::placeholder': { color: 'rgba(255,255,255,0.55)', opacity: 1 },
};

const Letter = ({ children }) => (
  <Box component="span" sx={{ color: 'var(--primary-light)', fontWeight: 800, fontSize: '1.2rem', mr: 1.5, minWidth: 28 }}>
    {children}:
  </Box>
);

const SectionLabel = ({ children }) => (
  <Typography sx={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1.25 }}>
    {children}
  </Typography>
);

const emptyForm = { pytanie: '', odp_a: '', odp_b: '', odp_c: '', odp_d: '', poprawna_litera: '', poprawna_tekst: '', link: '' };

// Podstrona /teleturniej (motyw teleturniejowy ustawia ThemeContext). Na razie tylko formularz dodawania pytan.
const TeleturniejPage = () => {
  const { preset } = useSiteTheme();
  const [typ, setTyp] = useState('abcd'); // 'abcd' | 'otwarte'
  const [media, setMedia] = useState(''); // '' | 'muzyka' | 'wideo'
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(0);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    if (!form.pytanie.trim()) return 'Wpisz treść pytania.';
    if (media) {
      let ok = false;
      try {
        const u = new URL(form.link.trim());
        ok = u.protocol === 'http:' || u.protocol === 'https:';
      } catch (e) {
        ok = false;
      }
      if (!ok) return 'Podaj poprawny link (zaczynający się od http:// lub https://).';
    }
    if (typ === 'abcd') {
      for (const l of LETTERS) {
        if (!form[`odp_${l}`].trim()) return `Uzupełnij odpowiedź ${l.toUpperCase()}.`;
      }
      if (!form.poprawna_litera) return 'Wskaż poprawną odpowiedź (A, B, C lub D).';
    } else if (!form.poprawna_tekst.trim()) {
      return 'Wpisz poprawną odpowiedź.';
    }
    return '';
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setSending(true);
    try {
      const payload =
        typ === 'abcd'
          ? {
              typ,
              pytanie: form.pytanie.trim(),
              odp_a: form.odp_a.trim(),
              odp_b: form.odp_b.trim(),
              odp_c: form.odp_c.trim(),
              odp_d: form.odp_d.trim(),
              poprawna_odpowiedz: form.poprawna_litera,
            }
          : { typ, pytanie: form.pytanie.trim(), poprawna_odpowiedz: form.poprawna_tekst.trim() };
      if (media) {
        payload.media = media;
        payload.link = form.link.trim();
      }
      const response = await fetch(`${API_URL}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się dodać pytania.');
      setAdded((n) => n + 1);
      setForm(emptyForm);
      confetti({ particleCount: 110, spread: 80, origin: { y: 0.6 }, colors: preset.colors.confetti });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatButton = (value, label, hint) => (
    <HexBar
      component="button"
      type="button"
      selected={typ === value}
      minHeight={64}
      onClick={() => setTyp(value)}
      aria-pressed={typ === value}
    >
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>{hint}</Typography>
      </Box>
    </HexBar>
  );

  return (
    <Box sx={{ position: 'relative', minHeight: 'calc(100vh - 60px)' }}>
      {/* Reflektory sceny (tlo) */}
      <Box aria-hidden="true" sx={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div className="stage-rays" />
        <div className="stage-beam" style={{ left: '-8vw', '--beam-from': '-18deg', '--beam-to': '14deg', '--beam-color': 'rgba(96,165,250,0.34)' }} />
        <div className="stage-beam" style={{ left: '30vw', '--beam-from': '16deg', '--beam-to': '-16deg', '--beam-color': 'rgba(255,210,63,0.26)', animationDuration: '11s' }} />
        <div className="stage-beam" style={{ right: '-8vw', '--beam-from': '18deg', '--beam-to': '-12deg', '--beam-color': 'rgba(244,114,182,0.28)', animationDuration: '8s' }} />
      </Box>

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 20, py: { xs: 4, md: 6 } }}>
        <QuizNav current="pytania" />

        {/* Szyld */}
        <Box className="rise-in" sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
          <Box
            sx={{
              display: 'inline-block',
              width: '100%',
              maxWidth: 640,
              borderRadius: '18px',
              overflow: 'hidden',
              border: '3px solid var(--gold)',
              background: 'linear-gradient(180deg, #0b1a73, #050f46)',
              boxShadow: '0 0 0 3px #050826, 0 0 40px rgba(var(--accent-rgb), 0.45)',
            }}
          >
            <div className="marquee-lights" />
            <Box sx={{ px: 2, py: { xs: 2, sm: 3 } }}>
              <Typography sx={{ color: 'var(--primary-light)', fontWeight: 800, letterSpacing: 6, fontSize: { xs: '0.7rem', sm: '0.85rem' }, textTransform: 'uppercase' }}>
                ❓ Dodaj pytanie do puli ❓
              </Typography>
              <Typography
                component="h1"
                className="gold-text neon-title"
                sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: { xs: 2, sm: 5 }, lineHeight: 1.05, fontSize: { xs: '2.3rem', sm: '3.6rem', md: '4.2rem' } }}
              >
                TELETURNIEJ
              </Typography>
            </Box>
            <div className="marquee-lights alt" />
          </Box>
        </Box>

        <Box component="form" onSubmit={submit} noValidate className="rise-in" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Format pytania */}
          <Box>
            <SectionLabel>Format pytania</SectionLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {formatButton('abcd', '🔠 Pytanie ABCD', 'cztery odpowiedzi, jedna poprawna')}
              {formatButton('otwarte', '✍️ Pytanie otwarte', 'pytanie i poprawna odpowiedź')}
            </Box>
            <Box sx={{ mt: 2 }}>
              <SectionLabel>Multimedia (opcjonalnie)</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }} role="radiogroup" aria-label="Multimedia">
                {[['', '➖ Bez multimediów'], ['muzyka', '🎵 Pytanie muzyczne'], ['wideo', '🎬 Pytanie wideo']].map(([value, label]) => (
                  <HexBar
                    key={value || 'brak'}
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={media === value}
                    selected={media === value}
                    minHeight={52}
                    onClick={() => setMedia(value)}
                  >
                    <Typography sx={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{label}</Typography>
                  </HexBar>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Pytanie */}
          <Box>
            <SectionLabel>Pytanie</SectionLabel>
            <HexBar minHeight={96}>
              <InputBase
                multiline
                minRows={2}
                value={form.pytanie}
                onChange={set('pytanie')}
                placeholder={media === 'muzyka' ? 'np. Jak nazywa się ten utwór?' : media === 'wideo' ? 'np. Z jakiego filmu pochodzi ta scena?' : 'Wpisz treść pytania...'}
                inputProps={{ 'aria-label': 'Treść pytania', maxLength: 500 }}
                sx={{ ...inputSx, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
              />
            </HexBar>
          </Box>

          {media && (
            <Box>
              <SectionLabel>{media === 'muzyka' ? 'Link do utworu' : 'Link do filmu'}</SectionLabel>
              <HexBar>
                <Box component="span" aria-hidden="true" sx={{ mr: 1.5, fontSize: '1.3rem' }}>{media === 'muzyka' ? '🎵' : '🎬'}</Box>
                <InputBase
                  type="url"
                  value={form.link}
                  onChange={set('link')}
                  placeholder="https://www.youtube.com/watch?v=..."
                  inputProps={{ 'aria-label': media === 'muzyka' ? 'Link do utworu' : 'Link do filmu', maxLength: 300 }}
                  sx={inputSx}
                />
              </HexBar>
            </Box>
          )}

          {/* Odpowiedzi */}
          {typ === 'abcd' ? (
            <Box>
              <SectionLabel>Odpowiedzi</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
                {LETTERS.map((l) => (
                  <HexBar key={l} selected={form.poprawna_litera === l}>
                    <Letter>{l.toUpperCase()}</Letter>
                    <InputBase
                      value={form[`odp_${l}`]}
                      onChange={set(`odp_${l}`)}
                      placeholder={`Odpowiedź ${l.toUpperCase()}`}
                      inputProps={{ 'aria-label': `Odpowiedź ${l.toUpperCase()}`, maxLength: 200 }}
                      sx={inputSx}
                    />
                  </HexBar>
                ))}
              </Box>

              <Box sx={{ mt: 3 }}>
                <SectionLabel>Poprawna odpowiedź</SectionLabel>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }} role="radiogroup" aria-label="Poprawna odpowiedź">
                  {LETTERS.map((l) => (
                    <HexBar
                      key={l}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={form.poprawna_litera === l}
                      selected={form.poprawna_litera === l}
                      onClick={() => setForm((f) => ({ ...f, poprawna_litera: l }))}
                      minHeight={52}
                    >
                      <Typography sx={{ width: '100%', textAlign: 'center', fontWeight: 800, fontSize: '1.3rem' }}>{l.toUpperCase()}</Typography>
                    </HexBar>
                  ))}
                </Box>
              </Box>
            </Box>
          ) : (
            <Box>
              <SectionLabel>Poprawna odpowiedź</SectionLabel>
              <HexBar selected={!!form.poprawna_tekst.trim()}>
                <InputBase
                  value={form.poprawna_tekst}
                  onChange={set('poprawna_tekst')}
                  placeholder="Wpisz poprawną odpowiedź..."
                  inputProps={{ 'aria-label': 'Poprawna odpowiedź', maxLength: 200 }}
                  sx={inputSx}
                />
              </HexBar>
            </Box>
          )}

          {error && <Alert severity="error" role="alert">{error}</Alert>}
          {added > 0 && !error && (
            <Alert severity="success">
              Pytanie dodane do puli! W tej sesji dodano: {added}. Możesz wpisać kolejne.
            </Alert>
          )}

          <Box
            component="button"
            type="submit"
            disabled={sending}
            className="hex-bar glow-pulse"
            sx={{
              mt: 1,
              py: 2,
              px: 4,
              cursor: sending ? 'wait' : 'pointer',
              border: 0,
              font: 'inherit',
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: '#1a1205',
              background: 'linear-gradient(180deg, var(--gold-light), var(--gold) 45%, var(--gold-deep))',
              '&:hover': { filter: 'brightness(1.08)' },
              '&:disabled': { opacity: 0.7 },
            }}
          >
            {sending ? 'Zapisywanie...' : 'Zatwierdź pytanie'}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default TeleturniejPage;
