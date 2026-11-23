import React, { useMemo } from 'react';
import { Box } from '@mui/material';

const rand = (min, max) => min + Math.random() * (max - min);

// Wspolna scena teleturnieju: obracajace sie promienie, kolysace sie reflektory, blask podlogi i migoczace iskry.
// variant "full" (widok TV) ma wiecej reflektorow i iskier, "soft" (telefon, panele) jest spokojniejszy.
const StageBackdrop = ({ variant = 'soft' }) => {
  const full = variant === 'full';

  const sparkles = useMemo(
    () =>
      Array.from({ length: full ? 26 : 10 }, (_, i) => ({
        id: i,
        left: rand(2, 98),
        top: rand(4, 92),
        size: rand(2, full ? 6 : 4),
        delay: -rand(0, 6),
        duration: rand(2.2, 5),
      })),
    [full]
  );

  return (
    <Box aria-hidden="true" sx={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div className="stage-rays" />
      <div className="stage-floor" />
      <div className="stage-beam" style={{ left: '-8vw', '--beam-from': '-18deg', '--beam-to': '14deg', '--beam-color': 'rgba(96,165,250,0.34)' }} />
      <div className="stage-beam" style={{ left: '30vw', '--beam-from': '16deg', '--beam-to': '-16deg', '--beam-color': 'rgba(255,210,63,0.26)', animationDuration: '11s' }} />
      <div className="stage-beam" style={{ right: '-8vw', '--beam-from': '18deg', '--beam-to': '-12deg', '--beam-color': 'rgba(244,114,182,0.28)', animationDuration: '8s' }} />
      {full && (
        <>
          <div className="stage-beam" style={{ left: '14vw', '--beam-from': '10deg', '--beam-to': '-22deg', '--beam-color': 'rgba(52,211,153,0.2)', animationDuration: '13s', width: '34vw' }} />
          <div className="stage-beam" style={{ right: '16vw', '--beam-from': '-14deg', '--beam-to': '20deg', '--beam-color': 'rgba(167,139,250,0.24)', animationDuration: '10s', width: '34vw' }} />
        </>
      )}
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="sparkle-dot"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
        />
      ))}
    </Box>
  );
};

export default StageBackdrop;
