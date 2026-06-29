'use strict';

// core requires first (needed before everything else)
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── pkg standalone detection ──
// When running as .exe (pkg), process.pkg is defined.
// BASE_DIR points to the folder containing the .exe (or __dirname in dev),
// so public/ and database.json are always read from OUTSIDE the executable
// — edits to HTML/CSS/JS files are reflected immediately without restarting.
const IS_PKG   = typeof process.pkg !== 'undefined';
const BASE_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;

// Load .env from BASE_DIR so it works both in dev and next to the .exe
require('dotenv').config({ path: path.join(BASE_DIR, '.env'), quiet: true });

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const session    = require('express-session');
const XLSX       = require('xlsx');

// ─────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────
const PORT           = parseInt(process.env.PORT, 10) || 3000;
const CONTROLLER_PIN = process.env.CONTROLLER_PIN || '1234';
const SESSION_SECRET = process.env.SESSION_SECRET || 'bwf-badminton-scoreboard-secret-2025';
const CATEGORIES     = ['MS', 'WS', 'MD', 'WD', 'XD'];

// ─────────────────────────────────────────────
//  App Setup
// ─────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie:            { secure: false, httpOnly: true, maxAge: 12 * 60 * 60 * 1000 }
}));

// Static files — read from BASE_DIR so edits are live even when running as .exe
app.use(express.static(path.join(BASE_DIR, 'public'), { index: false }));

// Serve jsPDF from node_modules for full offline use
const jspdfDist = path.join(BASE_DIR, 'node_modules', 'jspdf', 'dist');
if (fs.existsSync(jspdfDist)) {
  app.use('/vendor/jspdf', express.static(jspdfDist));
}

// ─────────────────────────────────────────────
//  Auth Middleware
// ─────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.auth === true) return next();
  const red = encodeURIComponent(req.originalUrl);
  res.redirect(`/login?redirect=${red}`);
}

// ─────────────────────────────────────────────
//  Database  (Excel .xlsx — auto-reload on save)
// ─────────────────────────────────────────────
const DB_XLSX = path.join(BASE_DIR, 'database.xlsx');
const DB_JSON = path.join(BASE_DIR, 'database.json'); // legacy fallback
let db = { players: [], clubs: [], umpires: [] };

function sheetToList(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1 })
    .slice(1).map(r => String(r[0] || '').trim()).filter(Boolean);
}

function loadDB() {
  try {
    if (fs.existsSync(DB_XLSX)) {
      const wb   = XLSX.readFile(DB_XLSX);
      db.players = sheetToList(wb, 'Pemain');
      db.clubs   = sheetToList(wb, 'Klub');
      db.umpires = sheetToList(wb, 'Wasit');
      return;
    }
    // Migrate from legacy JSON
    if (fs.existsSync(DB_JSON)) {
      const raw  = JSON.parse(fs.readFileSync(DB_JSON, 'utf8'));
      db.players = Array.isArray(raw.players) ? raw.players.map(String) : [];
      db.clubs   = Array.isArray(raw.clubs)   ? raw.clubs.map(String)   : [];
      db.umpires = Array.isArray(raw.umpires) ? raw.umpires.map(String) : [];
      saveDB(); // write xlsx immediately
      console.log('[DB] Migrasi database.json → database.xlsx selesai');
    }
  } catch (e) { console.error('[DB] Load error:', e.message); }
}

function saveDB() {
  try {
    const mkSheet = (list, hdr) =>
      XLSX.utils.aoa_to_sheet([[hdr], ...list.sort((a,b)=>a.localeCompare(b,'id')).map(v => [v])]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, mkSheet(db.players, 'Nama Pemain'),   'Pemain');
    XLSX.utils.book_append_sheet(wb, mkSheet(db.clubs,   'Nama Klub / PB'),'Klub');
    XLSX.utils.book_append_sheet(wb, mkSheet(db.umpires, 'Nama Wasit'),    'Wasit');
    XLSX.writeFile(wb, DB_XLSX);
  } catch (e) { console.error('[DB] Save error:', e.message); }
}

