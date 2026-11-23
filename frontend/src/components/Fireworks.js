import { Fireworks } from '@fireworks-js/react';
import { useRef, useEffect } from 'react';

const FireworksComponent = () => {
  const fireworksRef = useRef(null);

  useEffect(() => {
    if (fireworksRef.current) {
      const fireworks = fireworksRef.current;
      
      // Start fireworks automatically
      fireworks.start();
      
      // Launch multiple fireworks at shorter intervals
      const interval = setInterval(() => {
        // Launch 2-4 fireworks at once
        const count = 2 + Math.floor(Math.random() * 3); // 2-4 fireworks
        fireworks.launch(count);
      }, 800 + Math.random() * 1200); // Every 0.8-2 seconds (much more frequent)

      return () => {
        clearInterval(interval);
        fireworks.stop();
      };
    }
  }, []);

  return (
    <Fireworks
      ref={fireworksRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
      options={{
        autoresize: true,
        opacity: 0.6,
        acceleration: 1.05,
        friction: 0.97,
        gravity: 1.5,
        particles: 80,
        traceLength: 4,
        traceSpeed: 12,
        explosion: 8,
        intensity: 40,
        flickering: 50,
        lineStyle: 'round',
        hue: {
          min: 0,
          max: 360
        },
        delay: {
          min: 15,
          max: 40
        },
        rocketsPoint: {
          min: 50,
          max: 50
        },
        lineWidth: {
          explosion: {
            min: 1,
            max: 4
          },
          trace: {
            min: 1,
            max: 2
          }
        },
        brightness: {
          min: 60,
          max: 100
        },
        decay: {
          min: 0.015,
          max: 0.03
        },
        mouse: {
          click: false,
          move: false,
          max: 1
        }
      }}
    />
  );
};

export default FireworksComponent;

