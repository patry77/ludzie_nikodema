import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { isOwnMedia, mediaIcon, ownMediaSrc, uploadMediaFile } from '../quiz/quizApi';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const PAGE_SIZE = 15;
const LETTERS = ['a', 'b', 'c', 'd'];

const authHeaders = () => ({ 'x-admin-password': sessionStorage.getItem('adminPass') || '' });

const isHttpLink = (link) => /^https?:\/\//i.test(link || '');

// sekundy -> "m:ss" (do pol edycji); "1:23" / "83" -> sekundy (NaN gdy zly zapis)
const fmtTime = (sec) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '');
const parseTime = (v) => {
  const s = String(v || '').trim();
  if (!s) return 0;
  if (!/^\d+(:\d{1,2}){0,2}$/.test(s)) return NaN;
  return s.split(':').reduce((acc, p) => acc * 60 + Number(p), 0);
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (e) {
    return '';
  }
};

// Zakladka "Teleturniej" w panelu admina: lista pytan z wyszukiwaniem, filtrami i stronicowaniem.
// Odpowiedzi nie sa pobierane z serwera, dopoki admin nie potwierdzi monitu (dopiero wtedy ?answers=1).
const QuizAdminTab = () => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // id -> pelne pytanie z odpowiedziami (po potwierdzeniu)
  const [revealAll, setRevealAll] = useState(false);
  const [revealedIds, setRevealedIds] = useState([]);
  const [confirmTarget, setConfirmTarget] = useState(null); // 'all' | id pytania | null
  const [revealing, setRevealing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [typFilter, setTypFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [insideFilter, setInsideFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Edycja pytania: odpowiedzi sa w oknie ukryte, dopoki admin ich nie odslonie
  const [editing, setEditing] = useState(null); // edytowane pytanie (bez odpowiedzi)
  const [ef, setEf] = useState(null); // pola formularza edycji
  const [efAnswers, setEfAnswers] = useState(false); // czy odpowiedzi sa odslonieta w oknie
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [editError, setEditError] = useState('');
  const fileRef = React.useRef(null);

  const openEdit = (q) => {
    setEditing(q);
    setEf({ pytanie: q.pytanie, media: q.media || '', link: q.link || '', start: fmtTime(q.start), end: fmtTime(q.end), odp_a: '', odp_b: '', odp_c: '', odp_d: '', poprawna: '' });
    setEfAnswers(false);
    setEditError('');
  };

  const closeEdit = () => {
    if (saving || uploading) return;
    setEditing(null);
    setEf(null);
    setEfAnswers(false);
  };

  const setField = (key) => (e) => setEf((f) => ({ ...f, [key]: e.target.value }));

  // Odslania odpowiedzi w oknie edycji (pobiera je z serwera dopiero teraz)
  const revealInEdit = async () => {
    setEditError('');
    try {
      let full = answers[editing.id];
      if (!full) {
        const all = await fetchAnswers();
        full = all[editing.id];
      }
      if (!full) throw new Error('Nie udało się pobrać odpowiedzi');
      setEf((f) => ({ ...f, odp_a: full.odp_a || '', odp_b: full.odp_b || '', odp_c: full.odp_c || '', odp_d: full.odp_d || '', poprawna: full.poprawna_odpowiedz || '' }));
      setEfAnswers(true);
    } catch (e) {
      setEditError(e.message);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setEditError('');
    const res = await uploadMediaFile(file, setUploadStatus);
    setUploading(false);
    if (!res.ok) {
      setEditError(res.data.error || 'Nie udało się wgrać pliku');
      return;
    }
    // rodzaj multimediow dopasowujemy do wgranego pliku
    setEf((f) => ({ ...f, media: res.data.media, link: res.data.url }));
  };

  const saveEdit = async () => {
    const st = parseTime(ef.start);
    const en = parseTime(ef.end);
    if (!ef.pytanie.trim()) return setEditError('Wpisz treść pytania.');
    if (ef.media && !ef.link.trim()) return setEditError('Podaj link albo wgraj plik (albo wybierz „Bez multimediów”).');
    if (ef.media !== 'zdjecie' && ef.media && (Number.isNaN(st) || Number.isNaN(en))) return setEditError('Czas początku i końca wpisz jako m:ss (np. 1:25) lub w sekundach.');
    if (ef.media !== 'zdjecie' && en && en <= st) return setEditError('Koniec fragmentu musi być późniejszy niż początek.');
    const body = { pytanie: ef.pytanie.trim(), media: ef.media };
    if (ef.media) {
      body.link = ef.link.trim();
      if (ef.media !== 'zdjecie') {
        body.start = st;
        body.end = en;
      }
    }
    if (efAnswers) {
      if (editing.typ === 'abcd') {
        Object.assign(body, { odp_a: ef.odp_a, odp_b: ef.odp_b, odp_c: ef.odp_c, odp_d: ef.odp_d, poprawna_odpowiedz: ef.poprawna });
      } else {
        body.poprawna_odpowiedz = ef.poprawna;
      }
    }
    setSaving(true);
    setEditError('');
    try {
      const response = await fetch(`${API_URL}/questions/${editing.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się zapisać zmian');
      setEditing(null);
      setEf(null);
      setEfAnswers(false);
      await load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchList = useCallback(async () => {
    const response = await fetch(`${API_URL}/questions`, { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Nie udało się pobrać pytań');
    return [...(data.questions || [])].sort((a, b) => String(b.dodano).localeCompare(String(a.dodano)));
  }, []);

  const fetchAnswers = useCallback(async () => {
    const response = await fetch(`${API_URL}/questions?answers=1`, { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Nie udało się pobrać odpowiedzi');
    return Object.fromEntries((data.questions || []).map((q) => [q.id, q]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setQuestions(await fetchList());
      // Odpowiedzi odswiezamy tylko wtedy, gdy admin juz je wczesniej potwierdzil
      if (revealAll || revealedIds.length > 0) setAnswers(await fetchAnswers());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchList, fetchAnswers, revealAll, revealedIds.length]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zmiana filtrow wraca na pierwsza strone
  useEffect(() => {
    setPage(1);
  }, [search, typFilter, mediaFilter, insideFilter]);

  const stats = useMemo(
    () => ({
      total: questions.length,
      abcd: questions.filter((q) => q.typ === 'abcd').length,
      otwarte: questions.filter((q) => q.typ === 'otwarte').length,
      muzyka: questions.filter((q) => q.media === 'muzyka').length,
      wideo: questions.filter((q) => q.media === 'wideo').length,
      zdjecie: questions.filter((q) => q.media === 'zdjecie').length,
      inside: questions.filter((q) => q.inside).length,
    }),
    [questions]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (typFilter !== 'all' && q.typ !== typFilter) return false;
      if (mediaFilter === 'none' && q.media) return false;
      if ((mediaFilter === 'muzyka' || mediaFilter === 'wideo' || mediaFilter === 'zdjecie') && q.media !== mediaFilter) return false;
      if (insideFilter === 'inside' && !q.inside) return false;
      if (insideFilter === 'ogolne' && q.inside) return false;
      if (needle && !q.pytanie.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [questions, search, typFilter, mediaFilter, insideFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const isRevealed = (id) => revealAll || revealedIds.includes(id);

  // Po potwierdzeniu monitu dopiero pobieramy odpowiedzi z serwera
  const confirmReveal = async () => {
    const target = confirmTarget;
    setRevealing(true);
    setError('');
    try {
      setAnswers(await fetchAnswers());
      if (target === 'all') setRevealAll(true);
      else setRevealedIds((ids) => (ids.includes(target) ? ids : [...ids, target]));
      setConfirmTarget(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setRevealing(false);
    }
  };

  const hideAll = () => {
    setRevealAll(false);
    setRevealedIds([]);
    setAnswers({}); // odpowiedzi znikaja tez z pamieci przegladarki
  };

  const hideOne = (id) => setRevealedIds((ids) => ids.filter((x) => x !== id));

  // Etykieta "inside": pytanie zrozumiale tylko dla paczki znajomych (w grze mozna je pominac)
  const toggleInside = async (q, value) => {
    try {
      const response = await fetch(`${API_URL}/questions/${q.id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ inside: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się zapisać etykiety');
      setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, inside: value || undefined } : x)));
    } catch (e) {
      setError(e.message);
    }
  };

  const removeQuestion = async (q) => {
    if (!window.confirm(`Usunąć to pytanie?\n\n„${q.pytanie.slice(0, 120)}”\n\nTej operacji nie można cofnąć.`)) return;
    try {
      const response = await fetch(`${API_URL}/questions/${q.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się usunąć pytania');
      setQuestions((list) => list.filter((x) => x.id !== q.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const anyRevealed = revealAll || revealedIds.length > 0;

  const renderAnswers = (q) => {
    const full = answers[q.id];
    if (!full) {
      return (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
          Brak odpowiedzi w pobranych danych – użyj „Odśwież”.
        </Typography>
      );
    }
    if (q.typ === 'abcd') {
      return (
        <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
          {LETTERS.map((l) => {
            const correct = full.poprawna_odpowiedz === l;
            return (
              <Box
                key={l}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: correct ? '#19b857' : 'rgba(0,0,0,0.15)',
                  background: correct ? '#e6f9ee' : '#fff',
                  fontWeight: correct ? 700 : 400,
                }}
              >
                <strong>{l.toUpperCase()}:</strong> {full[`odp_${l}`]} {correct && '✔'}
              </Box>
            );
          })}
        </Box>
      );
    }
    return (
      <Box sx={{ mt: 1.5, px: 1.5, py: 0.75, borderRadius: '10px', border: '1px solid #19b857', background: '#e6f9ee' }}>
        <strong>Poprawna odpowiedź:</strong> {full.poprawna_odpowiedz} ✔
      </Box>
    );
  };

  return (
    <Box>
      <Card className="mb-6 bg-white shadow-lg border-2">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Typography variant="h6" className="font-semibold text-blue-700">
              🎤 Pytania do teleturnieju ({stats.total})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
                Odśwież
              </Button>
              {anyRevealed ? (
                <Button variant="outlined" color="warning" startIcon={<VisibilityOffIcon />} onClick={hideAll}>
                  Ukryj odpowiedzi
                </Button>
              ) : (
                <Button variant="contained" startIcon={<VisibilityIcon />} onClick={() => setConfirmTarget('all')} disabled={stats.total === 0}>
                  Pokaż odpowiedzi
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label={`ABCD: ${stats.abcd}`} />
            <Chip label={`Otwarte: ${stats.otwarte}`} />
            <Chip label={`🎵 Muzyczne: ${stats.muzyka}`} />
            <Chip label={`🎬 Wideo: ${stats.wideo}`} />
            <Chip label={`📷 Zdjęcia: ${stats.zdjecie}`} />
            <Chip color="warning" label={`inside: ${stats.inside}`} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' }, gap: 1.5 }}>
            <TextField
              size="small"
              label="Szukaj w treści pytania"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              inputProps={{ 'aria-label': 'Szukaj w treści pytania' }}
            />
            <FormControl size="small">
              <InputLabel id="quiz-typ-label">Format</InputLabel>
              <Select labelId="quiz-typ-label" label="Format" value={typFilter} onChange={(e) => setTypFilter(e.target.value)}>
                <MenuItem value="all">Wszystkie formaty</MenuItem>
                <MenuItem value="abcd">ABCD</MenuItem>
                <MenuItem value="otwarte">Otwarte</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel id="quiz-media-label">Multimedia</InputLabel>
              <Select labelId="quiz-media-label" label="Multimedia" value={mediaFilter} onChange={(e) => setMediaFilter(e.target.value)}>
                <MenuItem value="all">Wszystkie</MenuItem>
                <MenuItem value="none">Bez multimediów</MenuItem>
                <MenuItem value="muzyka">🎵 Muzyczne</MenuItem>
                <MenuItem value="wideo">🎬 Wideo</MenuItem>
                <MenuItem value="zdjecie">📷 Zdjęcia</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel id="quiz-inside-label">Inside</InputLabel>
              <Select labelId="quiz-inside-label" label="Inside" value={insideFilter} onChange={(e) => setInsideFilter(e.target.value)}>
                <MenuItem value="all">Wszystkie</MenuItem>
                <MenuItem value="inside">Tylko „inside”</MenuItem>
                <MenuItem value="ogolne">Bez „inside”</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading && questions.length === 0 ? (
        <Typography sx={{ textAlign: 'center', color: '#fff', py: 4 }}>Ładowanie pytań...</Typography>
      ) : filtered.length === 0 ? (
        <Card className="bg-white">
          <CardContent>
            <Typography sx={{ textAlign: 'center', color: 'text.secondary' }}>
              {stats.total === 0 ? 'Nie ma jeszcze żadnych pytań. Dodaj je na stronie /teleturniej.' : 'Brak pytań pasujących do filtrów.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {pageItems.map((q, i) => (
            <Card key={q.id} className="bg-white shadow-md border-2">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        #{offset + i + 1}
                      </Typography>
                      <Chip size="small" color={q.typ === 'abcd' ? 'primary' : 'secondary'} label={q.typ === 'abcd' ? 'ABCD' : 'Otwarte'} />
                      {q.media === 'muzyka' && <Chip size="small" label="🎵 Muzyczne" />}
                      {q.media === 'wideo' && <Chip size="small" label="🎬 Wideo" />}
                      {q.media === 'zdjecie' && <Chip size="small" label="📷 Zdjęcie" />}
                      {q.link && isOwnMedia(q.link) && <Chip size="small" variant="outlined" label="własny plik" />}
                      {q.inside && <Chip size="small" color="warning" label="inside" />}
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatDate(q.dodano)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{q.pytanie}</Typography>
                    {q.media === 'zdjecie' && q.link && (
                      <Box sx={{ mt: 1 }}>
                        <img src={ownMediaSrc(q.link)} alt="Zdjęcie do pytania" loading="lazy" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 8, border: '1px solid rgba(0,0,0,0.2)' }} />
                      </Box>
                    )}
                    {q.link && (
                      <Typography variant="body2" sx={{ mt: 0.75, wordBreak: 'break-all' }}>
                        {isHttpLink(q.link) || isOwnMedia(q.link) ? (
                          <a href={ownMediaSrc(q.link)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'underline' }}>
                            {mediaIcon(q.media)} {isOwnMedia(q.link) ? 'wgrany plik' : q.link}
                          </a>
                        ) : (
                          q.link
                        )}
                        {(q.start || q.end) ? ` · fragment ${fmtTime(q.start) || '0:00'}–${fmtTime(q.end) || 'koniec'}` : ''}
                      </Typography>
                    )}
                    {isRevealed(q.id) && renderAnswers(q)}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }} title="Pytanie zrozumiałe tylko dla paczki znajomych">
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>inside</Typography>
                      <Switch size="small" checked={!!q.inside} onChange={(e) => toggleInside(q, e.target.checked)} inputProps={{ 'aria-label': 'Pytanie inside' }} />
                    </Box>
                    {!revealAll &&
                      (revealedIds.includes(q.id) ? (
                        <IconButton aria-label="Ukryj odpowiedź" title="Ukryj odpowiedź" onClick={() => hideOne(q.id)}>
                          <VisibilityOffIcon />
                        </IconButton>
                      ) : (
                        <IconButton aria-label="Pokaż odpowiedź" title="Pokaż odpowiedź" onClick={() => setConfirmTarget(q.id)}>
                          <VisibilityIcon />
                        </IconButton>
                      ))}
                    <IconButton aria-label="Edytuj pytanie" title="Edytuj pytanie" onClick={() => openEdit(q)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton aria-label="Usuń pytanie" title="Usuń pytanie" onClick={() => removeQuestion(q)} className="text-red-500">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination
                count={pageCount}
                page={currentPage}
                onChange={(e, value) => {
                  setPage(value);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                getItemAriaLabel={(type, pageNumber, selected) =>
                  type === 'page' ? (selected ? `Strona ${pageNumber}, bieżąca` : `Przejdź do strony ${pageNumber}`) : type === 'next' ? 'Następna strona' : type === 'previous' ? 'Poprzednia strona' : type === 'first' ? 'Pierwsza strona' : 'Ostatnia strona'
                }
                color="primary"
                sx={{ background: 'rgba(255,255,255,0.9)', borderRadius: 999, px: 1, py: 0.5 }}
              />
            </Box>
          )}
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.75)' }}>
            Wyświetlono {offset + 1}–{Math.min(offset + PAGE_SIZE, filtered.length)} z {filtered.length}
          </Typography>
        </Box>
      )}

      {/* Edycja pytania */}
      <Dialog open={!!editing} onClose={closeEdit} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Edycja pytania
        </DialogTitle>
        <DialogContent sx={{ pt: '24px !important' }}>
          {editing && ef && (
            <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
              {editError && <Alert severity="error" onClose={() => setEditError('')}>{editError}</Alert>}
              <TextField label="Treść pytania" value={ef.pytanie} onChange={setField('pytanie')} multiline minRows={2} fullWidth inputProps={{ maxLength: 500 }} />

              <FormControl size="small" fullWidth>
                <InputLabel id="edit-media-label">Multimedia</InputLabel>
                <Select labelId="edit-media-label" label="Multimedia" value={ef.media} onChange={(e) => setEf((f) => ({ ...f, media: e.target.value }))}>
                  <MenuItem value="">Bez multimediów</MenuItem>
                  <MenuItem value="muzyka">🎵 Muzyka</MenuItem>
                  <MenuItem value="wideo">🎬 Wideo</MenuItem>
                  <MenuItem value="zdjecie">📷 Zdjęcie</MenuItem>
                </Select>
              </FormControl>

              {ef.media && (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <TextField
                    size="small"
                    label="Link (http/https) albo wgrany plik"
                    value={ef.link}
                    onChange={setField('link')}
                    helperText={isOwnMedia(ef.link) ? 'Wgrany plik – możesz go zastąpić linkiem albo innym plikiem.' : 'Adres z internetu (np. YouTube) albo użyj przycisku poniżej.'}
                    fullWidth
                    inputProps={{ maxLength: 300 }}
                  />
                  <Box>
                    <input
                      ref={fileRef}
                      type="file"
                      hidden
                      accept={ef.media === 'zdjecie' ? 'image/*' : ef.media === 'wideo' ? 'video/mp4,video/webm' : 'audio/*,.mp3,.m4a,.ogg,.wav'}
                      onChange={uploadFile}
                      aria-label="Wgraj plik"
                    />
                    <Button variant="outlined" onClick={() => fileRef.current && fileRef.current.click()} disabled={uploading}>
                      {uploading ? uploadStatus || 'Wgrywanie…' : '📁 Wgraj własny plik'}
                    </Button>
                  </Box>
                  {ef.link && ef.media === 'zdjecie' && (
                    <img src={ownMediaSrc(ef.link)} alt="Podgląd zdjęcia" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid rgba(0,0,0,0.2)' }} />
                  )}
                  {ef.media !== 'zdjecie' && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                      <TextField size="small" label="Fragment od (np. 1:25)" value={ef.start} onChange={setField('start')} inputProps={{ maxLength: 9 }} />
                      <TextField size="small" label="Fragment do (np. 1:45)" value={ef.end} onChange={setField('end')} inputProps={{ maxLength: 9 }} />
                    </Box>
                  )}
                </Box>
              )}

              <Box sx={{ p: 1.5, borderRadius: '10px', border: '1px dashed rgba(0,0,0,0.3)' }}>
                {!efAnswers ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 200 }}>
                      Odpowiedzi są ukryte (nie są nawet pobierane). Pokaż je tylko, jeśli chcesz je zmienić.
                    </Typography>
                    <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={revealInEdit}>
                      Pokaż i edytuj odpowiedzi
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'grid', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 700 }}>Odpowiedzi</Typography>
                      <Button size="small" startIcon={<VisibilityOffIcon />} onClick={() => setEfAnswers(false)}>Ukryj (bez zmian)</Button>
                    </Box>
                    {editing.typ === 'abcd' ? (
                      <>
                        {LETTERS.map((l) => (
                          <TextField key={l} size="small" label={`Odpowiedź ${l.toUpperCase()}${ef.poprawna === l ? ' ✔ poprawna' : ''}`} value={ef[`odp_${l}`]} onChange={setField(`odp_${l}`)} fullWidth inputProps={{ maxLength: 200 }} />
                        ))}
                        <FormControl size="small" fullWidth>
                          <InputLabel id="edit-correct-label">Poprawna odpowiedź</InputLabel>
                          <Select labelId="edit-correct-label" label="Poprawna odpowiedź" value={ef.poprawna} onChange={setField('poprawna')}>
                            {LETTERS.map((l) => <MenuItem key={l} value={l}>{l.toUpperCase()}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </>
                    ) : (
                      <TextField size="small" label="Poprawna odpowiedź" value={ef.poprawna} onChange={setField('poprawna')} fullWidth inputProps={{ maxLength: 200 }} />
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={closeEdit} disabled={saving || uploading}>Anuluj</Button>
          <Button variant="contained" onClick={saveEdit} disabled={saving || uploading}>{saving ? 'Zapisywanie…' : 'Zapisz zmiany'}</Button>
        </DialogActions>
      </Dialog>

      {/* Monit przed pokazaniem odpowiedzi */}
      <Dialog open={confirmTarget !== null} onClose={() => !revealing && setConfirmTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Pokazać odpowiedzi?
        </DialogTitle>
        <DialogContent sx={{ pt: '24px !important' }}>
          <Typography sx={{ mt: 1 }}>Czy na pewno chcesz wyświetlić odpowiedzi i poprawną odpowiedź?</Typography>
          <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
            {confirmTarget === 'all'
              ? 'Dotyczy wszystkich pytań na liście. Odpowiedzi będą widoczne do czasu ich ukrycia lub zmiany zakładki.'
              : 'Dotyczy tylko tego jednego pytania.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setConfirmTarget(null)} disabled={revealing} autoFocus>
            Anuluj
          </Button>
          <Button variant="contained" onClick={confirmReveal} disabled={revealing}>
            {revealing ? 'Pobieranie...' : 'Tak, wyświetl'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizAdminTab;
