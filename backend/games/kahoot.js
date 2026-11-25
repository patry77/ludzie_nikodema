'use strict';
// Tryb "Kahoot": wszyscy odpowiadaja na KAZDE pytanie jednoczesnie z telefonow (tylko pytania ABCD).
// Punkty: poprawna odpowiedz = do 1000 pkt, im szybciej tym wiecej (najwolniejsza w limicie = 500).
// Seria (streak): kolejne poprawne odpowiedzi dodaja bonus 100 pkt za kazda ponad pierwsza (max +500).
// Po kazdym pytaniu: wyniki rundy (punkty, najszybszy, serie) i ranking. Prowadzacy tylko przechodzi dalej lub pauzuje.
const { v4: uuidv4 } = require('uuid');

const FORMAT_ID = 'kahoot';
const MAX_PLAYERS = 20;
const MIN_PLAYERS = 1;
const MAX_POINTS = 1000;
const STREAK_STEP = 100;
const STREAK_MAX_STEPS = 5;

const DEFAULT_CONFIG = {
  questionSeconds: 20, // czas na odpowiedz
  totalQuestions: 10, // ile pytan w grze
  botAccuracy: 0.65,
  botSpeed: 1,
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const LETTERS = ['a', 'b', 'c', 'd'];

function createGame({ code, test, config, pool, source, insideIncluded }) {
  const abcd = (pool || []).filter((q) => q.typ === 'abcd');
  const now = Date.now();
  return {
    code,
    format: FORMAT_ID,
    test: !!test,
    source,
    insideIncluded: insideIncluded === undefined ? null : insideIncluded,
    createdAt: now,
    version: 1,
    status: 'lobby', // lobby | running | finished
    config: { ...DEFAULT_CONFIG, ...(config || {}) },
    players: [],
    pool: abcd,
    poolOrder: shuffle(abcd.map((_, i) => i)),
    poolPos: 0,
    questionsAsked: 0,
    current: null,
    result: null,
  };
}

const byId = (game, id) => game.players.find((p) => p.id === id);

function addPlayer(game, { name, isBot }) {
  if (game.status !== 'lobby') throw new Error('Gra już trwa - nie można dołączyć');
  if (game.players.length >= MAX_PLAYERS) throw new Error(`Komplet graczy (${MAX_PLAYERS})`);
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
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    fastestCount: 0,
    correctMsTotal: 0,
    lastRank: 0,
    joinedAt: Date.now(),
  };
  game.players.push(player);
  return player;
}

function removePlayer(game, playerId) {
  if (game.status !== 'lobby') throw new Error('Gracza można usunąć tylko w poczekalni');
  const i = game.players.findIndex((p) => p.id === playerId);
  if (i < 0) throw new Error('Nie znaleziono gracza');
  game.players.splice(i, 1);
}

function drawQuestion(game) {
  if (!game.pool.length) throw new Error('Brak pytań do gry');
  if (game.poolPos >= game.poolOrder.length) {
    game.poolOrder = shuffle(game.pool.map((_, i) => i));
    game.poolPos = 0;
  }
  return game.pool[game.poolOrder[game.poolPos++]];
}

function publicQuestion(q) {
  return {
    id: q.id,
    typ: 'abcd',
    pytanie: q.pytanie,
    media: q.media || null,
    link: q.link || null,
    start: q.start || 0,
    end: q.end || 0,
    options: { a: q.odp_a, b: q.odp_b, c: q.odp_c, d: q.odp_d },
  };
}

function startQuestion(game, now) {
  const q = drawQuestion(game);
  game.questionsAsked++;
  const total = game.config.questionSeconds * 1000;
  const botPlan = {};
  for (const p of game.players) {
    if (!p.isBot) continue;
    const correct = Math.random() < game.config.botAccuracy;
    const letter = correct ? q.poprawna_odpowiedz : pick(LETTERS.filter((l) => l !== q.poprawna_odpowiedz));
    botPlan[p.id] = { at: now + rand(1500, Math.max(2500, total * 0.85)) * (game.config.botSpeed || 1), letter };
  }
  game.current = {
    n: game.questionsAsked,
    q,
    status: 'question', // question | results
    startedAt: now,
    deadline: now + total,
    answers: {}, // playerId -> { letter, at }
    botPlan,
    results: null,
  };
}

