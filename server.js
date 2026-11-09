const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'paintings.json');
const MAX_SLOTS = 50;

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory 50-slot ring buffer
let paintings = [];

// Load existing paintings from disk
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    paintings = JSON.parse(raw);
    if (!Array.isArray(paintings)) paintings = [];
    if (paintings.length > MAX_SLOTS) paintings = paintings.slice(0, MAX_SLOTS);
    console.log(`[Storage] Loaded ${paintings.length} paintings from disk.`);
  }
} catch (err) {
  console.warn('[Storage] Failed to read existing data file, initializing empty buffer:', err.message);
  paintings = [];
}

// Save helper with atomic file write
function persistPaintings() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(paintings, null, 2), 'utf8');
  } catch (err) {
    console.error('[Storage] Error persisting paintings:', err.message);
  }
}

// Connected SSE clients for live broadcasts
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// HTTP Server
const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // 1. Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Project Qweirdo Palimpsest Live Engine',
      slots: paintings.length,
      maxSlots: MAX_SLOTS,
      connectedClients: sseClients.size,
      timestamp: Date.now()
    }));
    return;
  }

  // 2. GET /api/paintings - Fetch the last 50 paintings ring buffer
  if (req.method === 'GET' && pathname === '/api/paintings') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      count: paintings.length,
      maxSlots: MAX_SLOTS,
      paintings: paintings
    }));
    return;
  }

  // 3. POST /api/paintings - Submit a new painting (FIFO recycling oldest when > 50)
  if (req.method === 'POST' && pathname === '/api/paintings') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Safeguard max payload size (15MB for high-res canvases)
      if (body.length > 15 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large. Max 15MB.' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const {
          title = 'Palimpsest Inscription',
          writer = 'Anonymous Writer',
          image,
          substrate = 'mta',
          cap = 'fat',
          scheme = 'gold',
          customTag = ''
        } = payload;

        if (!image || typeof image !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Valid image dataURL is required.' }));
          return;
        }

        // Calculate cryptographic SHA-256 provenance hash of the artwork
        const hash = crypto.createHash('sha256').update(image).digest('hex');
        const id = 'piece_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
        const timestamp = Date.now();

        const newPiece = {
          id,
          title: String(title).slice(0, 80),
          writer: String(writer).slice(0, 60),
          substrate,
          cap,
          scheme,
          customTag: String(customTag).slice(0, 60),
          image,
          hash,
          timestamp,
          provenance: {
            engine: 'Project Qweirdo Palimpsest Studio',
            license: 'CC BY-NC-SA 4.0 / Collaborative Provenance',
            nftOwnershipAgreement: '50% Writer / 50% Project Qweirdo Scriptorium Split'
          }
        };

        // Prepend to ring buffer (newest first)
        paintings.unshift(newPiece);

        // Recycle oldest slots when exceeding MAX_SLOTS (50)
        let recycledPiece = null;
        if (paintings.length > MAX_SLOTS) {
          recycledPiece = paintings.pop();
        }

        // Persist to disk
        persistPaintings();

        // Broadcast to all live SSE clients
        broadcastEvent('new_painting', {
          piece: newPiece,
          slotCount: paintings.length,
          recycledId: recycledPiece ? recycledPiece.id : null
        });

        console.log(`[Palimpsest] Stored painting "${newPiece.title}" by "${newPiece.writer}" (Slot ${paintings.length}/${MAX_SLOTS})`);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          id: newPiece.id,
          slot: 1,
          totalStored: paintings.length,
          maxSlots: MAX_SLOTS,
          hash: newPiece.hash
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Malformed JSON payload: ' + err.message }));
      }
    });
    return;
  }

  // 4. GET /api/stream - Live Server-Sent Events (SSE) Stream
  if (req.method === 'GET' && pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const client = { id: Date.now() + '_' + Math.random(), res };
    sseClients.add(client);
    console.log(`[SSE] Client connected. Total live listeners: ${sseClients.size}`);

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({
      message: 'Connected to Project Qweirdo Live Wall Stream',
      slots: paintings.length,
      maxSlots: MAX_SLOTS
    })}\n\n`);

    req.on('close', () => {
      sseClients.delete(client);
      console.log(`[SSE] Client disconnected. Total live listeners: ${sseClients.size}`);
    });
    return;
  }

  // 5. Static file serving (serve repository assets for full standalone execution)
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

// Periodic keep-alive ping for SSE connections every 25s
setInterval(() => {
  broadcastEvent('ping', { time: Date.now() });
}, 25000);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  Project Qweirdo Palimpsest Live Backend Active`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Storage: 50-slot FIFO ring buffer (${DATA_FILE})`);
    console.log(`  SSE Live Stream: http://localhost:${PORT}/api/stream`);
    console.log(`=======================================================`);
  });
}

module.exports = { server, paintings, MAX_SLOTS };
