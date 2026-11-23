'use strict';
// Silnik teleturnieju "1 z 10" (format "Fifteen to One").
//
// Zasady odtworzone na podstawie opisu formatu:
//  - 10 graczy (stanowiska 1-10), kazdy ma 3 szanse. Szanse traci sie za zla odpowiedz lub brak odpowiedzi w czasie.
//  - Etap I:  dwie kolejki pytan, po jednym pytaniu dla kazdego gracza w kolejnosci numerow. Dobra odpowiedz ratuje przed
//             utrata szansy. Kto nie odpowie dobrze na zadne z dwoch pytan - odpada. Kto odpowie na jedno - gra dalej z 2 szansami,
//             na oba - z 3 szansami.
//  - Etap II: pierwsze pytanie dostaje gracz z najnizszym numerem. Dobra odpowiedz daje prawo wyznaczania. Zla - utrata
//             szansy i pytanie dostaje nastepny gracz, az ktos odpowie dobrze. Pierwsze wyznaczenie musi byc na przeciwna strone
//             studia (1-5 wskazuja 6-10 i odwrotnie), potem dowolnie. Wskazany: dobra odpowiedz = przejmuje prawo wyznaczania,
//             zla = traci szanse, a wyznaczajacy wskazuje dalej. Etap trwa, az zostanie 3 graczy.
//  - Etap III (final): maks. 40 pytan. Finalisci dostaja 3 nowe szanse i punkty = 10 za kazda szanse zachowana po etapie II.
//             Pytania dla wszystkich - zgloszenie przyciskiem, odpowiada najszybszy: dobra +10 pkt, zla = utrata szansy,
//             brak zgloszen = nikt nie traci. Kto pierwszy zdobedzie 3 dobre odpowiedzi, dostaje prawo wyznaczania.
//             Wskazany: dobra +10 pkt (wskazal siebie: +20), zla = utrata szansy. Gdy wskazany odpowie zle, gracze zglaszaja sie
//             do pytan, a prawo wyznaczania dostaje ten, kto pierwszy odpowie dobrze. Gdy zostaje 1 gracz z szansami - wygrywa;
//             po 40 pytaniach kazda zachowana szansa daje 10 pkt, wygrywa najwiecej punktow.
//  Zalozenie (opis nie rozstrzyga wprost): w etapie III po dobrej odpowiedzi wskazanego prawo wyznaczania przechodzi na niego,
//  tak samo jak w etapie II.

const { v4: uuidv4 } = require('uuid');

const FORMAT_ID = 'jeden-z-dziesieciu';
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 2;
const START_LIVES = 3;
const FINALISTS = 3;
const FINAL_MAX_QUESTIONS = 40;
const LOG_LIMIT = 40;

const DEFAULT_CONFIG = {
  answerSeconds: 15,     // czas na odpowiedz
  buzzSeconds: 12,       // czas na zgloszenie sie w finale
  designateSeconds: 30,  // czas na wskazanie gracza (potem losowo)
  autoAdvanceSeconds: 0, // automatyczne przejscie dalej po pokazaniu wyniku (0 = recznie)
  botSpeed: 1,           // mnoznik tempa botow (1 = normalnie, 0.2 = bardzo szybko)
  botAccuracy: 0.5,      // skutecznosc botow (tryb testowy) - 0.5 daje partie zblizona do prawdziwego programu
};

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Ocena odpowiedzi otwartych ----------
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

// Zwraca 'correct' | 'wrong' (podpowiedz dla prowadzacego / ocena automatyczna)
function matchOpen(question, value) {
  const given = normalize(value);
  if (!given) return 'wrong';
  const accepted = [question.poprawna_odpowiedz, ...(question.alt || [])].map(normalize).filter(Boolean);
  for (const ans of accepted) {
    if (given === ans) return 'correct';
    if (ans.length >= 5 && levenshtein(given, ans) <= 1) return 'correct';
  }
  return 'wrong';
}