function start(game, now) {
  if (game.status !== 'lobby') throw new Error('Gra już wystartowała');
  if (game.players.length < MIN_PLAYERS) throw new Error('Potrzeba co najmniej jednego gracza');
  if (!game.pool.length) throw new Error('Brak pytań ABCD w puli');
  game.status = 'running';
  game.startedAt = now;
  startQuestion(game, now);
}

function rankOf(game) {
  return [...game.players].sort((a, b) => b.score - a.score || b.bestStreak - a.bestStreak || a.joinedAt - b.joinedAt);
}

function finishRound(game, now) {
  const c = game.current;
  if (!c || c.status !== 'question') return;
  const total = game.config.questionSeconds * 1000;
  const correctLetter = c.q.poprawna_odpowiedz;
  const before = rankOf(game);
  const prevRank = {};
  before.forEach((p, i) => {
    prevRank[p.id] = i + 1;
  });

  const rows = [];
  const distribution = { a: 0, b: 0, c: 0, d: 0 };
  let fastest = null;
  for (const p of game.players) {
    const a = c.answers[p.id];
    if (a) distribution[a.letter]++;
    const ms = a ? Math.max(0, Math.min(total, a.at - c.startedAt)) : null;
    const correct = !!a && a.letter === correctLetter;
    let base = 0;
    let bonus = 0;
    if (correct) {
      base = Math.round(MAX_POINTS * (1 - ms / total / 2));
      p.streak += 1;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      bonus = p.streak >= 2 ? STREAK_STEP * Math.min(p.streak - 1, STREAK_MAX_STEPS) : 0;
      p.correctCount += 1;
      p.correctMsTotal += ms;
      if (!fastest || ms < fastest.ms) fastest = { playerId: p.id, ms };
    } else {
      p.streak = 0;
    }
    p.score += base + bonus;
    rows.push({ playerId: p.id, letter: a ? a.letter : null, correct, ms, base, bonus, points: base + bonus, streak: p.streak });
  }
  if (fastest) {
    const fp = byId(game, fastest.playerId);
    if (fp) fp.fastestCount += 1;
  }
  const after = rankOf(game);
  after.forEach((p, i) => {
    const row = rows.find((r) => r.playerId === p.id);
    row.rank = i + 1;
    // po pierwszym pytaniu nie ma jeszcze "poprzedniego" rankingu - nie pokazujemy awansow/spadkow
    row.prevRank = game.questionsAsked === 1 ? i + 1 : prevRank[p.id] || i + 1;
    row.score = p.score;
    p.lastRank = i + 1;
  });
  rows.sort((a, b) => a.rank - b.rank);
  c.status = 'results';
  c.finishedAt = now;
  c.results = { correct: correctLetter, distribution, rows, fastest, last: game.questionsAsked >= game.config.totalQuestions };
}

function submitAnswer(game, playerId, value, now) {
  if (game.paused) throw new Error('Gra jest wstrzymana przez prowadzącego');
  const c = game.current;
  if (game.status !== 'running' || !c || c.status !== 'question') throw new Error('Nie ma teraz pytania do odpowiedzi');
  if (now > c.deadline + 400) throw new Error('Czas na odpowiedź minął');
  const p = byId(game, playerId);
  if (!p) throw new Error('Nie znaleziono gracza');
  const letter = String(value || '').toLowerCase();
  if (!LETTERS.includes(letter)) throw new Error('Wybierz odpowiedź A, B, C lub D');
  if (c.answers[playerId]) throw new Error('Już odpowiedziałeś na to pytanie');
  c.answers[playerId] = { letter, at: now };
  if (game.players.every((x) => c.answers[x.id])) finishRound(game, now);
}

// Prowadzacy: z pytania (przedwczesne zakonczenie) lub z wynikow rundy -> dalej
function advance(game, now) {
  const c = game.current;
  if (game.status !== 'running' || !c) throw new Error('Brak aktywnego pytania');
  if (c.status === 'question') {
    finishRound(game, now);
    return;
  }
  if (game.questionsAsked >= game.config.totalQuestions) {
    finish(game, now, 'Koniec pytań');
    return;
  }
  startQuestion(game, now);
}

