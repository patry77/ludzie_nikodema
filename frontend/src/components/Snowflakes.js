import React, { useMemo } from 'react';
import { useSiteTheme } from '../ThemeContext';
import FireworksCanvas from './FireworksCanvas';

const COUNTS = { snow: 55, confetti: 45, sparkle: 40, orbs: 14 };

const rand = (min, max) => min + Math.random() * (max - min);

// Czasteczki tla zalezne od motywu: snieg, konfetti, iskry, neonowe kule albo nic.
// Losowane raz na zmiane motywu (useMemo), zeby nie "skakaly" przy kazdym renderze.
const Snowflakes = () => {
  const { preset } = useSiteTheme();
  const mode = preset.particles;
  const palette = preset.colors.confetti;

  const items = useMemo(() => {
    const count = COUNTS[mode] || 0;
    return Array.from({ length: count }, (_, i) => {
      const color = palette[Math.floor(Math.random() * palette.length)];
      if (mode === 'snow') {
        const size = rand(2, 7);
        return {
          id: i, left: rand(0, 100), width: size, height: size, delay: -rand(0, 20), duration: rand(12, 28),
          drift: rand(-60, 60), opacity: rand(0.35, 0.9), background: undefined, blur: size > 5 ? 0.6 : 0,
        };
      }
      if (mode === 'confetti') {
        return {
          id: i, left: rand(0, 100), width: rand(6, 11), height: rand(10, 18), delay: -rand(0, 16), duration: rand(9, 18),
          drift: rand(-80, 80), opacity: rand(0.6, 0.95), background: color, blur: 0,
        };
      }
      if (mode === 'sparkle') {
        const size = rand(2, 5);
        return {
          id: i, left: rand(0, 100), width: size, height: size, delay: -rand(0, 14), duration: rand(8, 18),
          drift: rand(-40, 40), opacity: rand(0.5, 1), background: color, glow: color, blur: 0,
        };
      }
      // orbs
      const size = rand(40, 130);
      return {
        id: i, left: rand(0, 95), top: rand(5, 95), width: size, height: size, delay: -rand(0, 10), duration: rand(7, 14),
        drift: rand(-40, 40), opacity: rand(0.3, 0.6), background: color, blur: 14,
      };
    });
  }, [mode, palette]);

  if (mode === 'fireworks') return <FireworksCanvas colors={palette} />;
  if (items.length === 0) return null;

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {items.map((p) => (
        <span
          key={`${mode}-${p.id}`}
          className={`particle particle-${mode}`}
          style={{
            left: `${p.left}%`,
            top: p.top !== undefined ? `${p.top}%` : undefined,
            width: p.width,
            height: p.height,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--p-opacity': p.opacity,
            background: p.background,
            boxShadow: p.glow ? `0 0 8px 2px ${p.glow}` : mode === 'orbs' ? `0 0 40px 10px ${p.background}55` : undefined,
            filter: p.blur ? `blur(${p.blur}px)` : undefined,
          }}
        />
      ))}
    </div>
  );
};

export default Snowflakes;
