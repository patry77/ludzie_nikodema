import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Button, IconButton, Typography, Drawer, List, ListItemButton, ListItemText } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

const LINKS = [
  { to: '/', label: 'Menu wigilijne' },
  { to: '/mikolajki', label: 'Mikołajki 🎁' },
  { to: '/wakacje', label: 'Wakacje' },
  { to: '/wiki', label: 'Wiki' },
];

const Bulbs = () => {
  const colors = ['#e0334f', '#f4c95d', '#2f9266', '#7cc4ff', '#e0334f', '#f4c95d', '#2f9266'];
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
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="bulb"
          style={{
            background: colors[i % colors.length],
            boxShadow: `0 0 10px 2px ${colors[i % colors.length]}88`,
            animationDelay: `${(i % 7) * 0.35}s`,
            marginTop: 6 + (i % 2) * 2,
          }}
        />
      ))}
    </Box>
  );
};

const Navbar = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = React.useState(false);

  const isActive = (to) => (to === '/' ? pathname === '/' || pathname === '/menu' : pathname.startsWith(to));

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(7, 20, 15, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(244, 201, 93, 0.25)',
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          component={Link}
          to="/"
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: { xs: '1.15rem', md: '1.4rem' },
            textDecoration: 'none',
            color: 'var(--gold)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <span aria-hidden="true">🎄</span> Ludzie Nikodema
        </Typography>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
          {LINKS.map((l) => (
            <Button
              key={l.to}
              component={Link}
              to={l.to}
              sx={{
                color: isActive(l.to) ? '#1a1205' : 'var(--ink)',
                background: isActive(l.to) ? 'linear-gradient(120deg, #fff1c1, #f4c95d 55%, #d9a521)' : 'transparent',
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
      <Bulbs />

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { background: '#0c2218', color: 'var(--ink)', width: 250, borderLeft: '1px solid rgba(244,201,93,0.3)' } }}
      >
        <List sx={{ pt: 3 }}>
          {LINKS.map((l) => (
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