function dbAdd(type, value) {
  const v = String(value || '').trim().slice(0, 100);
  if (!v || !db[type]) return;
  if (!db[type].includes(v)) { db[type].push(v); saveDB(); }
}

function dbRemove(type, value) {
  if (!db[type]) return;
  const idx = db[type].indexOf(value);
  if (idx !== -1) { db[type].splice(idx, 1); saveDB(); }
}

loadDB();

// Auto-reload when file is saved externally (e.g., edited in Excel)
fs.watchFile(DB_XLSX, { interval: 2000 }, (curr, prev) => {
  if (curr.mtimeMs > prev.mtimeMs) {
    loadDB();
    console.log('[DB] database.xlsx diperbarui, data dimuat ulang.');
  }
});

// ─────────────────────────────────────────────
//  Match State (In-Memory)
// ─────────────────────────────────────────────
function createState() {
  return {
    tournament:   '',
    category:     'MS',
    court:        '',
    matchNo:      '',
    umpire:       '',
    serviceJudge: '',
    startTime:    null,
    endTime:      null,
    teams: {
      L: { player1: '', player2: '', club: '', flag: '' },
      R: { player1: '', player2: '', club: '', flag: '' }
    },
    scores: {
      game1: { L: 0, R: 0 },
      game2: { L: 0, R: 0 },
      game3: { L: 0, R: 0 }
    },
    gamesWon:     { L: 0, R: 0 },
    activeGame:   1,
    serverSide:   'L',
    isInterval:   false,
    intervalDone: { game1: false, game2: false, game3: false },
    isMatchOver:  false,
    winner:       null,
    // Display configuration
    displayNameFontSize: 84,
    // ID of the player currently serving (1 or 2)
    serverP2:     { L: false, R: false },
    // History entry shape:
    // { id, game, time, scorer, scoreL, scoreR,
    //   prevL, prevR, prevServer,
    //   isServiceOver, isInterval, isGameWin, isMatchWin }
    history:      []
  };
}

let state = createState();

// ─────────────────────────────────────────────
//  BWF Rule Helpers
// ─────────────────────────────────────────────
function gk(n) { return `game${n}`; }

function checkGameWin(sL, sR) {
  if (sL >= 30) return 'L';
  if (sR >= 30) return 'R';
  if (sL >= 21 && sL - sR >= 2) return 'L';
  if (sR >= 21 && sR - sL >= 2) return 'R';
  return null;
}

function addPoint(side) {
  if (state.isMatchOver) return { ok: false, msg: 'Pertandingan sudah selesai' };
  const key       = gk(state.activeGame);
  const sc        = state.scores[key];
  if (checkGameWin(sc.L, sc.R)) return { ok: false, msg: 'Game sudah selesai — klik Game ▶ Lanjut' };
  const prevL     = sc.L;
  const prevR     = sc.R;
  const prevSrv   = state.serverSide;
  const isServOvr = side !== prevSrv;

  sc[side]++;
  if (isServOvr) state.serverSide = side;

  // Interval: first time either team reaches 11 in this game
  let isIntervalNow = false;
  if (!state.intervalDone[key] && (sc.L === 11 || sc.R === 11)) {
    state.isInterval    = true;
    state.intervalDone[key] = true;
    isIntervalNow       = true;
  }

  const winner     = checkGameWin(sc.L, sc.R);
  let   isGameWin  = false;
  let   isMatchWin = false;

  if (winner) {
    isGameWin = true;
    state.gamesWon[winner]++;
    if (state.gamesWon[winner] >= 2) {
      isMatchWin          = true;
      state.isMatchOver   = true;
      state.winner        = winner;
      state.endTime       = new Date().toISOString();
    }
  }

  state.history.push({
    id:           state.history.length + 1,
    game:         state.activeGame,
    time:         new Date().toISOString(),
    scorer:       side,
    scoreL:       sc.L,
    scoreR:       sc.R,
    prevL,
    prevR,
    prevServer:   prevSrv,
    serverP2L:    state.serverP2.L, // store to restore
    serverP2R:    state.serverP2.R,
    isServiceOver: isServOvr,
    isInterval:   isIntervalNow,
    isGameWin,
    isMatchWin
  });

  return { ok: true };
}