// ---------- Tworzenie gry ----------
function createGame({ code, test, config, pool, source }) {
  const now = Date.now();
  const order = shuffle(pool.map((_, i) => i));
  return {
    code,
    format: FORMAT_ID,
    test: !!test,
    source,
    createdAt: now,
    version: 1,
    status: 'lobby', // lobby | running | finished
    config: { ...DEFAULT_CONFIG, ...(config || {}) },
    players: [],
    stage: 0,
    s1: null,
    s2: null,
    s3: null,
    pool,
    poolOrder: order,
    poolPos: 0,
    recycled: false,
    questionsAsked: 0,
    current: null,
    awaiting: null,
    log: [],
    result: null,
  };
}

const byId = (game, id) => game.players.find((p) => p.id === id);
const bySeat = (game) => [...game.players].sort((a, b) => a.seat - b.seat);
const alive = (game) => bySeat(game).filter((p) => !p.eliminated);

function addLog(game, text, kind) {
  game.log.push({ t: Date.now(), text, kind: kind || 'info' });
  if (game.log.length > LOG_LIMIT) game.log.splice(0, game.log.length - LOG_LIMIT);
}

function addPlayer(game, { name, isBot }) {
  if (game.status !== 'lobby') throw new Error('Gra już trwa - nie można dołączyć');
  if (game.players.length >= MAX_PLAYERS) throw new Error('Komplet graczy (10)');
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) throw new Error('Podaj imię');
  if (game.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Gracz o takim imieniu już jest w grze');
  }
  const used = new Set(game.players.map((p) => p.seat));
  let seat = 1;
  while (used.has(seat)) seat++;
  const player = {
    id: uuidv4(),
    token: uuidv4(),
    name: clean,
    seat,
    isBot: !!isBot,
    lives: START_LIVES,
    points: 0,
    eliminated: false,
    s1correct: 0,
    correct3: 0,
    joinedAt: Date.now(),
  };
  game.players.push(player);
  addLog(game, `${player.name} dołączył(a) do gry (stanowisko ${seat})`);
  return player;
}

function removePlayer(game, playerId) {
  if (game.status !== 'lobby') throw new Error('Gracza można usunąć tylko przed startem');
  const idx = game.players.findIndex((p) => p.id === playerId);
  if (idx === -1) throw new Error('Nie znaleziono gracza');
  const [p] = game.players.splice(idx, 1);
  addLog(game, `${p.name} opuścił(a) grę`);
}

// ---------- Pytania ----------
function drawQuestion(game) {
  if (!game.pool.length) throw new Error('Brak pytań do gry');
  if (game.poolPos >= game.poolOrder.length) {
    game.poolOrder = shuffle(game.pool.map((_, i) => i));
    game.poolPos = 0;
    game.recycled = true;
    addLog(game, 'Pula pytań się skończyła - pytania zaczynają się powtarzać', 'warn');
  }
  return game.pool[game.poolOrder[game.poolPos++]];
}

function publicQuestion(q) {
  const out = { id: q.id, typ: q.typ, pytanie: q.pytanie, media: q.media || null, link: q.link || null };
  if (q.typ === 'abcd') out.options = { a: q.odp_a, b: q.odp_b, c: q.odp_c, d: q.odp_d };
  return out;
}

function correctText(q) {
  if (q.typ === 'abcd') {
    const l = q.poprawna_odpowiedz;
    return `${l.toUpperCase()}: ${q[`odp_${l}`]}`;
  }
  return q.poprawna_odpowiedz;
}

// ---------- Boty (tryb testowy) ----------
function planBots(game, now) {
  const c = game.current;
  if (!c) return;
  const acc = game.config.botAccuracy;
  const sp = game.config.botSpeed || 1;
  c.botPlan = null;
  if (c.kind === 'single') {
    const t = byId(game, c.targetId);
    if (t && t.isBot) c.botPlan = { answerAt: now + rand(2500, 6500) * sp, correct: Math.random() < acc };
  } else {
    const plans = [];
    for (const p of alive(game)) {
      if (!p.isBot) continue;
      const knows = Math.random() < acc * 0.9;
      if (knows) plans.push({ playerId: p.id, at: now + rand(1500, 8000) * sp, correct: true });
      else if (Math.random() < 0.15) plans.push({ playerId: p.id, at: now + rand(3000, 9000) * sp, correct: false });
    }
    c.botPlan = { buzz: plans, answerAt: null, correct: null };
  }
}

