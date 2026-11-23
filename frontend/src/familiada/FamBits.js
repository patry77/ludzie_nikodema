import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Avatar } from '../quiz/Avatar';

export const TEAM_COLORS = {
  red: { main: '#e5484d', light: '#ff8a8e', dark: '#7d1218', glow: 'rgba(229,72,77,0.55)' },
  blue: { main: '#3b82f6', light: '#8fbaff', dark: '#10357d', glow: 'rgba(59,130,246,0.55)' },
};
export const teamColor = (t) => TEAM_COLORS[t && t.color] || TEAM_COLORS.blue;

// Zwraca true przez `ms` milisekund po kazdej zmianie klucza (nie przy pierwszym renderze)
export function useFlash(key, ms = 1800) {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  const last = useRef(key);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      last.current = key;
      return undefined;
    }
    if (last.current === key) return undefined;
    last.current = key;
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return on;
}

export const memberLabel = (m, round) => {
  if (m.isSpeaker) return 'ODPOWIADA';
  if (m.isRep) return 'POJEDYNEK';
  return '';
};

// Osoba przy stoliku: zdjecie albo bialy ludek + imie
export const SeatedMember = ({ code, member, color, size = 'clamp(44px, 5vw, 96px)', fontSize = 'clamp(0.7rem, 1.1vw, 1.3rem)' }) => {
  const active = member.isSpeaker || member.isRep;
  const label = memberLabel(member);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 0, position: 'relative' }}>
      <Box
        className={active ? 'podium-active' : undefined}
        sx={{ borderRadius: '50%', p: '3px', background: active ? color.main : 'transparent', boxShadow: active ? `0 0 22px 4px ${color.glow}` : 'none', transition: 'all .25s ease', transform: active ? 'translateY(-6px) scale(1.08)' : 'none' }}
      >
        <Avatar code={code} player={member} size={size} badge={false} />
      </Box>
      <Typography noWrap sx={{ maxWidth: '100%', fontWeight: active ? 800 : 600, fontSize, color: active ? '#fff' : 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
        {member.isLeader ? '★ ' : ''}
        {member.name}
      </Typography>
      {label && (
        <Typography sx={{ position: 'absolute', top: -14, fontSize: 'clamp(0.55rem, 0.8vw, 0.95rem)', fontWeight: 800, px: 1, borderRadius: 999, background: color.main, color: '#fff', whiteSpace: 'nowrap', boxShadow: `0 0 12px ${color.glow}` }}>
          {label}
        </Typography>
      )}
    </Box>
  );
};

// Pasek stanu rundy (np. "RUNDA 3 · ×2")
export const secondsText = (n) => `${Math.max(0, Math.ceil(n))}`;