function undoLast() {
  if (!state.history.length) return { ok: false, msg: 'Tidak ada riwayat' };
  const last = state.history[state.history.length - 1];
  const key  = gk(last.game);

  // Restore scores
  state.scores[key].L = last.prevL;
  state.scores[key].R = last.prevR;

  // Restore server & active game
  state.serverSide = last.prevServer;
  if ('serverP2L' in last) state.serverP2.L = last.serverP2L;
  if ('serverP2R' in last) state.serverP2.R = last.serverP2R;
  state.activeGame = last.game;

  // Restore interval
  if (last.isInterval) {
    state.intervalDone[key] = false;
    state.isInterval        = false;
  }

  // Restore game/match wins
  if (last.isGameWin)  state.gamesWon[last.scorer] = Math.max(0, state.gamesWon[last.scorer] - 1);
  if (last.isMatchWin) { state.isMatchOver = false; state.winner = null; state.endTime = null; }

  state.history.pop();
  return { ok: true };
}

function broadcast() { io.emit('state_update', state); }

// ─────────────────────────────────────────────
//  Routes: Pages
// ─────────────────────────────────────────────
const PUB = (f) => path.join(BASE_DIR, 'public', f);

app.get('/', (_, res) => res.redirect('/display'));

// Auth
app.get('/login', (req, res) => {
  if (req.session.auth) return res.redirect('/controller');
  res.sendFile(PUB('login.html'));
});