function botAnswerValue(q, correct) {
  if (q.typ === 'abcd') {
    if (correct) return q.poprawna_odpowiedz;
    return pick(['a', 'b', 'c', 'd'].filter((l) => l !== q.poprawna_odpowiedz));
  }
  return correct ? q.poprawna_odpowiedz : 'nie wiem';
}

// ---------- Przebieg pytania ----------
function startQuestion(game, kind, targetId, role, now) {
  const q = drawQuestion(game);
  game.questionsAsked++;
  const cfg = game.config;
  game.current = {
    n: game.questionsAsked,
    kind, // 'single' | 'buzz'
    role: role || null, // 'seek' | 'designated' | null
    designatedBy: null,
    q,
    targetId: targetId || null,
    status: 'asking', // asking | answering | judging | revealed
    startedAt: now,
    deadline: now + (kind === 'single' ? cfg.answerSeconds : cfg.buzzSeconds) * 1000,
    buzzer: null,
    answer: null,
    suggestion: null,
    result: null, // { correct: true|false|null, playerId }
    advanceAt: null,
    botPlan: null,
  };
  game.awaiting = null;
  planBots(game, now);
}

function replaceQuestion(game, now) {
  assertNotPaused(game);
  const c = game.current;
  if (!c || (c.status !== 'asking' && c.status !== 'answering' && c.status !== 'judging')) {
    throw new Error('Pytania nie można teraz pominąć');
  }
  const kind = c.kind;
  const targetId = c.targetId;
  const role = c.role;
  const designatedBy = c.designatedBy;
  game.questionsAsked--; // pominiete pytanie nie liczy sie do limitu
  startQuestion(game, kind, targetId, role, now);
  game.current.designatedBy = designatedBy;
  addLog(game, 'Prowadzący pominął pytanie - nowe pytanie', 'warn');
}

function lose(game, p, reason) {
  p.lives -= 1;
  if (p.lives <= 0) {
    p.lives = 0;
    if (game.stage !== 1) p.eliminated = true;
    addLog(game, `${p.name} traci ostatnią szansę i odpada${reason ? ` (${reason})` : ''}`, 'bad');
  } else {
    addLog(game, `${p.name} traci szansę (${p.lives} ${p.lives === 1 ? 'została' : 'zostały'})${reason ? ` - ${reason}` : ''}`, 'bad');
  }
}

function designationTargets(game, byIdValue) {
  const holder = byId(game, byIdValue);
  const al = alive(game);
  if (game.stage === 3) return al.map((p) => p.id); // w finale mozna wskazac tez siebie
  let list = al.filter((p) => p.id !== byIdValue);
  if (game.s2 && !game.s2.firstDone && holder) {
    const opposite = list.filter((p) => (holder.seat <= 5 ? p.seat >= 6 : p.seat <= 5));
    if (opposite.length) list = opposite;
  }
  return list.map((p) => p.id);
}