function finish(game, now, reason) {
  game.status = 'finished';
  game.finishedAt = now;
  game.current = game.current && game.current.status === 'question' ? null : game.current;
  const ranking = rankOf(game);
  const top = ranking.length ? ranking[0].score : 0;
  const withCorrect = game.players.filter((p) => p.correctCount > 0);
  const quickest = withCorrect.length ? [...withCorrect].sort((a, b) => a.correctMsTotal / a.correctCount - b.correctMsTotal / b.correctCount)[0] : null;
  const streakKing = game.players.length ? [...game.players].sort((a, b) => b.bestStreak - a.bestStreak)[0] : null;
  game.result = {
    reason: reason || '',
    winnerIds: ranking.filter((p) => p.score === top).map((p) => p.id),
    ranking: ranking.map((p, i) => ({ id: p.id, rank: i + 1, name: p.name, score: p.score, correctCount: p.correctCount, bestStreak: p.bestStreak, fastestCount: p.fastestCount })),
    awards: {
      quickest: quickest ? { id: quickest.id, avgMs: Math.round(quickest.correctMsTotal / quickest.correctCount) } : null,
      streak: streakKing && streakKing.bestStreak >= 2 ? { id: streakKing.id, value: streakKing.bestStreak } : null,
    },
    questions: game.questionsAsked,
  };
}

function pause(game, now) {
  if (game.status !== 'running') throw new Error('Pauza jest możliwa tylko w trakcie gry');
  if (game.paused) return;
  game.paused = true;
  game.pausedAt = now;
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
    shift(c, 'startedAt');
    shift(c, 'finishedAt');
    // odpowiedzi udzielone przed pauza zachowuja swoj czas reakcji
    Object.values(c.answers || {}).forEach((a) => shift(a, 'at'));
    Object.values(c.botPlan || {}).forEach((b) => shift(b, 'at'));
  }
  game.paused = false;
  game.pausedAt = null;
}

// Zegar: boty odpowiadaja, po uplywie czasu runda sie konczy
function tick(game, now) {
  if (game.status !== 'running' || game.paused) return false;
  const c = game.current;
  if (!c || c.status !== 'question') return false;
  let changed = false;
  for (const [pid, plan] of Object.entries(c.botPlan || {})) {
    if (!c.answers[pid] && now >= plan.at && now <= c.deadline) {
      c.answers[pid] = { letter: plan.letter, at: Math.min(plan.at, c.deadline) };
      changed = true;
    }
  }
  if (game.players.every((x) => c.answers[x.id]) || now > c.deadline) {
    finishRound(game, now);
    return true;
  }
  return changed;
}

// ---------- Widoki ----------
function playerView(game, p, rankMap) {
  const c = game.current;
  return {
    id: p.id,
    seat: p.seat,
    name: p.name,
    isBot: p.isBot,
    hasPhoto: !!p.photoV,
    photoV: p.photoV || 0,
    score: p.score,
    streak: p.streak,
    bestStreak: p.bestStreak,
    rank: rankMap[p.id] || 0,
    answered: !!(c && c.status === 'question' && c.answers[p.id]),
  };
}

function viewFor(game, role, player, now) {
  const isHost = role === 'host';
  const c = game.current;
  const ranking = rankOf(game);
  const rankMap = {};
  ranking.forEach((p, i) => {
    rankMap[p.id] = i + 1;
  });
  const showResults = !!c && c.status === 'results';

  let current = null;
  if (c) {
    current = {
      n: c.n,
      total: game.config.totalQuestions,
      status: c.status,
      question: publicQuestion(c.q),
      startedAt: c.startedAt,
      deadline: c.status === 'question' ? c.deadline : null,
      answered: Object.keys(c.answers).length,
      players: game.players.length,
      results: showResults ? c.results : null,
    };
    // prowadzacy widzi poprawna odpowiedz od razu; pozostali dopiero w wynikach rundy
    if (isHost) current.correct = c.q.poprawna_odpowiedz;
  }

  const view = {
    code: game.code,
    format: game.format,
    formatLabel: 'Kahoot',
    test: game.test,
    version: game.version,
    status: game.status,
    paused: !!game.paused,
    pausedAt: game.paused ? game.pausedAt : null,
    config: game.config,
    now,
    players: game.players.map((p) => playerView(game, p, rankMap)).sort((a, b) => a.seat - b.seat),
    current,
    result: game.result,
    questionsAsked: game.questionsAsked,
  };
  if (role === 'player' && player) {
    const you = playerView(game, player, rankMap);
    you.answer = c && c.status === 'question' && c.answers[player.id] ? { letter: c.answers[player.id].letter } : null;
    if (showResults) {
      you.myResult = c.results.rows.find((r) => r.playerId === player.id) || null;
    }
    view.you = you;
  }
  if (isHost) {
    view.poolSize = game.pool.length;
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
  advance,
  finish,
  pause,
  resume,
  tick,
  viewFor,
  byId,
};
