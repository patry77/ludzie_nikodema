'use strict';
// Silnik "Familiady" (Family Feud). Zasady odtworzone na podstawie opisu formatu:
//  - Dwie druzyny (do 5 osob), kazda ma kapitana. Tablica ma 3-6 odpowiedzi z punktami (liczba ankietowanych).
//  - Runda: POJEDYNEK (po jednym przedstawicielu z kazdej druzyny, kto pierwszy nacisnie przycisk, odpowiada):
//      * odpowiedz z najwyzszym wynikiem (nr 1) - jego druzyna wygrywa pojedynek,
//      * inna odpowiedz z tablicy - przeciwnik ma jedna szanse podac wyzej punktowana (wtedy to on wygrywa),
//      * odpowiedz spoza tablicy - odpowiada przeciwnik; trafiona odpowiedz daje mu pojedynek; gdy obaj pudluja - kolejne proby naprzemiennie.
//    Zwyciezca pojedynku DECYDUJE: gra dalej albo oddaje pytanie przeciwnikom.
//  - GRA DRUZYNY: czlonkowie odpowiadaja po kolei. Kazda trafiona odpowiedz zasila pule rundy. Wszystkie odpowiedzi = druzyna
//    wygrywa runde. Trzy bledy (X) = PRZEJECIE: przeciwnicy podaja jedna odpowiedz; trafiona -> biora cala pule (razem z punktami
//    za te odpowiedz), nietrafiona -> pule bierze druzyna, ktora miala kontrole. Po drugim bledzie przeciwnicy moga sie naradzac.
//  - Mnozniki: rundy 1-3 x1, runda 4 x2, runda 5 i kolejne x3. Do finalu przechodzi druzyna, ktora pierwsza zdobedzie 300 pkt.
//  - FINAL: dwoje graczy odpowiada na te same 5 pytan: pierwszy w 15 s, drugi (nie widzi odpowiedzi pierwszego) w 20 s i nie moze
//    powtarzac odpowiedzi. Potrzeba lacznie 200 punktow.
//  Prowadzacy zatwierdza odpowiedzi: wskazuje, ktora pozycja z tablicy odpowiada temu, co powiedzieli uczestnicy.

const { v4: uuidv4 } = require('uuid');

const FORMAT_ID = 'familiada';
const MAX_TEAM_SIZE = 5;
const MAX_ANSWER_CHARS = 16;
const FINAL_QUESTIONS = 5;
const LOG_LIMIT = 40;
const COLORS = ['red', 'blue'];
const DEFAULT_NAMES = ['Czerwoni', 'Niebiescy'];

const DEFAULT_CONFIG = {
  targetScore: 300,   // ile punktow daje awans do finalu
  finalTarget: 200,   // ile punktow w finale daje wygrana
  final1Seconds: 15,  // czas pierwszego finalisty
  final2Seconds: 20,  // czas drugiego finalisty
};

const multiplierFor = (round) => (round >= 5 ? 3 : round === 4 ? 2 : 1);
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

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------- Tworzenie gry ----------
function createGame({ code, test, config, pool, source }) {
  const now = Date.now();
  return {
    code,
    format: FORMAT_ID,
    test: !!test,
    source,
    createdAt: now,
    version: 1,
    status: 'lobby', // lobby | running | finished
    paused: false,
    pausedAt: null,
    config: { ...DEFAULT_CONFIG, ...(config || {}) },
    teams: COLORS.map((color, i) => ({ idx: i, name: DEFAULT_NAMES[i], color, leaderId: null, score: 0 })),
    players: [], // czlonkowie druzyn (z telefonow albo dodani przez prowadzacego)
    pool,
    poolOrder: shuffle(pool.map((_, i) => i)),
    poolPos: 0,
    recycled: false,
    phase: 'lobby', // lobby | faceoff | decision | play | steal | roundEnd | stageEnd | final | finished
    roundNo: 0,
    round: null,
    stageWinner: null,
    suggestions: [[], []],
    choice: [null, null], // wybor lidera (id propozycji) dla kazdej druzyny
    botPlan: [],
    final: null,
    seq: { reveal: 0, strike: 0, round: 0, repeat: 0 },
    log: [],
    result: null,
  };
}

const byId = (game, id) => game.players.find((p) => p.id === id);
const teamMembers = (game, t) => game.players.filter((p) => p.team === t).sort((a, b) => a.joinedAt - b.joinedAt);

function addLog(game, text, kind) {
  game.log.push({ t: Date.now(), text, kind: kind || 'info' });
  if (game.log.length > LOG_LIMIT) game.log.splice(0, game.log.length - LOG_LIMIT);
}