function reveal(game, correct, now) {
  const c = game.current;
  const answerer = c.kind === 'single' ? byId(game, c.targetId) : c.buzzer ? byId(game, c.buzzer.playerId) : null;
  c.status = 'revealed';
  c.result = { correct, playerId: answerer ? answerer.id : null };
  c.advanceAt = game.config.autoAdvanceSeconds > 0 ? now + game.config.autoAdvanceSeconds * 1000 : null;

  const reason = c.answer ? 'zła odpowiedź' : 'brak odpowiedzi';

  if (game.stage === 1) {
    if (correct) {
      answerer.s1correct += 1;
      addLog(game, `${answerer.name}: dobra odpowiedź`, 'good');
    } else {
      lose(game, answerer, reason);
    }
  } else if (game.stage === 2) {
    const s2 = game.s2;
    if (correct) {
      s2.holderId = answerer.id;
      addLog(game, `${answerer.name}: dobra odpowiedź - ma prawo wyznaczania`, 'good');
    } else {
      lose(game, answerer, reason);
      if (c.role === 'seek') s2.seekFrom = answerer.seat;
    }
  } else if (game.stage === 3) {
    const s3 = game.s3;
    if (c.kind === 'buzz') {
      if (!answerer) {
        addLog(game, 'Nikt się nie zgłosił - nikt nie traci szansy');
      } else if (correct) {
        answerer.points += 10;
        answerer.correct3 += 1;
        addLog(game, `${answerer.name}: dobra odpowiedź (+10 pkt)`, 'good');
        if (s3.seekRight) {
          s3.holderId = answerer.id;
          s3.mode = 'designate';
          s3.seekRight = false;
          s3.rightEstablished = true;
          addLog(game, `${answerer.name} odzyskuje prawo wyznaczania`, 'good');
        } else if (!s3.rightEstablished && answerer.correct3 >= 3) {
          s3.holderId = answerer.id;
          s3.mode = 'designate';
          s3.rightEstablished = true;
          addLog(game, `${answerer.name} zdobywa 3 dobre odpowiedzi - prawo wyznaczania`, 'good');
        }
      } else {
        lose(game, answerer, reason);
      }
    } else {
      // pytanie dla wskazanego gracza
      if (correct) {
        const self = c.designatedBy === answerer.id;
        const gain = self ? 20 : 10;
        answerer.points += gain;
        s3.holderId = answerer.id;
        addLog(game, `${answerer.name}: dobra odpowiedź (+${gain} pkt)${self ? ' - wskazał(a) siebie' : ''}`, 'good');
      } else {
        lose(game, answerer, reason);
        s3.mode = 'buzz';
        s3.seekRight = true;
        s3.holderId = null;
        addLog(game, 'Gracze zgłaszają się - prawo wyznaczania dostanie ten, kto pierwszy odpowie dobrze');
      }
    }
  }
}

// ---------- Akcje graczy i prowadzacego ----------
function assertNotPaused(game) {
  if (game.paused) throw new Error('Gra jest wstrzymana przez prowadzącego');
}

function submitAnswer(game, playerId, value, now) {
  assertNotPaused(game);
  const c = game.current;
  if (game.status !== 'running' || !c) throw new Error('Brak aktywnego pytania');
  if (c.kind === 'single') {
    if (c.status !== 'asking' || c.targetId !== playerId) throw new Error('To pytanie nie jest teraz do Ciebie');
  } else if (c.status !== 'answering' || !c.buzzer || c.buzzer.playerId !== playerId) {
    throw new Error('Najpierw zgłoś się przyciskiem');
  }

  const q = c.q;
  if (q.typ === 'abcd') {
    const letter = String(value || '').toLowerCase();
    if (!['a', 'b', 'c', 'd'].includes(letter)) throw new Error('Wybierz odpowiedź A, B, C lub D');
    c.answer = { playerId, value: letter, at: now };
    reveal(game, letter === q.poprawna_odpowiedz, now);
    return;
  }

  const voice = value === '__voice__';
  const text = voice ? '' : String(value || '').trim().slice(0, 200);
  if (!voice && !text) throw new Error('Wpisz odpowiedź albo wybierz „Odpowiadam głosem”');
  c.answer = { playerId, value: voice ? null : text, voice, at: now };
  c.suggestion = voice ? null : matchOpen(q, text);
  // Pytania otwarte ocenia ZAWSZE prowadzacy i nie ma na to limitu czasu (system tylko podpowiada)
  c.status = 'judging';
  c.deadline = null;
}

