import React from 'react';

// Tlo zalezne od motywu: gleboka noc z kolorowymi poswiatami (zmienne CSS --glow-*, --night-*)
// i delikatnym wzorem gwiazd w kolorze akcentu.
const Background = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      background: [
        'radial-gradient(900px 520px at 12% -5%, var(--glow-1), transparent 60%)',
        'radial-gradient(800px 600px at 95% 8%, var(--glow-2), transparent 62%)',
        'radial-gradient(1100px 700px at 50% 115%, var(--glow-3), transparent 65%)',
        'linear-gradient(180deg, var(--night) 0%, var(--night-2) 55%, var(--night) 100%)',
      ].join(', '),
      transition: 'background 0.4s ease',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.5,
        backgroundImage:
          'radial-gradient(1.2px 1.2px at 20px 30px, rgba(255,255,255,0.9), transparent),' +
          'radial-gradient(1px 1px at 90px 80px, rgba(255,246,229,0.8), transparent),' +
          'radial-gradient(1.4px 1.4px at 160px 20px, rgba(255,255,255,0.7), transparent),' +
          'radial-gradient(1px 1px at 240px 120px, rgba(var(--accent-rgb),0.9), transparent)',
        backgroundSize: '280px 160px',
      }}
    />
  </div>
);

export default Background;
