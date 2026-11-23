import React from 'react';
import { Box, Typography } from '@mui/material';

// Szyld ze swiecacymi zarowkami (jak na stronie dodawania pytan)
const MarqueeSign = ({ kicker, title, size = 'large', sx }) => (
  <Box className="rise-in" sx={{ textAlign: 'center', ...sx }}>
    <Box
      sx={{
        display: 'inline-block',
        width: '100%',
        maxWidth: size === 'large' ? 640 : 460,
        borderRadius: '18px',
        overflow: 'hidden',
        border: '3px solid var(--gold)',
        background: 'linear-gradient(180deg, #0b1a73, #050f46)',
        boxShadow: '0 0 0 3px #050826, 0 0 40px rgba(var(--accent-rgb), 0.45)',
      }}
    >
      <div className="marquee-lights" />
      <Box sx={{ px: 2, py: size === 'large' ? { xs: 2, sm: 3 } : 1.5 }}>
        {kicker && (
          <Typography sx={{ color: 'var(--primary-light)', fontWeight: 800, letterSpacing: 6, fontSize: { xs: '0.7rem', sm: '0.85rem' }, textTransform: 'uppercase' }}>
            {kicker}
          </Typography>
        )}
        <Typography
          component="h1"
          className="gold-text neon-title"
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            letterSpacing: { xs: 2, sm: 5 },
            lineHeight: 1.05,
            fontSize: size === 'large' ? { xs: '2.3rem', sm: '3.6rem', md: '4.2rem' } : { xs: '1.8rem', sm: '2.4rem' },
          }}
        >
          {title}
        </Typography>
      </Box>
      <div className="marquee-lights alt" />
    </Box>
  </Box>
);

export default MarqueeSign;