function buzz(game, playerId, now) {
  assertNotPaused(game);
  const c = game.current;
  if (game.status !== 'running' || !c || c.kind !== 'buzz' || c.status !== 'asking') throw new Error('Nie można się teraz zgłosić');
  const p = byId(game, playerId);
  if (!p || p.eliminated) throw new Error('Nie bierzesz udziału w tym pytaniu');
  if (now > c.deadline) throw new Error('Czas na zgłoszenie minął');
  c.buzzer = { playerId, at: now };
  c.status = 'answering';
  c.deadline = now + game.config.answerSeconds * 1000;
  addLog(game, `${p.name} zgłasza się do odpowiedzi`);
  // plan bota: czy i kiedy odpowie poprawnie
  if (p.isBot) {
    const plan = (c.botPlan && c.botPlan.buzz.find((b) => b.playerId === playerId)) || { correct: Math.random() < game.config.botAccuracy };
    c.botPlan = { buzz: [], answerAt: now + rand(1500, 3500) * (game.config.botSpeed || 1), correct: plan.correct };
  } else {
    c.botPlan = null;
  }
}

function judge(game, correct, now) {
  const c = game.current;
  if (game.status !== 'running' || !c || c.status !== 'judging') throw new Error('Brak odpowiedzi do oceny');
  reveal(game, !!correct, now);
}

function designate(game, byPlayerId, targetId, now) {
  assertNotPaused(game);
  const a = game.awaiting;
  if (game.status !== 'running' || !a || a.type !== 'designate' || a.byId !== byPlayerId) {
    throw new Error('Nie możesz teraz wskazać gracza');
  }
  if (!a.allowedIds.includes(targetId)) {
    throw new Error(game.stage === 2 && a.first ? 'Pierwsze wyznaczenie musi być na przeciwną stronę studia (1–5 ↔ 6–10)' : 'Tego gracza nie można wskazać');
  }
  const holder = byId(game, byPlayerId);
  const target = byId(game, targetId);
  addLog(game, `${holder.name} wskazuje: ${target.name}${holder.id === target.id ? ' (siebie)' : ''}`);
  if (game.stage === 2) game.s2.firstDone = true;
  if (game.stage === 3) game.s3.qCount += 1;
  startQuestion(game, 'single', targetId, 'designated', now);
  game.current.designatedBy = byPlayerId;
}

// ---------- Etapy ----------
function start(game, now) {
  if (game.status !== 'lobby') throw new Error('Gra już wystartowała');
  if (game.players.length < MIN_PLAYERS) throw new Error(`Do startu potrzeba co najmniej ${MIN_PLAYERS} graczy`);
  game.status = 'running';
  game.startedAt = now;
  game.stage = 1;
  const order = bySeat(game);
  game.s1 = { queue: [] };
  for (let round = 1; round <= 2; round++) order.forEach((p) => game.s1.queue.push({ playerId: p.id, round }));
  addLog(game, 'Start gry! Etap I - dwie kolejki pytań, po jednym pytaniu dla każdego gracza', 'stage');
  advance(game, now);
}

function checkFinish(game, now) {
  const al = alive(game);
  if (al.length <= 1) {
    finish(game, now, al.length === 1 ? 'Został jeden gracz z szansami' : 'Wszyscy odpadli');
    return true;
  }
  return false;
}

// lifeBonus: po rozegraniu wszystkich pytan finalu kazda zachowana szansa daje 10 pkt (gdy wygrywa ostatni gracz z szansami - bez bonusu)
function finish(game, now, reason, lifeBonus) {
  game.status = 'finished';
  game.finishedAt = now;
  game.current = null;
  game.awaiting = null;
  const list = game.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    lives: p.lives,
    points: p.points,
    eliminated: p.eliminated,
    total: p.points + (lifeBonus && game.stage === 3 && !p.eliminated ? p.lives * 10 : 0),
  }));
  let winnerIds = [];
  const al = alive(game);
  if (al.length === 1) winnerIds = [al[0].id];
  else {
    const pool = list.filter((r) => !r.eliminated);
    const candidates = pool.length ? pool : list;
    const max = Math.max(...candidates.map((r) => r.total));
    winnerIds = candidates.filter((r) => r.total === max).map((r) => r.id);
  }
  list.sort((a, b) => (winnerIds.includes(b.id) ? 1 : 0) - (winnerIds.includes(a.id) ? 1 : 0) || b.total - a.total || a.seat - b.seat);
  game.result = { winnerIds, ranking: list, reason };
  const names = winnerIds.map((id) => byId(game, id).name).join(', ');
  addLog(game, winnerIds.length > 1 ? `Remis! Zwycięzcy: ${names}` : `Zwycięzca: ${names}`, 'stage');
}

