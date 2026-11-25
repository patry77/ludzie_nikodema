'use strict';
// Tryb "Najslabsze ogniwo". Zasady (wzorowane na znanym teleturnieju):
//  - Gracze odpowiadaja po kolei na pytania (ta sama pula co "1 z 10": ABCD z telefonu, otwarte glosem + ocena prowadzacego).
//  - Kazda poprawna odpowiedz wydluza LANCUCH (20 > 50 > 100 > 200 > 300 > 450 > 600 > 800 > 1000). Bledna zrywa lancuch do zera.
//  - Przed odpowiedzia gracz moze powiedziec "BANK": wartosc lancucha trafia do banku rundy, a lancuch zaczyna sie od nowa.
//  - Runda trwa ograniczony czas (kazda nastepna jest krotsza). Potem wszyscy glosuja, kto byl najslabszym ogniwem.
//    Najwiecej glosow = odpada. Remis rozstrzyga glos najsilniejszego ogniwa (a gdy to nie pomoze - slabsze statystyki).
//  - Gdy zostanie dwoje graczy: POJEDYNEK (po 5 pytan kazdy, potem nagla smierc). Zwyciezca zgarnia caly bank z rund.

const { v4: uuidv4 } = require('uuid');

const FORMAT_ID = 'ogniwo';
const MAX_PLAYERS = 12;
const MIN_PLAYERS = 3;
const LADDER = [20, 50, 100, 200, 300, 450, 600, 800, 1000];

