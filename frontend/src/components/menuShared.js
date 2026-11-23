import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

export const WIGILIA_DATE = new Date('2026-12-24T18:00:00+01:00');
export const DEFAULT_MENU_MESSAGE = 'Zobacz, co przygotowaliśmy na wigilijny stół!';

// Klucze kategorii zostaja bez zmian (zgodnosc z zapisanymi danymi), zmieniamy tylko etykiety.
export const categoryLabels = {
  wszystkie: 'Wszystko',
  dania: '🍲 Potrawy wigilijne',
  przekąski: '🥟 Dodatki i zakąski',
  napoje: '🥤 Napoje i kompoty',
  alkohole: '🍷 Trunki',
};

export const groupItemsByCategory = (items) => {
  const categories = { dania: [], przekąski: [], napoje: [], alkohole: [] };
  items.forEach((item) => {
    const cat = item.category || 'dania';
    (categories[cat] || categories.dania).push(item);
  });
  return categories;
};

const pad = (n) => String(n).padStart(2, '0');

const getRemaining = () => {
  const diff = WIGILIA_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

export const Countdown = ({ compact = false }) => {
  const [left, setLeft] = useState(getRemaining());

  useEffect(() => {
    const t = setInterval(() => setLeft(getRemaining()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!left) {
    return (
      <Typography sx={{ color: 'var(--gold)', fontWeight: 700, fontSize: compact ? '1.4rem' : '1.2rem' }}>
        🎄 Wesołych Świąt! 🎄
      </Typography>
    );
  }

  const cells = [
    ['dni', left.days],
    ['godz.', pad(left.hours)],
    ['min.', pad(left.minutes)],
    ['sek.', pad(left.seconds)],
  ];

  return (
    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, justifyContent: 'center' }} aria-label="Odliczanie do Wigilii">
      {cells.map(([label, value]) => (
        <Box
          key={label}
          sx={{
            minWidth: compact ? 'clamp(70px, 6vw, 110px)' : { xs: 60, sm: 76 },
            py: compact ? 1.5 : 1,
            borderRadius: '16px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(244,201,93,0.35)',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              lineHeight: 1,
              fontSize: compact ? 'clamp(1.8rem, 3.2vw, 3.2rem)' : { xs: '1.5rem', sm: '1.9rem' },
              color: 'var(--gold)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </Typography>
          <Typography sx={{ fontSize: compact ? 'clamp(0.7rem, 1vw, 1rem)' : '0.7rem', color: 'var(--ink-dim)', letterSpacing: 1.5, textTransform: 'uppercase', mt: 0.5 }}>
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export const MenuHero = ({ message, children }) => (
  <Box className="glass rise-in" sx={{ textAlign: 'center', px: { xs: 3, md: 6 }, py: { xs: 5, md: 7 }, mb: 5, position: 'relative', overflow: 'hidden' }}>
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: 'radial-gradient(600px 220px at 50% 0%, rgba(244,201,93,0.18), transparent 70%)',
      }}
    />
    <Typography sx={{ letterSpacing: 4, textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--gold)', mb: 1.5, position: 'relative' }}>
      24 grudnia 2026
    </Typography>
    <Typography
      variant="h2"
      className="gold-text"
      sx={{ fontSize: { xs: '2.4rem', sm: '3.4rem', md: '4.2rem' }, lineHeight: 1.1, mb: 2, position: 'relative' }}
    >
      Menu Wigilijne
    </Typography>
    <Typography sx={{ color: 'var(--ink-dim)', fontSize: { xs: '1rem', md: '1.2rem' }, maxWidth: 640, mx: 'auto', mb: 4, position: 'relative' }}>
      {message}
    </Typography>
    <Box sx={{ position: 'relative' }}>
      <Countdown />
    </Box>
    {children && <Box sx={{ mt: 4, position: 'relative' }}>{children}</Box>}
  </Box>
);

export const CategoryFilter = ({ value, onChange }) => (
  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 5 }}>
    {Object.entries(categoryLabels).map(([key, label]) => {
      const active = value === key;
      return (
        <Box
          key={key}
          component="button"
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={active}
          sx={{
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: 600,
            fontSize: '0.95rem',
            px: 2.5,
            py: 1,
            borderRadius: 999,
            border: active ? '1px solid transparent' : '1px solid rgba(244,201,93,0.4)',
            color: active ? '#1a1205' : 'var(--ink)',
            background: active ? 'linear-gradient(120deg, #fff1c1, #f4c95d 55%, #d9a521)' : 'rgba(255,255,255,0.05)',
            transition: 'transform .15s ease, background .15s ease',
            '&:hover': { transform: 'translateY(-2px)', background: active ? undefined : 'rgba(255,255,255,0.12)' },
          }}
        >
          {label}
        </Box>
      );
    })}
  </Box>
);

export const DishCard = ({ item, index = 0 }) => (
  <Box
    className="glass rise-in"
    sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      animationDelay: `${Math.min(index, 12) * 60}ms`,
      transition: 'transform .25s ease, border-color .25s ease',
      '&:hover': { transform: 'translateY(-6px)', borderColor: 'rgba(244,201,93,0.65)' },
    }}
  >
    {item.image && (
      <Box sx={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#0a1c14' }}>
        <img
          src={item.image}
          alt={item.dishName}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: item.imagePosition || 'center',
          }}
        />
      </Box>
    )}
    <Box sx={{ p: 3, flexGrow: 1 }}>
      <Typography variant="h5" sx={{ color: 'var(--gold)', fontSize: '1.4rem', mb: 1.25, lineHeight: 1.25 }}>
        {item.dishName}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--ink-dim)', mb: item.description ? 1.5 : 0 }}>
        <PersonIcon sx={{ fontSize: 18 }} />
        <Typography variant="body2">
          Przygotował/a: <strong style={{ color: 'var(--ink)' }}>{item.madeBy}</strong>
        </Typography>
      </Box>
      {item.description && (
        <Typography variant="body2" sx={{ color: 'var(--ink-dim)', lineHeight: 1.65 }}>
          {item.description}
        </Typography>
      )}
    </Box>
  </Box>
);

export const EmptyMenu = ({ text }) => (
  <Box className="glass" sx={{ p: 6, textAlign: 'center' }}>
    <Typography sx={{ fontSize: '3rem', mb: 1 }} aria-hidden="true">🎄</Typography>
    <Typography sx={{ color: 'var(--ink-dim)' }}>{text}</Typography>
  </Box>
);
