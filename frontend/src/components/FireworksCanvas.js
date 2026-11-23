import React, { useEffect, useRef } from 'react';

// Fajerwerki na calym tle (motyw sylwestrowy): rakiety startuja z dolu ekranu i eksploduja
// kolorowymi kulami, pierscieniami, serduszkami i "wierzbami" (zlote, powoli opadajace iskry).
// Canvas jest nad tlem, ale pod trescia strony i nie przechwytuje klikniec.
const GRAVITY = 0.045;

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FireworksCanvas = ({ colors }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    // Szanujemy ustawienie "ogranicz animacje"
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let nextLaunch = 0;
    const rockets = [];
    const sparks = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const small = () => width < 640;

    const launch = () => {
      // Czesc wybuchow wypada po bokach, gdzie nie zaslania ich tresc strony
      const side = Math.random() < 0.6;
      const left = Math.random() < 0.5;
      const x = side
        ? left ? rand(width * 0.04, width * 0.22) : rand(width * 0.78, width * 0.96)
        : rand(width * 0.15, width * 0.85);
      const targetY = rand(height * 0.12, height * 0.5);
      rockets.push({
        x,
        y: height + 10,
        vx: rand(-0.6, 0.6),
        vy: -Math.sqrt(2 * 0.09 * (height - targetY)) * 1.0,
        targetY,
        color: pick(colors),
        trail: [],
      });
    };

    const explode = (x, y, color) => {
      const kind = pick(['sphere', 'sphere', 'ring', 'willow', 'heart', 'double']);
      const scale = small() ? 0.6 : 1;
      const count = Math.round((kind === 'willow' ? 90 : 110) * scale);
      const secondary = pick(colors);

      const add = (vx, vy, opts = {}) =>
        sparks.push({
          x,
          y,
          vx,
          vy,
          life: 1,
          decay: opts.decay || rand(0.008, 0.016),
          color: opts.color || color,
          size: opts.size || rand(1.2, 2.4),
          drag: opts.drag || 0.985,
          gravity: opts.gravity === undefined ? GRAVITY : opts.gravity,
          twinkle: Math.random() < 0.35,
        });

      if (kind === 'ring') {
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const s = 3.4 * scale + rand(-0.1, 0.1);
          add(Math.cos(a) * s, Math.sin(a) * s, { color: i % 2 ? color : secondary });
        }
      } else if (kind === 'heart') {
        for (let i = 0; i < count; i++) {
          const t = (i / count) * Math.PI * 2;
          const hx = 16 * Math.sin(t) ** 3;
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          add((hx / 16) * 3.2 * scale, (hy / 16) * 3.2 * scale, { color: '#ff7a9c', decay: 0.011 });
        }
      } else if (kind === 'willow') {
        for (let i = 0; i < count; i++) {
          const a = rand(0, Math.PI * 2);
          const s = rand(0.6, 3.4) * scale;
          add(Math.cos(a) * s, Math.sin(a) * s, { color: '#ffd98a', decay: rand(0.004, 0.008), gravity: 0.03, drag: 0.978, size: rand(1, 1.8) });
        }
      } else if (kind === 'double') {
        for (let i = 0; i < count; i++) {
          const a = rand(0, Math.PI * 2);
          const inner = i % 3 === 0;
          const s = (inner ? rand(0.8, 1.8) : rand(2.4, 4.2)) * scale;
          add(Math.cos(a) * s, Math.sin(a) * s, { color: inner ? secondary : color });
        }
      } else {
        for (let i = 0; i < count; i++) {
          const a = rand(0, Math.PI * 2);
          const s = rand(0.6, 4.2) * scale;
          add(Math.cos(a) * s, Math.sin(a) * s);
        }
      }
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 16.667, 3); // 1 = klatka przy 60 fps
      last = now;

      // Zanikanie poprzedniej klatki (smugi), canvas pozostaje przezroczysty
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      if (now >= nextLaunch) {
        const volley = Math.random() < 0.25 ? 2 : 1;
        for (let i = 0; i < volley; i++) launch();
        nextLaunch = now + rand(900, 2000);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.vy += 0.09 * dt;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 8) r.trail.shift();

        for (let t = 0; t < r.trail.length; t++) {
          const p = r.trail[t];
          ctx.globalAlpha = (t / r.trail.length) * 0.8;
          ctx.fillStyle = '#fff3c4';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        if (r.vy >= -0.4 || r.y <= r.targetY) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= s.drag;
        s.vy = s.vy * s.drag + s.gravity * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= s.decay * dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const flicker = s.twinkle ? 0.55 + Math.random() * 0.45 : 1;
        ctx.globalAlpha = Math.max(s.life, 0) * flicker;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.6 + s.life * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    />
  );
};

export default FireworksCanvas;