function assertNotPaused(game) {
  if (game.paused) throw new Error('Gra jest wstrzymana');
}

// ---------- Druzyny i czlonkowie ----------
function addMember(game, { name, team, isBot }) {
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) throw new Error('Podaj imię');
  if (game.players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) throw new Error('Ktoś o takim imieniu już jest w grze');
  const t = team === 0 || team === 1 ? team : null;
  if (t !== null && teamMembers(game, t).length >= MAX_TEAM_SIZE) throw new Error(`Drużyna ma już komplet (${MAX_TEAM_SIZE} osób)`);
  const m = {
    id: uuidv4(),
    token: uuidv4(),
    name: clean,
    team: t,
    isBot: !!isBot,
    photoV: 0,
    joinedAt: Date.now(),
  };
  game.players.push(m);
  if (t !== null && game.teams[t].leaderId === null) game.teams[t].leaderId = m.id;
  addLog(game, `${m.name} dołączył(a)${t !== null ? ` do drużyny „${game.teams[t].name}”` : ''}`);
  return m;
}

function moveMember(game, memberId, team) {
  const m = byId(game, memberId);
  if (!m) throw new Error('Nie znaleziono osoby');
  const t = team === 0 || team === 1 ? team : null;
  if (t !== null && m.team !== t && teamMembers(game, t).length >= MAX_TEAM_SIZE) throw new Error(`Drużyna ma już komplet (${MAX_TEAM_SIZE} osób)`);
  if (m.team !== null && game.teams[m.team].leaderId === m.id) game.teams[m.team].leaderId = null;
  m.team = t;
  if (t !== null && game.teams[t].leaderId === null) game.teams[t].leaderId = m.id;
  fixLeaders(game);
}

function fixLeaders(game) {
  game.teams.forEach((tm) => {
    const members = teamMembers(game, tm.idx);
    if (!members.some((m) => m.id === tm.leaderId)) tm.leaderId = members.length ? members[0].id : null;
  });
}

function removeMember(game, memberId) {
  const idx = game.players.findIndex((p) => p.id === memberId);
  if (idx === -1) throw new Error('Nie znaleziono osoby');
  const [m] = game.players.splice(idx, 1);
  fixLeaders(game);
  addLog(game, `${m.name} opuścił(a) grę`);
}

function setLeader(game, team, memberId) {
  const m = byId(game, memberId);
  if (!m || m.team !== team) throw new Error('Kapitanem może być tylko członek tej drużyny');
  game.teams[team].leaderId = m.id;
}

