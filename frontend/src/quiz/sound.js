// Efekty dzwiekowe teleturniejow.
// Wszystkie dzwieki sa SYNTEZOWANE w przegladarce (Web Audio) - oryginalne, bez plikow i bez praw autorskich osob trzecich.
// Wlasne nagrania: wrzuc plik o nazwie dzwieku (np. correct.mp3) do frontend/public/sounds/ - zastapi dzwiek syntezowany.

const PUBLIC = process.env.PUBLIC_URL || '';
const EXTENSIONS = ['mp3', 'ogg', 'wav'];

export const SOUND_LIST = [
  { name: 'start', label: 'Start gry', hint: 'fanfara na otwarcie' },
  { name: 'join', label: 'Gracz dołączył', hint: 'cichy „plum”' },
  { name: 'question', label: 'Nowe pytanie', hint: 'szum i dzwonek' },
  { name: 'designate', label: 'Wskazywanie', hint: 'dzwonek wskazania' },
  { name: 'buzz', label: 'Zgłoszenie (finał)', hint: 'ostry sygnał przycisku' },
  { name: 'tick', label: 'Odliczanie', hint: 'tykanie w ostatnich sekundach' },
  { name: 'correct', label: 'Dobra odpowiedź', hint: 'wesoły dzwonek' },
  { name: 'wrong', label: 'Zła odpowiedź', hint: 'niski buzzer' },
  { name: 'lifeLost', label: 'Utrata szansy', hint: 'opadający dźwięk' },
  { name: 'eliminated', label: 'Odpadnięcie', hint: 'smutny motyw' },
  { name: 'stage', label: 'Nowy etap', hint: 'krótka fanfara' },
  { name: 'winner', label: 'Zwycięzca', hint: 'wielka fanfara' },
];

let ctx = null;
let master = null;
let volume = 0.6;
const custom = new Map(); // nazwa -> url | null (brak)

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio() {
  const c = getCtx();
  if (!c) return false;
  if (c.state === 'suspended') {
    try {
      await c.resume();
    } catch (e) {
      /* przegladarka moze odmowic bez gestu uzytkownika */
    }
  }
  if (c.state === 'running') preloadCustom();
  return c.state === 'running';
}

export const isAudioUnlocked = () => !!ctx && ctx.state === 'running';

export function setMasterVolume(v) {
  volume = Math.min(1, Math.max(0, Number(v)));
  if (master) master.gain.value = volume;
}