app.post('/login', (req, res) => {
  const { pin, redirect: redir } = req.body;
  if (pin === CONTROLLER_PIN) {
    req.session.auth = true;
    // Validate redirect to prevent open redirect
    const target = redir && /^\/[\w\-/?=&%]*$/.test(redir) ? redir : '/controller';
    return res.redirect(target);
  }
  res.redirect('/login?err=1');
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Public pages
app.get('/display',    (_, res) => res.sendFile(PUB('display.html')));
app.get('/viewer',     (_, res) => res.sendFile(PUB('viewer.html')));
app.get('/tutorial',   requireAuth, (_, res) => res.sendFile(PUB('tutorial.html')));

// Protected pages
app.get('/controller', requireAuth, (_, res) => res.sendFile(PUB('controller.html')));
app.get('/manage',     requireAuth, (_, res) => res.sendFile(PUB('manage.html')));

// ─────────────────────────────────────────────
//  Routes: REST API
// ─────────────────────────────────────────────
app.get('/api/state', (_, res) => res.json(state));
app.get('/api/db',    (_, res) => res.json(db));

// Public server info (port + LAN IPs) — used by manage panel to build URLs
app.get('/api/info', (_, res) => {
  const localIPs = Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
  res.json({ port: PORT, localIPs });
});

// Add item to DB (from manage page)
app.post('/api/db/add', requireAuth, (req, res) => {
  const { type, value } = req.body;
  if (!['players','clubs','umpires'].includes(type))
    return res.status(400).json({ ok: false });
  dbAdd(type, String(value || '').trim());
  res.json({ ok: true, db });
});

// Remove item from DB
app.post('/api/db/remove', requireAuth, (req, res) => {
  const { type, value } = req.body;
  if (!['players','clubs','umpires'].includes(type))
    return res.status(400).json({ ok: false });
  dbRemove(type, String(value || '').trim());
  res.json({ ok: true, db });
});

// Change PIN — writes to .env (restart required)
app.post('/api/config/pin', requireAuth, (req, res) => {
  const { pin } = req.body;
  if (!pin || pin.length < 4 || pin.length > 20)
    return res.status(400).json({ ok: false, msg: 'PIN harus 4–20 karakter' });
  const envFile = path.join(BASE_DIR, '.env');
  try {
    let c = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    c = c.includes('CONTROLLER_PIN=')
      ? c.replace(/CONTROLLER_PIN=.*/m, 'CONTROLLER_PIN=' + pin)
      : c + '\nCONTROLLER_PIN=' + pin;
    fs.writeFileSync(envFile, c.trim() + '\n', 'utf8');
    res.json({ ok: true, msg: 'PIN disimpan. Restart server untuk diterapkan.' });
  } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
});

// Update display font size
app.post('/api/config/display-font', requireAuth, (req, res) => {
  const { size } = req.body;
  if (size && !isNaN(size)) {
    state.displayNameFontSize = parseInt(size, 10);
    broadcast();
    res.json({ ok: true });
  } else {
    res.status(400).json({ ok: false });
  }
});

// Read court configs
app.get('/api/courts', requireAuth, (_, res) => {
  const courts = [];
  for (let i = 1; i <= 6; i++) {
    const f = path.join(BASE_DIR, `.env.court${i}`);
    if (fs.existsSync(f)) {
      const c    = fs.readFileSync(f, 'utf8');
      const pin  = (c.match(/CONTROLLER_PIN=(.+)/) || [])[1]?.trim() || '';
      const port = (c.match(/PORT=(.+)/)           || [])[1]?.trim() || String(3000 + i);
      courts.push({ num: i, pin, port, active: true });
    } else {
      courts.push({ num: i, pin: String(1111 + (i-1)*1111), port: 3000 + i, active: false });
    }
  }
  res.json(courts);
});

// Save court configs
app.post('/api/courts/save', requireAuth, (req, res) => {
  const { courts } = req.body;
  if (!Array.isArray(courts)) return res.status(400).json({ ok: false });
  courts.forEach(c => {
    if (!c.active) return;
    const num  = parseInt(c.num, 10);
    const pin  = String(c.pin  || '1234').trim();
    const port = parseInt(c.port || 3000 + num, 10);
    if (num < 1 || num > 6) return;
    const content = `# Lapangan ${num}\nCONTROLLER_PIN=${pin}\nPORT=${port}\nSESSION_SECRET=court${num}-${Date.now()}\n`;
    fs.writeFileSync(path.join(BASE_DIR, `.env.court${num}`), content, 'utf8');
  });
  res.json({ ok: true });
});

// Setup match info
app.post('/api/setup', requireAuth, (req, res) => {
  const b = req.body;
  state.tournament   = String(b.tournament   || '').trim().slice(0, 100);
  state.category     = CATEGORIES.includes(b.category) ? b.category : 'MS';
  state.court        = String(b.court        || '').trim().slice(0, 20);
  state.matchNo      = String(b.matchNo      || '').trim().slice(0, 20);
  state.umpire       = String(b.umpire       || '').trim().slice(0, 100);
  state.serviceJudge = String(b.serviceJudge || '').trim().slice(0, 100);

  ['L', 'R'].forEach(side => {
    const t = b[`team${side}`] || {};
    state.teams[side].player1 = String(t.player1 || '').trim().slice(0, 100);
    state.teams[side].player2 = String(t.player2 || '').trim().slice(0, 100);
    state.teams[side].club    = String(t.club    || '').trim().slice(0, 100);
    state.teams[side].flag    = String(t.flag    || '').trim().slice(0, 10);
    // Auto-add to DB
    [t.player1, t.player2].filter(Boolean).forEach(p => dbAdd('players', p));
    if (t.club) dbAdd('clubs', t.club);
  });
  if (b.umpire)       dbAdd('umpires', b.umpire);
  if (b.serviceJudge) dbAdd('umpires', b.serviceJudge);
  if (!state.startTime) state.startTime = new Date().toISOString();

  broadcast();
  res.json({ ok: true });
});

// Add point
app.post('/api/point', requireAuth, (req, res) => {
  const { side } = req.body;
  if (!['L', 'R'].includes(side)) return res.status(400).json({ ok: false, msg: 'Invalid side' });
  const result = addPoint(side);
  if (result.ok) broadcast();
  res.json(result);
});

// Undo last action
app.post('/api/undo', requireAuth, (req, res) => {
  const result = undoLast();
  if (result.ok) broadcast();
  res.json(result);
});

// Set server manually
app.post('/api/serve', requireAuth, (req, res) => {
  const { side } = req.body;
  if (!['L', 'R'].includes(side)) return res.status(400).json({ ok: false });
  state.serverSide = side;
  broadcast();
  res.json({ ok: true });
});

// Toggle which player is serving
app.post('/api/toggle-server', requireAuth, (req, res) => {
  const { side } = req.body;
  if (!['L', 'R'].includes(side)) return res.status(400).json({ ok: false });
  state.serverP2[side] = !state.serverP2[side];
  broadcast();
  res.json({ ok: true });
});

// Next game
app.post('/api/next-game', requireAuth, (req, res) => {
  if (state.activeGame >= 3)  return res.status(400).json({ ok: false, msg: 'Sudah Game 3' });
  if (state.isMatchOver)      return res.status(400).json({ ok: false, msg: 'Match selesai' });
  state.activeGame++;
  state.isInterval = false;
  broadcast();
  res.json({ ok: true });
});

// Dismiss interval banner
app.post('/api/dismiss-interval', requireAuth, (req, res) => {
  state.isInterval = false;
  broadcast();
  res.json({ ok: true });
});

// Reset full match
app.post('/api/reset', requireAuth, (req, res) => {
  state = createState();
  broadcast();
  res.json({ ok: true });
});

// ─────────────────────────────────────────────
//  Socket.io
// ─────────────────────────────────────────────
io.on('connection', socket => {
  const ip  = (socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').replace('::ffff:', '');
  const ref = socket.handshake.headers['referer'] || '';
  const page = ref ? ('/' + (ref.split('/').slice(3).join('/') || '')) : '—';
  const now  = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const count = () => io.engine.clientsCount;
  console.log(`[WS+] ${now()} | ${ip} | halaman: ${page} | total: ${count()} klien`);
  socket.emit('state_update', state);
  socket.on('disconnect', reason => {
    console.log(`[WS-] ${now()} | ${ip} | ${reason} | total: ${count()} klien`);
  });
});

// ─────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌  Port ${PORT} sudah dipakai oleh proses lain!`);
    console.error(`  ▸ Hentikan proses lain dengan stop.bat / tools/stop-server.bat`);
    console.error(`  ▸ Atau ubah PORT di file .env\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '0.0.0.0', () => {
  const localIPs = Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🏸  Badminton Scoreboard  |  v1.0.0        ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n  ▸ Local    → http://localhost:${PORT}`);
  localIPs.forEach(ip => console.log(`  ▸ LAN      → http://${ip}:${PORT}`));
  console.log('\n  Halaman:');
  console.log('  • /display     → Layar TV / Proyektor  (publik)');
  console.log('  • /viewer      → HP Penonton           (publik)');
  console.log(`  • /controller  → Wasit / Operator      (PIN: ${CONTROLLER_PIN})`);
  console.log(`  • /manage      → Panel Admin            (PIN: ${CONTROLLER_PIN})`);
  console.log('  • /tutorial    → Panduan Penggunaan    (PIN diperlukan)');
  console.log(`\n  database.xlsx auto-reload saat disimpan di Excel.\n`);
});