function setTeamName(game, team, name) {
  const clean = String(name || '').trim().slice(0, 24);
  if (!clean) throw new Error('Podaj nazwę drużyny');
  if (game.teams[1 - team].name.toLowerCase() === clean.toLowerCase()) throw new Error('Drużyny muszą mieć różne nazwy');
  game.teams[team].name = clean;
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

const mkAnswers = (q) => q.odpowiedzi.map((a) => ({ text: a.tekst, points: a.punkty, revealed: false, late: false, by: null }));

// ---------- Runda ----------
function repOf(game, t) {
  const members = teamMembers(game, t);
  if (!members.length) return null;
  return members[(Math.max(game.roundNo, 1) - 1) % members.length];
}

function speakerOf(game, t) {
  const members = teamMembers(game, t);
  if (!members.length || !game.round) return null;
  return members[game.round.turn[t] % members.length];
}

function beginRound(game, now) {
  const q = drawQuestion(game);
  game.roundNo += 1;
  game.seq.round += 1;
  game.round = {
    n: game.roundNo,
    multiplier: multiplierFor(game.roundNo),
    question: { id: q.id, text: q.pytanie, answers: mkAnswers(q) },
    bank: 0,
    ctrl: null,
    strikes: 0,
    consult: false,
    turn: [0, 0],
    fo: { first: null, turn: null, pending: null, attempts: [], winner: null },
    winner: null,
    stealTeam: null,
    stealHit: null,
  };
  game.phase = 'faceoff';
  game.suggestions = [[], []];
  game.choice = [null, null];
  game.botPlan = [];
  planBotSuggestions(game, now);
  addLog(game, `Runda ${game.roundNo}${game.round.multiplier > 1 ? ` (punkty ×${game.round.multiplier})` : ''}: ${q.pytanie}`, 'stage');
}

function swapQuestion(game, now) {
  assertNotPaused(game);
  const r = game.round;
  if (game.phase !== 'faceoff' || r.fo.attempts.length || r.question.answers.some((a) => a.revealed)) {
    throw new Error('Pytanie można zmienić tylko przed pierwszą odpowiedzią w pojedynku');
  }
  const q = drawQuestion(game);
  r.question = { id: q.id, text: q.pytanie, answers: mkAnswers(q) };
  r.fo = { first: null, turn: null, pending: null, attempts: [], winner: null };
  game.suggestions = [[], []];
  game.choice = [null, null];
  game.botPlan = [];
  planBotSuggestions(game, now);
  addLog(game, 'Prowadzący zmienił pytanie', 'warn');
}

function revealSlot(game, idx, byTeam) {
  const r = game.round;
  const a = r.question.answers[idx];
  if (!a) throw new Error('Nie ma takiej odpowiedzi na tablicy');
  if (a.revealed) throw new Error('Ta odpowiedź została już odkryta');
  a.revealed = true;
  a.by = byTeam;
  r.bank += a.points * r.multiplier;
  game.seq.reveal += 1;
  addLog(game, `${game.teams[byTeam].name}: „${a.text}” (${a.points} pkt)`, 'good');
}

const parseIdx = (idx) => (idx === null || idx === undefined || idx === '' ? null : Number(idx));

// --- Pojedynek ---
function faceoffBuzz(game, team, fromPhone) {
  assertNotPaused(game);
  const fo = game.round && game.round.fo;
  if (game.phase !== 'faceoff') throw new Error('Pojedynek już się zakończył');
  if (fo.attempts.length) throw new Error('Pojedynek już trwa');
  // z telefonow liczy sie tylko pierwsze nacisniecie; prowadzacy moze je zmienic recznie
  if (fromPhone && fo.first !== null) throw new Error('Przycisk został już wciśnięty - odpowiada drużyna ' + game.teams[fo.first].name);
  if (team !== 0 && team !== 1) throw new Error('Wybierz drużynę');
  fo.first = team;
  fo.turn = team;
  addLog(game, `Pierwsza zgłosiła się drużyna „${game.teams[team].name}”`);
}

function faceoffAnswer(game, idxRaw) {
  assertNotPaused(game);
  const r = game.round;
  const fo = r && r.fo;
  if (game.phase !== 'faceoff' || fo.turn === null) throw new Error('Najpierw wskaż, kto się zgłosił');
  const idx = parseIdx(idxRaw);
  const team = fo.turn;
  const other = 1 - team;
  const hit = idx !== null;
  if (hit) revealSlot(game, idx, team);
  else {
    game.seq.strike += 1;
    addLog(game, `${game.teams[team].name}: brak odpowiedzi na tablicy`, 'bad');
  }
  const prev = fo.attempts.length ? fo.attempts[fo.attempts.length - 1] : null;
  fo.attempts.push({ team, idx });

  if (fo.pending) {
    const winner = hit && idx < fo.pending.idx ? team : fo.pending.team;
    return finishFaceoff(game, winner);
  }
  if (hit) {
    if (idx === 0) return finishFaceoff(game, team);
    if (prev && prev.team !== team && prev.idx === null) return finishFaceoff(game, team);
    fo.pending = { team, idx };
    fo.turn = other;
    return undefined;
  }
  fo.turn = other;
  return undefined;
}

function finishFaceoff(game, winner) {
  const fo = game.round.fo;
  fo.winner = winner;
  fo.turn = null;
  game.phase = 'decision';
  addLog(game, `Pojedynek wygrywa drużyna „${game.teams[winner].name}” - decyduje, czy gra, czy oddaje pytanie`, 'stage');
}

function decide(game, play) {
  assertNotPaused(game);
  const r = game.round;
  if (game.phase !== 'decision') throw new Error('Teraz nie ma decyzji do podjęcia');
  r.ctrl = play ? r.fo.winner : 1 - r.fo.winner;
  r.strikes = 0;
  r.consult = false;
  r.turn[r.ctrl] = teamMembers(game, r.ctrl).findIndex((m) => repOf(game, r.ctrl) && m.id === repOf(game, r.ctrl).id) + 1;
  game.phase = 'play';
  addLog(game, `${play ? 'Gra' : 'Oddaje pytanie - gra'} drużyna „${game.teams[r.ctrl].name}”`, 'stage');
  if (r.question.answers.every((a) => a.revealed)) endRound(game, r.ctrl, 'wszystkie odpowiedzi odkryte');
}

// --- Gra druzyny ---
function playAnswer(game, idxRaw) {
  assertNotPaused(game);
  const r = game.round;
  if (game.phase !== 'play') throw new Error('Teraz nie trwa gra drużyny');
  const idx = parseIdx(idxRaw);
  if (idx === null) throw new Error('Wskaż odpowiedź z tablicy albo użyj przycisku „Błąd”');
  revealSlot(game, idx, r.ctrl);
  r.turn[r.ctrl] += 1;
  if (r.question.answers.every((a) => a.revealed)) endRound(game, r.ctrl, 'odkryte wszystkie odpowiedzi');
}

function playStrike(game) {
  assertNotPaused(game);
  const r = game.round;
  if (game.phase !== 'play') throw new Error('Teraz nie trwa gra drużyny');
  r.strikes += 1;
  game.seq.strike += 1;
  r.turn[r.ctrl] += 1;
  addLog(game, `✖ Błąd drużyny „${game.teams[r.ctrl].name}” (${r.strikes}/3)`, 'bad');
  if (r.strikes === 2) {
    r.consult = true;
    addLog(game, `Drużyna „${game.teams[1 - r.ctrl].name}” może się naradzać`, 'warn');
  }
  if (r.strikes >= 3) {
    game.phase = 'steal';
    r.stealTeam = 1 - r.ctrl;
    r.consult = false;
    addLog(game, `PRZEJĘCIE: drużyna „${game.teams[r.stealTeam].name}” ma jedną szansę`, 'stage');
  }
}

function stealAnswer(game, idxRaw) {
  assertNotPaused(game);
  const r = game.round;
  if (game.phase !== 'steal') throw new Error('Teraz nie ma przejęcia');
  const idx = parseIdx(idxRaw);
  if (idx !== null) {
    revealSlot(game, idx, r.stealTeam);
    r.stealHit = true;
    endRound(game, r.stealTeam, 'przejęcie udane');
  } else {
    r.stealHit = false;
    game.seq.strike += 1;
    addLog(game, `Przejęcie nieudane - punkty zachowuje „${game.teams[r.ctrl].name}”`, 'bad');
    endRound(game, r.ctrl, 'przejęcie nieudane');
  }
}

function endRound(game, winner, reason) {
  const r = game.round;
  r.winner = winner;
  game.teams[winner].score += r.bank;
  game.phase = 'roundEnd';
  addLog(game, `Rundę wygrywa „${game.teams[winner].name}” (+${r.bank} pkt, ${reason})`, 'stage');
  const reached = game.teams.filter((t) => t.score >= game.config.targetScore);
  game.stageWinner = reached.length ? (reached.length === 2 ? (game.teams[0].score >= game.teams[1].score ? 0 : 1) : reached[0].idx) : null;
}

function revealRest(game) {
  assertNotPaused(game);
  if (game.phase !== 'roundEnd') throw new Error('Pozostałe odpowiedzi można pokazać po zakończeniu rundy');
  let any = false;
  game.round.question.answers.forEach((a) => {
    if (!a.revealed) {
      a.revealed = true;
      a.late = true;
      any = true;
    }
  });
  if (any) game.seq.reveal += 1;
}

function nextAfterRound(game, now) {
  assertNotPaused(game);
  if (game.phase !== 'roundEnd') throw new Error('Najpierw zakończ rundę');
  if (game.stageWinner !== null) {
    game.phase = 'stageEnd';
    addLog(game, `Drużyna „${game.teams[game.stageWinner].name}” zdobyła ${game.teams[game.stageWinner].score} pkt i gra w finale!`, 'stage');
    return;
  }
  beginRound(game, now);
}

// ---------- Final ----------
function startFinal(game, repIds, now) {
  assertNotPaused(game);
  if (game.phase !== 'stageEnd') throw new Error('Finał jest dostępny po zakończeniu pierwszego etapu');
  const t = game.stageWinner;
  const ids = Array.isArray(repIds) ? repIds.filter(Boolean) : [];
  const members = teamMembers(game, t);
  let reps = ids.map((id) => byId(game, id)).filter((m) => m && m.team === t);
  if (reps.length < 2) {
    // domyslnie: kapitan + pierwsza inna osoba (albo ta sama osoba, gdy w druzynie jest tylko jedna)
    const leader = byId(game, game.teams[t].leaderId) || members[0];
    reps = [leader, members.find((m) => m.id !== (leader && leader.id)) || leader];
  }
  reps = reps.slice(0, 2);
  if (!reps[0]) throw new Error('Drużyna nie ma członków do finału');
  const questions = [];
  for (let i = 0; i < FINAL_QUESTIONS; i++) {
    const q = drawQuestion(game);
    questions.push({ q: { id: q.id, text: q.pytanie, answers: q.odpowiedzi.map((a) => ({ text: a.tekst, points: a.punkty })) }, p1: null, p2: null });
  }
  game.final = {
    team: t,
    reps: reps.map((m) => ({ id: m.id, name: m.name })),
    questions,
    step: 'ready', // ready | p1 | p1done | p2 | p2done | revealing | result
    deadline: null,
    total: 0,
    revealed: 0,
    result: null,
  };
  game.phase = 'final';
  game.suggestions = [[], []];
  game.choice = [null, null];
  game.botPlan = [];
  addLog(game, `FINAŁ: ${reps.map((m) => m.name).join(' i ')} (drużyna „${game.teams[t].name}”). Potrzeba ${game.config.finalTarget} pkt`, 'stage');
}

const finalPoints = (fq, slot) => (slot && slot.idx !== null && fq.q.answers[slot.idx] ? fq.q.answers[slot.idx].points : 0);
const finalSum = (f, key) => f.questions.reduce((s, fq) => s + finalPoints(fq, fq[key]), 0);

function finalStart(game, now) {
  assertNotPaused(game);
  const f = game.final;
  if (game.phase !== 'final') throw new Error('Finał jeszcze nie trwa');
  if (f.step === 'ready') {
    f.step = 'p1';
    f.total = game.config.final1Seconds;
    f.deadline = now + f.total * 1000;
    addLog(game, `${f.reps[0].name} odpowiada - ${f.total} sekund`, 'stage');
  } else if (f.step === 'p1done') {
    f.step = 'p2';
    f.total = game.config.final2Seconds;
    f.deadline = now + f.total * 1000;
    addLog(game, `${f.reps[1].name} odpowiada - ${f.total} sekund`, 'stage');
  } else {
    throw new Error('Teraz nie można rozpocząć odliczania');
  }
}

function finalStop(game) {
  const f = game.final;
  if (!f || (f.step !== 'p1' && f.step !== 'p2')) throw new Error('Odliczanie nie trwa');
  f.step = f.step === 'p1' ? 'p1done' : 'p2done';
  f.deadline = null;
  if (f.step === 'p1done') addLog(game, `Pierwszy finalista zdobył ${finalSum(f, 'p1')} pkt`, 'good');
  else addLog(game, `Drugi finalista zdobył ${finalSum(f, 'p2')} pkt`, 'good');
}

function finalSet(game, qi, idxRaw, text) {
  assertNotPaused(game);
  const f = game.final;
  if (!f || (f.step !== 'p1' && f.step !== 'p2')) throw new Error('Odpowiedzi można wpisywać tylko podczas odliczania');
  const fq = f.questions[qi];
  if (!fq) throw new Error('Nie ma takiego pytania');
  const idx = parseIdx(idxRaw);
  if (idx !== null && !fq.q.answers[idx]) throw new Error('Nie ma takiej odpowiedzi');
  const key = f.step === 'p1' ? 'p1' : 'p2';
  if (key === 'p2' && idx !== null && fq.p1 && fq.p1.idx === idx) {
    game.seq.repeat += 1; // drugi gracz powtorzyl odpowiedz pierwszego
    return { repeat: true };
  }
  fq[key] = { idx, text: String(text || '').slice(0, 40) };
  return { ok: true };
}

function finalClear(game, qi) {
  const f = game.final;
  if (!f || (f.step !== 'p1' && f.step !== 'p2')) throw new Error('Odpowiedzi można zmieniać tylko podczas odliczania');
  const fq = f.questions[qi];
  if (!fq) throw new Error('Nie ma takiego pytania');
  fq[f.step === 'p1' ? 'p1' : 'p2'] = null;
}

function finalRevealStart(game) {
  const f = game.final;
  if (!f || f.step !== 'p2done') throw new Error('Najpierw obaj gracze muszą skończyć');
  f.step = 'revealing';
  f.revealed = 0;
}

function finalRevealNext(game, all) {
  assertNotPaused(game);
  const f = game.final;
  if (!f) throw new Error('Brak finału');
  if (f.step === 'p2done') finalRevealStart(game);
  if (f.step !== 'revealing') throw new Error('Teraz nie można odkrywać odpowiedzi');
  f.revealed = all ? f.questions.length : Math.min(f.revealed + 1, f.questions.length);
  game.seq.reveal += 1;
  if (f.revealed >= f.questions.length) finishFinal(game);
}

function finishFinal(game) {
  const f = game.final;
  const s1 = finalSum(f, 'p1');
  const s2 = finalSum(f, 'p2');
  const total = s1 + s2;
  f.step = 'result';
  f.result = { s1, s2, total, win: total >= game.config.finalTarget, target: game.config.finalTarget };
  game.phase = 'finished';
  game.status = 'finished';
  game.finishedAt = Date.now();
  game.result = {
    winnerTeam: game.stageWinner,
    scores: game.teams.map((t) => t.score),
    final: f.result,
  };
  addLog(game, f.result.win ? `WYGRANA! ${total} pkt w finale` : `Zabrakło ${f.result.target - total} pkt (zdobyto ${total})`, 'stage');
}

function finish(game, now, reason) {
  game.status = 'finished';
  game.phase = 'finished';
  game.finishedAt = now;
  if (!game.result) {
    const [a, b] = game.teams;
    game.result = { winnerTeam: a.score === b.score ? null : a.score > b.score ? 0 : 1, scores: [a.score, b.score], final: null, reason: reason || 'Gra zakończona' };
  }
  addLog(game, reason || 'Gra zakończona przez prowadzącego', 'warn');
}

// ---------- Narada na telefonach (propozycje odpowiedzi) ----------
function addSuggestion(game, member, text) {
  if (game.status !== 'running' || !['faceoff', 'play', 'steal'].includes(game.phase)) throw new Error('Propozycje można wysyłać w trakcie rundy');
  if (member.team === null) throw new Error('Najpierw dołącz do drużyny');
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!clean) throw new Error('Wpisz propozycję');
  const list = game.suggestions[member.team];
  const key = norm(clean);
  const existing = list.find((s) => norm(s.text) === key);
  if (existing) {
    if (!existing.by.includes(member.name)) existing.by.push(member.name);
    return existing;
  }
  if (list.length >= 30) throw new Error('Za dużo propozycji');
  const s = { id: uuidv4(), text: clean, by: [member.name], at: Date.now() };
  list.push(s);
  return s;
}