// ---------- Wlasne pliki ----------
async function findCustom(name) {
  if (custom.has(name)) return custom.get(name);
  let found = null;
  for (const ext of EXTENSIONS) {
    const url = `${PUBLIC}/sounds/${name}.${ext}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (res.ok && /audio|ogg|mpeg|wav|octet-stream/i.test(type) && !/html/i.test(type)) {
        found = url;
        break;
      }
    } catch (e) {
      /* brak pliku */
    }
  }
  custom.set(name, found);
  return found;
}

function preloadCustom() {
  SOUND_LIST.forEach((s) => {
    if (!custom.has(s.name)) findCustom(s.name);
  });
}

// ---------- Synteza ----------
function tone(c, out, { freq, freqEnd, type = 'sine', start = 0, dur = 0.3, gain = 0.2, attack = 0.01, release = 0.08, filter, vibrato }) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.setValueAtTime(gain, t0 + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = osc;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out);
  if (vibrato) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = vibrato.rate;
    lg.gain.value = vibrato.depth;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(c, out, { start = 0, dur = 0.4, gain = 0.12, f0 = 400, f1 = 3000, q = 1.5 }) {
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t0);
}

const N = { // czestotliwosci nut
  G3: 196, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568,
};

const chord = (c, out, freqs, start, dur, gain, type = 'sawtooth', filter = 2200) =>
  freqs.forEach((f) => tone(c, out, { freq: f, type, start, dur, gain, attack: 0.02, release: dur * 0.5, filter }));

const RECIPES = {
  start: (c, o) => {
    noise(c, o, { dur: 0.5, gain: 0.1, f0: 200, f1: 2500 });
    [N.G4, N.C5, N.E5].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: 0.25 + i * 0.13, dur: 0.22, gain: 0.22 }));
    chord(c, o, [N.C5, N.E5, N.G5, N.C6], 0.7, 1.1, 0.07);
    tone(c, o, { freq: N.C6, type: 'sine', start: 0.7, dur: 1.1, gain: 0.12 });
  },
  join: (c, o) => tone(c, o, { freq: 520, freqEnd: 900, type: 'sine', dur: 0.16, gain: 0.16, release: 0.06 }),
  question: (c, o) => {
    noise(c, o, { dur: 0.35, gain: 0.1, f0: 300, f1: 3200, q: 1 });
    tone(c, o, { freq: 880, type: 'sine', start: 0.3, dur: 0.35, gain: 0.16 });
    tone(c, o, { freq: 1318.5, type: 'sine', start: 0.42, dur: 0.5, gain: 0.12 });
  },
  designate: (c, o) => {
    tone(c, o, { freq: N.C6, type: 'triangle', dur: 0.25, gain: 0.18 });
    tone(c, o, { freq: N.G6, type: 'triangle', start: 0.12, dur: 0.4, gain: 0.15 });
  },
  buzz: (c, o) => {
    tone(c, o, { freq: 920, type: 'square', dur: 0.13, gain: 0.14, filter: 3500, release: 0.03 });
    tone(c, o, { freq: 920, type: 'square', start: 0.18, dur: 0.22, gain: 0.14, filter: 3500, release: 0.05 });
  },
  tick: (c, o) => tone(c, o, { freq: 1500, type: 'sine', dur: 0.05, gain: 0.12, attack: 0.002, release: 0.03 }),
  correct: (c, o) => {
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => {
      tone(c, o, { freq: f, type: 'triangle', start: i * 0.09, dur: i === 3 ? 0.7 : 0.2, gain: 0.2 });
      tone(c, o, { freq: f * 2, type: 'sine', start: i * 0.09, dur: i === 3 ? 0.7 : 0.2, gain: 0.06 });
    });
  },
  wrong: (c, o) => {
    tone(c, o, { freq: 190, freqEnd: 75, type: 'sawtooth', dur: 0.75, gain: 0.26, filter: 700, release: 0.2 });
    tone(c, o, { freq: 95, freqEnd: 60, type: 'square', dur: 0.75, gain: 0.12, filter: 400, release: 0.2 });
  },
  lifeLost: (c, o) => tone(c, o, { freq: 700, freqEnd: 180, type: 'sine', dur: 0.45, gain: 0.2, release: 0.15 }),
  eliminated: (c, o) => {
    [N.G4, N.F4, N.E4, N.C4].forEach((f, i) =>
      tone(c, o, { freq: f, freqEnd: f * 0.96, type: 'sawtooth', start: i * 0.28, dur: i === 3 ? 0.9 : 0.26, gain: 0.16, filter: 900, vibrato: { rate: 6, depth: 6 } })
    );
  },
  stage: (c, o) => {
    noise(c, o, { dur: 0.3, gain: 0.08, f0: 400, f1: 2800 });
    chord(c, o, [N.C4, N.G4, N.C5, N.E5], 0.2, 0.9, 0.07);
    [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: 0.2 + i * 0.1, dur: 0.3, gain: 0.16 }));
  },
  winner: (c, o) => {
    noise(c, o, { dur: 0.6, gain: 0.1, f0: 200, f1: 3000 });
    [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: 0.3 + i * 0.11, dur: 0.3, gain: 0.18 }));
    chord(c, o, [N.C5, N.E5, N.G5, N.C6], 1.05, 1.8, 0.08);
    tone(c, o, { freq: N.C6, type: 'sine', start: 1.05, dur: 1.8, gain: 0.14 });
    [N.G6, N.E6, N.G6, N.C6].forEach((f, i) => tone(c, o, { freq: f * 2 > 3000 ? f : f * 2, type: 'sine', start: 1.3 + i * 0.16, dur: 0.25, gain: 0.05 }));
  },
};

export async function playSound(name) {
  const c = getCtx();
  if (!c || c.state !== 'running') return false;
  const url = await findCustom(name);
  if (url) {
    try {
      const a = new Audio(url);
      a.volume = volume;
      await a.play();
      return true;
    } catch (e) {
      /* spadamy na dzwiek syntezowany */
    }
  }
  const recipe = RECIPES[name];
  if (!recipe) return false;
  try {
    recipe(c, master);
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- Ustawienia (zapamietane per widok) ----------
export const loadSoundSettings = (role, defaults) => {
  try {
    const raw = localStorage.getItem(`quizSound:${role}`);
    return { ...defaults, ...(raw ? JSON.parse(raw) : {}) };
  } catch (e) {
    return { ...defaults };
  }
};

export const saveSoundSettings = (role, settings) => {
  try {
    localStorage.setItem(`quizSound:${role}`, JSON.stringify(settings));
  } catch (e) {
    /* ignorujemy */
  }
};

// ---------- Udostepnione narzedzia dla innych zestawow dzwiekow (np. Familiada) ----------
export const audioEngine = { getCtx, getMaster: () => master, getVolume: () => volume, tone, noise, chord };
