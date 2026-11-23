import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container, Typography, Box, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { THEMES } from '../themes';
import {
  categoryLabels,
  groupItemsByCategory,
  CategoryFilter,
  DishCard,
  EmptyMenu,
} from './menuShared';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return '';
  }
};

// Zakladka "Archiwum": lista zarchiwizowanych menu (wybierana z listy) i podglad wybranego archiwum.
const ArchivePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('a') || '';

  const [archives, setArchives] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [archive, setArchive] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('wszystkie');

  // Lista archiwow
  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/archives`);
        if (!response.ok) throw new Error('Nie udało się pobrać listy archiwów');
        setArchives(await response.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setListLoading(false);
      }
    };
    load();
  }, []);

  // Wybrane archiwum
  useEffect(() => {
    if (!selectedId) {
      setArchive(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setArchiveLoading(true);
      setError('');
      setCategory('wszystkie');
      try {
        const response = await fetch(`${API_URL}/archives/${selectedId}`);
        if (!response.ok) throw new Error('Nie znaleziono wybranego archiwum');
        const data = await response.json();
        if (!cancelled) setArchive(data);
      } catch (e) {
        if (!cancelled) {
          setArchive(null);
          setError(e.message);
        }
      } finally {
        if (!cancelled) setArchiveLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const items = archive ? archive.items || [] : [];
  const filtered = category === 'wszystkie' ? items : items.filter((i) => (i.category || 'dania') === category);
  const archiveTheme = archive && THEMES[archive.theme];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, position: 'relative', zIndex: 20 }}>
      <Box className="glass rise-in" sx={{ textAlign: 'center', px: { xs: 3, md: 6 }, py: { xs: 5, md: 6 }, mb: 5 }}>
        <Typography sx={{ letterSpacing: 4, textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--gold)', mb: 1.5 }}>
          Poprzednie wydarzenia
        </Typography>
        <Typography variant="h2" className="gold-text" sx={{ fontSize: { xs: '2.4rem', sm: '3.2rem', md: '3.8rem' }, lineHeight: 1.1, mb: 3 }}>
          Archiwum 📦
        </Typography>

        {listLoading ? (
          <Typography sx={{ color: 'var(--ink-dim)' }}>Ładowanie archiwów...</Typography>
        ) : archives.length === 0 ? (
          <Typography sx={{ color: 'var(--ink-dim)' }}>Nie ma jeszcze żadnych archiwów.</Typography>
        ) : (
          <FormControl
            sx={{
              minWidth: { xs: '100%', sm: 360 },
              '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '14px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.4)' }, '&:hover fieldset': { borderColor: 'rgba(var(--accent-rgb),0.8)' }, '&.Mui-focused fieldset': { borderColor: 'var(--gold)' } },
              '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--gold)' },
              '& .MuiSvgIcon-root': { color: 'var(--ink)' },
            }}
          >
            <InputLabel id="archive-select-label">Wybierz archiwum</InputLabel>
            <Select
              labelId="archive-select-label"
              label="Wybierz archiwum"
              value={archives.some((a) => a.id === selectedId) ? selectedId : ''}
              onChange={(e) => setSearchParams(e.target.value ? { a: e.target.value } : {})}
              MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
            >
              {archives.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name} · {a.itemCount} poz. · {formatDate(a.createdAt)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {error && (
        <Typography sx={{ textAlign: 'center', color: 'var(--primary-light)', mb: 3 }} role="alert">
          {error}
        </Typography>
      )}

      {archiveLoading && <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', py: 6 }}>Ładowanie archiwum...</Typography>}

      {archive && !archiveLoading && (
        <>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ color: 'var(--ink)', fontSize: { xs: '1.7rem', md: '2.2rem' } }}>
              {archiveTheme ? `${archiveTheme.emoji} ` : ''}
              {archive.name}
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', mt: 0.5 }}>
              Zarchiwizowano {formatDate(archive.createdAt)} · {items.length} pozycji
            </Typography>
          </Box>

          {items.length > 0 && <CategoryFilter value={category} onChange={setCategory} />}

          {items.length === 0 ? (
            <EmptyMenu text="To archiwum jest puste." />
          ) : (
            Object.entries(groupItemsByCategory(filtered)).map(([key, list]) =>
              list.length === 0 ? null : (
                <Box key={key} component="section" sx={{ mb: 7 }}>
                  <Typography variant="h4" sx={{ color: 'var(--ink)', mb: 1, fontSize: { xs: '1.6rem', md: '2rem' } }}>
                    {categoryLabels[key] || key}
                  </Typography>
                  <hr className="gold-rule" style={{ marginBottom: 28 }} />
                  <Grid container spacing={3}>
                    {list.map((item, i) => (
                      <Grid item xs={12} sm={6} md={4} key={item.id}>
                        <DishCard item={item} index={i} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )
            )
          )}
        </>
      )}
    </Container>
  );
};

export default ArchivePage;