function endStage1(game, now) {
  for (const p of game.players) {
    if (p.s1correct === 0) {
      p.eliminated = true;
      p.lives = 0;
      addLog(game, `${p.name} nie odpowiedział(a) dobrze na żadne pytanie - odpada`, 'bad');
    } else {
      p.lives = 1 + p.s1correct; // 1 dobra = 2 szanse, 2 dobre = 3 szanse
    }
  }
  const al = alive(game);
  addLog(game, `Koniec etapu I. Dalej gra ${al.length} ${al.length === 1 ? 'osoba' : 'osób'}`, 'stage');
  if (checkFinish(game, now)) return;
  if (al.length <= FINALISTS) {
    addLog(game, `Zostało ${al.length} graczy - od razu finał`);
    startStage3(game, now);
  } else {
    startStage2(game, now);
  }
}

function startStage2(game, now) {
  game.stage = 2;
  game.s2 = { holderId: null, firstDone: false, seekFrom: 0 };
  addLog(game, 'Etap II - wyznaczanie. Gramy, aż zostanie trzech graczy', 'stage');
  advance(game, now);
}

function startStage3(game, now) {
  game.stage = 3;
  for (const p of alive(game)) {
    p.points = p.lives * 10;
    p.lives = START_LIVES;
    p.correct3 = 0;
  }
  game.s3 = { mode: 'buzz', holderId: null, qCount: 0, rightEstablished: false, seekRight: false };
  addLog(game, `Etap III - FINAŁ (maks. ${FINAL_MAX_QUESTIONS} pytań). Finaliści dostają 3 nowe szanse; za szanse zachowane po etapie II mają punkty startowe`, 'stage');
  advance(game, now);
}

// Przejscie do nastepnego kroku (nastepne pytanie / wskazywanie / zmiana etapu)
function advance(game, now) {
  if (game.status !== 'running') return;
  assertNotPaused(game);
  game.current = game.current && game.current.status === 'revealed' ? null : game.current;
  game.awaiting = null;
  if (game.stage === 1) return advanceStage1(game, now);
  if (game.stage === 2) return advanceStage2(game, now);
  if (game.stage === 3) return advanceStage3(game, now);
}

function advanceStage1(game, now) {
  const next = game.s1.queue.shift();
  if (!next) return endStage1(game, now);
  startQuestion(game, 'single', next.playerId, null, now);
  game.current.round = next.round;
}

function nextAliveAfter(game, seat) {
  const al = alive(game);
  return al.find((p) => p.seat > seat) || al[0];
}

function awaitDesignation(game, holderId, now) {
  const first = game.stage === 2 && !game.s2.firstDone;
  const allowedIds = designationTargets(game, holderId);
  const holder = byId(game, holderId);
  game.awaiting = {
    type: 'designate',
    byId: holderId,
    first,
    allowedIds,
    deadline: now + game.config.designateSeconds * 1000,
    botAt: holder.isBot ? now + rand(1500, 3500) * (game.config.botSpeed || 1) : null,
  };
  addLog(game, `${holder.name} wskazuje, kto odpowiada${first ? ' (pierwsze wyznaczenie - przeciwna strona studia)' : ''}`);
}

