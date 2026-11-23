import React from 'react';

const Snowflakes = () => {
  const confetti = Array.from({ length: 50 }, (_, i) => i);
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece}
          className="snowflake absolute opacity-75"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
            fontSize: `${10 + Math.random() * 15}px`,
            color: colors[Math.floor(Math.random() * colors.length)],
          }}
        >
          {Math.random() > 0.5 ? '✨' : '🎉'}
        </div>
      ))}
    </div>
  );
};

export default Snowflakes;

