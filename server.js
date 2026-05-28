const express = require('express');
const http = require('http');
const os = require('os');
const path = require('path');
const { Server } = require('socket.io');
const {
  createInitialMatchState,
  resetMatchState,
  applyRallyPoint,
  applyPatch: applyMatchPatch,
  undoLastAction
} = require('./src/shared/badmintonLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const vendorDir = path.join(__dirname, 'node_modules');

let state = createInitialMatchState();

function cloneState(currentState) {
  return JSON.parse(JSON.stringify(currentState));
}

function normalizeText(value) {
  return String(value || '').trim();
}

function detectOperatingSystem(userAgent = '', platform = '') {
  const text = `${userAgent} ${platform}`.toLowerCase();

  if (text.includes('windows')) return 'Windows';
  if (text.includes('android')) return 'Android';
  if (text.includes('iphone') || text.includes('ipad') || text.includes('ios')) return 'iOS';
  if (text.includes('mac')) return 'macOS';
  if (text.includes('linux')) return 'Linux';

  return normalizeText(platform) || 'Unknown OS';
}

function detectBrowser(userAgent = '') {
  const text = String(userAgent || '');

  if (/Edg\//i.test(text)) return 'Edge';
  if (/Chrome\//i.test(text) && !/Edg\//i.test(text)) return 'Chrome';
  if (/Firefox\//i.test(text)) return 'Firefox';
  if (/Safari\//i.test(text) && !/Chrome\//i.test(text)) return 'Safari';
  if (/Electron\//i.test(text)) return 'Electron';

  return 'Unknown Browser';
}

function describeNetworkSource(ipAddress) {
  const value = normalizeText(ipAddress);

  if (!value) return 'unknown ip';
  if (value === '::1' || value === '127.0.0.1' || value.startsWith('::ffff:127.')) return 'localhost';

  return value.replace('::ffff:', '');
}

function getClientInfo(socket) {
  const auth = socket.handshake.auth || {};
  const headers = socket.handshake.headers || {};
  const userAgent = normalizeText(auth.userAgent || headers['user-agent']);
  const platform = normalizeText(auth.platform || 'Unknown platform');
  const language = normalizeText(auth.language || headers['accept-language'] || 'unknown');
  const screen = normalizeText(auth.screen || 'unknown');
  const deviceLabel = normalizeText(auth.deviceLabel || auth.page || 'client');
  const page = normalizeText(auth.page || 'unknown page');
  const ipAddress = normalizeText(
    auth.ipAddress ||
    socket.handshake.address ||
    socket.conn?.remoteAddress ||
    'unknown ip'
  );

  return {
    deviceLabel,
    page,
    platform,
    language,
    screen,
    userAgent,
    ipAddress,
    socketId: socket.id
  };
}

function formatClientDescription(info, status) {
  const osLabel = detectOperatingSystem(info.userAgent, info.platform);
  const browserLabel = detectBrowser(info.userAgent);
  const sourceLabel = describeNetworkSource(info.ipAddress);
  const pageLabel = info.page || 'page';
  const screenLabel = info.screen && info.screen !== 'unknown' ? ` ${info.screen}` : '';

  return `[${status.toUpperCase()}] ${info.deviceLabel} - ${pageLabel} - ${osLabel} / ${browserLabel}${screenLabel} - ${sourceLabel}`;
}

function broadcastState() {
  io.emit('state:update', cloneState(state));
}

function applyPatch(patch = {}) {
  const result = applyMatchPatch(state, patch);
  state = result.state;
  broadcastState();
}

function applyPoint(pointWinnerSide, options = {}) {
  const result = applyRallyPoint(state, pointWinnerSide, options);
  state = result.state;
  broadcastState();
  return result.event;
}

function undoLastPoint() {
  const result = undoLastAction(state);
  state = result.state;
  broadcastState();
  return result.event;
}

function resetMatch() {
  state = resetMatchState(state);
  broadcastState();
}

function getLocalNetworkUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];

  for (const interfaceName of Object.keys(interfaces)) {
    for (const address of interfaces[interfaceName] || []) {
      if (address.family === 'IPv4' && !address.internal) {
        urls.push(`http://${address.address}:${port}`);
      }
    }
  }

  return urls;
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir, { index: false }));
app.use('/vendor', express.static(vendorDir));

app.get('/', (req, res) => {
  res.redirect('/controller');
});

app.get('/controller', (req, res) => {
  res.sendFile(path.join(publicDir, 'controller.html'));
});

app.get('/controller/', (req, res) => {
  res.sendFile(path.join(publicDir, 'controller.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(publicDir, 'display.html'));
});

app.get('/display/', (req, res) => {
  res.sendFile(path.join(publicDir, 'display.html'));
});

app.get('/api/state', (req, res) => {
  res.json(cloneState(state));
});

app.post('/api/state', (req, res) => {
  applyPatch(req.body || {});
  res.json({ ok: true, state: cloneState(state) });
});

io.on('connection', (socket) => {
  const clientInfo = getClientInfo(socket);
  socket.data.clientInfo = clientInfo;
  console.log(formatClientDescription(clientInfo, 'Client connected'));

  socket.emit('state:update', cloneState(state));

  socket.on('controller:update', (patch) => {
    if (!patch || typeof patch !== 'object') {
      return;
    }

    applyPatch(patch);
  });

  socket.on('controller:point', ({ winnerSide, gameNumber }) => {
    if (typeof winnerSide === 'undefined') {
      return;
    }

    applyPoint(winnerSide, { gameNumber });
  });

  socket.on('controller:undo', () => {
    undoLastPoint();
  });

  socket.on('controller:reset', () => {
    resetMatch();
  });

  socket.on('controller:export-pdf', (payload) => {
    socket.emit('controller:export-pdf:ack', {
      ok: true,
      receivedAt: new Date().toISOString(),
      payload: payload || null
    });
  });

  socket.on('state:request', () => {
    socket.emit('state:update', cloneState(state));
  });

  socket.on('disconnect', () => {
    const info = socket.data.clientInfo || clientInfo || getClientInfo(socket);
    console.log(formatClientDescription(info, 'Client disconnected'));
  });
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sedang dipakai. Biasanya ada server lama yang masih berjalan.`);
    console.error('Tutup terminal/node process lama, lalu jalankan kembali node server.js.');
    return;
  }

  throw error;
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);

  for (const localUrl of getLocalNetworkUrls(PORT)) {
    console.log(`Akses dari perangkat lain: ${localUrl}`);
  }
});
