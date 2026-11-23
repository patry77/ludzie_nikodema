'use strict';
// Narzedzie deweloperskie: symuluje pelne gry Familiady z losowymi decyzjami prowadzacego i sprawdza zasady.
// Uruchomienie: node backend/games/simulateFam.js [liczba_gier]
const fam = require('./familiada');
const { FAMILIADA_SAMPLE_QUESTIONS } = require('./familiadaQuestions');

const games = parseInt(process.argv[2] || '300', 10);
let failures = 0;
const fail = (m, c) => { failures++; console.error('BŁĄD:', m, c || ''); };
const rnd = (n) => Math.floor(Math.random() * n);

function runOne(i) {
  const g = fam.createGame({ code: 'F' + i, test: false, source: 'sample', pool: FAMILIADA_SAMPLE_QUESTIONS, config: {} });
  const sizeA = 1 + rnd(5), sizeB = 1 + rnd(5);
  for (let k = 0; k < sizeA; k++) fam.addMember(g, { name: 'A' + k, team: 0 });
  for (let k = 0; k < sizeB; k++) fam.addMember(g, { name: 'B' + k, team: 1 });
  let now = 1e6;
  fam.hostAction(g, { action: 'start' }, now);
  let steps = 0, awarded = [0, 0], rounds = 0;
  const act = (body) => fam.hostAction(g, body, now);
  while (g.status === 'running' && steps++ < 20000) {
    now += 500;
    const r = g.round;
    switch (g.phase) {
      case 'faceoff': {
        if (r.fo.first === null) { act({ action: 'buzz', team: rnd(2) }); break; }
        const free = r.question.answers.map((a, k) => (a.revealed ? -1 : k)).filter((k) => k >= 0);
        const hit = Math.random() < 0.7 && free.length;
        act({ action: 'foAnswer', idx: hit ? (Math.random() < 0.4 ? free[0] : free[rnd(free.length)]) : null });
        break;
      }
      case 'decision': {
        const w = r.fo.winner;
        act({ action: 'decide', play: Math.random() < 0.85 });
        if (g.phase === 'play' && r.ctrl !== w && r.ctrl !== 1 - w) fail('niepoprawna kontrola');
        break;
      }
      case 'play': {
        const free = r.question.answers.map((a, k) => (a.revealed ? -1 : k)).filter((k) => k >= 0);
        if (!free.length) { fail('play bez wolnych odpowiedzi'); return g; }
        if (Math.random() < 0.6) act({ action: 'answer', idx: free[rnd(free.length)] });
        else act({ action: 'strike' });
        break;
      }
      case 'steal': {
        const free = r.question.answers.map((a, k) => (a.revealed ? -1 : k)).filter((k) => k >= 0);
        const before = g.teams.map((t) => t.score);
        const bank = r.bank;
        const ctrl = r.ctrl;
        const hit = Math.random() < 0.4 && free.length;
        act({ action: 'steal', idx: hit ? free[rnd(free.length)] : null });
        // kto powinien dostac punkty?
        const expectWinner = hit ? 1 - ctrl : ctrl;
        const gained = g.teams.map((t, k) => t.score - before[k]);
        if (gained[expectWinner] !== r.bank) fail('zla pula po przejeciu', { gained, bank: r.bank, hit });
        if (gained[1 - expectWinner] !== 0) fail('punkty dla zlej druzyny po przejeciu', gained);
        break;
      }
      case 'roundEnd': {
        rounds++;
        const exp = r.bank;
        if (r.winner === null) fail('brak zwyciezcy rundy');
        if (Math.random() < 0.5) act({ action: 'revealRest' });
        act({ action: 'next' });
        break;
      }
      case 'stageEnd': {
        const w = g.stageWinner;
        if (g.teams[w].score < g.config.targetScore) fail('awans bez 300 pkt', g.teams.map((t) => t.score));
        if (g.teams[1 - w].score >= g.config.targetScore && g.teams[1 - w].score > g.teams[w].score) fail('awans slabszej druzyny');
        act({ action: 'startFinal', repIds: [] });
        break;
      }
      case 'final': {
        const f = g.final;
        act({ action: 'finalStart' });
        for (let q = 0; q < 5; q++) {
          const free = f.questions[q].q.answers.map((_, k) => k);
          act({ action: 'finalSet', qi: q, idx: Math.random() < 0.7 ? free[rnd(free.length)] : null, text: 'xx' });
        }
        act({ action: 'finalStop' });
        act({ action: 'finalStart' });
        let reps = 0;
        for (let q = 0; q < 5; q++) {
          const p1 = f.questions[q].p1;
          const idx = Math.random() < 0.7 ? rnd(f.questions[q].q.answers.length) : null;
          const before = g.seq.repeat;
          const res = act({ action: 'finalSet', qi: q, idx, text: '' });
          if (idx !== null && p1 && p1.idx === idx) { if (!(res && res.repeat) || g.seq.repeat !== before + 1) fail('powtorzenie nie wykryte'); if (f.questions[q].p2 && f.questions[q].p2.idx === idx) fail('powtorzona odpowiedz zapisana'); reps++; }
        }
        act({ action: 'finalStop' });
        if (Math.random() < 0.5) { act({ action: 'finalRevealNext' }); act({ action: 'finalRevealAll' }); } else act({ action: 'finalRevealAll' });
        break;
      }
      default: fail('nieoczekiwana faza ' + g.phase); return g;
    }
  }
  if (g.status !== 'finished') fail('gra sie nie zakonczyla', { phase: g.phase, steps });
  const sum = g.teams.reduce((s, t) => s + t.score, 0);
  if (!g.result || !g.result.final) fail('brak wyniku finalu');
  return { g, rounds };
}

const stats = { wins: 0, rounds: 0, maxRounds: 0 };
const t0 = Date.now();
for (let i = 0; i < games; i++) {
  try {
    const out = runOne(i);
    if (out.g) { stats.rounds += out.rounds; stats.maxRounds = Math.max(stats.maxRounds, out.rounds); if (out.g.result && out.g.result.final && out.g.result.final.win) stats.wins++; }
  } catch (e) { fail('wyjatek w grze ' + i + ': ' + e.stack); }
}
console.log(`Gier: ${games}, czas: ${Date.now() - t0} ms | srednio rund: ${(stats.rounds / games).toFixed(1)} (max ${stats.maxRounds}) | wygrane finaly: ${stats.wins}`);
if (failures) { console.error(`\nZNALEZIONO BŁĘDÓW: ${failures}`); process.exit(1); }
console.log('OK - wszystkie sprawdzenia zasad Familiady przeszły.');
