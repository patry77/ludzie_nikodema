import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Button, IconButton, Typography, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import Logo from './Logo';
import { useSiteTheme } from '../ThemeContext';

// Girlanda: lampki w motywie swiatecznym, w pozostalych cienka kolorowa linia.
const Garland = ({ kind, colors }) => {
  if (kind !== 'bulbs') {
    return (
      <Box
        aria-hidden="true"
        sx={{ height: 3, background: `linear-gradient(90deg, ${colors.join(', ')}, ${colors[0]})`, opacity: 0.9 }}
      />
    );
  }
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'flex',
        justifyContent: 'space-around',
        px: 2,
        height: 18,
        overflow: 'hidden',
        borderTop: '2px solid rgba(255,255,255,0.12)',
      }}
    >
      {Array.from({ length: 28 }, (_, i) => {
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="bulb"
            style={{
              background: color,
              boxShadow: `0 0 10px 2px ${color}88`,
              animationDelay: `${(i % 7) * 0.35}s`,
              marginTop: 6 + (i % 2) * 2,
            }}
          />
        );
      })}
    </Box>
  );
};

const Navbar = () => {
  const { pathname } = useLocation();
  const { preset } = useSiteTheme();
  const [open, setOpen] = React.useState(false);

  // Karta "Mikolajki" jest widoczna tylko w motywie swiatecznym
  const links = [
    { to: '/', label: preset.menuTitle },
    ...(preset.mikolajki ? [{ to: '/mikolajki', label: 'Mikołajki 🎁' }] : []),
    { to: '/archiwum', label: 'Archiwum' },
    { to: '/wakacje', label: 'Wakacje' },
    { to: '/wiki', label: 'Wiki' },
  ];

  const isActive = (to) => (to === '/' ? pathname === '/' || pathname === '/menu' : pathname.startsWith(to));

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'color-mix(in srgb, var(--night) 72%, transparent)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(var(--accent-rgb), 0.25)',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          component={Link}
          to="/"
          aria-label="Ludzie Nikodema - strona główna"
          sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
        >
          <Logo size={42} />
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
          {links.map((l) => (
            <Button
              key={l.to}
              component={Link}
              to={l.to}
              sx={{
                color: isActive(l.to) ? '#1a1205' : 'var(--ink)',
                background: isActive(l.to) ? 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))' : 'transparent',
                '&:hover': { background: isActive(l.to) ? undefined : 'rgba(255,255,255,0.1)' },
              }}
            >
              {l.label}
            </Button>
          ))}
        </Box>

        <IconButton
          aria-label="Menu nawigacji"
          onClick={() => setOpen(true)}
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'var(--ink)' }}
        >
          <MenuIcon />
        </IconButton>
      </Box>
      <Garland kind={preset.garland} colors={preset.colors.garland} />

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { background: 'var(--night-2)', color: 'var(--ink)', width: 250, borderLeft: '1px solid rgba(var(--accent-rgb),0.3)' } }}
      >
        <List sx={{ pt: 3 }}>
          {links.map((l) => (
            <ListItemButton key={l.to} component={Link} to={l.to} onClick={() => setOpen(false)} selected={isActive(l.to)}>
              <ListItemText primary={l.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </header>
  );
};

export default Navbar;