function voteSuggestion(game, member, id) {
  const s = member.team !== null && game.suggestions[member.team].find((x) => x.id === id);
  if (!s) throw new Error('Nie znaleziono propozycji');
  if (!s.by.includes(member.name)) s.by.push(member.name);
}

function chooseSuggestion(game, member, id) {
  if (member.team === null || game.teams[member.team].leaderId !== member.id) throw new Error('Wybierać może tylko kapitan');
  const s = game.suggestions[member.team].find((x) => x.id === id);
  if (!s) throw new Error('Nie znaleziono propozycji');
  game.choice[member.team] = game.choice[member.team] === id ? null : id;
}

function planBotSuggestions(game, now) {
  if (!game.test || !game.round) return;
  const answers = game.round.question.answers;
  const junk = ['KOT', 'DOM', 'AUTO', 'LAS', 'PIES', 'KAWA', 'TELEFON', 'WODA'];
  game.botPlan = [];
  game.players.filter((p) => p.isBot && p.team !== null).forEach((p) => {
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const text = Math.random() < 0.7 ? pick(answers).text : pick(junk);
      game.botPlan.push({ memberId: p.id, at: now + rand(1500, 9000), text });
    }
  });
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
  if (game.final && typeof game.final.deadline === 'number') game.final.deadline += delta;
  game.botPlan.forEach((b) => {
    b.at += delta;
  });
  game.paused = false;
  game.pausedAt = null;
  addLog(game, '▶ Gra wznowiona', 'warn');
}

