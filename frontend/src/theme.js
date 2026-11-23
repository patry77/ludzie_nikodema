import { createTheme } from '@mui/material/styles';

// Motyw swiateczny: gleboka zielen, burgund i zloto.
// Strony "legacy" (admin, wakacje, wiki) uzywaja jasnych powierzchni, wiec zostajemy w trybie light,
// a nowe strony stylujemy jawnie (szklane karty na ciemnym tle).
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#b3122f', dark: '#8a0e24', light: '#e0334f', contrastText: '#fff' },
    secondary: { main: '#1f6b4a', dark: '#123a2a', light: '#2f9266', contrastText: '#fff' },
    warning: { main: '#d9a521' },
    background: { default: '#07140f', paper: '#ffffff' },
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
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 22 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 24 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 20 },
      },
    },
  },
});

export default theme;
