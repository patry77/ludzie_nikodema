// Efekty dzwiekowe Familiady - OSOBNY zestaw (nie miesza sie z "1 z 10").
// Dzwieki sa syntezowane (Web Audio, oryginalne). Wlasne nagrania: frontend/public/sounds/familiada/<nazwa>.mp3|ogg|wav.
import { audioEngine, isAudioUnlocked } from '../quiz/sound';

const PUBLIC = process.env.PUBLIC_URL || '';
const EXTENSIONS = ['mp3', 'ogg', 'wav'];

export const FAM_SOUND_LIST = [
  { name: 'intro', label: 'Start gry', hint: 'wesoła czołówka' },
  { name: 'join', label: 'Ktoś dołączył', hint: 'cichy sygnał' },
  { name: 'roundStart', label: 'Nowa runda', hint: 'krótka fanfara i pytanie' },
  { name: 'buzzIn', label: 'Zgłoszenie w pojedynku', hint: 'sygnał przycisku' },
  { name: 'reveal', label: 'Odkrycie odpowiedzi', hint: 'dzwonek i „ding”' },
  { name: 'strike', label: 'Błąd (X)', hint: 'niski buzzer' },
  { name: 'repeat', label: 'Powtórzona odpowiedź', hint: 'podwójny sygnał (finał)' },
  { name: 'decision', label: 'Wygrany pojedynek', hint: 'pytanie: gramy czy oddajemy?' },
  { name: 'consult', label: 'Narada rywali', hint: 'po dwóch błędach' },
  { name: 'steal', label: 'Przejęcie', hint: 'napięcie, jedna szansa' },
  { name: 'roundWin', label: 'Koniec rundy', hint: 'punkty dla drużyny' },
  { name: 'stageWin', label: 'Wejście do finału', hint: 'duża fanfara' },
  { name: 'finalIntro', label: 'Finał – wstęp', hint: 'rytmiczne napięcie' },
  { name: 'finalGo', label: 'Finał – start odliczania', hint: 'sygnał startu' },
  { name: 'tick', label: 'Odliczanie', hint: 'tykanie w ostatnich sekundach' },
  { name: 'timeUp', label: 'Koniec czasu', hint: 'gong' },
  { name: 'finalWin', label: 'Finał wygrany', hint: 'wielka fanfara' },
  { name: 'finalLose', label: 'Finał przegrany', hint: 'smutna końcówka' },
  { name: 'winner', label: 'Koniec gry', hint: 'fanfara zwycięzców' },
];

const custom = new Map();

