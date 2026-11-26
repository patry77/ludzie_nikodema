'use strict';
// Pytania teleturniejowe: dodawanie (publiczne), lista / edycja / usuwanie (admin) oraz wgrywanie wlasnych
// zdjec, filmow i nagran. Pytanie moze miec multimedia:
//  media: "muzyka" | "wideo" | "zdjecie"
//  link:  adres http(s) (np. YouTube) albo "/api/media/<plik>" dla pliku wgranego na serwer
//  start / end: fragment w sekundach (muzyka i wideo)
// Przyklady:
//  { "typ": "abcd", "pytanie": "...", "odp_a": "...", "odp_b": "...", "odp_c": "...", "odp_d": "...", "poprawna_odpowiedz": "b" }
//  { "typ": "otwarte", "pytanie": "...", "poprawna_odpowiedz": "Warszawa" }

const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const { spawn, spawnSync } = require('child_process');

// Limity wielkosci plikow. Film moze miec do 100 MB (nginx musi przepuszczac tyle: client_max_body_size) - serwer
// przekodowuje go ffmpeg-iem do 720p H.264, wiec w grze zostaje kilka MB. Zdjecia zmniejsza przegladarka.
const MEDIA_MAX_MB = Number(process.env.MEDIA_MAX_MB) > 0 ? Number(process.env.MEDIA_MAX_MB) : 100;
const MEDIA_MAX_BYTES = Math.floor(MEDIA_MAX_MB * 1024 * 1024);
const IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const AUDIO_MAX_MB = 25;
const AUDIO_MAX_BYTES = AUDIO_MAX_MB * 1024 * 1024;
const NO_FFMPEG_VIDEO_MAX_MB = 9; // limit filmu, gdy na serwerze nie ma ffmpeg (brak kompresji)
const SMALL_MP4_BYTES = 3 * 1024 * 1024; // male MP4 zostawiamy bez przekodowania
const FFMPEG_OK = (() => {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch (e) {
    return false;
  }
})();
const MEDIA_URL_PREFIX = '/api/media/';
const FILE_RE = /^[a-f0-9-]{36}\.(jpg|png|webp|gif|mp4|webm|mp3|m4a|ogg|wav)$/;
const KIND_OF_EXT = { jpg: 'zdjecie', png: 'zdjecie', webp: 'zdjecie', gif: 'zdjecie', mp4: 'wideo', webm: 'wideo', mp3: 'muzyka', m4a: 'muzyka', ogg: 'muzyka', wav: 'muzyka' };
const MIME_OF_EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav' };

// Rozpoznanie typu pliku po zawartosci (nie ufamy nazwie ani naglowkowi)
function sniffExt(buf) {
  if (buf.length < 12) return null;
  const hex = (a, b) => buf.slice(a, b).toString('hex');
  const ascii = (a, b) => buf.slice(a, b).toString('latin1');
  if (hex(0, 3) === 'ffd8ff') return 'jpg';
  if (hex(0, 4) === '89504e47') return 'png';
  if (ascii(0, 4) === 'GIF8') return 'gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';
  if (hex(0, 4) === '1a45dfa3') return 'webm';
  if (ascii(4, 8) === 'ftyp') return /^(M4A|M4B)/.test(ascii(8, 11)) ? 'm4a' : 'mp4';
  if (ascii(0, 4) === 'OggS') return 'ogg';
  if (ascii(0, 3) === 'ID3' || ['fffb', 'fff3', 'fff2'].includes(hex(0, 2))) return 'mp3';
  return null;
}