// ---------- Start gry ----------
function start(game, now) {
  if (game.status !== 'lobby') throw new Error('Gra już wystartowała');
  fixLeaders(game);
  for (const t of game.teams) {
    if (!teamMembers(game, t.idx).length) throw new Error(`Drużyna „${t.name}” nie ma żadnego członka`);
  }
  game.status = 'running';
  game.startedAt = now;
  addLog(game, `Start! „${game.teams[0].name}” kontra „${game.teams[1].name}” - gramy do ${game.config.targetScore} punktów`, 'stage');
  beginRound(game, now);
}

// ---------- Akcje prowadzacego ----------
function hostAction(game, body, now) {
  const a = body.action;
  switch (a) {
    case 'start':
      return start(game, now);
    case 'teamName':
      return setTeamName(game, Number(body.team), body.name);
    case 'addMember':
      return addMember(game, { name: body.name, team: body.team === null ? null : Number(body.team), isBot: false });
    case 'kick':
      return removeMember(game, body.playerId);
    case 'move':
      return moveMember(game, body.playerId, body.team === null ? null : Number(body.team));
    case 'leader':
      return setLeader(game, Number(body.team), body.playerId);
    case 'buzz':
      return faceoffBuzz(game, Number(body.team));
    case 'foAnswer':
      return faceoffAnswer(game, body.idx);
    case 'decide':
      return decide(game, !!body.play);
    case 'answer':
      return playAnswer(game, body.idx);
    case 'strike':
      return playStrike(game);
    case 'steal':
      return stealAnswer(game, body.idx);
    case 'revealRest':
      return revealRest(game);
    case 'next':
      return nextAfterRound(game, now);
    case 'skip':
      return swapQuestion(game, now);
    case 'startFinal':
      return startFinal(game, body.repIds, now);
    case 'finalStart':
      return finalStart(game, now);
    case 'finalStop':
      return finalStop(game);
    case 'finalSet':
      return finalSet(game, Number(body.qi), body.idx, body.text);
    case 'finalClear':
      return finalClear(game, Number(body.qi));
    case 'finalRevealNext':
      return finalRevealNext(game, false);
    case 'finalRevealAll':
      return finalRevealNext(game, true);
    case 'pause':
      return pause(game, now);
    case 'resume':
      return resume(game, now);
    case 'end':
      return game.status === 'running' ? finish(game, now, 'Gra zakończona przez prowadzącego') : undefined;
    default:
      throw new Error('Nieznana akcja prowadzącego');
  }
}

