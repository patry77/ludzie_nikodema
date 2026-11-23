import React, { useEffect, useRef } from 'react';

// Tablica kropkowa w stylu Familiady: znaki 5x7 + miejsce na ogonki (siatka 5 x 10), zielone "segmenty" na czarnym tle.

const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..#..', '...#.', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '..#..', '..#..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '*': ['.....', '#.#.#', '.###.', '#####', '.###.', '#.#.#', '.....'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '?_': [],
};

// Polskie litery: baza + akcent u gory (2 wiersze) / ogonek u dolu (1 wiersz); Ł ma wlasny ksztalt
const ACUTE = ['...#.', '..#..'];
const DOT = ['.....', '..#..'];
const TAIL = '....#';
const POLISH = {
  Ą: { base: 'A', tail: true },
  Ć: { base: 'C', top: ACUTE },
  Ę: { base: 'E', tail: true },
  Ł: { custom: ['#....', '#....', '#.#..', '##...', '#....', '#....', '#####'] },
  Ń: { base: 'N', top: ACUTE },
  Ó: { base: 'O', top: ACUTE },
  Ś: { base: 'S', top: ACUTE },
  Ź: { base: 'Z', top: ACUTE },
  Ż: { base: 'Z', top: DOT },
};

const BLANK = '.....';
const GLYPH_ROWS = 10; // 2 (akcent) + 7 (korpus) + 1 (ogonek)
const CELL_COLS = 6; // 5 kolumn znaku + 1 odstep

const cache = new Map();

export function glyphRows(ch) {
  const c = ch.toUpperCase();
  if (cache.has(c)) return cache.get(c);
  let rows;
  const p = POLISH[c];
  if (p) {
    const body = p.custom || G[p.base];
    rows = [...(p.top || [BLANK, BLANK]), ...body, p.tail ? TAIL : BLANK];
  } else if (G[c] && G[c].length === 7) {
    rows = [BLANK, BLANK, ...G[c], BLANK];
  } else {
    rows = Array(GLYPH_ROWS).fill(BLANK);
  }
  cache.set(c, rows);
  return rows;
}

// Przeksztalca linie tekstu w siatke wlaczonych kropek. line: string albo tablica {ch, v}
export function gridSize(charCols, lineCount, gap) {
  return { cols: charCols * CELL_COLS - 1, rows: lineCount * GLYPH_ROWS + (lineCount - 1) * gap };
}

function lineToChars(line, charCols) {
  const chars = [];
  if (typeof line === 'string') {
    for (const ch of line) chars.push({ ch, v: 1 });
  } else {
    for (const c of line) chars.push(c);
  }
  while (chars.length < charCols) chars.push({ ch: ' ', v: 1 });
  return chars.slice(0, charCols);
}

