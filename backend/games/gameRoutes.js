'use strict';
// Trasy API gier teleturniejowych (na razie jeden format: "1 z 10").
// Stan gier trzymany w pamieci i zapisywany do data/games.json (przezywa restart serwera).
// Klienci (TV, prowadzacy, telefony uczestnikow) odpytuja GET /state co ~1 s; przy braku zmian dostaja krotka odpowiedz.

const fs = require('fs');
const path = require('path');
const engine = require('./jedenZDziesieciu');
const { SAMPLE_QUESTIONS } = require('./sampleQuestions');
const { MUSIC_QUESTIONS } = require('./musicQuestions');
const fam = require('./familiada');
const { FAMILIADA_SAMPLE_QUESTIONS } = require('./familiadaQuestions');
const crypto = require('crypto');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // bez I i O (mylace z 1 i 0)
const BOT_NAMES = ['Ania', 'Bartek', 'Celina', 'Darek', 'Ewa', 'Franek', 'Gosia', 'Heniek', 'Iza', 'Janek'];
const JOIN_LIMIT_PER_10_MIN = 40;

module.exports = function registerGameRoutes({ app, isAdminRequest, readQuestions, dataDir }) {
  const FILE = path.join(dataDir, 'games.json');
  const PHOTO_DIR = path.join(dataDir, 'game-photos');
  const games = new Map();
  const joinAttempts = new Map();
  const photoLimits = new Map();
  const FAM_QUESTIONS_FILE = path.join(dataDir, 'familiada-questions.json');
  let saveTimer = null;
  // Kazdy format ma wlasny silnik o tym samym interfejsie (tick / viewFor)
  const engineOf = (g) => (g.format === fam.FORMAT_ID ? fam : engine);

  // ---------- Zapis / odczyt ----------
  function load() {
    try {
      const list = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      for (const g of list) games.set(g.code, g);
    } catch (e) {
      /* brak pliku = brak gier */
    }
    cleanup();
  }

  function saveSoon() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        const tmp = `${FILE}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify([...games.values()]));
        fs.renameSync(tmp, FILE);
      } catch (e) {
        console.error('Nie udało się zapisać games.json:', e.message);
      }
    }, 800);
  }

  // Zdjecia uczestnikow: osobne pliki (nie trafiaja do stanu gry); kasowane razem z gra
  const photoPath = (code, playerId) => path.join(PHOTO_DIR, `${code}_${String(playerId).replace(/[^a-f0-9-]/gi, '')}.jpg`);

  function deletePhotos(code) {
    try {
      for (const f of fs.readdirSync(PHOTO_DIR)) {
        if (f.startsWith(`${code}_`)) fs.unlinkSync(path.join(PHOTO_DIR, f));
      }
    } catch (e) {
      /* brak katalogu = brak zdjec */
    }
  }

  function cleanup() {
    const now = Date.now();
    for (const [code, g] of games) {
      const age = now - (g.finishedAt || g.createdAt);
      const limit = g.status === 'finished' ? 3 * 864e5 : g.test ? 12 * 36e5 : 2 * 864e5;
      if (age > limit) {
        games.delete(code);
        deletePhotos(code);
      }
    }
    saveSoon();
  }

  load();
  setInterval(cleanup, 60 * 60 * 1000).unref();

  // ---------- Zegar gier (timeouty, boty) ----------
  setInterval(() => {
    const now = Date.now();
    for (const g of games.values()) {
      if (g.status !== 'running') continue;
      try {
        if (engineOf(g).tick(g, now)) {
          g.version++;
          saveSoon();
        }
      } catch (e) {
        console.error(`Błąd zegara gry ${g.code}:`, e.message);
      }
    }
  }, 500).unref();

  // ---------- Pomocnicze ----------
  const num = (v, min, max, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };

  function sanitizeConfig(input, base) {
    const c = { ...base };
    if (!input || typeof input !== 'object') return c;
    if (input.answerSeconds !== undefined) c.answerSeconds = num(input.answerSeconds, 5, 120, c.answerSeconds);
    if (input.buzzSeconds !== undefined) c.buzzSeconds = num(input.buzzSeconds, 5, 60, c.buzzSeconds);
    if (input.designateSeconds !== undefined) c.designateSeconds = num(input.designateSeconds, 10, 120, c.designateSeconds);
    if (input.autoAdvanceSeconds !== undefined) c.autoAdvanceSeconds = num(input.autoAdvanceSeconds, 0, 60, c.autoAdvanceSeconds);
    if (input.botAccuracy !== undefined) c.botAccuracy = num(input.botAccuracy, 0.05, 0.98, c.botAccuracy);
    if (input.botSpeed !== undefined) c.botSpeed = num(input.botSpeed, 0.05, 3, c.botSpeed || 1);
    return c;
  }

  function sanitizeFamConfig(input, base) {
    const c = { ...base };
    if (!input || typeof input !== 'object') return c;
    if (input.targetScore !== undefined) c.targetScore = num(input.targetScore, 50, 1000, c.targetScore);
    if (input.finalTarget !== undefined) c.finalTarget = num(input.finalTarget, 50, 500, c.finalTarget);
    if (input.final1Seconds !== undefined) c.final1Seconds = num(input.final1Seconds, 5, 60, c.final1Seconds);
    if (input.final2Seconds !== undefined) c.final2Seconds = num(input.final2Seconds, 5, 90, c.final2Seconds);
    return c;
  }

  // Zapis zdjecia uczestnika (JPEG, walidacja rozmiaru i naglowka, limit zmian)
  function storePhoto(g, member, photo, now) {
    const data = typeof photo === 'string' ? photo : '';
    if (data.length > 600000) throw new Error('Zdjęcie jest za duże');
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
    if (!m) throw new Error('Nieprawidłowe zdjęcie (wymagany format JPEG)');
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length < 200 || buf.length > 300 * 1024) throw new Error('Zdjęcie ma niepoprawny rozmiar');
    if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) throw new Error('To nie jest plik JPEG');
    const rec = (photoLimits.get(member.id) || []).filter((t) => now - t < 60 * 1000);
    if (rec.length >= 8) throw new Error('Za dużo zmian zdjęcia. Spróbuj za minutę.');
    rec.push(now);
    photoLimits.set(member.id, rec);
    fs.mkdirSync(PHOTO_DIR, { recursive: true });
    fs.writeFileSync(photoPath(g.code, member.id), buf);
    member.photoV = (member.photoV || 0) + 1;
  }

  function readFamQuestions() {
    try {
      const parsed = JSON.parse(fs.readFileSync(FAM_QUESTIONS_FILE, 'utf8'));
      return Array.isArray(parsed.questions) ? parsed.questions : [];
    } catch (e) {
      return [];
    }
  }

  function writeFamQuestions(list) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(FAM_QUESTIONS_FILE, JSON.stringify({ questions: list }, null, 2));
  }

  function newCode() {
    for (let attempt = 0; attempt < 200; attempt++) {
      let code = '';
      for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (!games.has(code)) return code;
    }
    throw new Error('Nie udało się wygenerować kodu gry');
  }

  const toEnginePool = (list) =>
    list.map((q) => ({
      id: q.id,
      typ: q.typ,
      pytanie: q.pytanie,
      odp_a: q.odp_a,
      odp_b: q.odp_b,
      odp_c: q.odp_c,
      odp_d: q.odp_d,
      poprawna_odpowiedz: q.poprawna_odpowiedz,
      alt: q.alt || [],
      media: q.media || null,
      link: q.link || null,
      start: q.start || 0,
      end: q.end || 0,
    }));

  const getGame = (code) => games.get(String(code || '').toUpperCase());

  const summary = (g) => ({
    code: g.code,
    format: g.format,
    test: g.test,
    status: g.status,
    stage: g.stage !== undefined ? g.stage : g.phase,
    teams: g.teams ? g.teams.map((t) => t.name) : undefined,
    players: g.players.length,
    source: g.source,
    createdAt: g.createdAt,
  });

  const touch = (g) => {
    g.version++;
    saveSoon();
  };

  const fail = (res, status, message) => res.status(status).json({ error: message });

  // Panel gier (/teleturniej/gry, prowadzacy, edytor pytan) jest domyslnie otwarty - strona jest prywatna, dla znajomych.
  // Aby znowu wymagac hasla administratora, ustaw na serwerze GAMES_REQUIRE_PASSWORD=1.
  const gamesOpen = process.env.GAMES_REQUIRE_PASSWORD !== '1';
  const isHostRequest = (req) => gamesOpen || isAdminRequest(req);

  const requireAdmin = (req, res) => {
    if (isHostRequest(req)) return true;
    fail(res, 401, 'Brak uprawnień. Zaloguj się do panelu administracyjnego.');
    return false;
  };

  // Gracz = token gracza; w trybie testowym admin moze dzialac jako dowolny gracz (parametr as / playerId)
  function resolvePlayer(req, game, asId) {
    const token = (req.query && req.query.token) || (req.body && req.body.token);
    if (token) {
      const p = game.players.find((x) => x.token === token);
      if (p) return p;
    }
    if (game.test && isHostRequest(req) && asId) {
      return game.players.find((x) => x.id === asId) || null;
    }
    return null;
  }

  // ---------- Przedstawianie z kamera (WebRTC) ----------
  // Serwer tylko przekazuje wiadomosci sygnalizacyjne (hello/offer/answer/ice); obraz idzie prosto z telefonu do TV.
  // Dziala tylko w poczekalni (przed startem gry). Stan trzymany w pamieci - nie trafia do games.json.
  const intros = new Map(); // kod gry -> { presenterId, rev, status, seq, msgs }
  const SIGNAL_TYPES = ['hello', 'offer', 'answer', 'ice', 'bye'];
  const INTRO_STATUSES = ['waiting', 'connecting', 'live', 'failed', 'frames'];

  const introView = (g) => {
    const it = intros.get(g.code);
    if (!it || g.status !== 'lobby') return null;
    const p = g.players.find((x) => x.id === it.presenterId);
    if (!p) return null;
    return { presenterId: p.id, name: p.name, rev: it.rev, status: it.status, mode: it.mode || 'auto' };
  };

  app.post('/api/games/:code/intro', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const body = req.body || {};
    if (body.action === 'stop') {
      intros.delete(g.code);
      touch(g);
      return res.json({ success: true });
    }
    if (body.action === 'mode') {
      const it = intros.get(g.code);
      if (!it) return fail(res, 400, 'Przedstawianie nie jest włączone');
      if (!['auto', 'live', 'frames'].includes(body.mode)) return fail(res, 400, 'Nieznany tryb');
      it.mode = body.mode;
      // przy zmianie trybu telefon i TV ustalaja status od nowa
      it.status = body.mode === 'frames' ? 'frames' : 'connecting';
      touch(g);
      return res.json({ success: true });
    }
    if (body.action !== 'start') return fail(res, 400, 'Nieznana akcja');
    if (g.status !== 'lobby') return fail(res, 400, 'Przedstawianie jest możliwe tylko przed startem gry');
    const p = g.players.find((x) => x.id === body.playerId);
    if (!p) return fail(res, 404, 'Nie znaleziono osoby');
    if (p.isBot) return fail(res, 400, 'Bot nie ma kamery');
    intros.set(g.code, { presenterId: p.id, rev: crypto.randomUUID(), status: 'waiting', mode: 'auto', seq: 0, msgs: [] });
    touch(g);
    res.json({ success: true });
  });

  function signalAuth(req, res, g, role, body) {
    const it = intros.get(g.code);
    if (!it || g.status !== 'lobby') {
      res.json({ active: false });
      return null;
    }
    if (String(body.rev) !== it.rev) {
      res.json({ active: false, stale: true });
      return null;
    }
    if (role === 'phone') {
      const p = resolvePlayer(req, g, body.as);
      if (!p || p.id !== it.presenterId) {
        fail(res, 403, 'To nie Ty się teraz przedstawiasz');
        return null;
      }
    } else if (role !== 'tv') {
      fail(res, 400, 'Nieznana rola');
      return null;
    }
    return it;
  }

  app.post('/api/games/:code/signal', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const body = req.body || {};
    const role = body.role;
    const it = signalAuth(req, res, g, role, body);
    if (!it) return undefined;
    if (body.type === 'status') {
      if (role !== 'tv' || !INTRO_STATUSES.includes(body.value)) return fail(res, 400, 'Nieprawidłowy status');
      if (it.status !== body.value) {
        it.status = body.value;
        touch(g);
      }
      return res.json({ success: true });
    }
    if (!SIGNAL_TYPES.includes(body.type)) return fail(res, 400, 'Nieznany typ wiadomości');
    const data = body.data === undefined ? null : body.data;
    if (JSON.stringify(data).length > 30000) return fail(res, 413, 'Wiadomość jest za duża');
    it.seq += 1;
    it.msgs.push({ id: it.seq, to: role === 'tv' ? 'phone' : 'tv', type: body.type, sid: String(body.sid || '').slice(0, 64), data });
    if (it.msgs.length > 300) it.msgs.splice(0, it.msgs.length - 300);
    res.json({ success: true, id: it.seq });
  });

  // Tryb zastepczy dla przegladarek bez WebRTC (np. niektore telewizory): telefon wysyla klatki JPEG, TV je pobiera (bez dzwieku)
  app.post('/api/games/:code/intro-frame', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const body = req.body || {};
    const it = signalAuth(req, res, g, 'phone', body);
    if (!it) return undefined;
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(typeof body.frame === 'string' ? body.frame : '');
    if (!m) return fail(res, 400, 'Nieprawidłowa klatka');
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > 200 * 1024) return fail(res, 413, 'Klatka jest za duża');
    it.frame = buf;
    it.frameV = (it.frameV || 0) + 1;
    res.json({ success: true });
  });

  app.get('/api/games/:code/intro-frame', (req, res) => {
    const g = getGame(req.params.code);
    const it = g && intros.get(g.code);
    if (!it || !it.frame || String(req.query.rev) !== it.rev) return res.status(404).end();
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
    res.send(it.frame);
  });

  app.get('/api/games/:code/signal', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const role = req.query.role;
    const it = signalAuth(req, res, g, role, { rev: req.query.rev, as: req.query.as });
    if (!it) return undefined;
    const since = Number(req.query.since) || 0;
    res.set('Cache-Control', 'no-store');
    res.json({ active: true, status: it.status, msgs: it.msgs.filter((m) => m.to === role && m.id > since) });
  });

  // ---------- Trasy ----------
  app.get('/api/games/formats', (req, res) => {
    res.json([
      {
        id: engine.FORMAT_ID,
        label: '1 z 10',
        minPlayers: engine.MIN_PLAYERS,
        maxPlayers: engine.MAX_PLAYERS,
        defaults: engine.DEFAULT_CONFIG,
      },
      {
        id: fam.FORMAT_ID,
        label: 'Familiada',
        minPlayers: 0,
        maxPlayers: 10,
        defaults: fam.DEFAULT_CONFIG,
      },
    ]);
  });

  app.get('/api/games', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json([...games.values()].map(summary).sort((a, b) => b.createdAt - a.createdAt));
  });

  app.post('/api/games', async (req, res) => {
    try {
      if (!requireAdmin(req, res)) return;
      const body = req.body || {};
      if (body.format === fam.FORMAT_ID) {
        const testFam = !!body.test;
        const src = ['custom', 'all'].includes(body.source) ? body.source : 'sample';
        const custom = readFamQuestions();
        let famPool = src === 'custom' ? custom : src === 'all' ? [...FAMILIADA_SAMPLE_QUESTIONS, ...custom] : FAMILIADA_SAMPLE_QUESTIONS;
        if (famPool.length < 12) return fail(res, 400, `W puli jest za mało pytań (${famPool.length}, potrzeba co najmniej 12). Dodaj własne albo użyj wbudowanej puli.`);
        const fgame = fam.createGame({ code: newCode(), test: testFam, source: src, pool: famPool, config: sanitizeFamConfig(body.config, { ...fam.DEFAULT_CONFIG }) });
        let famTester = null;
        if (testFam) {
          famTester = fam.addMember(fgame, { name: 'Ty (test)', team: 0, isBot: false });
          ['Ania', 'Bartek', 'Celina'].forEach((n) => fam.addMember(fgame, { name: `Bot ${n}`, team: 0, isBot: true }));
          ['Darek', 'Ewa', 'Franek', 'Gosia'].forEach((n) => fam.addMember(fgame, { name: `Bot ${n}`, team: 1, isBot: true }));
        }
        games.set(fgame.code, fgame);
        saveSoon();
        return res.json({ code: fgame.code, test: testFam, playerId: famTester ? famTester.id : null, token: famTester ? famTester.token : null });
      }
      if (body.format && body.format !== engine.FORMAT_ID) return fail(res, 400, 'Nieznany format teleturnieju');
      const test = !!body.test;
      const source = body.source === 'bank' ? 'bank' : body.source === 'music' ? 'music' : 'sample';

      let pool;
      if (source === 'bank') {
        const data = await readQuestions();
        pool = toEnginePool(data.questions || []);
        if (pool.length < 5) return fail(res, 400, `W banku jest za mało pytań (${pool.length}). Dodaj ich więcej na /teleturniej albo użyj wbudowanej puli.`);
      } else if (source === 'music') {
        pool = toEnginePool(MUSIC_QUESTIONS);
      } else {
        pool = toEnginePool(SAMPLE_QUESTIONS);
      }

      const baseConfig = test
        ? { ...engine.DEFAULT_CONFIG, autoAdvanceSeconds: 0, answerSeconds: 15 }
        : { ...engine.DEFAULT_CONFIG };
      const game = engine.createGame({
        code: newCode(),
        test,
        source,
        pool,
        config: sanitizeConfig(body.config, baseConfig),
      });

      let tester = null;
      if (test) {
        tester = engine.addPlayer(game, { name: 'Ty (test)', isBot: false });
        for (let i = 0; i < 9; i++) engine.addPlayer(game, { name: `Bot ${BOT_NAMES[i]}`, isBot: true });
      }
      games.set(game.code, game);
      saveSoon();
      res.json({ code: game.code, test, playerId: tester ? tester.id : null, token: tester ? tester.token : null });
    } catch (error) {
      console.error('Error creating game:', error);
      fail(res, 500, error.message || 'Nie udało się utworzyć gry');
    }
  });

  app.delete('/api/games/:code', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    games.delete(g.code);
    deletePhotos(g.code);
    saveSoon();
    res.json({ success: true });
  });

  // Stan gry dla widoku TV / prowadzacego / gracza
  app.get('/api/games/:code/state', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry o takim kodzie');
    const role = req.query.role;
    const now = Date.now();
    try {
      if (g.status === 'running') {
        if (engineOf(g).tick(g, now)) touch(g);
      }
      let player = null;
      if (role === 'host') {
        if (!requireAdmin(req, res)) return;
      } else if (role === 'player') {
        player = resolvePlayer(req, g, req.query.as);
        if (!player) return fail(res, 401, 'Nie rozpoznano gracza - dołącz do gry ponownie');
      } else if (role !== 'tv') {
        return fail(res, 400, 'Nieznana rola widoku');
      }
      if (String(req.query.since) === String(g.version) && !req.query.force) {
        return res.json({ unchanged: true, version: g.version, now });
      }
      res.set('Cache-Control', 'no-store');
      const view = engineOf(g).viewFor(g, role, player, now);
      view.intro = introView(g);
      view.mediaCmd = g.mediaCmd || null;
      res.json(view);
    } catch (error) {
      console.error('Error building game state:', error);
      fail(res, 500, 'Błąd serwera');
    }
  });

  // Dolaczenie z telefonu
  app.post('/api/games/:code/join', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry o takim kodzie');
    const now = Date.now();
    const ip = req.ip || 'unknown';
    const recent = (joinAttempts.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= JOIN_LIMIT_PER_10_MIN) return fail(res, 429, 'Zbyt wiele prób. Spróbuj za chwilę.');
    recent.push(now);
    joinAttempts.set(ip, recent);
    try {
      if (g.format === fam.FORMAT_ID) {
        const teamRaw = req.body && req.body.team;
        const pf = fam.addMember(g, { name: req.body && req.body.name, team: teamRaw === 0 || teamRaw === 1 ? teamRaw : null, isBot: false });
        touch(g);
        return res.json({ playerId: pf.id, token: pf.token, name: pf.name, team: pf.team });
      }
      const p = engine.addPlayer(g, { name: req.body && req.body.name, isBot: false });
      touch(g);
      res.json({ playerId: p.id, token: p.token, seat: p.seat, name: p.name });
    } catch (error) {
      fail(res, 400, error.message);
    }
  });

  // Akcje prowadzacego
  app.post('/api/games/:code/host', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const body = req.body || {};
    const now = Date.now();
    try {
      if (g.format === fam.FORMAT_ID) {
        if (body.action === 'config') g.config = sanitizeFamConfig(body.config, g.config);
        else if (body.action === 'memberPhoto') {
          const target = g.players.find((p) => p.id === body.playerId);
          if (!target) throw new Error('Nie znaleziono osoby');
          storePhoto(g, target, body.photo, now);
        } else if (body.action === 'removeMemberPhoto') {
          const target = g.players.find((p) => p.id === body.playerId);
          if (!target) throw new Error('Nie znaleziono osoby');
          try {
            fs.unlinkSync(photoPath(g.code, target.id));
          } catch (e) {
            /* nie bylo zdjecia */
          }
          target.photoV = 0;
        } else if (body.action === 'kick') {
          fam.hostAction(g, body, now);
          try {
            fs.unlinkSync(photoPath(g.code, body.playerId));
          } catch (e) {
            /* nie bylo zdjecia */
          }
        } else fam.hostAction(g, body, now);
        touch(g);
        return res.json({ success: true, version: g.version });
      }
      switch (body.action) {
        case 'start':
          engine.start(g, now);
          break;
        case 'next':
          if (g.status !== 'running' || !g.current || g.current.status !== 'revealed') throw new Error('Najpierw trzeba zakończyć bieżące pytanie');
          engine.advance(g, now);
          break;
        case 'judge':
          engine.judge(g, !!body.correct, now);
          break;
        case 'approve':
          engine.approve(g, now);
          break;
        case 'skip':
          engine.replaceQuestion(g, now);
          break;
        case 'pause':
          engine.pause(g, now);
          break;
        case 'resume':
          engine.resume(g, now);
          break;
        case 'designate': {
          const by = body.byId || (g.awaiting && g.awaiting.byId);
          engine.designate(g, by, body.targetId, now);
          break;
        }
        case 'kick':
          engine.removePlayer(g, body.playerId);
          break;
        case 'addBot': {
          const used = new Set(g.players.map((p) => p.name));
          const name = BOT_NAMES.map((n) => `Bot ${n}`).find((n) => !used.has(n)) || `Bot ${g.players.length + 1}`;
          engine.addPlayer(g, { name, isBot: true });
          break;
        }
        case 'config':
          g.config = sanitizeConfig(body.config, g.config);
          break;
        case 'media': {
          if (!['play', 'pause', 'restart'].includes(body.cmd)) throw new Error('Nieznana komenda multimediów');
          if (!g.current || !g.current.q || !g.current.q.link) throw new Error('To pytanie nie ma filmu ani utworu');
          g.mediaCmd = { n: ((g.mediaCmd && g.mediaCmd.n) || 0) + 1, cmd: body.cmd, qid: g.current.q.id };
          break;
        }
        case 'end':
          if (g.status === 'running') engine.finish(g, now, 'Gra zakończona przez prowadzącego');
          break;
        default:
          throw new Error('Nieznana akcja prowadzącego');
      }
      touch(g);
      res.json({ success: true, version: g.version });
    } catch (error) {
      fail(res, 400, error.message);
    }
  });

  // Zdjecie uczestnika (publiczne po kodzie gry i id gracza; adres zawiera numer wersji, wiec przegladarka je cache'uje)
  app.get('/api/games/:code/photo/:playerId', (req, res) => {
    const g = getGame(req.params.code);
    if (!g || !g.players.some((p) => p.id === req.params.playerId && p.photoV)) return res.status(404).end();
    fs.readFile(photoPath(g.code, req.params.playerId), (err, buf) => {
      if (err) return res.status(404).end();
      res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
      res.send(buf);
    });
  });

  // ---------- Pytania Familiady (wlasne, edytor w hubie) ----------
  app.get('/api/familiada/questions', (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ custom: readFamQuestions(), sampleCount: FAMILIADA_SAMPLE_QUESTIONS.length });
  });

  app.post('/api/familiada/questions', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = req.body || {};
    const pytanie = typeof body.pytanie === 'string' ? body.pytanie.trim() : '';
    if (!pytanie || pytanie.length > 200) return fail(res, 400, 'Wpisz pytanie (maks. 200 znaków)');
    const raw = Array.isArray(body.odpowiedzi) ? body.odpowiedzi : [];
    const answers = raw
      .map((a) => ({ tekst: typeof a.tekst === 'string' ? a.tekst.trim().toUpperCase() : '', punkty: Number(a.punkty) }))
      .filter((a) => a.tekst);
    if (answers.length < 3 || answers.length > 6) return fail(res, 400, 'Pytanie musi mieć od 3 do 6 odpowiedzi');
    for (const a of answers) {
      if ([...a.tekst].length > fam.MAX_ANSWER_CHARS) return fail(res, 400, `Odpowiedź „${a.tekst}” ma więcej niż ${fam.MAX_ANSWER_CHARS} znaków (tablica tyle nie pomieści)`);
      if (!Number.isInteger(a.punkty) || a.punkty < 1 || a.punkty > 99) return fail(res, 400, `Punkty muszą być liczbą całkowitą 1–99 (odpowiedź „${a.tekst}”)`);
    }
    if (new Set(answers.map((a) => a.tekst)).size !== answers.length) return fail(res, 400, 'Odpowiedzi nie mogą się powtarzać');
    answers.sort((x, y) => y.punkty - x.punkty);
    const list = readFamQuestions();
    list.push({ id: `fam-${crypto.randomUUID()}`, pytanie, odpowiedzi: answers, dodano: new Date().toISOString() });
    writeFamQuestions(list);
    res.json({ success: true, count: list.length });
  });

  app.delete('/api/familiada/questions/:id', (req, res) => {
    if (!requireAdmin(req, res)) return;
    const list = readFamQuestions();
    const next = list.filter((q) => q.id !== req.params.id);
    if (next.length === list.length) return fail(res, 404, 'Nie znaleziono pytania');
    writeFamQuestions(next);
    res.json({ success: true });
  });

  // Akcje uczestnika (telefon)
  app.post('/api/games/:code/player', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const body = req.body || {};
    const player = resolvePlayer(req, g, body.as);
    if (!player) return fail(res, 401, 'Nie rozpoznano gracza - dołącz do gry ponownie');
    const now = Date.now();
    try {
      if (g.format === fam.FORMAT_ID && body.action !== 'photo' && body.action !== 'removePhoto') {
        fam.memberAction(g, player, body, now);
        touch(g);
        return res.json({ success: true, version: g.version });
      }
      switch (body.action) {
        case 'answer':
          engine.submitAnswer(g, player.id, body.value, now);
          break;
        case 'buzz':
          engine.buzz(g, player.id, now);
          break;
        case 'designate':
          engine.designate(g, player.id, body.targetId, now);
          break;
        case 'photo':
          storePhoto(g, player, body.photo, now);
          break;
        case 'removePhoto':
          try {
            fs.unlinkSync(photoPath(g.code, player.id));
          } catch (e) {
            /* nie bylo zdjecia */
          }
          player.photoV = 0;
          break;
        default:
          throw new Error('Nieznana akcja gracza');
      }
      touch(g);
      res.json({ success: true, version: g.version });
    } catch (error) {
      fail(res, 400, error.message);
    }
  });
};
