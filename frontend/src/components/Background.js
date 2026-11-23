import React from 'react';

// Tlo: gleboka nocna zielen z cieplymi poswiatami (choinkowe swiatla) i delikatnym wzorem gwiazd.
const Background = () => (
  <div
    aria-hidden="true"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: -1,
      background: [
        'radial-gradient(900px 520px at 12% -5%, rgba(179, 18, 47, 0.38), transparent 60%)',
        'radial-gradient(800px 600px at 95% 8%, rgba(244, 201, 93, 0.16), transparent 62%)',
        'radial-gradient(1100px 700px at 50% 115%, rgba(31, 107, 74, 0.55), transparent 65%)',
        'linear-gradient(180deg, #07140f 0%, #0c2218 55%, #0a1c14 100%)',
      ].join(', '),
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
          'radial-gradient(1px 1px at 240px 120px, rgba(244,201,93,0.9), transparent)',
        backgroundSize: '280px 160px',
      }}
    />
  </div>
);

export default Background;
