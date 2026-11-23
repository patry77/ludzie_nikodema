import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  resolveMenuMessage,
  categoryLabels,
  groupItemsByCategory,
  MenuHero,
  CategoryFilter,
  DishCard,
  EmptyMenu,
} from './menuShared';
import { useSiteTheme } from '../ThemeContext';

const API_URL = '/api';

// Strona glowna (/): menu z formularzem dodawania pozycji przez gosci
const MenuPage = () => {
  const { preset } = useSiteTheme();
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedCategory, setSelectedCategory] = useState('wszystkie');

  // Form state
  const [dishName, setDishName] = useState('');
  const [madeBy, setMadeBy] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('dania');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/menu`);
        if (!response.ok) throw new Error('Błąd podczas pobierania menu');
        const data = await response.json();
        let items = data.items || [];
        if (data.message) setMenuMessage(data.message);
        // Migrate existing items without category
        if (items.some((item) => !item.category)) {
          await fetch(`${API_URL}/menu/migrate-categories`, { method: 'POST' });
          const again = await fetch(`${API_URL}/menu`);
          items = (await again.json()).items || [];
        }
        setMenuItems(items);
      } catch (error) {
        console.error('Error fetching menu:', error);
        showSnackbar('Błąd podczas pobierania menu', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar('Zdjęcie jest za duże. Maksymalny rozmiar to 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDishName('');
    setMadeBy('');
    setDescription('');
    setCategory('dania');
    setImage(null);
    setImagePreview(null);
  };

  const handleAddItem = async () => {
    if (!dishName.trim() || !madeBy.trim()) {
      showSnackbar('Nazwa dania i osoba są wymagane', 'error');
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishName: dishName.trim(),
          madeBy: madeBy.trim(),
          description: description.trim(),
          category,
          image,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas dodawania pozycji');
      }
      const newItem = await response.json();
      setMenuItems((prev) => [...prev, newItem]);
      showSnackbar('Pozycja dodana pomyślnie!');
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding menu item:', error);
      showSnackbar(error.message || 'Błąd podczas dodawania pozycji', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    selectedCategory === 'wszystkie' ? menuItems : menuItems.filter((i) => (i.category || 'dania') === selectedCategory);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, position: 'relative', zIndex: 20 }}>
      <MenuHero message={resolveMenuMessage(menuMessage, preset)}>
        <Button
          variant="contained"
          size="large"
          onClick={() => setOpenDialog(true)}
          startIcon={<AddIcon />}
          sx={{
            color: '#1a1205',
            fontWeight: 700,
            background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))',
            '&:hover': { filter: 'brightness(1.06)' },
          }}
        >
          Dodaj pozycję do menu
        </Button>
      </MenuHero>

      {menuItems.length > 0 && <CategoryFilter value={selectedCategory} onChange={setSelectedCategory} />}

      {loading ? (
        <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', py: 6 }}>Ładowanie menu...</Typography>
      ) : menuItems.length === 0 ? (
        <EmptyMenu text={preset.emptyMenu} />
      ) : (
        Object.entries(groupItemsByCategory(filtered)).map(([key, items]) =>
          items.length === 0 ? null : (
            <Box key={key} component="section" sx={{ mb: 7 }}>
              <Typography variant="h4" sx={{ color: 'var(--ink)', mb: 1, fontSize: { xs: '1.6rem', md: '2rem' } }}>
                {categoryLabels[key] || key}
              </Typography>
              <hr className="gold-rule" style={{ marginBottom: 28 }} />
              <Grid container spacing={3}>
                {items.map((item, i) => (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <DishCard item={item} index={i} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )
        )
      )}

      {/* Add Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
          Dodaj pozycję do menu
        </DialogTitle>
        <DialogContent sx={{ pt: '24px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField fullWidth label="Nazwa dania/napoju *" value={dishName} onChange={(e) => setDishName(e.target.value)} required />

            <FormControl fullWidth>
              <InputLabel>Kategoria *</InputLabel>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} label="Kategoria *">
                <MenuItem value="dania">{categoryLabels.dania}</MenuItem>
                <MenuItem value="przekąski">{categoryLabels['przekąski']}</MenuItem>
                <MenuItem value="napoje">{categoryLabels.napoje}</MenuItem>
                <MenuItem value="alkohole">{categoryLabels.alkohole}</MenuItem>
              </Select>
            </FormControl>

            <TextField fullWidth label="Kto zrobił *" value={madeBy} onChange={(e) => setMadeBy(e.target.value)} required />

            <TextField fullWidth label="Opis (opcjonalne)" multiline rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />

            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Zdjęcie (opcjonalne, max 5MB)
              </Typography>
              <input accept="image/*" style={{ display: 'none' }} id="image-upload" type="file" onChange={handleImageChange} />
              <label htmlFor="image-upload">
                <Button variant="outlined" component="span" startIcon={<AddIcon />}>
                  Wybierz zdjęcie
                </Button>
              </label>
              {imagePreview && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ width: '100%', maxWidth: 300, position: 'relative', paddingTop: '56.25%', overflow: 'hidden', borderRadius: 2, border: '2px solid #e0e0e0' }}>
                    <img
                      src={imagePreview}
                      alt="Podgląd"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Usuń zdjęcie
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Anuluj
          </Button>
          <Button onClick={handleAddItem} variant="contained" disabled={saving || !dishName.trim() || !madeBy.trim()}>
            {saving ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MenuPage;
