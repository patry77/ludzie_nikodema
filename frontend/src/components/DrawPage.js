import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Button,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const DrawPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('Zobacz co przygotowaliśmy na sylwestra!');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('wszystkie');

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
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <Container maxWidth="lg" className="py-8 relative z-20">
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
        <Typography variant="body1" className="text-white mb-6 font-semibold text-lg">
          {menuMessage}
        </Typography>
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
          <Typography className="text-white">Ładowanie menu...</Typography>
        </Box>
      ) : menuItems.length === 0 ? (
        <Paper className="p-8 text-center bg-gray-800 bg-opacity-50">
          <RestaurantIcon className="text-6xl text-gray-400 mb-4" />
          <Typography variant="h6" className="text-gray-300">
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
                              paddingTop: '56.25%',
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
    </Container>
  );
};

export default DrawPage;