async function findCustom(name) {
  if (custom.has(name)) return custom.get(name);
  let found = null;
  for (const ext of EXTENSIONS) {
    const url = `${PUBLIC}/sounds/familiada/${name}.${ext}`;
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

export function preloadFamCustom() {
  FAM_SOUND_LIST.forEach((s) => {
    if (!custom.has(s.name)) findCustom(s.name);
  });
}

const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568 };

const RECIPES = {
  intro: (c, o, { tone, chord }) => {
    // wesola, "telewizyjna" czolowka: szybkie arpeggio w gore i akord
    [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6].forEach((f, i) => tone(c, o, { freq: f, type: 'square', start: i * 0.11, dur: 0.16, gain: 0.07, filter: 3200 }));
    chord(c, o, [N.C5, N.E5, N.G5, N.C6], 0.85, 1.3, 0.07, 'sawtooth', 2600);
    tone(c, o, { freq: N.C6, type: 'triangle', start: 0.85, dur: 1.3, gain: 0.13 });
  },
  join: (c, o, { tone }) => tone(c, o, { freq: 660, freqEnd: 990, type: 'triangle', dur: 0.14, gain: 0.14 }),
  roundStart: (c, o, { tone, noise }) => {
    noise(c, o, { dur: 0.25, gain: 0.07, f0: 500, f1: 3500 });
    [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => tone(c, o, { freq: f, type: 'square', start: 0.15 + i * 0.09, dur: 0.14, gain: 0.07, filter: 3000 }));
    tone(c, o, { freq: N.C6, type: 'triangle', start: 0.55, dur: 0.5, gain: 0.14 });
  },
  buzzIn: (c, o, { tone }) => {
    tone(c, o, { freq: 700, type: 'square', dur: 0.1, gain: 0.12, filter: 3000, release: 0.02 });
    tone(c, o, { freq: 1050, type: 'square', start: 0.11, dur: 0.22, gain: 0.12, filter: 3000, release: 0.05 });
  },
  reveal: (c, o, { tone }) => {
    // elektroniczny "ding" odkrywanej odpowiedzi
    tone(c, o, { freq: 1568, type: 'sine', dur: 0.9, gain: 0.2, attack: 0.003, release: 0.7 });
    tone(c, o, { freq: 3136, type: 'sine', dur: 0.5, gain: 0.07, attack: 0.003, release: 0.4 });
    tone(c, o, { freq: 784, type: 'triangle', dur: 0.3, gain: 0.1, release: 0.2 });
    tone(c, o, { freq: 1175, type: 'square', start: 0.0, dur: 0.07, gain: 0.05, filter: 2500, release: 0.03 });
  },
  strike: (c, o, { tone }) => {
    // klasyczne "bzzzt" przy bledzie
    tone(c, o, { freq: 130, freqEnd: 110, type: 'sawtooth', dur: 0.95, gain: 0.26, filter: 650, release: 0.25 });
    tone(c, o, { freq: 65, type: 'square', dur: 0.95, gain: 0.14, filter: 300, release: 0.25 });
    tone(c, o, { freq: 196, type: 'sawtooth', dur: 0.95, gain: 0.08, filter: 800, release: 0.25, vibrato: { rate: 24, depth: 6 } });
  },
  repeat: (c, o, { tone }) => {
    tone(c, o, { freq: 330, type: 'square', dur: 0.18, gain: 0.14, filter: 1200, release: 0.04 });
    tone(c, o, { freq: 330, type: 'square', start: 0.26, dur: 0.3, gain: 0.14, filter: 1200, release: 0.06 });
  },
  decision: (c, o, { tone }) => {
    [N.E5, N.G5, N.C6].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: i * 0.1, dur: 0.3, gain: 0.16 }));
    tone(c, o, { freq: N.G5, type: 'sine', start: 0.5, dur: 0.5, gain: 0.1 });
  },
  consult: (c, o, { tone }) => {
    [N.A4, N.E5, N.A4].forEach((f, i) => tone(c, o, { freq: f, type: 'sine', start: i * 0.22, dur: 0.3, gain: 0.14, vibrato: { rate: 5, depth: 4 } }));
  },
  steal: (c, o, { tone, noise }) => {
    noise(c, o, { dur: 0.8, gain: 0.06, f0: 300, f1: 2000, q: 2 });
    [N.C5, N.C5, N.C5, N.G5].forEach((f, i) => tone(c, o, { freq: f, type: 'square', start: i * 0.14, dur: i === 3 ? 0.5 : 0.1, gain: 0.08, filter: 2500 }));
  },
  roundWin: (c, o, { tone, chord }) => {
    [N.C5, N.E5, N.G5, N.E5, N.G5, N.C6].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: i * 0.08, dur: 0.14, gain: 0.15 }));
    chord(c, o, [N.C5, N.G5, N.C6], 0.5, 0.9, 0.06, 'sawtooth', 2400);
    // "liczenie punktow"
    for (let i = 0; i < 8; i++) tone(c, o, { freq: 1200 + i * 90, type: 'sine', start: 0.1 + i * 0.07, dur: 0.05, gain: 0.05, attack: 0.002, release: 0.03 });
  },
  stageWin: (c, o, { tone, chord, noise }) => {
    noise(c, o, { dur: 0.5, gain: 0.09, f0: 300, f1: 3200 });
    [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(c, o, { freq: f, type: 'square', start: 0.2 + i * 0.1, dur: 0.18, gain: 0.07, filter: 3200 }));
    chord(c, o, [N.C5, N.E5, N.G5, N.C6], 0.9, 1.6, 0.08, 'sawtooth', 2600);
    tone(c, o, { freq: N.C6, type: 'triangle', start: 0.9, dur: 1.6, gain: 0.13 });
  },
  finalIntro: (c, o, { tone }) => {
    for (let i = 0; i < 8; i++) tone(c, o, { freq: i % 2 ? 196 : 147, type: 'sawtooth', start: i * 0.18, dur: 0.14, gain: 0.1, filter: 700 });
    [N.C5, N.G5].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: 1.5 + i * 0.15, dur: 0.6, gain: 0.14 }));
  },
  finalGo: (c, o, { tone }) => {
    tone(c, o, { freq: 880, type: 'square', dur: 0.12, gain: 0.1, filter: 3000, release: 0.03 });
    tone(c, o, { freq: 880, type: 'square', start: 0.2, dur: 0.12, gain: 0.1, filter: 3000, release: 0.03 });
    tone(c, o, { freq: 1760, type: 'square', start: 0.4, dur: 0.35, gain: 0.1, filter: 3000, release: 0.1 });
  },
  tick: (c, o, { tone }) => tone(c, o, { freq: 1300, type: 'sine', dur: 0.05, gain: 0.12, attack: 0.002, release: 0.03 }),
  timeUp: (c, o, { tone }) => {
    tone(c, o, { freq: 220, type: 'sine', dur: 1.6, gain: 0.25, attack: 0.005, release: 1.4 });
    tone(c, o, { freq: 440, type: 'sine', dur: 1.2, gain: 0.1, attack: 0.005, release: 1.0 });
    tone(c, o, { freq: 660, type: 'sine', dur: 0.8, gain: 0.05, attack: 0.005, release: 0.6 });
  },
  finalWin: (c, o, { tone, chord, noise }) => {
    noise(c, o, { dur: 0.6, gain: 0.1, f0: 200, f1: 3500 });
    [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6, N.E6, N.G6].forEach((f, i) => tone(c, o, { freq: f, type: 'triangle', start: 0.25 + i * 0.1, dur: 0.22, gain: 0.17 }));
    chord(c, o, [N.C5, N.E5, N.G5, N.C6], 1.1, 2.2, 0.08, 'sawtooth', 2600);
    tone(c, o, { freq: N.C6, type: 'sine', start: 1.1, dur: 2.2, gain: 0.14 });
  },
  finalLose: (c, o, { tone }) => {
    [N.G4, N.E4, N.D4, N.C4].forEach((f, i) => tone(c, o, { freq: f, freqEnd: f * 0.97, type: 'sawtooth', start: i * 0.3, dur: i === 3 ? 1.0 : 0.28, gain: 0.15, filter: 900, vibrato: { rate: 6, depth: 5 } }));
  },
  winner: (c, o, { tone, chord, noise }) => {
    noise(c, o, { dur: 0.6, gain: 0.1, f0: 200, f1: 3000 });
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(c, o, { freq: f, type: 'square', start: 0.2 + i * 0.12, dur: 0.2, gain: 0.07, filter: 3200 }));
    chord(c, o, [N.C5, N.E5, N.G5, N.C6], 0.8, 1.8, 0.08, 'sawtooth', 2600);
    tone(c, o, { freq: N.C6, type: 'triangle', start: 0.8, dur: 1.8, gain: 0.13 });
  },
};

export async function playFamSound(name) {
  const c = audioEngine.getCtx();
  if (!c || c.state !== 'running') return false;
  const url = await findCustom(name);
  if (url) {
    try {
      const a = new Audio(url);
      a.volume = audioEngine.getVolume();
      await a.play();
      return true;
    } catch (e) {
      /* spadamy na dzwiek syntezowany */
    }
  }
  const recipe = RECIPES[name];
  if (!recipe) return false;
  try {
    recipe(c, audioEngine.getMaster(), audioEngine);
    return true;
  } catch (e) {
    return false;
  }
}

export { isAudioUnlocked };