// ---------- Akcje uczestnika (telefon) ----------
function memberAction(game, member, body, now) {
  switch (body.action) {
    case 'team': {
      if (game.status !== 'lobby') throw new Error('Drużynę można wybrać przed startem');
      return moveMember(game, member.id, body.team === null ? null : Number(body.team));
    }
    case 'suggest':
      assertNotPaused(game);
      return addSuggestion(game, member, body.text);
    case 'vote':
      return voteSuggestion(game, member, body.id);
    case 'choose':
      return chooseSuggestion(game, member, body.id);
    case 'buzz': {
      assertNotPaused(game);
      const rep = member.team !== null ? repOf(game, member.team) : null;
      const isLeader = member.team !== null && game.teams[member.team].leaderId === member.id;
      if (!rep || (rep.id !== member.id && !isLeader)) throw new Error('Przycisk ma przedstawiciel drużyny w tym pojedynku');
      return faceoffBuzz(game, member.team, true);
    }
    default:
      throw new Error('Nieznana akcja uczestnika');
  }
}

// ---------- Zegar ----------
function tick(game, now) {
  if (game.status !== 'running' || game.paused) return false;
  let changed = false;
  const f = game.final;
  if (f && (f.step === 'p1' || f.step === 'p2') && f.deadline && now >= f.deadline) {
    finalStop(game);
    changed = true;
  }
  if (game.botPlan.length) {
    const due = game.botPlan.filter((b) => now >= b.at);
    if (due.length) {
      game.botPlan = game.botPlan.filter((b) => now < b.at);
      due.forEach((b) => {
        const m = byId(game, b.memberId);
        if (m) {
          try {
            addSuggestion(game, m, b.text);
          } catch (e) {
            /* faza mogla sie zmienic */
          }
        }
      });
      changed = true;
    }
  }
  return changed;
}

