import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Container, InputBase, Typography } from '@mui/material';
import confetti from 'canvas-confetti';
import { useSiteTheme } from '../ThemeContext';
import StageBackdrop from '../quiz/StageBackdrop';
import MarqueeSign from '../quiz/MarqueeSign';
import { uploadMediaFile } from '../quiz/quizApi';

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

const emptyForm = { pytanie: '', odp_a: '', odp_b: '', odp_c: '', odp_d: '', poprawna_litera: '', poprawna_tekst: '', link: '', start: '', end: '' };

// "1:23", "83" lub "0:01:05" -> sekundy; puste = 0; blad = NaN
const parseTime = (v) => {
  const s = String(v || '').trim();
  if (!s) return 0;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(s)) return NaN;
  return s.split(':').reduce((acc, p) => acc * 60 + Number(p), 0);
};

// Podstrona /teleturniej (motyw teleturniejowy ustawia ThemeContext). Na razie tylko formularz dodawania pytan.
const TeleturniejPage = () => {
  const { preset } = useSiteTheme();
  const [typ, setTyp] = useState('abcd'); // 'abcd' | 'otwarte'
  const [media, setMedia] = useState(''); // '' | 'muzyka' | 'wideo' | 'zdjecie'
  const [source, setSource] = useState('link'); // 'link' | 'file' (wlasny plik wgrany na serwer)
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [maxMb, setMaxMb] = useState(9);
  const [audioMb, setAudioMb] = useState(25);
  const [compression, setCompression] = useState(false);
  const [statusText, setStatusText] = useState('');
  const fileInput = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(0);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/media/limits`);
        const data = await res.json();
        if (data && data.maxMb) setMaxMb(data.maxMb);
        if (data && data.audioMaxMb) setAudioMb(data.audioMaxMb);
        setCompression(!!(data && data.compression));
      } catch (e) {
        /* zostaje domyslny limit */
      }
    })();
  }, []);

  // Podglad wybranego pliku (adres tymczasowy, zwalniany przy zmianie)
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickMedia = (value) => {
    setMedia(value);
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const okType = media === 'zdjecie' ? f.type.startsWith('image/') : media === 'wideo' ? f.type.startsWith('video/') : f.type.startsWith('audio/') || /\.(mp3|m4a|ogg|wav)$/i.test(f.name);
    if (!okType) {
      setError(media === 'zdjecie' ? 'Wybierz plik ze zdjęciem (JPG, PNG, WebP lub GIF).' : media === 'wideo' ? 'Wybierz plik wideo (MP4 lub WebM).' : 'Wybierz plik audio (MP3, M4A, OGG lub WAV).');
      e.target.value = '';
      return;
    }
    // zdjecia zmniejszamy przed wyslaniem, wiec ich rozmiaru nie sprawdzamy z gory
    const limitMb = media === 'wideo' ? maxMb : audioMb;
    if (!f.type.startsWith('image/') && f.size > limitMb * 1024 * 1024) {
      setError(`Plik jest za duży (${(f.size / 1048576).toFixed(1)} MB, maks. ${limitMb} MB). Przytnij go lub zmniejsz jakość.`);
      e.target.value = '';
      return;
    }
    setError('');
    setFile(f);
  };

  const validate = () => {
    if (!form.pytanie.trim()) return 'Wpisz treść pytania.';
    if (media) {
      if (source === 'file') {
        if (!file) return 'Wybierz plik do wgrania albo przełącz na link.';
      } else {
        let ok = false;
        try {
          const u = new URL(form.link.trim());
          ok = u.protocol === 'http:' || u.protocol === 'https:';
        } catch (e) {
          ok = false;
        }
        if (!ok) return 'Podaj poprawny link (zaczynający się od http:// lub https://).';
      }
      if (media !== 'zdjecie') {
        const st = parseTime(form.start);
        const en = parseTime(form.end);
        if (Number.isNaN(st) || Number.isNaN(en)) return 'Czas początku i końca wpisz jako m:ss (np. 1:25) lub w sekundach.';
        if (en && en <= st) return 'Koniec fragmentu musi być późniejszy niż początek.';
      }
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
        if (source === 'file') {
          const up = await uploadMediaFile(file, setStatusText);
          if (!up.ok) throw new Error(up.data.error || 'Nie udało się wgrać pliku.');
          payload.upload = up.data.upload;
        } else {
          payload.link = form.link.trim();
        }
        if (media !== 'zdjecie') {
          payload.start = parseTime(form.start);
          payload.end = parseTime(form.end);
        }
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
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
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
        <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.95)' }}>{hint}</Typography>
      </Box>
    </HexBar>
  );

  return (
    <Box sx={{ position: 'relative', minHeight: 'calc(100vh - 60px)' }}>
      <StageBackdrop variant="soft" />

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 20, py: { xs: 4, md: 6 } }}>
        <MarqueeSign kicker="❓ Dodaj pytanie do puli ❓" title="TELETURNIEJ" sx={{ mb: { xs: 4, md: 5 } }} />

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
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }} role="radiogroup" aria-label="Multimedia">
                {[['', '➖ Bez multimediów'], ['muzyka', '🎵 Pytanie muzyczne'], ['wideo', '🎬 Pytanie wideo'], ['zdjecie', '📷 Pytanie ze zdjęciem']].map(([value, label]) => (
                  <HexBar
                    key={value || 'brak'}
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={media === value}
                    selected={media === value}
                    minHeight={52}
                    onClick={() => pickMedia(value)}
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
                placeholder={media === 'muzyka' ? 'np. Jak nazywa się ten utwór?' : media === 'wideo' ? 'np. Z jakiego filmu pochodzi ta scena?' : media === 'zdjecie' ? 'np. Kto jest na tym zdjęciu?' : 'Wpisz treść pytania...'}
                inputProps={{ 'aria-label': 'Treść pytania', maxLength: 500 }}
                sx={{ ...inputSx, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
              />
            </HexBar>
          </Box>

          {media && (
            <Box>
              <SectionLabel>Źródło {media === 'muzyka' ? 'utworu' : media === 'wideo' ? 'filmu' : 'zdjęcia'}</SectionLabel>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }} role="radiogroup" aria-label="Źródło multimediów">
                {[['link', '🔗 Link (np. YouTube)'], ['file', '📁 Własny plik']].map(([value, label]) => (
                  <HexBar key={value} component="button" type="button" role="radio" aria-checked={source === value} selected={source === value} minHeight={52} onClick={() => setSource(value)}>
                    <Typography sx={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '0.95rem' }}>{label}</Typography>
                  </HexBar>
                ))}
              </Box>

              {source === 'link' ? (
                <HexBar>
                  <Box component="span" aria-hidden="true" sx={{ mr: 1.5, fontSize: '1.3rem' }}>{media === 'muzyka' ? '🎵' : media === 'wideo' ? '🎬' : '📷'}</Box>
                  <InputBase
                    type="url"
                    value={form.link}
                    onChange={set('link')}
                    placeholder={media === 'zdjecie' ? 'https://.../zdjecie.jpg' : 'https://www.youtube.com/watch?v=...'}
                    inputProps={{ 'aria-label': media === 'muzyka' ? 'Link do utworu' : media === 'wideo' ? 'Link do filmu' : 'Link do zdjęcia', maxLength: 300 }}
                    sx={inputSx}
                  />
                </HexBar>
              ) : (
                <Box>
                  <input
                    ref={fileInput}
                    type="file"
                    hidden
                    accept={media === 'zdjecie' ? 'image/*' : media === 'wideo' ? 'video/mp4,video/webm' : 'audio/*,.mp3,.m4a,.ogg,.wav'}
                    onChange={onFile}
                    aria-label="Wybierz plik"
                  />
                  <HexBar component="button" type="button" selected={!!file} minHeight={64} onClick={() => fileInput.current && fileInput.current.click()}>
                    <Box sx={{ width: '100%', textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 800 }}>{file ? `✔ ${file.name}` : '📁 Wybierz plik'}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>
                        {file ? `${(file.size / 1048576).toFixed(1)} MB – kliknij, aby zmienić` : media === 'zdjecie' ? 'JPG, PNG, WebP lub GIF (zdjęcie zmniejszymy automatycznie)' : media === 'wideo' ? `MP4 lub WebM, maks. ${maxMb} MB${compression ? ' – film zostanie automatycznie skompresowany' : ''}` : `MP3, M4A, OGG lub WAV, maks. ${audioMb} MB`}
                      </Typography>
                    </Box>
                  </HexBar>
                  {file && preview && (
                    <Box sx={{ mt: 1.5, textAlign: 'center' }}>
                      {media === 'zdjecie' ? (
                        <img src={preview} alt="Podgląd wybranego zdjęcia" style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 12, border: '2px solid var(--gold)' }} />
                      ) : media === 'wideo' ? (
                        <video src={preview} controls playsInline style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 12, border: '2px solid var(--gold)' }} />
                      ) : (
                        <audio src={preview} controls style={{ width: '100%' }} />
                      )}
                    </Box>
                  )}
                </Box>
              )}
              {media !== 'zdjecie' && (
              <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1.5 }}>
                <Box>
                  <SectionLabel>Fragment od (opcjonalnie)</SectionLabel>
                  <HexBar>
                    <InputBase value={form.start} onChange={set('start')} placeholder="np. 1:25 lub 85" inputProps={{ 'aria-label': 'Początek fragmentu', maxLength: 9 }} sx={inputSx} />
                  </HexBar>
                </Box>
                <Box>
                  <SectionLabel>Fragment do (opcjonalnie)</SectionLabel>
                  <HexBar>
                    <InputBase value={form.end} onChange={set('end')} placeholder="np. 1:45 lub 105" inputProps={{ 'aria-label': 'Koniec fragmentu', maxLength: 9 }} sx={inputSx} />
                  </HexBar>
                </Box>
              </Box>
              <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.85rem', mt: 1 }}>
                Podaj, jeśli w grze ma zagrać tylko wycinek (np. refren albo fragment Twojego filmu). Puste = od początku do końca.
              </Typography>
              </>
              )}
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
            {sending ? statusText || 'Zapisywanie...' : 'Zatwierdź pytanie'}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default TeleturniejPage;
