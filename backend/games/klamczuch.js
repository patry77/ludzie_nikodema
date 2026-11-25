'use strict';
// Tryb "Kłamczuch" (wzorowany na teleturnieju "Gdzie jest kłamczuch?" / Dirty Rotten Cheater).
//  - Pytania i odpowiedzi jak w Familiadzie (tablica z punktami), ale gra sie pojedynczo.
//  - Na starcie JEDEN gracz jest po cichu KLAMCZUCHEM: na swoim telefonie widzi cala tablice z odpowiedziami i punktami.
//    Pozostali (uczciwi) odpowiadaja z glowy.
//  - Runda: jedno pytanie, kazdy gracz podaje po kolei JEDNA odpowiedz (glosem). Prowadzacy wskazuje, ktora pozycja z tablicy
//    pasuje (albo "pudlo"). Zdobyte punkty widac na TV - podejrzanie dobre wyniki zdradzaja kłamczucha.
//  - Po rundzie wszyscy glosuja, kto jest klamczuchem. Najwiecej glosow = odpada i ujawnia swoja role.
//  - Klamczuch odpadl -> wygrywaja uczciwi. Klamczuch dotrwal do finalowej dwojki -> wygrywa on.

const { v4: uuidv4 } = require('uuid');

const FORMAT_ID = 'klamczuch';
const MAX_PLAYERS = 10;
const MIN_PLAYERS = 4;