function advanceStage2(game, now) {
  if (checkFinish(game, now)) return;
  const al = alive(game);
  if (al.length <= FINALISTS) {
    addLog(game, `Etap II zakończony - finaliści: ${al.map((p) => p.name).join(', ')}`, 'stage');
    return startStage3(game, now);
  }
  const s2 = game.s2;
  const holder = s2.holderId ? byId(game, s2.holderId) : null;
  if (holder && !holder.eliminated) return awaitDesignation(game, holder.id, now);
  s2.holderId = null;
  const target = nextAliveAfter(game, s2.seekFrom);
  s2.seekFrom = target.seat;
  startQuestion(game, 'single', target.id, 'seek', now);
}

function advanceStage3(game, now) {
  if (checkFinish(game, now)) return;
  const s3 = game.s3;
  if (s3.qCount >= FINAL_MAX_QUESTIONS) return finish(game, now, `Rozegrano ${FINAL_MAX_QUESTIONS} pytań - liczą się punkty (+10 za każdą zachowaną szansę)`, true);
  const holder = s3.holderId ? byId(game, s3.holderId) : null;
  if (s3.mode === 'designate' && holder && !holder.eliminated) return awaitDesignation(game, holder.id, now);
  s3.mode = 'buzz';
  s3.qCount += 1;
  startQuestion(game, 'buzz', null, null, now);
}

function autoDesignate(game, now) {
  const a = game.awaiting;
  const holder = byId(game, a.byId);
  let target = pick(a.allowedIds);
  if (holder.isBot && game.stage === 3 && a.allowedIds.includes(holder.id) && Math.random() < 0.3) target = holder.id;
  designate(game, a.byId, target, now);
}

// ---------- Pauza ----------
function pause(game, now) {
  if (game.status !== 'running') throw new Error('Pauza jest możliwa tylko w trakcie gry');
  if (game.paused) return;
  game.paused = true;
  game.pausedAt = now;
  addLog(game, '⏸ Prowadzący wstrzymał grę', 'warn');
}

function resume(game, now) {
  if (!game.paused) return;
  const delta = Math.max(0, now - (game.pausedAt || now));
  const shift = (obj, key) => {
    if (obj && typeof obj[key] === 'number') obj[key] += delta;
  };
  const c = game.current;
  if (c) {
    shift(c, 'deadline');
    shift(c, 'advanceAt');
    shift(c, 'startedAt');
    if (c.botPlan) {
      shift(c.botPlan, 'answerAt');
      (c.botPlan.buzz || []).forEach((b) => shift(b, 'at'));
    }
  }
  if (game.awaiting) {
    shift(game.awaiting, 'deadline');
    shift(game.awaiting, 'botAt');
  }
  game.paused = false;
  game.pausedAt = null;
  addLog(game, '▶ Gra wznowiona', 'warn');
}

// ---------- Zegar gry (timeouty i boty) ----------
function tick(game, now) {
  if (game.status !== 'running' || game.paused) return false;
  const c = game.current;
  if (c) {
    if (c.status === 'asking') {
      if (now > c.deadline) {
        if (c.kind === 'single') {
          c.answer = null;
          reveal(game, false, now);
        } else {
          reveal(game, null, now);
        }
        return true;
      }
      if (c.kind === 'single' && c.botPlan && now >= c.botPlan.answerAt) {
        submitAnswer(game, c.targetId, botAnswerValue(c.q, c.botPlan.correct), now);
        return true;
      }
      if (c.kind === 'buzz' && c.botPlan) {
        const due = c.botPlan.buzz.filter((b) => now >= b.at).sort((a, b) => a.at - b.at)[0];
        if (due) {
          buzz(game, due.playerId, now);
          return true;
        }
      }
    } else if (c.status === 'answering') {
      if (now > c.deadline) {
        c.answer = null;
        reveal(game, false, now);
        return true;
      }
      if (c.botPlan && c.botPlan.answerAt && now >= c.botPlan.answerAt) {
        submitAnswer(game, c.buzzer.playerId, botAnswerValue(c.q, c.botPlan.correct), now);
        return true;
      }
    } else if (c.status === 'revealed') {
      if (c.advanceAt && now >= c.advanceAt) {
        advance(game, now);
        return true;
      }
    }
  }
  if (game.awaiting) {
    const a = game.awaiting;
    if ((a.botAt && now >= a.botAt) || now > a.deadline) {
      autoDesignate(game, now);
      return true;
    }
  }
  return false;
}

