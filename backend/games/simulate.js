'use strict';
// Narzedzie deweloperskie: symuluje pelne gry "1 z 10" z samymi botami na sztucznym zegarze
// i sprawdza zasady. Uruchomienie: node backend/games/simulate.js [liczba_gier] [liczba_graczy] [--verbose]

const engine = require('./jedenZDziesieciu');
const { SAMPLE_QUESTIONS } = require('./sampleQuestions');

const games = parseInt(process.argv[2] || '200', 10);
const playerCount = parseInt(process.argv[3] || '10', 10);
const verbose = process.argv.includes('--verbose');

let failures = 0;
const fail = (msg, ctx) => {
  failures++;
  console.error('BŁĄD:', msg, ctx || '');
};

function runOne(index, playersN, accuracy) {
  const game = engine.createGame({
    code: 'SIM' + index,
    test: true,
    source: 'sample',
    pool: SAMPLE_QUESTIONS,
    config: { autoJudgeOpen: true, autoAdvanceSeconds: 1, botAccuracy: accuracy, answerSeconds: 10, buzzSeconds: 8 },
  });
  for (let i = 1; i <= playersN; i++) engine.addPlayer(game, { name: `Bot ${i}`, isBot: true });
  let now = 1_000_000;
  engine.start(game, now);

  const stats = { s1Asked: [], s2: [], s3Questions: 0, stages: new Set([1]), firstDesignation: null };
  let lastQ = null;
  let steps = 0;

  const observe = () => {
    const c = game.current;
    if (c && c !== lastQ) {
      lastQ = c;
      if (game.stage === 1) stats.s1Asked.push(game.players.find((p) => p.id === c.targetId).seat);
      if (game.stage === 2) stats.s2.push({ role: c.role, target: game.players.find((p) => p.id === c.targetId), by: c.designatedBy });
      if (game.stage === 3) stats.s3Questions++;
    }
    stats.stages.add(game.stage);
  };

  // Etap I - sprawdzamy kolejnosc zaraz po starcie
  observe();

  // sprawdzenie pierwszego wyznaczenia
  let checkedFirst = false;
  while (game.status === 'running' && steps < 200000) {
    now += 250;
    steps++;
    // pierwsze wyznaczenie: sprawdzamy dozwolone cele
    if (game.stage === 2 && game.awaiting && !checkedFirst && game.awaiting.first) {
      checkedFirst = true;
      const holder = game.players.find((p) => p.id === game.awaiting.byId);
      const targets = game.awaiting.allowedIds.map((id) => game.players.find((p) => p.id === id));
      const oppositeExists = game.players.some((p) => !p.eliminated && (holder.seat <= 5 ? p.seat >= 6 : p.seat <= 5));
      if (oppositeExists && !targets.every((t) => (holder.seat <= 5 ? t.seat >= 6 : t.seat <= 5))) {
        fail('pierwsze wyznaczenie dopuszcza ta sama strone studia', { holder: holder.seat, targets: targets.map((t) => t.seat) });
      }
      if (targets.some((t) => t.id === holder.id)) fail('w etapie II mozna wskazac siebie');
    }
    engine.tick(game, now);
    // inwarianty na biezaco
    for (const p of game.players) {
      if (p.lives < 0) fail('ujemna liczba szans', p.name);
      if (game.stage >= 2 && p.lives > 3) fail('wiecej niz 3 szanse', p.name);
    }
    observe();
    // po zakonczeniu etapu I sprawdz zasady
    if (game.stage >= 2 && !stats.checkedS1) {
      stats.checkedS1 = true;
      // kazdy gracz mial dokladnie 2 pytania, kolejnosc 1..N 1..N
      const expected = [];
      for (let r = 0; r < 2; r++) for (let s = 1; s <= playersN; s++) expected.push(s);
      if (JSON.stringify(stats.s1Asked) !== JSON.stringify(expected)) {
        fail('niepoprawna kolejnosc pytan w etapie I', { got: stats.s1Asked.join(','), expected: expected.join(',') });
      }
      for (const p of game.players) {
        if (p.s1correct === 0 && !p.eliminated) fail('gracz bez dobrych odpowiedzi nie odpadl', p.name);
        if (p.s1correct > 0 && p.eliminated && game.stage === 2) fail('gracz z dobra odpowiedzia odpadl', p.name);
      }
    }
    if (game.stage === 2) {
      const al = engine.alive(game);
      if (al.length < 4 && game.status === 'running' && game.stage === 2 && !game.current && !game.awaiting) fail('etap II z mniej niz 4 graczami');
    }
  }
  if (game.status === 'running') fail('gra sie zawiesila (limit krokow)', { stage: game.stage });

  // Sprawdzenia koncowe
  const al = engine.alive(game);
  if (game.stage === 3) {
    if (game.s3.qCount > 40) fail('wiecej niz 40 pytan w finale', game.s3.qCount);
  }
  if (!game.result) fail('brak wyniku gry');
  else {
    if (!game.result.winnerIds.length) fail('brak zwyciezcy');
    if (al.length === 1 && game.result.winnerIds[0] !== al[0].id) fail('zwyciezca to nie ostatni gracz z szansami');
  }
  return { game, stats, steps };
}

const summary = { finishedByLast: 0, finishedByPoints: 0, ties: 0, stage2Used: 0, directToFinal: 0, avgQuestions: 0, recycled: 0 };
const t0 = Date.now();
for (let i = 0; i < games; i++) {
  const acc = [0.4, 0.6, 0.75, 0.9][i % 4];
  let out;
  try {
    out = runOne(i, playerCount, acc);
  } catch (e) {
    fail(`wyjatek w grze ${i}: ${e.stack}`);
    continue;
  }
  const g = out.game;
  if (g.result && /Został jeden/.test(g.result.reason)) summary.finishedByLast++;
  else summary.finishedByPoints++;
  if (g.result && g.result.winnerIds.length > 1) summary.ties++;
  if (out.stats.stages.has(2)) summary.stage2Used++;
  else summary.directToFinal++;
  summary.avgQuestions += g.questionsAsked;
  if (g.recycled) summary.recycled++;
  if (verbose && i === 0) {
    console.log('--- Przykladowa gra (log) ---');
    g.log.forEach((l) => console.log(' ', l.text));
  }
}
summary.avgQuestions = Math.round(summary.avgQuestions / games);
console.log(`Gier: ${games}, graczy: ${playerCount}, czas: ${Date.now() - t0} ms`);
console.log('Podsumowanie:', summary);
if (failures) {
  console.error(`\nZNALEZIONO BŁĘDÓW: ${failures}`);
  process.exit(1);
}
console.log('OK - wszystkie sprawdzenia zasad przeszły.');