const DEFAULT_CONFIG = {
  answerSeconds: 25, // czas na odpowiedz jednego gracza (po jego uplywie liczy sie pudlo)
  voteSeconds: 60, // czas na glosowanie
  botAccuracy: 0.6,
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

function createGame({ code, test, config, pool, source }) {
  const usable = (pool || []).filter((q) => q && q.pytanie && Array.isArray(q.odpowiedzi) && q.odpowiedzi.length >= 3);
  return {
    code,
    format: FORMAT_ID,
    test: !!test,
    source,
    createdAt: Date.now(),
    version: 1,
    status: 'lobby', // lobby | running | finished
    phase: null, // answer | roundEnd | vote | voteEnd
    config: { ...DEFAULT_CONFIG, ...(config || {}) },
    players: [],
    pool: usable,
    poolOrder: shuffle(usable.map((_, i) => i)),
    poolPos: 0,
    round: 0,
    cheaterId: null,
    pot: 0,
    eliminated: [],
    r: null,
    v: null,
    ve: null,
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
    active: true,
    score: 0,
    detective: 0, // ile razy zaglosowal(a) na prawdziwego klamczuche
    eliminatedRound: null,
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

const mkBoard = (q) => q.odpowiedzi.map((a) => ({ text: a.tekst, points: a.punkty, revealed: false, by: null }));

function beginTurn(game, now) {
  const r = game.r;
  if (r.turn >= r.order.length) {
    endRound(game, now);
    return;
  }
  const id = r.order[r.turn];
  const p = byId(game, id);
  const cur = { playerId: id, deadline: now + game.config.answerSeconds * 1000, startedAt: now };
  if (p.isBot) {
    cur.botAt = now + rand(1800, 4200) * (game.config.botSpeed || 1);
    cur.botPick = botPick(game, p);
  }
  r.cur = cur;
}

// Bot wybiera pozycje z tablicy (albo pudlo = null). Klamczuch-bot zna tablice, wiec trafia czesciej, ale nie zawsze.
function botPick(game, p) {
  const free = game.r.board.map((a, i) => ({ a, i })).filter((x) => !x.a.revealed);
  if (!free.length) return null;
  if (p.id === game.cheaterId) {
    if (Math.random() < 0.2) return null;
    free.sort((x, y) => y.a.points - x.a.points);
    // czasem celowo mniej oczywista odpowiedz, zeby nie wzbudzac podejrzen
    const k = Math.random() < 0.55 ? Math.min(free.length - 1, 1 + Math.floor(Math.random() * 3)) : 0;
    return free[k].i;
  }
  if (Math.random() > game.config.botAccuracy) return null;
  const weights = free.map((x) => Math.sqrt(x.a.points) + 0.5);
  const total = weights.reduce((s, w) => s + w, 0);
  let t = Math.random() * total;
  for (let i = 0; i < free.length; i++) {
    t -= weights[i];
    if (t <= 0) return free[i].i;
  }
  return free[free.length - 1].i;
}

function startRound(game, now) {
  const q = drawQuestion(game);
  const act = actives(game);
  game.round += 1;
  // kolejnosc odpowiadania: kazda runda zaczyna kto inny
  let order = act.map((p) => p.id);
  const shift = (game.round - 1) % order.length;
  order = [...order.slice(shift), ...order.slice(0, shift)];
  const scores = {};
  order.forEach((id) => {
    scores[id] = null;
  });
  game.phase = 'answer';
  game.v = null;
  game.ve = null;
  game.r = { n: game.round, q: { id: q.id, pytanie: q.pytanie }, board: mkBoard(q), order, turn: 0, cur: null, log: [], scores, summary: null };
  beginTurn(game, now);
}

function start(game, now) {
  if (game.status !== 'lobby') throw new Error('Gra już wystartowała');
  if (game.players.length < MIN_PLAYERS) throw new Error(`Potrzeba co najmniej ${MIN_PLAYERS} graczy`);
  if (game.pool.length < 3) throw new Error('Za mało pytań w puli');
  game.status = 'running';
  game.startedAt = now;
  game.cheaterId = game.players[Math.floor(Math.random() * game.players.length)].id;
  startRound(game, now);
}

// Rozliczenie odpowiedzi biezacego gracza. idx = numer pozycji z tablicy albo null (pudlo)
function resolveAnswer(game, idx, now, timeout) {
  const r = game.r;
  const c = r && r.cur;
  if (game.phase !== 'answer' || !c) throw new Error('Nie ma teraz odpowiedzi do oceny');
  const p = byId(game, c.playerId);
  let points = 0;
  let pos = null;
  if (idx !== null && idx !== undefined && idx !== '') {
    const i = Number(idx);
    if (!Number.isInteger(i) || i < 0 || i >= r.board.length) throw new Error('Nieprawidłowa pozycja z tablicy');
    if (r.board[i].revealed) throw new Error('Ta odpowiedź została już odkryta');
    r.board[i].revealed = true;
    r.board[i].by = p.id;
    points = r.board[i].points;
    pos = i;
  }
  p.score += points;
  r.scores[p.id] = points;
  r.log.push({ playerId: p.id, idx: pos, text: pos !== null ? r.board[pos].text : null, points, timeout: !!timeout });
  game.pot += points;
  r.turn += 1;
  r.cur = null;
  beginTurn(game, now);
}

function mark(game, idx, now) {
  resolveAnswer(game, idx, now, false);
}

function swapQuestion(game, now) {
  const r = game.r;
  if (game.phase !== 'answer' || !r || r.log.length > 0) throw new Error('Pytanie można wymienić tylko zanim ktokolwiek odpowie');
  const q = drawQuestion(game);
  r.q = { id: q.id, pytanie: q.pytanie };
  r.board = mkBoard(q);
  beginTurn(game, now);
}

function endRound(game, now) {
  const r = game.r;
  r.cur = null;
  const rows = r.order.map((id) => ({ playerId: id, points: r.scores[id] || 0, text: (r.log.find((l) => l.playerId === id) || {}).text || null }));
  r.summary = { rows };
  game.phase = 'roundEnd';
}

// ---------- Glosowanie ----------
function beginVote(game, now) {
  if (game.phase !== 'roundEnd') throw new Error('Głosowanie zaczyna się po podsumowaniu rundy');
  const act = actives(game);
  const botPlan = {};
  for (const p of act) {
    if (!p.isBot) continue;
    const others = act.filter((x) => x.id !== p.id);
    // uczciwy bot podejrzewa tych, ktorzy mieli dobre wyniki (z domieszka przypadku); klamczuch-bot odwraca uwage
    const scored = others.map((o) => ({ id: o.id, w: (o.score || 0) * (0.3 + Math.random() * 0.9) + rand(0, 30) }));
    scored.sort((a, b) => b.w - a.w);
    let target = scored[0].id;
    if (p.id === game.cheaterId) target = others[Math.floor(Math.random() * others.length)].id;
    botPlan[p.id] = { at: now + rand(3000, Math.max(5000, game.config.voteSeconds * 600)) * (game.config.botSpeed || 1), target };
  }
  game.phase = 'vote';
  game.v = { startedAt: now, deadline: now + game.config.voteSeconds * 1000, votes: {}, botPlan };
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

function resolveVote(game, now) {
  if (game.phase !== 'vote' || !game.v) throw new Error('Nie trwa głosowanie');
  const act = actives(game);
  const tally = {};
  act.forEach((p) => {
    tally[p.id] = 0;
  });
  Object.values(game.v.votes).forEach((t) => {
    if (tally[t] !== undefined) tally[t] += 1;
  });
  const top = Math.max(...Object.values(tally));
  const tied = act.filter((p) => tally[p.id] === top);
  // remis: odpada ten z wiekszym wynikiem (bardziej podejrzany); gdy dalej remis - los
  const maxScore = Math.max(...tied.map((p) => p.score));
  const finalists = tied.filter((p) => p.score === maxScore);
  const out = finalists[Math.floor(Math.random() * finalists.length)];
  const method = tied.length === 1 ? 'votes' : finalists.length === 1 ? 'score' : 'random';
  out.active = false;
  out.eliminatedRound = game.round;
  game.eliminated.push(out.id);
  // punkty "detektywa" za glos na prawdziwego klamczuche
  const votes = Object.entries(game.v.votes).map(([voterId, targetId]) => ({ voterId, targetId }));
  votes.forEach((v) => {
    if (v.targetId === game.cheaterId) {
      const vp = byId(game, v.voterId);
      if (vp) vp.detective += 1;
    }
  });
  const caught = out.id === game.cheaterId;
  const left = actives(game).length;
  game.ve = {
    eliminatedId: out.id,
    wasCheater: caught,
    tally,
    method,
    tied: tied.length > 1 ? tied.map((p) => p.id) : [],
    votes,
    next: caught ? 'end' : left <= 2 ? 'end' : 'round',
  };
  game.phase = 'voteEnd';
}

function advance(game, now) {
  if (game.status !== 'running') throw new Error('Gra nie trwa');
  if (game.phase === 'answer') throw new Error('Najpierw wszyscy gracze muszą odpowiedzieć');
  if (game.phase === 'roundEnd') return beginVote(game, now);
  if (game.phase === 'vote') return resolveVote(game, now);
  if (game.phase === 'voteEnd') {
    if (game.ve.next === 'end') return finish(game, now, game.ve.wasCheater ? 'Kłamczuch wykryty' : 'Kłamczuch dotrwał do końca', game.ve.wasCheater ? 'honest' : 'cheater');
    return startRound(game, now);
  }
  throw new Error('Nie można teraz przejść dalej');
}

function finish(game, now, reason, winner) {
  game.status = 'finished';
  game.finishedAt = now;
  const survivors = actives(game).map((p) => p.id);
  const cheater = byId(game, game.cheaterId);
  const detectives = [...game.players]
    .filter((p) => p.id !== game.cheaterId)
    .sort((a, b) => b.detective - a.detective || b.score - a.score)
    .map((p) => ({ id: p.id, votes: p.detective }));
  game.result = {
    reason: reason || '',
    winner: winner || null, // honest | cheater | null (przerwana)
    cheaterId: game.cheaterId,
    cheaterName: cheater ? cheater.name : '',
    survivors,
    pot: game.pot,
    detectives,
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
  if (game.r && game.r.cur) {
    shift(game.r.cur, 'deadline');
    shift(game.r.cur, 'botAt');
    shift(game.r.cur, 'startedAt');
  }
  if (game.v) {
    shift(game.v, 'deadline');
    shift(game.v, 'startedAt');
    Object.values(game.v.botPlan || {}).forEach((b) => shift(b, 'at'));
  }
  game.paused = false;
  game.pausedAt = null;
}

function tick(game, now) {
  if (game.status !== 'running' || game.paused) return false;
  if (game.phase === 'answer') {
    const c = game.r.cur;
    if (!c) return false;
    const p = byId(game, c.playerId);
    if (p && p.isBot && now >= c.botAt) {
      // bot: gdy wybrana pozycja zostala juz odkryta, liczy sie pudlo
      const pick = c.botPick;
      resolveAnswer(game, pick !== null && game.r.board[pick] && !game.r.board[pick].revealed ? pick : null, now, false);
      return true;
    }
    if (now > c.deadline) {
      resolveAnswer(game, null, now, true);
      return true;
    }
    return false;
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
function playerView(game, p, revealRole) {
  const out = {
    id: p.id,
    seat: p.seat,
    name: p.name,
    isBot: p.isBot,
    hasPhoto: !!p.photoV,
    photoV: p.photoV || 0,
    active: p.active,
    score: p.score,
    eliminatedRound: p.eliminatedRound,
  };
  // rola jest jawna dopiero po odpadnieciu (albo na koncu gry)
  if (revealRole || !p.active) out.wasCheater = p.id === game.cheaterId;
  return out;
}

function viewFor(game, role, player, now) {
  const isHost = role === 'host';
  const r = game.r;
  const finished = game.status === 'finished';
  const showAll = (b) => isHost || finished || game.phase === 'roundEnd' || game.phase === 'vote' || game.phase === 'voteEnd' ? b.text : null;
  const view = {
    code: game.code,
    format: game.format,
    formatLabel: 'Kłamczuch',
    test: game.test,
    version: game.version,
    status: game.status,
    phase: game.phase,
    paused: !!game.paused,
    pausedAt: game.paused ? game.pausedAt : null,
    config: game.config,
    now,
    round: game.round,
    pot: game.pot,
    players: game.players.map((p) => playerView(game, p, finished)).sort((a, b) => a.seat - b.seat),
    result: game.result,
  };
  if (r) {
    view.r = {
      n: r.n,
      question: r.q.pytanie,
      // tablica: odkryte odpowiedzi widac zawsze; nieodkryte - po rundzie (TV) albo od razu (prowadzacy)
      board: r.board.map((b) => ({ revealed: b.revealed, by: b.by, text: b.revealed ? b.text : showAll(b), points: b.revealed || showAll(b) ? b.points : null })),
      order: r.order,
      turn: r.turn,
      cur: game.phase === 'answer' && r.cur ? { playerId: r.cur.playerId, deadline: r.cur.deadline, startedAt: r.cur.startedAt } : null,
      log: r.log,
      scores: r.scores,
      summary: r.summary,
    };
  }
  if (game.v) view.v = { deadline: game.v.deadline, voted: Object.keys(game.v.votes), total: actives(game).length };
  if (game.ve) view.ve = game.ve;
  if (isHost) {
    view.poolSize = game.pool.length;
    view.cheaterId = game.cheaterId;
  }
  if (role === 'player' && player) {
    const you = playerView(game, player, finished);
    you.role = game.status === 'lobby' ? null : player.id === game.cheaterId ? 'cheater' : 'honest';
    you.isTurn = !!(game.phase === 'answer' && r && r.cur && r.cur.playerId === player.id);
    you.vote = game.v && game.v.votes[player.id] ? game.v.votes[player.id] : null;
    // tylko klamczuch dostaje sciage z cala tablica biezacej rundy
    if (you.role === 'cheater' && r && player.active && game.status === 'running') {
      you.cheat = r.board.map((b) => ({ text: b.text, points: b.points, revealed: b.revealed }));
    }
    view.you = you;
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
  advance,
  mark,
  swapQuestion,
  vote,
  finish,
  pause,
  resume,
  tick,
  viewFor,
  byId,
};
