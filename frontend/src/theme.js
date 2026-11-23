import { createTheme } from '@mui/material/styles';

// Paleta MUI budowana z aktywnego motywu strony (patrz themes.js).
// Strony "legacy" (admin, wakacje, wiki) uzywaja jasnych powierzchni, wiec zostajemy w trybie light,
// a nowe strony stylujemy jawnie (szklane karty na ciemnym tle, zmienne CSS).
export const buildMuiTheme = (colors) =>
  createTheme({
    palette: {
      mode: 'light',
      primary: { main: colors.primary, dark: colors.primaryDark, light: colors.primaryLight, contrastText: '#fff' },
      secondary: { main: colors.secondary, dark: colors.secondaryDark, contrastText: '#fff' },
      warning: { main: colors.goldDeep },
      background: { default: colors.night, paper: '#ffffff' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800 },
      h2: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800 },
      h3: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 },
      h4: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 },
      h5: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0.2 },
    },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 999, paddingInline: 22 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
      MuiCard: { styleOverrides: { root: { borderRadius: 20 } } },
    },
  });
