// Cloudflare Pages Functions: Shared Security & Schema Validator

export const ALLOWED_SUBSTRATES = new Set(['mta', 'tile', 'brick', 'billboard']);
export const ALLOWED_CAPS = new Set(['fat', 'skinny', 'mop', 'spatter', 'waves', 'buff']);
export const ALLOWED_SCHEMES = new Set(['gold', 'chrome', 'oxblood', 'tealsage', 'matte', 'lapis', 'teal', 'obsidian']);
export const ALLOWED_TAG_STYLES = new Set(['wildstyle', 'bubble', 'handstyle', 'none']);
export const ALLOWED_PRIM_TYPES = new Set(['bezier', 'poly']);

export const SAFE_THUMB_REGEX = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

// Shared anti-abuse term list
const BAD_SET = new Set('ass sex cum tits piss'.split(' '));
const SUB_LIST = 'fuck shit bitch cunt pussy asshole whore slut dick cock retard rape porn wank twat fck fuk nigg fag kike chink spic gook nazi hitler swastik aryan whitepower kkk fascis gestapo holocaust apartheid genocid terror jihad isis isil daesh alqaeda taliban hamas hezbollah insurrect assassin boko blasphem sacrileg desecrat defile burnquran burnbible kaffir kafir infidel sedition extremist dhimmi heretic'.split(' ');

export function isBadText(str) {
  if (!str) return false;
  const words = String(str).toLowerCase().split(/\s+/);
  return words.some(w => {
    const norm = w.replace(/0/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4@]/g, 'a').replace(/[5$]/g, 's').replace(/[^a-z]/g, '');
    if (!norm) return false;
    if (BAD_SET.has(norm)) return true;
    return SUB_LIST.some(s => norm.includes(s));
  });
}

export function cleanStr(s, max = 48, def = '') {
  if (typeof s !== 'string') return def;
  const c = s
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, max);
  if (!c || isBadText(c)) return def;
  return c;
}

export function isValidImage(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 28000 || !SAFE_THUMB_REGEX.test(dataUrl)) {
    return false;
  }
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return false;
    const base64Str = dataUrl.slice(commaIdx + 1);
    const binaryStr = atob(base64Str.slice(0, 32));
    const bytes = [];
    for (let i = 0; i < Math.min(16, binaryStr.length); i++) {
      bytes.push(binaryStr.charCodeAt(i));
    }
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
    // WebP: RIFF (bytes 0..3) .... WEBP (bytes 8..11)
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x42 && bytes[10] === 0x45 && bytes[11] === 0x50) return true;
    return false;
  } catch {
    return false;
  }
}

export function validatePrimitive(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const type = ALLOWED_PRIM_TYPES.has(p.type) ? p.type : 'poly';
  if (!Array.isArray(p.pts) || p.pts.length < 2 || p.pts.length > 24) return null;

  const cleanPts = [];
  for (const pt of p.pts) {
    if (!Array.isArray(pt) || pt.length < 2) return null;
    const x = Math.max(10, Math.min(1590, Math.round(Number(pt[0]))));
    const y = Math.max(10, Math.min(790, Math.round(Number(pt[1]))));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    cleanPts.push([x, y]);
  }

  const width = Math.max(0.5, Math.min(6.0, Number(p.width) || 1.8));
  const alpha = Math.max(0.05, Math.min(1.0, Number(p.alpha) || 0.88));
  const scheme = (typeof p.scheme === 'string' && ALLOWED_SCHEMES.has(p.scheme)) ? p.scheme : 'gold';
  const closed = Boolean(p.closed);

  return { type, closed, pts: cleanPts, scheme, width, alpha };
}

export function validateWallPiece(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Malformed wall piece payload' };
  }

  const writer = cleanStr(body.writer, 40, 'Anonymous Scribe');
  const title = cleanStr(body.title, 50, 'Untitled Wall Mark');
  const customTag = cleanStr(body.customTag, 32, '');

  const substrate = ALLOWED_SUBSTRATES.has(body.substrate) ? body.substrate : 'mta';
  const cap = ALLOWED_CAPS.has(body.cap) ? body.cap : 'fat';
  const scheme = ALLOWED_SCHEMES.has(body.scheme) ? body.scheme : 'gold';
  const tagStyle = ALLOWED_TAG_STYLES.has(body.tagStyle) ? body.tagStyle : 'none';

  const cx = Math.max(80, Math.min(1520, Math.round(Number(body.cx) || 800)));
  const cy = Math.max(80, Math.min(720, Math.round(Number(body.cy) || 400)));

  const strokes = Array.isArray(body.strokes)
    ? body.strokes.slice(0, 40).map(st => {
        if (!Array.isArray(st)) return [];
        return st.slice(0, 124).map((n, i) => (i < 2 ? String(n).slice(0, 20) : Math.round(Number(n) || 0)));
      }).filter(s => s.length >= 4)
    : [];

  const aiPrimitives = Array.isArray(body.aiPrimitives)
    ? body.aiPrimitives.map(validatePrimitive).filter(Boolean).slice(0, 24)
    : [];

  const bridgePrimitives = Array.isArray(body.bridgePrimitives)
    ? body.bridgePrimitives.map(validatePrimitive).filter(Boolean).slice(0, 12)
    : [];

  let image = '';
  if (body.image) {
    if (!isValidImage(body.image)) {
      return { valid: false, error: 'Invalid thumbnail image format or magic bytes' };
    }
    image = body.image;
  }

  const piece = {
    id: 'qw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
    timestamp: Date.now(),
    title,
    writer,
    substrate,
    cap,
    scheme,
    tagStyle,
    customTag,
    cx,
    cy,
    strokes,
    aiPrimitives,
    bridgePrimitives,
    image,
    status: 'approved'
  };

  return { valid: true, piece };
}

// Origin-locked CORS Headers helper
export function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (
    origin === 'https://qweirdo.github.io' ||
    origin.endsWith('.qweirdo.pages.dev') ||
    origin === 'https://qweirdo.pages.dev' ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1')
  );

  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': allowed ? origin : 'https://qweirdo.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, CF-Turnstile-Token',
    'Vary': 'Origin'
  };
}

// In-memory sliding-window IP rate limiter
const ipRateMap = new Map();

export function checkRateLimit(clientIp, maxHits = 20, windowMs = 60000) {
  const now = Date.now();
  const hits = ipRateMap.get(clientIp) || [];
  const validHits = hits.filter(ts => (now - ts) < windowMs);

  if (validHits.length >= maxHits) {
    ipRateMap.set(clientIp, validHits);
    return false;
  }

  validHits.push(now);
  ipRateMap.set(clientIp, validHits);

  // Periodically clean up old entries
  if (ipRateMap.size > 2000) {
    for (const [ip, timestamps] of ipRateMap.entries()) {
      const active = timestamps.filter(ts => (now - ts) < windowMs);
      if (active.length === 0) ipRateMap.delete(ip);
      else ipRateMap.set(ip, active);
    }
  }

  return true;
}

// Cloudflare Turnstile Verification
export async function verifyTurnstile(token, secret, clientIp) {
  if (!secret) return true; // Bypass in dev / unit tests without secret
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (clientIp) formData.append('remoteip', clientIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });

    const outcome = await res.json();
    return Boolean(outcome.success);
  } catch {
    return false;
  }
}
