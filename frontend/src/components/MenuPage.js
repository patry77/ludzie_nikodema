import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Restaurant as RestaurantIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const API_URL = '/api';

const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('Zobacz co przygotowaliśmy na sylwestra!');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/menu`);
      if (!response.ok) throw new Error('Błąd podczas pobierania menu');
      const data = await response.json();
      setMenuItems(data.items || []);
      if (data.message) {
        setMenuMessage(data.message);
      }
      // Migrate existing items without category
      const needsMigration = (data.items || []).some(item => !item.category);
      if (needsMigration) {
        await fetch(`${API_URL}/menu/migrate-categories`, { method: 'POST' });
        // Refetch after migration
        const newResponse = await fetch(`${API_URL}/menu`);
        const newData = await newResponse.json();
        setMenuItems(newData.items || []);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      showSnackbar('Błąd podczas pobierania menu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showSnackbar('Zdjęcie jest za duże. Maksymalny rozmiar to 5MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setImage(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = async () => {
    if (!dishName.trim() || !madeBy.trim()) {
      showSnackbar('Nazwa dania i osoba są wymagane', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dishName: dishName.trim(),
          madeBy: madeBy.trim(),
          description: description.trim(),
          category: category,
          image: image,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Błąd podczas dodawania pozycji');
      }

      const newItem = await response.json();
      setMenuItems([...menuItems, newItem]);
      showSnackbar('Pozycja dodana pomyślnie!', 'success');
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding menu item:', error);
      showSnackbar(error.message || 'Błąd podczas dodawania pozycji', 'error');
    } finally {
      setLoading(false);
    }
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

  const groupItemsByCategory = (items) => {
    const categories = {
      dania: [],
      przekąski: [],
      napoje: [],
      alkohole: []
    };
    
    items.forEach(item => {
      const cat = item.category || 'dania';
      if (categories[cat]) {
        categories[cat].push(item);
      } else {
        categories.dania.push(item);
      }
    });
    
    return categories;
  };

  const categoryLabels = {
    wszystkie: 'Wszystkie',
    dania: '🍽️ Dania',
    przekąski: '🍿 Przekąski',
    napoje: '🥤 Napoje',
    alkohole: '🍷 Alkohole'
  };

  const getFilteredItems = () => {
    if (selectedCategory === 'wszystkie') {
      return menuItems;
    }
    return menuItems.filter(item => item.category === selectedCategory);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="lg" className="py-8">
      <Box 
        className="mb-8 text-center p-8 rounded-lg shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          border: '4px solid #FFD700',
        }}
      >
        <Typography variant="h3" className="font-bold text-yellow-400 mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
          🎉 Menu Sylwestrowe 2025 🎊
        </Typography>
        <Typography variant="body1" className="text-gray-700 mb-6 font-semibold text-lg">
          {menuMessage}
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          onClick={() => setOpenDialog(true)}
          className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 px-8 py-3 font-bold"
          startIcon={<AddIcon />}
        >
          Dodaj pozycję do menu
        </Button>
      </Box>

      {/* Category Filter Buttons */}
      {menuItems.length > 0 && (
        <Box className="mb-6 flex gap-2 justify-center flex-wrap">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'contained' : 'outlined'}
              onClick={() => setSelectedCategory(key)}
              className={
                selectedCategory === key
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 px-6 py-2 font-bold shadow-lg'
                  : 'border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 px-6 py-2'
              }
            >
              {label}
            </Button>
          ))}
        </Box>
      )}

      {loading && menuItems.length === 0 ? (
        <Box className="text-center py-8">
          <Typography>Ładowanie menu...</Typography>
        </Box>
      ) : menuItems.length === 0 ? (
        <Paper className="p-8 text-center bg-gray-50">
          <RestaurantIcon className="text-6xl text-gray-400 mb-4" />
          <Typography variant="h6" className="text-gray-500">
            Menu jest puste. Dodaj pierwszą pozycję!
          </Typography>
        </Paper>
      ) : (
        <Box>
          {Object.entries(groupItemsByCategory(getFilteredItems())).map(([categoryKey, items]) => {
            if (items.length === 0) return null;
            
            return (
              <Box key={categoryKey} className="mb-8">
                <Typography variant="h4" className="font-bold text-yellow-400 mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  {categoryLabels[categoryKey] || categoryKey}
                </Typography>
                <Grid container spacing={4}>
                  {items.map((item) => (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                      <Card className="h-full flex flex-col shadow-lg hover:shadow-xl transition-shadow overflow-hidden bg-gray-800 bg-opacity-70">
                        {item.image && (
                          <Box
                            sx={{
                              width: '100%',
                              height: 0,
                              paddingTop: '56.25%', // 16:9 aspect ratio
                              position: 'relative',
                              overflow: 'hidden',
                              backgroundColor: '#1a1a1a'
                            }}
                          >
                            <img
                              src={item.image}
                              alt={item.dishName}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                objectPosition: item.imagePosition || 'center'
                              }}
                            />
                          </Box>
                        )}
                        <CardContent className="flex-grow" style={{ backgroundColor: 'rgba(26, 26, 46, 0.8)' }}>
                          <Typography variant="h5" className="font-bold text-yellow-400 mb-2">
                            {item.dishName}
                          </Typography>
                          
                          <Box className="flex items-center mb-2 text-gray-300">
                            <PersonIcon className="mr-2 text-sm" />
                            <Typography variant="body2">
                              Przygotował/a: <strong className="text-white">{item.madeBy}</strong>
                            </Typography>
                          </Box>
                          
                          {item.description && (
                            <Box className="mt-3">
                              <Box className="flex items-center mb-1 text-gray-300">
                                <DescriptionIcon className="mr-2 text-sm" />
                                <Typography variant="body2" className="font-semibold">
                                  Opis:
                                </Typography>
                              </Box>
                              <Typography variant="body2" className="text-gray-200">
                                {item.description}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Add Item Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900">
          <Typography variant="h6" className="font-bold">
            Dodaj pozycję do menu
          </Typography>
        </DialogTitle>
        <DialogContent className="pt-6">
          <Box className="space-y-4">
            <TextField
              fullWidth
              label="Nazwa dania/napoju *"
              variant="outlined"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              required
              className="bg-white"
            />
            
            <FormControl fullWidth className="bg-white">
              <InputLabel>Kategoria *</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label="Kategoria *"
              >
                <MenuItem value="dania">🍽️ Dania</MenuItem>
                <MenuItem value="przekąski">🍿 Przekąski</MenuItem>
                <MenuItem value="napoje">🥤 Napoje</MenuItem>
                <MenuItem value="alkohole">🍷 Alkohole</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Kto zrobił *"
              variant="outlined"
              value={madeBy}
              onChange={(e) => setMadeBy(e.target.value)}
              required
              className="bg-white"
            />
            
            <TextField
              fullWidth
              label="Opis (opcjonalne)"
              variant="outlined"
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white"
            />
            
            <Box>
              <Typography variant="body2" className="mb-2 text-gray-600">
                Zdjęcie dania/napoju (opcjonalne, max 5MB)
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  className="mb-2"
                  startIcon={<AddIcon />}
                >
                  Wybierz zdjęcie
                </Button>
              </label>
              {imagePreview && (
                <Box className="mt-2">
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: '300px',
                      height: 0,
                      paddingTop: '56.25%', // 16:9 aspect ratio
                      position: 'relative',
                      overflow: 'hidden',
                      borderRadius: '8px',
                      border: '2px solid #e0e0e0',
                      backgroundColor: '#f5f5f5'
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                      }}
                    />
                  </Box>
                  <Button
                    size="small"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="mt-2 text-red-500"
                  >
                    Usuń zdjęcie
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={handleCloseDialog} className="text-gray-600">
            Anuluj
          </Button>
          <Button
            onClick={handleAddItem}
            variant="contained"
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-gray-900 font-bold"
            disabled={loading || !dishName.trim() || !madeBy.trim()}
          >
            {loading ? 'Dodawanie...' : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MenuPage;