// ---------- Widoki ----------
const memberView = (game, m, round) => ({
  id: m.id,
  name: m.name,
  team: m.team,
  hasPhoto: !!m.photoV,
  photoV: m.photoV || 0,
  isBot: m.isBot,
  isLeader: m.team !== null && game.teams[m.team].leaderId === m.id,
  isRep: !!(round && m.team !== null && repOf(game, m.team) && repOf(game, m.team).id === m.id && ['faceoff', 'decision'].includes(game.phase)),
  isSpeaker: !!(round && m.team !== null && ['play', 'steal'].includes(game.phase) && ((game.phase === 'play' && round.ctrl === m.team) || (game.phase === 'steal' && round.stealTeam === m.team)) && speakerOf(game, m.team) && speakerOf(game, m.team).id === m.id),
});

function roundView(game, host) {
  const r = game.round;
  if (!r) return null;
  return {
    n: r.n,
    multiplier: r.multiplier,
    bank: r.bank,
    ctrl: r.ctrl,
    strikes: r.strikes,
    consult: r.consult,
    stealTeam: r.stealTeam,
    stealHit: r.stealHit,
    winner: r.winner,
    question: r.question.text,
    count: r.question.answers.length,
    answers: r.question.answers.map((a, i) => ({
      i,
      revealed: a.revealed,
      late: a.late,
      by: a.by,
      text: a.revealed || host ? a.text : null,
      points: a.revealed || host ? a.points : null,
    })),
    fo: { first: r.fo.first, turn: r.fo.turn, winner: r.fo.winner, pendingTeam: r.fo.pending ? r.fo.pending.team : null, attempts: r.fo.attempts.length },
  };
}