// ---------- Widoki dla klientow ----------
function playerView(game, p) {
  const c = game.current;
  const awaiting = game.awaiting;
  return {
    id: p.id,
    seat: p.seat,
    name: p.name,
    lives: p.lives,
    points: p.points,
    eliminated: p.eliminated,
    isBot: p.isBot,
    hasPhoto: !!p.photoV,
    photoV: p.photoV || 0,
    isHolder:
      (game.stage === 2 && game.s2 && game.s2.holderId === p.id) || (game.stage === 3 && game.s3 && game.s3.holderId === p.id),
    isTarget: !!(c && c.kind === 'single' && c.targetId === p.id && c.status !== 'revealed'),
    isBuzzer: !!(c && c.buzzer && c.buzzer.playerId === p.id && c.status !== 'revealed'),
    isDesignating: !!(awaiting && awaiting.byId === p.id),
  };
}

const STAGE_LABELS = { 0: 'Poczekalnia', 1: 'Etap I', 2: 'Etap II', 3: 'Etap III - finał' };

// role: 'tv' | 'player' | 'host'
function viewFor(game, role, player, now) {
  const c = game.current;
  const isHost = role === 'host';
  const revealed = !!c && c.status === 'revealed';
  const showSecrets = isHost || revealed;

  let current = null;
  if (c) {
    current = {
      n: c.n,
      kind: c.kind,
      role: c.role,
      round: c.round || null,
      status: c.status,
      question: publicQuestion(c.q),
      targetId: c.targetId,
      designatedBy: c.designatedBy,
      buzzerId: c.buzzer ? c.buzzer.playerId : null,
      deadline: c.deadline,
      result: c.result,
      // wybrana odpowiedz jest widoczna dla prowadzacego od razu, dla pozostalych dopiero po ujawnieniu wyniku
      answer: c.answer
        ? { playerId: c.answer.playerId, voice: !!c.answer.voice, value: showSecrets ? c.answer.value : null, given: true }
        : null,
      advanceAt: c.advanceAt,
    };
    if (showSecrets) {
      current.correct = { text: correctText(c.q), letter: c.q.typ === 'abcd' ? c.q.poprawna_odpowiedz : null };
    }
    if (isHost) current.suggestion = c.suggestion;
  }

  const view = {
    code: game.code,
    format: game.format,
    formatLabel: '1 z 10',
    test: game.test,
    version: game.version,
    status: game.status,
    paused: !!game.paused,
    pausedAt: game.paused ? game.pausedAt : null,
    stage: game.stage,
    stageLabel: STAGE_LABELS[game.stage] || '',
    config: game.config,
    now,
    players: bySeat(game).map((p) => playerView(game, p)),
    current,
    awaiting: game.awaiting
      ? { type: game.awaiting.type, byId: game.awaiting.byId, first: game.awaiting.first, allowedIds: game.awaiting.allowedIds, deadline: game.awaiting.deadline }
      : null,
    log: game.log.slice(-14),
    result: game.result,
    finalQuestions: game.stage === 3 && game.s3 ? { asked: game.s3.qCount, max: FINAL_MAX_QUESTIONS } : null,
    questionsAsked: game.questionsAsked,
    recycled: game.recycled,
  };
  if (role === 'player' && player) view.you = playerView(game, player);
  if (isHost) {
    view.poolSize = game.pool.length;
    view.poolRemaining = Math.max(game.pool.length - game.poolPos, 0);
  }
  return view;
}

module.exports = {
  FORMAT_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  DEFAULT_CONFIG,
  createGame,
  addPlayer,
  removePlayer,
  start,
  submitAnswer,
  buzz,
  judge,
  designate,
  advance,
  replaceQuestion,
  pause,
  resume,
  tick,
  viewFor,
  byId,
  alive,
  matchOpen,
  finish,
};
