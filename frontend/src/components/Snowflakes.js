import React, { useMemo } from 'react';

const FLAKES = 55;

// Platki sa losowane raz (useMemo), zeby nie "skakaly" przy kazdym renderze.
const Snowflakes = () => {
  const flakes = useMemo(
    () =>
      Array.from({ length: FLAKES }, (_, i) => {
        const size = 2 + Math.random() * 5;
        return {
          id: i,
          left: Math.random() * 100,
          size,
          delay: -Math.random() * 20,
          duration: 12 + Math.random() * 16,
          drift: (Math.random() - 0.5) * 120,
          opacity: 0.35 + Math.random() * 0.55,
        };
      }),
    []
  );

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {flakes.map((f) => (
        <span
          key={f.id}
          className="snowflake"
          style={{
            left: `${f.left}%`,
            width: f.size,
            height: f.size,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
            '--drift': `${f.drift}px`,
            '--flake-opacity': f.opacity,
            filter: f.size > 5 ? 'blur(0.6px)' : 'none',
          }}
        />
      ))}
    </div>
  );
};

export default Snowflakes;
