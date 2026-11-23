'use strict';
// Trasy API gier teleturniejowych (na razie jeden format: "1 z 10").
// Stan gier trzymany w pamieci i zapisywany do data/games.json (przezywa restart serwera).
// Klienci (TV, prowadzacy, telefony uczestnikow) odpytuja GET /state co ~1 s; przy braku zmian dostaja krotka odpowiedz.

const fs = require('fs');
const path = require('path');
const engine = require('./jedenZDziesieciu');
const { SAMPLE_QUESTIONS } = require('./sampleQuestions');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // bez I i O (mylace z 1 i 0)
const BOT_NAMES = ['Ania', 'Bartek', 'Celina', 'Darek', 'Ewa', 'Franek', 'Gosia', 'Heniek', 'Iza', 'Janek'];
const JOIN_LIMIT_PER_10_MIN = 40;

module.exports = function registerGameRoutes({ app, isAdminRequest, readQuestions, dataDir }) {
  const FILE = path.join(dataDir, 'games.json');
  const PHOTO_DIR = path.join(dataDir, 'game-photos');
  const games = new Map();
  const joinAttempts = new Map();
  const photoLimits = new Map();
  let saveTimer = null;

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
        if (engine.tick(g, now)) {
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
    if (input.autoJudgeOpen !== undefined) c.autoJudgeOpen = !!input.autoJudgeOpen;
    if (input.botAccuracy !== undefined) c.botAccuracy = num(input.botAccuracy, 0.05, 0.98, c.botAccuracy);
    if (input.botSpeed !== undefined) c.botSpeed = num(input.botSpeed, 0.05, 3, c.botSpeed || 1);
    return c;
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
    }));

  const getGame = (code) => games.get(String(code || '').toUpperCase());

  const summary = (g) => ({
    code: g.code,
    format: g.format,
    test: g.test,
    status: g.status,
    stage: g.stage,
    players: g.players.length,
    source: g.source,
    createdAt: g.createdAt,
  });

  const touch = (g) => {
    g.version++;
    saveSoon();
  };

  const fail = (res, status, message) => res.status(status).json({ error: message });

  const requireAdmin = (req, res) => {
    if (isAdminRequest(req)) return true;
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
    if (game.test && isAdminRequest(req) && asId) {
      return game.players.find((x) => x.id === asId) || null;
    }
    return null;
  }

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
      if (body.format && body.format !== engine.FORMAT_ID) return fail(res, 400, 'Nieznany format teleturnieju');
      const test = !!body.test;
      const source = body.source === 'bank' ? 'bank' : 'sample';

      let pool;
      if (source === 'bank') {
        const data = await readQuestions();
        pool = toEnginePool(data.questions || []);
        if (pool.length < 5) return fail(res, 400, `W banku jest za mało pytań (${pool.length}). Dodaj ich więcej na /teleturniej albo użyj wbudowanej puli.`);
      } else {
        pool = toEnginePool(SAMPLE_QUESTIONS);
      }

      const baseConfig = test
        ? { ...engine.DEFAULT_CONFIG, autoJudgeOpen: true, autoAdvanceSeconds: 4, answerSeconds: 15 }
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
        if (engine.tick(g, now)) touch(g);
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
      res.json(engine.viewFor(g, role, player, now));
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
        case 'skip':
          engine.replaceQuestion(g, now);
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

  // Akcje uczestnika (telefon)
  app.post('/api/games/:code/player', (req, res) => {
    const g = getGame(req.params.code);
    if (!g) return fail(res, 404, 'Nie znaleziono gry');
    const body = req.body || {};
    const player = resolvePlayer(req, g, body.as);
    if (!player) return fail(res, 401, 'Nie rozpoznano gracza - dołącz do gry ponownie');
    const now = Date.now();
    try {
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
        case 'photo': {
          const photo = typeof body.photo === 'string' ? body.photo : '';
          if (photo.length > 600000) throw new Error('Zdjęcie jest za duże');
          const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo);
          if (!m) throw new Error('Nieprawidłowe zdjęcie (wymagany format JPEG)');
          const buf = Buffer.from(m[1], 'base64');
          if (buf.length < 200 || buf.length > 300 * 1024) throw new Error('Zdjęcie ma niepoprawny rozmiar');
          if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) throw new Error('To nie jest plik JPEG');
          const rec = (photoLimits.get(player.id) || []).filter((t) => now - t < 60 * 1000);
          if (rec.length >= 8) throw new Error('Za dużo zmian zdjęcia. Spróbuj za minutę.');
          rec.push(now);
          photoLimits.set(player.id, rec);
          fs.mkdirSync(PHOTO_DIR, { recursive: true });
          fs.writeFileSync(photoPath(g.code, player.id), buf);
          player.photoV = (player.photoV || 0) + 1;
          break;
        }
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
