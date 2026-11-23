import React from 'react';
import { Box } from '@mui/material';

// Znak: choinka ze zlota gwiazda w zlotym medalionie.
export const LogoMark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Ludzie Nikodema" style={{ flexShrink: 0 }}>
    <defs>
      <radialGradient id="lm-bg" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stopColor="#1f6b4a" />
        <stop offset="100%" stopColor="#07140f" />
      </radialGradient>
      <linearGradient id="lm-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff1c1" />
        <stop offset="55%" stopColor="#f4c95d" />
        <stop offset="100%" stopColor="#d9a521" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#lm-bg)" stroke="url(#lm-gold)" strokeWidth="2.5" />
    <polygon points="32,14 24,27 40,27" fill="#fff6e5" />
    <polygon points="32,22 20,39 44,39" fill="#f6efe0" />
    <polygon points="32,31 15,52 49,52" fill="#fff6e5" />
    <rect x="29" y="52" width="6" height="6" rx="1" fill="#d9a521" />
    <polygon
      points="32,5 33.29,8.22 36.76,8.45 34.09,10.68 34.94,14.05 32,12.2 29.06,14.05 29.91,10.68 27.24,8.45 30.71,8.22"
      fill="url(#lm-gold)"
    />
    <circle cx="29" cy="35" r="1.8" fill="#e0334f" />
    <circle cx="37" cy="43" r="1.8" fill="#d9a521" />
    <circle cx="25" cy="47" r="1.8" fill="#e0334f" />
    <circle cx="40" cy="49" r="1.5" fill="#e0334f" />
    <circle cx="34" cy="26" r="1.3" fill="#e0334f" />
  </svg>
);

// Pelne logo: znak + napis "Ludzie Nikodema" (male "LUDZIE" nad duzym "Nikodema").
const Logo = ({ size = 40, showText = true }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
    <LogoMark size={size} />
    {showText && (
      <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <Box
          component="span"
          sx={{ fontSize: size * 0.27, letterSpacing: size * 0.09, textTransform: 'uppercase', color: 'var(--ink-dim)', fontWeight: 600 }}
        >
          Ludzie
        </Box>
        <Box
          component="span"
          className="gold-text"
          sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: size * 0.58, mt: '2px' }}
        >
          Nikodema
        </Box>
      </Box>
    )}
  </Box>
);

export default Logo;