function finalView(game, host) {
  const f = game.final;
  if (!f) return null;
  const done = ['p1done', 'p2', 'p2done', 'revealing', 'result'].includes(f.step);
  const out = {
    team: f.team,
    reps: f.reps.map((r) => {
      const m = byId(game, r.id);
      return { id: r.id, name: r.name, hasPhoto: !!(m && m.photoV), photoV: m ? m.photoV || 0 : 0 };
    }),
    step: f.step,
    deadline: f.deadline,
    total: f.total,
    target: game.config.finalTarget,
    revealed: f.revealed,
    result: f.result,
    sum1: done ? finalSum(f, 'p1') : null, // drugi gracz widzi tylko sume pierwszego
    sum2: ['p2done', 'revealing', 'result'].includes(f.step) ? finalSum(f, 'p2') : null,
    rows: f.questions.map((fq, i) => {
      const shown = (f.step === 'revealing' || f.step === 'result') && i < f.revealed;
      const row = { i, filled1: !!fq.p1, filled2: !!fq.p2, shown };
      if (shown || host) {
        row.a1 = fq.p1 ? { text: fq.p1.idx !== null ? fq.q.answers[fq.p1.idx].text : fq.p1.text || '—', points: finalPoints(fq, fq.p1), onBoard: fq.p1.idx !== null } : null;
        row.a2 = fq.p2 ? { text: fq.p2.idx !== null ? fq.q.answers[fq.p2.idx].text : fq.p2.text || '—', points: finalPoints(fq, fq.p2), onBoard: fq.p2.idx !== null } : null;
      }
      if (host) {
        row.question = fq.q.text;
        row.answers = fq.q.answers;
        row.p1 = fq.p1;
        row.p2 = fq.p2;
      }
      return row;
    }),
  };
  return out;
}

function viewFor(game, role, member, now) {
  const host = role === 'host';
  const r = game.round;
  const view = {
    code: game.code,
    format: FORMAT_ID,
    formatLabel: 'Familiada',
    test: game.test,
    version: game.version,
    status: game.status,
    paused: !!game.paused,
    pausedAt: game.paused ? game.pausedAt : null,
    phase: game.phase,
    now,
    config: game.config,
    teams: game.teams.map((t) => ({
      idx: t.idx,
      name: t.name,
      color: t.color,
      score: t.score,
      leaderId: t.leaderId,
      isCtrl: !!(r && ['play', 'steal'].includes(game.phase) && (game.phase === 'play' ? r.ctrl === t.idx : r.stealTeam === t.idx)),
      members: teamMembers(game, t.idx).map((m) => memberView(game, m, r)),
    })),
    unassigned: game.players.filter((p) => p.team === null).map((m) => memberView(game, m, r)),
    round: roundView(game, host),
    stageWinner: game.stageWinner,
    final: finalView(game, host),
    seq: game.seq,
    log: game.log.slice(-12),
    result: game.result,
    roundNo: game.roundNo,
  };
  if (host) {
    view.poolSize = game.pool.length;
    view.poolRemaining = Math.max(game.pool.length - game.poolPos, 0);
    view.recycled = game.recycled;
    view.suggestions = game.suggestions.map((list, t) => list.map((s) => ({ id: s.id, text: s.text, by: s.by, chosen: game.choice[t] === s.id })));
  }
  if (role === 'player' && member) {
    const mine = memberView(game, member, r);
    const rep = member.team !== null ? repOf(game, member.team) : null;
    view.you = {
      ...mine,
      canBuzz: !!(r && game.phase === 'faceoff' && r.fo.first === null && member.team !== null && rep && (rep.id === member.id || mine.isLeader)),
    };
    view.suggestions =
      member.team !== null
        ? game.suggestions[member.team].map((s) => ({ id: s.id, text: s.text, count: s.by.length, mine: s.by.includes(member.name), chosen: game.choice[member.team] === s.id }))
        : [];
  }
  return view;
}

module.exports = {
  FORMAT_ID,
  MAX_TEAM_SIZE,
  MAX_ANSWER_CHARS,
  DEFAULT_CONFIG,
  createGame,
  addMember,
  removeMember,
  hostAction,
  memberAction,
  tick,
  viewFor,
  finish,
  byId,
  teamMembers,
  repOf,
};
