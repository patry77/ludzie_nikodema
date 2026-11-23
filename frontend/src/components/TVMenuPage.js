import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import {
  Person as PersonIcon,
} from '@mui/icons-material';
import { DEFAULT_MENU_MESSAGE, categoryLabels, Countdown } from './menuShared';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const TVMenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState(DEFAULT_MENU_MESSAGE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMenuItems();
    // Refresh menu every 30 seconds
    const interval = setInterval(fetchMenuItems, 30000);
    return () => clearInterval(interval);
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

  const groupedItems = groupItemsByCategory(menuItems);
  const totalItems = menuItems.length;

  // Calculate optimal grid layout to fit all items without scrolling
  // Try to create a roughly square grid
  const calculateGridLayout = (itemCount) => {
    if (itemCount === 0) return { cols: 1, rows: 1 };
    if (itemCount === 1) return { cols: 1, rows: 1 };
    if (itemCount === 2) return { cols: 2, rows: 1 };
    if (itemCount <= 4) return { cols: 2, rows: 2 };
    if (itemCount <= 6) return { cols: 3, rows: 2 };
    if (itemCount <= 9) return { cols: 3, rows: 3 };
    if (itemCount <= 12) return { cols: 4, rows: 3 };
    if (itemCount <= 16) return { cols: 4, rows: 4 };
    if (itemCount <= 20) return { cols: 5, rows: 4 };
    if (itemCount <= 25) return { cols: 5, rows: 5 };
    // For more items, calculate dynamically
    const cols = Math.ceil(Math.sqrt(itemCount * 1.2)); // Slightly wider than tall
    const rows = Math.ceil(itemCount / cols);
    return { cols, rows };
  };

  const gridLayout = calculateGridLayout(totalItems);

  if (loading && menuItems.length === 0) {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <Typography variant="h2" sx={{ color: 'var(--gold)' }}>
          Ładowanie menu...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'transparent',
        position: 'relative',
        zIndex: 20,
        padding: '2vh',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          textAlign: 'center',
          marginBottom: '1.5vh',
          padding: '1.5vh',
          background: 'rgba(255, 255, 255, 0.07)',
          border: '1px solid rgba(244, 201, 93, 0.4)',
          borderRadius: '24px',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Typography
          variant="h1"
          className="gold-text"
          sx={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.6rem)',
            marginBottom: '0.5vh',
          }}
        >
          🎄 Menu Wigilijne 2026 🎄
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontSize: 'clamp(1.2rem, 3vw, 2rem)',
            color: 'var(--ink-dim)',
            marginBottom: '1vh',
          }}
        >
          {menuMessage}
        </Typography>
        <Countdown compact />
      </Box>

      {/* Menu Items - All categories in one view without scrolling */}
      <Box
        sx={{
          height: 'calc(100vh - 15vh)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Single grid with all items, calculated to fit without scrolling */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
            gap: '1vh',
            height: '100%',
            padding: '1vh',
            overflow: 'hidden',
          }}
        >
          {menuItems.map((item) => (
            <Card
              key={item.id}
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(10, 28, 20, 0.82)',
                border: '1px solid rgba(244, 201, 93, 0.45)',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                position: 'relative',
              }}
            >
              {/* Category badge */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '1vh',
                  right: '1vh',
                  background: 'rgba(244, 201, 93, 0.95)',
                  color: '#1a1205',
                  padding: '0.5vh 1vw',
                  borderRadius: '10px',
                  fontSize: 'clamp(0.8rem, 1.5vw, 1.2rem)',
                  fontWeight: 'bold',
                  zIndex: 10,
                }}
              >
                {categoryLabels[item.category] || item.category || '🍽️'}
              </Box>

              {item.image && (
                <Box
                  sx={{
                    width: '100%',
                    height: '40%',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#1a1a1a',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.dishName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: item.imagePosition || 'center',
                    }}
                  />
                </Box>
              )}
              <CardContent
                sx={{
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.5vh !important',
                  backgroundColor: 'transparent',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontSize: 'clamp(1rem, 2.2vw, 1.8rem)',
                    fontWeight: 'bold',
                    color: 'var(--gold)',
                    fontFamily: 'var(--font-display)',
                    marginBottom: '0.8vh',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {item.dishName}
                </Typography>
                
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '0.5vh',
                    justifyContent: 'center',
                  }}
                >
                  <PersonIcon sx={{ color: '#FFFFFF', marginRight: '0.5vw', fontSize: 'clamp(0.9rem, 1.8vw, 1.4rem)' }} />
                  <Typography
                    variant="h5"
                    sx={{
                      fontSize: 'clamp(0.85rem, 1.6vw, 1.3rem)',
                      color: '#FFFFFF',
                    }}
                  >
                    <strong>{item.madeBy}</strong>
                  </Typography>
                </Box>
                
                {item.description && (
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
                      color: '#E0E0E0',
                      textAlign: 'center',
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TVMenuPage;