const DEFAULT_CONFIG = {
  roundSeconds: 90, // dlugosc pierwszej rundy
  roundShrink: 10, // o ile sekund krotsza jest kazda kolejna runda
  minRoundSeconds: 40,
  answerSeconds: 15, // czas na odpowiedz ABCD (po jego uplywie = bledna)
  voteSeconds: 40, // czas na glosowanie
  duelQuestions: 5, // pytan na gracza w pojedynku
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
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LETTERS = ['a', 'b', 'c', 'd'];

const norm = (s) => String(s || '').trim();

function createGame({ code, test, config, pool, source, insideIncluded }) {
  // pytania z filmem/muzyka pomijamy - tryb jest szybki, bez odtwarzania
  const usable = (pool || []).filter((q) => (q.typ === 'abcd' || q.typ === 'otwarte') && !q.link);
  return {
    code,
    format: FORMAT_ID,
    test: !!test,
    source,
    insideIncluded: insideIncluded === undefined ? null : insideIncluded,
    createdAt: Date.now(),
    version: 1,
    status: 'lobby', // lobby | running | finished
    phase: null, // round | roundEnd | vote | voteEnd | duel
    config: { ...DEFAULT_CONFIG, ...(config || {}) },
    players: [],
    pool: usable,
    poolOrder: shuffle(usable.map((_, i) => i)),
    poolPos: 0,
    round: 0,
    pot: 0,
    eliminated: [],
    r: null,
    v: null,
    ve: null,
    d: null,
    result: null,
  };
}

const byId = (game, id) => game.players.find((p) => p.id === id);
const actives = (game) => game.players.filter((p) => p.active).sort((a, b) => a.seat - b.seat);

function addPlayer(game, { name, isBot }) {
  if (game.status !== 'lobby') throw new Error('Gra już trwa - nie można dołączyć');
  if (game.players.length >= MAX_PLAYERS) throw new Error(`Komplet graczy (${MAX_PLAYERS})`);
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) throw new Error('Podaj imię');
  if (game.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) throw new Error('Gracz o takim imieniu już jest w grze');
  const used = new Set(game.players.map((p) => p.seat));
  let seat = 1;
  while (used.has(seat)) seat++;
  const player = {
    id: uuidv4(),
    token: uuidv4(),
    name: clean,
    seat,
    isBot: !!isBot,
    skill: isBot ? rand(0.45, 0.95) : 0.7,
    bankAt: 3 + Math.floor(Math.random() * 4),
    active: true,
    eliminatedRound: null,
    totals: { correct: 0, wrong: 0, banked: 0, strongest: 0 },
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

// ---------- Pytania ----------
function drawQuestion(game) {
  if (!game.pool.length) throw new Error('Brak pytań do gry');
  if (game.poolPos >= game.poolOrder.length) {
    game.poolOrder = shuffle(game.pool.map((_, i) => i));
    game.poolPos = 0;
  }
  return game.pool[game.poolOrder[game.poolPos++]];
}

const publicQuestion = (q) => {
  const out = { id: q.id, typ: q.typ, pytanie: q.pytanie };
  if (q.typ === 'abcd') out.options = { a: q.odp_a, b: q.odp_b, c: q.odp_c, d: q.odp_d };
  return out;
};

const correctText = (q) => (q.typ === 'abcd' ? `${String(q.poprawna_odpowiedz).toUpperCase()}: ${q[`odp_${q.poprawna_odpowiedz}`]}` : String(q.poprawna_odpowiedz));

const accOf = (game, p) => clamp(game.config.botAccuracy + (p.skill - 0.7) * 0.5, 0.1, 0.97);

function makeCur(game, playerId, now) {
  const q = drawQuestion(game);
  const p = byId(game, playerId);
  const cur = {
    q,
    playerId,
    startedAt: now,
    deadline: q.typ === 'abcd' ? now + game.config.answerSeconds * 1000 : null,
  };
  if (p && p.isBot) {
    cur.botAt = now + rand(1300, 3600) * (game.config.botSpeed || 1);
    cur.botCorrect = Math.random() < accOf(game, p);
  }
  return cur;
}

const chainValue = (chain) => (chain > 0 ? LADDER[Math.min(chain, LADDER.length) - 1] : 0);

// ---------- Runda ----------
function nextTurn(game, now) {
  const r = game.r;
  const id = r.order[r.turn % r.order.length];
  r.turn++;
  r.cur = makeCur(game, id, now);
}

function startRound(game, now, starterId) {
  const act = actives(game);
  game.round += 1;
  const seconds = Math.max(game.config.minRoundSeconds, game.config.roundSeconds - (game.round - 1) * game.config.roundShrink);
  let order = act.map((p) => p.id);
  const at = order.indexOf(starterId);
  if (at > 0) order = [...order.slice(at), ...order.slice(0, at)];
  const stats = {};
  order.forEach((id) => {
    stats[id] = { correct: 0, wrong: 0, banked: 0 };
  });
  game.phase = 'round';
  game.v = null;
  game.ve = null;
  game.r = { n: game.round, seconds, startedAt: now, endsAt: now + seconds * 1000, order, turn: 0, chain: 0, roundBank: 0, stats, cur: null, last: null, lastN: 0, bankN: 0, lastBank: null, summary: null };
  nextTurn(game, now);
}

function start(game, now) {
  if (game.status !== 'lobby') throw new Error('Gra już wystartowała');
  if (game.players.length < MIN_PLAYERS) throw new Error(`Potrzeba co najmniej ${MIN_PLAYERS} graczy`);
  if (game.pool.length < 5) throw new Error('Za mało pytań w puli');
  game.status = 'running';
  game.startedAt = now;
  startRound(game, now, null);
}

function bank(game, playerId, now) {
  if (game.paused) throw new Error('Gra jest wstrzymana przez prowadzącego');
  const r = game.r;
  if (game.status !== 'running' || game.phase !== 'round' || !r || !r.cur) throw new Error('Teraz nie można bankować');
  if (r.cur.playerId !== playerId) throw new Error('Bankować może tylko gracz, który odpowiada');
  if (r.chain <= 0) throw new Error('Łańcuch jest pusty - nie ma czego bankować');
  const value = chainValue(r.chain);
  r.roundBank += value;
  r.stats[playerId].banked += value;
  r.chain = 0;
  r.bankN += 1;
  r.lastBank = { n: r.bankN, playerId, value };
}

function resolveAnswer(game, correct, now, given, timeout) {
  const inDuel = game.phase === 'duel';
  const holder = inDuel ? game.d : game.r;
  const c = holder.cur;
  const lastN = (holder.lastN || 0) + 1;
  holder.lastN = lastN;
  const last = { n: lastN, playerId: c.playerId, correct, given: given || null, timeout: !!timeout, pytanie: c.q.pytanie, answerText: correctText(c.q) };
  holder.last = last;
  const p = byId(game, c.playerId);
  if (correct) p.totals.correct += 1;
  else p.totals.wrong += 1;

  if (!inDuel) {
    const r = game.r;
    const st = r.stats[c.playerId];
    if (correct) {
      st.correct += 1;
      r.chain += 1;
      if (r.chain >= LADDER.length) {
        // pelny lancuch - automatyczny bank
        const value = LADDER[LADDER.length - 1];
        r.roundBank += value;
        st.banked += value;
        r.chain = 0;
        r.bankN += 1;
        r.lastBank = { n: r.bankN, playerId: c.playerId, value, auto: true };
      }
    } else {
      st.wrong += 1;
      r.chain = 0;
    }
    last.chainAfter = r.chain;
    nextTurn(game, now);
    return;
  }

  const d = game.d;
  d.asked += 1;
  if (correct) d.score[c.playerId] += 1;
  const [a, b] = d.order;
  const total = d.perPlayer * 2;
  const pairDone = d.asked % 2 === 0;
  if (d.asked >= total) d.suddenDeath = true;
  if (d.asked >= total && pairDone && d.score[a] !== d.score[b]) {
    finish(game, now, 'Pojedynek rozstrzygnięty', d.score[a] > d.score[b] ? a : b);
    return;
  }
  d.cur = makeCur(game, d.order[d.asked % 2], now);
}

function submitAnswer(game, playerId, value, now) {
  if (game.paused) throw new Error('Gra jest wstrzymana przez prowadzącego');
  const holder = game.phase === 'duel' ? game.d : game.phase === 'round' ? game.r : null;
  const c = holder && holder.cur;
  if (game.status !== 'running' || !c) throw new Error('Nie ma teraz pytania do odpowiedzi');
  if (c.playerId !== playerId) throw new Error('To nie Twoja kolej');
  if (c.q.typ !== 'abcd') throw new Error('To pytanie otwarte - odpowiedz głośno, ocenia prowadzący');
  if (c.deadline && now > c.deadline + 400) throw new Error('Czas na odpowiedź minął');
  const letter = String(value || '').toLowerCase();
  if (!LETTERS.includes(letter)) throw new Error('Wybierz odpowiedź A, B, C lub D');
  resolveAnswer(game, letter === c.q.poprawna_odpowiedz, now, letter, false);
}

// Prowadzacy ocenia odpowiedz glosowa na pytanie otwarte
function judge(game, correct, now) {
  const holder = game.phase === 'duel' ? game.d : game.phase === 'round' ? game.r : null;
  const c = holder && holder.cur;
  if (game.status !== 'running' || !c) throw new Error('Nie ma pytania do oceny');
  if (c.q.typ !== 'otwarte') throw new Error('Pytania ABCD są oceniane automatycznie');
  resolveAnswer(game, !!correct, now, null, false);
}

// Prowadzacy wymienia pytanie (bez kary)
function skipQuestion(game, now) {
  const holder = game.phase === 'duel' ? game.d : game.phase === 'round' ? game.r : null;
  const c = holder && holder.cur;
  if (game.status !== 'running' || !c) throw new Error('Nie ma pytania do wymiany');
  holder.cur = makeCur(game, c.playerId, now);
}

// ---------- Podsumowanie rundy ----------
function endRound(game, now, reason) {
  const r = game.r;
  if (game.phase !== 'round' || !r) throw new Error('Runda już się skończyła');
  r.cur = null;
  r.endReason = reason;
  r.endedAt = now;
  game.pot += r.roundBank;
  const rows = r.order.map((id) => ({ playerId: id, ...r.stats[id] }));
  const cmp = (a, b) => b.correct - a.correct || a.wrong - b.wrong || b.banked - a.banked;
  const sorted = [...rows].sort(cmp);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const sp = byId(game, strongest.playerId);
  if (sp) sp.totals.strongest += 1;
  r.summary = {
    rows,
    strongestId: strongest.playerId,
    weakestId: weakest.playerId,
    roundBank: r.roundBank,
    pot: game.pot,
  };
  game.phase = 'roundEnd';
}

// ---------- Glosowanie ----------
function beginVote(game, now) {
  if (game.phase !== 'roundEnd') throw new Error('Głosowanie rozpoczyna się po podsumowaniu rundy');
  const act = actives(game);
  const botPlan = {};
  const r = game.r;
  const maxCorrect = Math.max(0, ...act.map((p) => r.stats[p.id].correct));
  for (const p of act) {
    if (!p.isBot) continue;
    const others = act.filter((x) => x.id !== p.id);
    // bot glosuje na tego, kto mial najslabsze statystyki (z domieszka przypadku)
    const scored = others.map((o) => {
      const s = r.stats[o.id];
      return { id: o.id, w: (maxCorrect - s.correct) * 2 + s.wrong + rand(0, 2.5) };
    });
    scored.sort((a, b) => b.w - a.w);
    botPlan[p.id] = { at: now + rand(2500, Math.max(4000, game.config.voteSeconds * 700)) * (game.config.botSpeed || 1), target: scored[0].id };
  }
  game.phase = 'vote';
  game.v = { startedAt: now, deadline: now + game.config.voteSeconds * 1000, votes: {}, botPlan };
}

function resolveVote(game, now) {
  if (game.phase !== 'vote' || !game.v) throw new Error('Nie trwa głosowanie');
  const act = actives(game);
  const v = game.v;
  const r = game.r;
  const tally = {};
  act.forEach((p) => {
    tally[p.id] = 0;
  });
  Object.values(v.votes).forEach((t) => {
    if (tally[t] !== undefined) tally[t] += 1;
  });
  const top = Math.max(...Object.values(tally));
  let tied = act.filter((p) => tally[p.id] === top).map((p) => p.id);
  let method = 'votes';
  let eliminatedId = tied[0];
  if (tied.length > 1) {
    const strongestVote = v.votes[r.summary.strongestId];
    if (strongestVote && tied.includes(strongestVote)) {
      eliminatedId = strongestVote;
      method = 'strongest';
    } else {
      const worse = [...tied].sort((a, b) => r.stats[a].correct - r.stats[b].correct || r.stats[b].wrong - r.stats[a].wrong);
      const best = worse.filter((id) => r.stats[id].correct === r.stats[worse[0]].correct && r.stats[id].wrong === r.stats[worse[0]].wrong);
      eliminatedId = best[Math.floor(Math.random() * best.length)];
      method = 'stats';
    }
  }
  const p = byId(game, eliminatedId);
  p.active = false;
  p.eliminatedRound = game.round;
  game.eliminated.push(eliminatedId);
  game.ve = {
    eliminatedId,
    tally,
    method,
    tied: tied.length > 1 ? tied : [],
    votes: Object.entries(v.votes).map(([voterId, targetId]) => ({ voterId, targetId })),
    next: actives(game).length <= 2 ? 'duel' : 'round',
  };
  game.phase = 'voteEnd';
}

function vote(game, playerId, targetId, now) {
  if (game.paused) throw new Error('Gra jest wstrzymana przez prowadzącego');
  if (game.status !== 'running' || game.phase !== 'vote' || !game.v) throw new Error('Teraz nie ma głosowania');
  const voter = byId(game, playerId);
  const target = byId(game, targetId);
  if (!voter || !voter.active) throw new Error('Nie bierzesz już udziału w głosowaniu');
  if (!target || !target.active) throw new Error('Wybierz gracza, który jest jeszcze w grze');
  if (target.id === voter.id) throw new Error('Nie możesz głosować na siebie');
  game.v.votes[playerId] = targetId;
  if (actives(game).every((p) => game.v.votes[p.id])) resolveVote(game, now);
}

// ---------- Pojedynek ----------
function startDuel(game, now) {
  const act = actives(game);
  if (act.length !== 2) throw new Error('Pojedynek wymaga dwóch graczy');
  const order = shuffle(act.map((p) => p.id));
  game.phase = 'duel';
  game.r = game.r ? { ...game.r, cur: null } : null;
  game.v = null;
  game.ve = null;
  game.d = { order, perPlayer: game.config.duelQuestions, asked: 0, score: { [order[0]]: 0, [order[1]]: 0 }, cur: null, last: null, lastN: 0, suddenDeath: false };
  game.d.cur = makeCur(game, order[0], now);
}

// ---------- Przejscia sterowane przez prowadzacego ----------
function advance(game, now) {
  if (game.status !== 'running') throw new Error('Gra nie trwa');
  if (game.phase === 'round') return endRound(game, now, 'host');
  if (game.phase === 'roundEnd') return beginVote(game, now);
  if (game.phase === 'vote') return resolveVote(game, now);
  if (game.phase === 'voteEnd') {
    if (game.ve.next === 'duel') return startDuel(game, now);
    const sum = game.r.summary;
    const starter = sum && byId(game, sum.strongestId) && byId(game, sum.strongestId).active ? sum.strongestId : null;
    return startRound(game, now, starter);
  }
  throw new Error('Nie można teraz przejść dalej');
}

function finish(game, now, reason, winnerId) {
  game.status = 'finished';
  game.finishedAt = now;
  game.phase = game.phase === 'duel' ? 'duel' : game.phase;
  const finalists = actives(game);
  const win = winnerId ? byId(game, winnerId) : null;
  const runner = win ? finalists.find((p) => p.id !== win.id) : null;
  const order = [];
  if (win) order.push(win.id);
  if (runner) order.push(runner.id);
  [...game.eliminated].reverse().forEach((id) => order.push(id));
  game.players.forEach((p) => {
    if (!order.includes(p.id)) order.push(p.id);
  });
  const all = game.players;
  const best = (key) => {
    const s = [...all].sort((a, b) => b.totals[key] - a.totals[key])[0];
    return s && s.totals[key] > 0 ? { id: s.id, value: s.totals[key] } : null;
  };
  game.result = {
    reason: reason || '',
    winnerId: win ? win.id : null,
    runnerUpId: runner ? runner.id : null,
    pot: game.pot,
    ranking: order.map((id, i) => ({ id, rank: i + 1, name: byId(game, id).name })),
    awards: {
      mostCorrect: best('correct'),
      mostStrongest: best('strongest'),
    },
    duel: game.d ? { score: game.d.score, asked: game.d.asked, suddenDeath: game.d.suddenDeath } : null,
    rounds: game.round,
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
  if (game.r) {
    shift(game.r, 'endsAt');
    shift(game.r, 'startedAt');
    shift(game.r.cur, 'deadline');
    shift(game.r.cur, 'botAt');
    shift(game.r.cur, 'startedAt');
  }
  if (game.d) {
    shift(game.d.cur, 'deadline');
    shift(game.d.cur, 'botAt');
    shift(game.d.cur, 'startedAt');
  }
  if (game.v) {
    shift(game.v, 'deadline');
    shift(game.v, 'startedAt');
    Object.values(game.v.botPlan || {}).forEach((b) => shift(b, 'at'));
  }
  game.paused = false;
  game.pausedAt = null;
}

// ---------- Zegar ----------
function botTurn(game, holder, now) {
  const c = holder.cur;
  if (!c || c.botAt === undefined || now < c.botAt) return false;
  const p = byId(game, c.playerId);
  if (!p || !p.isBot) return false;
  if (game.phase === 'round' && game.r.chain > 0 && game.r.chain >= p.bankAt && Math.random() < 0.7) {
    bank(game, p.id, now);
  }
  resolveAnswer(game, !!c.botCorrect, now, null, false);
  return true;
}

function tick(game, now) {
  if (game.status !== 'running' || game.paused) return false;
  if (game.phase === 'round') {
    const r = game.r;
    if (now >= r.endsAt) {
      endRound(game, now, 'time');
      return true;
    }
    const c = r.cur;
    if (c && c.deadline && now > c.deadline) {
      resolveAnswer(game, false, now, null, true);
      return true;
    }
    return botTurn(game, r, now);
  }
  if (game.phase === 'duel') {
    const d = game.d;
    const c = d.cur;
    if (c && c.deadline && now > c.deadline) {
      resolveAnswer(game, false, now, null, true);
      return true;
    }
    return botTurn(game, d, now);
  }
  if (game.phase === 'vote') {
    const v = game.v;
    let changed = false;
    for (const [pid, plan] of Object.entries(v.botPlan || {})) {
      if (!v.votes[pid] && now >= plan.at) {
        const t = byId(game, plan.target);
        if (t && t.active) v.votes[pid] = plan.target;
        changed = true;
      }
    }
    if (actives(game).every((p) => v.votes[p.id]) || now > v.deadline) {
      resolveVote(game, now);
      return true;
    }
    return changed;
  }
  return false;
}

// ---------- Widoki ----------
function playerView(game, p) {
  return {
    id: p.id,
    seat: p.seat,
    name: p.name,
    isBot: p.isBot,
    hasPhoto: !!p.photoV,
    photoV: p.photoV || 0,
    active: p.active,
    eliminatedRound: p.eliminatedRound,
  };
}

function curView(game, cur, isHost) {
  if (!cur) return null;
  const out = { playerId: cur.playerId, question: publicQuestion(cur.q), deadline: cur.deadline, startedAt: cur.startedAt };
  if (isHost) out.correct = { text: correctText(cur.q), letter: cur.q.typ === 'abcd' ? cur.q.poprawna_odpowiedz : null };
  return out;
}

function viewFor(game, role, player, now) {
  const isHost = role === 'host';
  const r = game.r;
  const view = {
    code: game.code,
    format: game.format,
    formatLabel: 'Najsłabsze ogniwo',
    test: game.test,
    version: game.version,
    status: game.status,
    phase: game.phase,
    paused: !!game.paused,
    pausedAt: game.paused ? game.pausedAt : null,
    config: game.config,
    now,
    ladder: LADDER,
    round: game.round,
    pot: game.pot,
    players: game.players.map((p) => playerView(game, p)).sort((a, b) => a.seat - b.seat),
    result: game.result,
  };
  if (r) {
    view.r = {
      n: r.n,
      seconds: r.seconds,
      endsAt: r.endsAt,
      chain: r.chain,
      chainValue: chainValue(r.chain),
      roundBank: r.roundBank,
      order: r.order,
      stats: r.stats,
      cur: game.phase === 'round' ? curView(game, r.cur, isHost) : null,
      last: r.last,
      lastBank: r.lastBank,
      summary: r.summary,
      endReason: r.endReason || null,
    };
  }
  if (game.v) {
    view.v = { deadline: game.v.deadline, voted: Object.keys(game.v.votes), total: actives(game).length };
  }
  if (game.ve) view.ve = game.ve;
  if (game.d) {
    view.d = {
      order: game.d.order,
      perPlayer: game.d.perPlayer,
      asked: game.d.asked,
      score: game.d.score,
      suddenDeath: game.d.suddenDeath,
      cur: curView(game, game.d.cur, isHost),
      last: game.d.last,
    };
  }
  if (role === 'player' && player) {
    const you = playerView(game, player);
    const holder = game.phase === 'duel' ? game.d : game.phase === 'round' ? game.r : null;
    you.isTurn = !!(holder && holder.cur && holder.cur.playerId === player.id);
    you.canBank = !!(game.phase === 'round' && you.isTurn && r && r.chain > 0);
    you.vote = game.v && game.v.votes[player.id] ? game.v.votes[player.id] : null;
    you.totals = player.totals;
    view.you = you;
  }
  if (isHost) view.poolSize = game.pool.length;
  return view;
}

module.exports = {
  FORMAT_ID,
  MAX_PLAYERS,
  MIN_PLAYERS,
  DEFAULT_CONFIG,
  LADDER,
  createGame,
  addPlayer,
  removePlayer,
  start,
  advance,
  bank,
  submitAnswer,
  judge,
  skipQuestion,
  vote,
  finish,
  pause,
  resume,
  tick,
  viewFor,
  byId,
};
