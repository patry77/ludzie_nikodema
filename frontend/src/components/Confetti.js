import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const Confetti = () => {
  const intervalRef = useRef(null);

  useEffect(() => {
    // Function to create confetti with different shapes
    const createConfetti = () => {
      // Random position on screen
      const x = Math.random();
      const y = Math.random();
      
      // Random colors for sylwester theme
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#FF1493', '#00CED1', '#FF4500', '#FF69B4'];
      
      // Random shape selection
      const shapes = ['circle', 'square', 'triangle'];
      const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
      
      // Create confetti burst
      confetti({
        particleCount: 50 + Math.floor(Math.random() * 50), // 50-100 particles
        startVelocity: 30 + Math.random() * 20, // 30-50
        spread: 70 + Math.random() * 30, // 70-100
        origin: { x, y },
        colors: colors,
        shapes: [randomShape],
        gravity: 0.8 + Math.random() * 0.2, // 0.8-1.0
        ticks: 200 + Math.floor(Math.random() * 100), // 200-300
        decay: 0.92 + Math.random() * 0.03, // 0.92-0.95
        scalar: 0.8 + Math.random() * 0.4, // 0.8-1.2
        drift: (Math.random() - 0.5) * 0.5, // Random drift
      });
    };

    // Initial confetti when component mounts
    setTimeout(() => {
      createConfetti();
    }, 1000);

    // Create confetti at random intervals (every 1-3 seconds)
    const scheduleNextConfetti = () => {
      const delay = 1000 + Math.random() * 2000; // 1-3 seconds
      intervalRef.current = setTimeout(() => {
        createConfetti();
        scheduleNextConfetti();
      }, delay);
    };

    scheduleNextConfetti();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything visible
};

export default Confetti;