// ---------- Komponent canvas ----------
// lines: tablica linii (string | [{ch, v}]); animKeys[i] - zmiana klucza uruchamia animacje "odslaniania" linii i.
const DotDisplay = ({ lines, charCols, gap = 1, animKeys, color = '#39ff6a', offColor = '#052612', glow = true, style, className, label }) => {
  const wrapRef = useRef(null);
  const baseRef = useRef(null);
  const glowRef = useRef(null);
  const stateRef = useRef({ keys: [], anim: {}, raf: 0, w: 0 });
  const propsRef = useRef({});
  propsRef.current = { lines, charCols, gap, animKeys, color, offColor, glow };

  useEffect(() => {
    const wrap = wrapRef.current;
    const base = baseRef.current;
    const glw = glowRef.current;
    if (!wrap || !base) return undefined;
    const st = stateRef.current;

    const draw = (now) => {
      const { lines: L, charCols: CC, gap: GP, color: col, offColor: off, glow: gl } = propsRef.current;
      const { cols, rows } = gridSize(CC, L.length, GP);
      const width = wrap.clientWidth;
      if (!width) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pitch = width / cols;
      const height = Math.ceil(pitch * rows);
      const targets = [base, gl ? glw : null].filter(Boolean);
      targets.forEach((cv) => {
        if (cv.width !== Math.floor(width * dpr) || cv.height !== Math.floor(height * dpr)) {
          cv.width = Math.floor(width * dpr);
          cv.height = Math.floor(height * dpr);
          cv.style.width = `${width}px`;
          cv.style.height = `${height}px`;
        }
      });
      const bctx = base.getContext('2d');
      const gctx = gl && glw ? glw.getContext('2d') : null;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, width, height);
      if (gctx) {
        gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        gctx.clearRect(0, 0, width, height);
      }
      const radius = pitch * 0.4;
      let animating = false;

      L.forEach((line, li) => {
        const chars = lineToChars(line, CC);
        const a = st.anim[li];
        let progress = 1;
        if (a) {
          progress = Math.min(1, (now - a.t0) / 650);
          if (progress < 1) animating = true;
          else delete st.anim[li];
        }
        const rowBase = li * (GLYPH_ROWS + GP);
        // wlaczone kropki tej linii (mapa: wiersz -> kolumna -> jasnosc)
        const lit = new Map();
        chars.forEach((c, k) => {
          if (!c.v) return;
          const g = glyphRows(c.ch);
          for (let r = 0; r < GLYPH_ROWS; r++) {
            for (let cc = 0; cc < 5; cc++) {
              if (g[r][cc] === '#') lit.set(`${r}:${k * CELL_COLS + cc}`, c.v);
            }
          }
        });
        for (let r = 0; r < GLYPH_ROWS; r++) {
          for (let c = 0; c < cols; c++) {
            const x = (c + 0.5) * pitch;
            const y = (rowBase + r + 0.5) * pitch;
            let v = lit.get(`${r}:${c}`) || 0;
            if (v && progress < 1) {
              const edge = c / cols;
              if (edge > progress) v = 0;
              else if (progress - edge < 0.12) v *= 0.4 + Math.random() * 0.6;
            }
            bctx.beginPath();
            bctx.arc(x, y, radius, 0, Math.PI * 2);
            if (v > 0) {
              bctx.fillStyle = col;
              bctx.globalAlpha = Math.min(1, 0.25 + v * 0.75);
              bctx.fill();
              if (gctx) {
                gctx.beginPath();
                gctx.arc(x, y, radius * 1.15, 0, Math.PI * 2);
                gctx.fillStyle = col;
                gctx.globalAlpha = Math.min(1, v);
                gctx.fill();
              }
            } else {
              bctx.fillStyle = off;
              bctx.globalAlpha = 1;
              bctx.fill();
            }
          }
        }
      });
      bctx.globalAlpha = 1;
      return animating;
    };

    const loop = (now) => {
      const animating = draw(now);
      st.raf = animating ? requestAnimationFrame(loop) : 0;
    };
    st.start = () => {
      if (!st.raf) st.raf = requestAnimationFrame(loop);
    };
    st.redraw = () => {
      cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => st.redraw());
    ro.observe(wrap);
    st.redraw();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(st.raf);
      st.raf = 0;
    };
  }, []);

  // przy kazdej zmianie danych: wykryj nowe klucze animacji i przerysuj
  useEffect(() => {
    const st = stateRef.current;
    const keys = animKeys || [];
    const now = performance.now();
    keys.forEach((k, i) => {
      if (st.keys[i] !== undefined && st.keys[i] !== k && k) st.anim[i] = { t0: now };
    });
    st.keys = [...keys];
    if (st.redraw) st.redraw();
  }, [lines, animKeys, charCols, gap, color, offColor, glow]);

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative', width: '100%', ...style }} role="img" aria-label={label || 'Tablica'}>
      <canvas ref={baseRef} style={{ display: 'block' }} />
      {glow && (
        <canvas
          ref={glowRef}
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(5px) brightness(1.5)', mixBlendMode: 'screen', pointerEvents: 'none' }}
        />
      )}
    </div>
  );
};

export default DotDisplay;
export { CELL_COLS, GLYPH_ROWS };