module.exports = function registerQuestionRoutes({ app, isAdminRequest, dataDir }) {
  const QUESTIONS_FILE = path.join(dataDir, 'questions.json');
  const MEDIA_DIR = path.join(dataDir, 'question-media');
  const attempts = new Map(); // ip -> [timestamps]
  const uploadAttempts = new Map();
  const jobs = new Map(); // nazwa pliku -> { state: processing | ready | failed, error?, at }
  let queue = Promise.resolve(); // filmy przetwarzamy po jednym (serwer ma 1 procesor)

  // Przekodowanie: miesci sie w 1280x720, H.264 + AAC, MP4 z "faststart" (dziala na kazdej przegladarce i TV)
  function transcode(srcPath, outPath) {
    return new Promise((resolve, reject) => {
      const vf = "scale='trunc(min(1,min(1280/iw,720/ih))*iw/2)*2':'trunc(min(1,min(1280/iw,720/ih))*ih/2)*2'";
      const args = ['-y', '-i', srcPath, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-maxrate', '2500k', '-bufsize', '5000k', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-threads', '1', '-f', 'mp4', outPath];
      // na Linuksie z najnizszym priorytetem, zeby nie spowalniac gier
      const linux = process.platform === 'linux';
      const child = spawn(linux ? 'nice' : 'ffmpeg', linux ? ['-n', '19', 'ffmpeg', ...args] : args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      child.stderr.on('data', (d) => {
        err = (err + d).slice(-600);
      });
      const timer = setTimeout(() => child.kill('SIGKILL'), 10 * 60 * 1000);
      child.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(err || `ffmpeg zakonczyl sie kodem ${code}`));
      });
    });
  }

  function startVideoJob(name, srcPath, srcSize) {
    jobs.set(name, { state: 'processing', at: Date.now() });
    queue = queue.then(async () => {
      const out = path.join(MEDIA_DIR, name);
      const tmp = `${out}.tmp`;
      try {
        await transcode(srcPath, tmp);
        const st = await fs.stat(tmp);
        if (st.size > MEDIA_MAX_BYTES) throw new Error('po kompresji film nadal jest za duzy');
        await fs.rename(tmp, out);
        jobs.set(name, { state: 'ready', at: Date.now(), from: srcSize, to: st.size });
      } catch (e) {
        console.error('Kompresja filmu nie powiodla sie:', e.message);
        await fs.unlink(tmp).catch(() => {});
        jobs.set(name, { state: 'failed', at: Date.now(), error: 'Nie udało się przetworzyć filmu. Spróbuj innego pliku (MP4 lub WebM) albo krótszego fragmentu.' });
      } finally {
        await fs.unlink(srcPath).catch(() => {});
      }
    });
  }

  async function readQuestions() {
    try {
      const parsed = JSON.parse(await fs.readFile(QUESTIONS_FILE, 'utf8'));
      return Array.isArray(parsed.questions) ? parsed : { questions: [] };
    } catch (error) {
      return { questions: [] };
    }
  }

  async function writeQuestions(data) {
    await fs.mkdir(path.dirname(QUESTIONS_FILE), { recursive: true });
    await fs.writeFile(QUESTIONS_FILE, JSON.stringify(data, null, 2));
  }

  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const fileOfLink = (link) => (typeof link === 'string' && link.startsWith(MEDIA_URL_PREFIX) ? link.slice(MEDIA_URL_PREFIX.length) : null);

  const fileExists = async (name) => {
    try {
      await fs.access(path.join(MEDIA_DIR, name));
      return true;
    } catch (e) {
      return false;
    }
  };

  const rateLimited = (map, ip, max) => {
    const now = Date.now();
    const recent = (map.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= max) return true;
    recent.push(now);
    map.set(ip, recent);
    return false;
  };

  // Sprawdza i sklada pelne pytanie z `input` (cialo zadania albo pytanie po polaczeniu ze zmianami).
  // Zwraca { error } albo { question }.
  async function buildQuestion(input, base) {
    const typ = input.typ;
    const pytanie = str(input.pytanie);
    if (typ !== 'abcd' && typ !== 'otwarte') return { error: 'Wybierz format pytania' };
    if (!pytanie) return { error: 'Wpisz treść pytania' };
    if (pytanie.length > 500) return { error: 'Pytanie może mieć maks. 500 znaków' };
    const question = { ...base, typ, pytanie };
    delete question.media;
    delete question.link;
    delete question.start;
    delete question.end;

    const media = input.media === undefined || input.media === null ? '' : str(input.media);
    if (media) {
      if (!['muzyka', 'wideo', 'zdjecie'].includes(media)) return { error: 'Nieznany rodzaj multimediów (dozwolone: muzyka, wideo, zdjęcie)' };
      let link = '';
      const upload = str(input.upload);
      const own = upload ? upload : fileOfLink(str(input.link));
      if (own) {
        // plik wgrany na serwer
        const m = FILE_RE.exec(own);
        if (!m || !(await fileExists(own))) return { error: 'Nie znaleziono wgranego pliku – wgraj go ponownie' };
        if (KIND_OF_EXT[m[1]] !== media) return { error: 'Rodzaj pliku nie pasuje do wybranych multimediów' };
        link = `${MEDIA_URL_PREFIX}${own}`;
      } else {
        link = str(input.link);
        let parsed = null;
        try {
          parsed = new URL(link);
        } catch (e) {
          parsed = null;
        }
        if (!link || link.length > 300 || !parsed || !['http:', 'https:'].includes(parsed.protocol)) {
          return { error: 'Podaj poprawny link (zaczynający się od http:// lub https://) albo wgraj plik' };
        }
        link = parsed.href;
      }
      question.media = media;
      question.link = link;
      if (media !== 'zdjecie') {
        // Fragment do odtwarzania w grze (sekundy): opcjonalnie od / do
        const sec = (v) => {
          if (v === undefined || v === null || v === '') return 0;
          const n = Number(v);
          return Number.isFinite(n) && n >= 0 && n <= 36000 ? Math.floor(n) : NaN;
        };
        const start = sec(input.start);
        const end = sec(input.end);
        if (Number.isNaN(start) || Number.isNaN(end)) return { error: 'Niepoprawny czas początku lub końca fragmentu' };
        if (end && end <= start) return { error: 'Koniec fragmentu musi być późniejszy niż początek' };
        if (start) question.start = start;
        if (end) question.end = end;
      }
    }

    delete question.odp_a;
    delete question.odp_b;
    delete question.odp_c;
    delete question.odp_d;
    if (typ === 'abcd') {
      for (const key of ['odp_a', 'odp_b', 'odp_c', 'odp_d']) {
        const value = str(input[key]);
        const L = key.slice(-1).toUpperCase();
        if (!value) return { error: `Uzupełnij odpowiedź ${L}` };
        if (value.length > 200) return { error: `Odpowiedź ${L} może mieć maks. 200 znaków` };
        question[key] = value;
      }
      const correct = str(input.poprawna_odpowiedz).toLowerCase();
      if (!['a', 'b', 'c', 'd'].includes(correct)) return { error: 'Wskaż poprawną odpowiedź (A, B, C lub D)' };
      question.poprawna_odpowiedz = correct;
    } else {
      const correct = str(input.poprawna_odpowiedz);
      if (!correct) return { error: 'Wpisz poprawną odpowiedź' };
      if (correct.length > 200) return { error: 'Poprawna odpowiedź może mieć maks. 200 znaków' };
      question.poprawna_odpowiedz = correct;
    }
    return { question };
  }

  // Plik wgrany na serwer jest kasowany, gdy zadne pytanie juz z niego nie korzysta
  async function removeIfUnused(link, questions) {
    const name = fileOfLink(link);
    if (!name || !FILE_RE.test(name)) return;
    if (questions.some((q) => q.link === link)) return;
    await fs.unlink(path.join(MEDIA_DIR, name)).catch(() => {});
  }

  // ---------- Wgrywanie plikow ----------
  // Surowe bajty pliku w ciele zadania (bez multipart). Dodawanie pytan jest publiczne, wiec wgrywanie tez - z limitami.
  app.post('/api/media/upload', express.raw({ type: () => true, limit: `${MEDIA_MAX_MB + 1}mb` }), async (req, res) => {
    try {
      if (rateLimited(uploadAttempts, req.ip || 'unknown', 30)) {
        return res.status(429).json({ error: 'Zbyt wiele plików w krótkim czasie. Spróbuj za kilka minut.' });
      }
      const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!buf.length) return res.status(400).json({ error: 'Nie otrzymano pliku' });
      const ext = sniffExt(buf);
      if (!ext) return res.status(400).json({ error: 'Nieobsługiwany format pliku (dozwolone: JPG, PNG, WebP, GIF, MP4, WebM, MP3, M4A, OGG, WAV)' });
      const kind = KIND_OF_EXT[ext];
      const limit = kind === 'zdjecie' ? IMAGE_MAX_BYTES : kind === 'muzyka' ? AUDIO_MAX_BYTES : FFMPEG_OK ? MEDIA_MAX_BYTES : NO_FFMPEG_VIDEO_MAX_MB * 1024 * 1024;
      if (buf.length > limit) return res.status(413).json({ error: `Plik jest za duży (maks. ${Math.round(limit / 1048576)} MB)` });
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      const id = uuidv4();
      if (kind === 'wideo' && FFMPEG_OK && !(ext === 'mp4' && buf.length <= SMALL_MP4_BYTES)) {
        // film: zapis surowego pliku i kompresja w tle; klient odpytuje /api/media/status/<plik>
        const name = `${id}.mp4`;
        const srcPath = path.join(MEDIA_DIR, `${id}.src`);
        await fs.writeFile(srcPath, buf);
        startVideoJob(name, srcPath, buf.length);
        return res.json({ success: true, upload: name, url: `${MEDIA_URL_PREFIX}${name}`, media: 'wideo', size: buf.length, processing: true });
      }
      const name = `${id}.${ext}`;
      await fs.writeFile(path.join(MEDIA_DIR, name), buf);
      res.json({ success: true, upload: name, url: `${MEDIA_URL_PREFIX}${name}`, media: kind, size: buf.length });
    } catch (error) {
      console.error('Error uploading media:', error);
      res.status(500).json({ error: 'Nie udało się zapisać pliku' });
    }
  });

  app.get('/api/media/limits', (req, res) => res.json({ maxMb: FFMPEG_OK ? MEDIA_MAX_MB : NO_FFMPEG_VIDEO_MAX_MB, audioMaxMb: AUDIO_MAX_MB, compression: FFMPEG_OK }));

  // Stan przetwarzania wgranego filmu: processing | ready | failed
  app.get('/api/media/status/:file', async (req, res) => {
    const name = req.params.file;
    if (!FILE_RE.test(name)) return res.status(404).json({ state: 'missing' });
    const job = jobs.get(name);
    if (job && job.state === 'failed') return res.json({ state: 'failed', error: job.error });
    if (await fileExists(name)) return res.json({ state: 'ready' });
    if (job) return res.json({ state: 'processing' });
    res.status(404).json({ state: 'missing' });
  });

  // Publiczne (TV i telefony nie maja hasla); nazwy plikow to nieodgadnione UUID
  app.get('/api/media/:file', (req, res) => {
    const m = FILE_RE.exec(req.params.file);
    if (!m) return res.status(404).end();
    res.sendFile(
      path.join(MEDIA_DIR, req.params.file),
      { headers: { 'Content-Type': MIME_OF_EXT[m[1]], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } },
      (err) => {
        if (err && !res.headersSent) res.status(404).end();
      }
    );
  });

  // Sprzatanie: wgrane pliki, ktorych nie uzywa zadne pytanie (np. porzucony formularz), znikaja po 24 h
  async function cleanupOrphans() {
    try {
      const files = await fs.readdir(MEDIA_DIR);
      if (!files.length) return;
      const used = new Set((await readQuestions()).questions.map((q) => fileOfLink(q.link)).filter(Boolean));
      for (const [k, j] of jobs) if (Date.now() - j.at > 3600 * 1000 && j.state !== 'processing') jobs.delete(k);
      for (const f of files) {
        if (/\.(src|tmp)$/.test(f)) {
          // resztki przerwanej kompresji (np. po restarcie serwera)
          const old = await fs.stat(path.join(MEDIA_DIR, f)).catch(() => null);
          if (old && Date.now() - old.mtimeMs > 3600 * 1000) await fs.unlink(path.join(MEDIA_DIR, f)).catch(() => {});
          continue;
        }
        if (used.has(f) || !FILE_RE.test(f)) continue;
        const st = await fs.stat(path.join(MEDIA_DIR, f)).catch(() => null);
        if (st && Date.now() - st.mtimeMs > 24 * 3600 * 1000) await fs.unlink(path.join(MEDIA_DIR, f)).catch(() => {});
      }
    } catch (e) {
      /* brak katalogu = brak plikow */
    }
  }
  setInterval(cleanupOrphans, 6 * 3600 * 1000).unref();
  setTimeout(cleanupOrphans, 30 * 1000).unref();

  // ---------- Pytania ----------
  // Dodawanie jest publiczne (jak dodawanie pozycji menu). Poprawne odpowiedzi nigdy nie trafiaja do publicznosci.
  app.post('/api/questions', async (req, res) => {
    try {
      if (rateLimited(attempts, req.ip || 'unknown', 60)) {
        return res.status(429).json({ error: 'Zbyt wiele pytań w krótkim czasie. Spróbuj ponownie za kilka minut.' });
      }
      const built = await buildQuestion(req.body || {}, { id: uuidv4() });
      if (built.error) return res.status(400).json({ error: built.error });
      built.question.dodano = new Date().toISOString();
      const data = await readQuestions();
      data.questions.push(built.question);
      await writeQuestions(data);
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding question:', error);
      res.status(500).json({ error: 'Błąd serwera. Spróbuj ponownie.' });
    }
  });

  // Lista (admin). Domyslnie BEZ odpowiedzi - panel prosi o nie dopiero po potwierdzeniu (?answers=1).
  app.get('/api/questions', async (req, res) => {
    try {
      if (!isAdminRequest(req)) return res.status(401).json({ error: 'Brak uprawnień' });
      const data = await readQuestions();
      if (req.query.answers === '1') return res.json(data);
      const questions = data.questions.map((q) => {
        const { odp_a, odp_b, odp_c, odp_d, poprawna_odpowiedz, ...rest } = q;
        return rest;
      });
      res.json({ questions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Edycja pytania (admin) albo tylko etykieta "inside" ({ inside: true|false }).
  // Edycja: pola pytanie/odpowiedzi/multimedia sa opcjonalne - czego nie ma w zadaniu, to zostaje bez zmian.
  // Odpowiedzi (odp_a..d, poprawna_odpowiedz) mozna pominac, wtedy nie sa ani wysylane, ani zmieniane.
  app.patch('/api/questions/:id', async (req, res) => {
    try {
      if (!isAdminRequest(req)) return res.status(401).json({ error: 'Brak uprawnień' });
      const data = await readQuestions();
      const q = data.questions.find((x) => x.id === req.params.id);
      if (!q) return res.status(404).json({ error: 'Nie znaleziono pytania' });
      const body = req.body || {};
      const editKeys = ['pytanie', 'media', 'odp_a', 'odp_b', 'odp_c', 'odp_d', 'poprawna_odpowiedz'];
      const isEdit = editKeys.some((k) => body[k] !== undefined);

      if (!isEdit) {
        if (typeof body.inside !== 'boolean') return res.status(400).json({ error: 'Pole inside musi być true lub false' });
        if (body.inside) q.inside = true;
        else delete q.inside;
        await writeQuestions(data);
        return res.json({ success: true, id: q.id, inside: !!q.inside });
      }

      const input = { ...q, ...body, typ: q.typ };
      if (body.media === undefined) {
        // multimediow nie ruszamy
        input.media = q.media || '';
        input.link = q.link || '';
        input.start = q.start;
        input.end = q.end;
        input.upload = '';
      } else {
        input.link = body.link === undefined ? '' : body.link;
        input.start = body.start;
        input.end = body.end;
        input.upload = body.upload === undefined ? '' : body.upload;
      }
      const built = await buildQuestion(input, { id: q.id, dodano: q.dodano, ...(q.inside ? { inside: true } : {}) });
      if (built.error) return res.status(400).json({ error: built.error });
      const oldLink = q.link;
      built.question.edytowano = new Date().toISOString();
      const idx = data.questions.indexOf(q);
      data.questions[idx] = built.question;
      await writeQuestions(data);
      if (oldLink && oldLink !== built.question.link) await removeIfUnused(oldLink, data.questions);
      res.json({ success: true, id: q.id });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Błąd serwera' });
    }
  });

  app.delete('/api/questions/:id', async (req, res) => {
    try {
      if (!isAdminRequest(req)) return res.status(401).json({ error: 'Brak uprawnień' });
      const data = await readQuestions();
      const gone = data.questions.find((q) => q.id === req.params.id);
      if (!gone) return res.status(404).json({ error: 'Nie znaleziono pytania' });
      data.questions = data.questions.filter((q) => q.id !== req.params.id);
      await writeQuestions(data);
      await removeIfUnused(gone.link, data.questions);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return { readQuestions };
};
