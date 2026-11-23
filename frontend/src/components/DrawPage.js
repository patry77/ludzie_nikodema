import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Grid } from '@mui/material';
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

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Strona glowna: publiczne menu wigilijne (tylko do czytania)
const DrawPage = () => {
  const { preset } = useSiteTheme();
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('wszystkie');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/menu`);
        if (!response.ok) throw new Error('Błąd podczas pobierania menu');
        const data = await response.json();
        setMenuItems(data.items || []);
        if (data.message) setMenuMessage(data.message);
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered =
    selectedCategory === 'wszystkie' ? menuItems : menuItems.filter((i) => (i.category || 'dania') === selectedCategory);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, position: 'relative', zIndex: 20 }}>
      <MenuHero message={resolveMenuMessage(menuMessage, preset)} />

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
    </Container>
  );
};

export default DrawPage;
