import React from 'react';
import { Box } from '@mui/material';
import { useSiteTheme } from '../ThemeContext';

// Znak w medalionie. Srodek zalezy od motywu: choinka, fajerwerki, tort, kula disco albo "ludzie".
// Kolory biora sie ze zmiennych CSS aktywnego motywu.
const Glyph = ({ type }) => {
  const gold = { fill: 'url(#lm-gold)' };
  const cream = { fill: '#fff6e5' };
  const accent = { fill: 'var(--primary-light)' };
  const deep = { fill: 'var(--gold-deep)' };

  switch (type) {
    case 'burst': {
      const rays = Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const long = i % 2 === 0;
        const r1 = 6;
        const r2 = long ? 22 : 15;
        return { x1: 32 + r1 * Math.cos(a), y1: 32 + r1 * Math.sin(a), x2: 32 + r2 * Math.cos(a), y2: 32 + r2 * Math.sin(a), long };
      });
      return (
        <g>
          {rays.map((r, i) => (
            <g key={i}>
              <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="url(#lm-gold)" strokeWidth="2" strokeLinecap="round" />
              <circle cx={r.x2} cy={r.y2} r={r.long ? 2.2 : 1.5} style={r.long ? cream : accent} />
            </g>
          ))}
          <circle cx="32" cy="32" r="4" style={gold} />
        </g>
      );
    }
    case 'cake':
      return (
        <g>
          <rect x="16" y="40" width="32" height="12" rx="3" style={cream} />
          <rect x="19" y="28" width="26" height="12" rx="3" style={accent} />
          <path d="M19 40 q3 4 6.5 0 t6.5 0 t6.5 0 t6.5 0" fill="none" stroke="#fff6e5" strokeWidth="2" />
          <rect x="31" y="20" width="2.6" height="8" rx="1" style={deep} />
          <path d="M32.3 12 C35 15.5 35.5 18 32.3 19.5 C29.1 18 29.6 15.5 32.3 12 Z" style={gold} />
          <circle cx="24" cy="46" r="1.5" style={accent} />
          <circle cx="40" cy="46" r="1.5" style={accent} />
        </g>
      );
    case 'disco':
      return (
        <g>
          <line x1="32" y1="8" x2="32" y2="16" stroke="url(#lm-gold)" strokeWidth="2" />
          <circle cx="32" cy="34" r="17" style={{ fill: '#e8ecf5' }} />
          <g fill="none" stroke="var(--primary)" strokeWidth="1.2" opacity="0.8">
            <ellipse cx="32" cy="34" rx="17" ry="6" />
            <ellipse cx="32" cy="34" rx="17" ry="12" />
            <ellipse cx="32" cy="34" rx="6" ry="17" />
            <ellipse cx="32" cy="34" rx="12" ry="17" />
            <line x1="32" y1="17" x2="32" y2="51" />
            <line x1="15" y1="34" x2="49" y2="34" />
          </g>
          <circle cx="26" cy="28" r="3" style={cream} opacity="0.9" />
          <polygon points="50,14 51.4,17.6 55,19 51.4,20.4 50,24 48.6,20.4 45,19 48.6,17.6" style={gold} />
          <polygon points="14,46 15,48.6 17.6,49.6 15,50.6 14,53.2 13,50.6 10.4,49.6 13,48.6" style={gold} />
        </g>
      );
    case 'people':
      return (
        <g>
          <circle cx="24" cy="25" r="6.5" style={cream} />
          <path d="M11 50 C11 38 18 34 24 34 C30 34 37 38 37 50 Z" style={cream} />
          <circle cx="42" cy="27" r="5.5" style={gold} />
          <path d="M31 50 C31 40 36 36.5 42 36.5 C48 36.5 53 40 53 50 Z" style={gold} />
        </g>
      );
    case 'tree':
    default:
      return (
        <g>
          <polygon points="32,14 24,27 40,27" style={cream} />
          <polygon points="32,22 20,39 44,39" fill="#f6efe0" />
          <polygon points="32,31 15,52 49,52" style={cream} />
          <rect x="29" y="52" width="6" height="6" rx="1" style={deep} />
          <polygon
            points="32,5 33.29,8.22 36.76,8.45 34.09,10.68 34.94,14.05 32,12.2 29.06,14.05 29.91,10.68 27.24,8.45 30.71,8.22"
            style={gold}
          />
          <circle cx="29" cy="35" r="1.8" style={accent} />
          <circle cx="37" cy="43" r="1.8" style={deep} />
          <circle cx="25" cy="47" r="1.8" style={accent} />
          <circle cx="40" cy="49" r="1.5" style={accent} />
          <circle cx="34" cy="26" r="1.3" style={accent} />
        </g>
      );
  }
};

export const LogoMark = ({ size = 40, glyph = 'tree' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Ludzie Nikodema" style={{ flexShrink: 0 }}>
    <defs>
      <radialGradient id="lm-bg" cx="50%" cy="35%" r="75%">
        <stop offset="0%" style={{ stopColor: 'var(--secondary)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--night)' }} />
      </radialGradient>
      <linearGradient id="lm-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" style={{ stopColor: 'var(--gold-light)' }} />
        <stop offset="55%" style={{ stopColor: 'var(--gold)' }} />
        <stop offset="100%" style={{ stopColor: 'var(--gold-deep)' }} />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#lm-bg)" stroke="url(#lm-gold)" strokeWidth="2.5" />
    <Glyph type={glyph} />
  </svg>
);

// Pelne logo: znak (zalezny od motywu) + napis "Ludzie Nikodema" (male "LUDZIE" nad duzym "Nikodema").
const Logo = ({ size = 40, showText = true }) => {
  const { preset } = useSiteTheme();
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <LogoMark size={size} glyph={preset.glyph} />
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
};

export default Logo;
