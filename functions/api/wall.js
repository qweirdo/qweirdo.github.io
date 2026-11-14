// Cloudflare Pages Function: Protected Global Wall Ledger (KV + Validation + Turnstile + Rate Limiter)
import {
  getCorsHeaders,
  checkRateLimit,
  verifyTurnstile,
  validateWallPiece
} from './_validate.js';

const MAX_SLOTS = 50;
const KV_KEY = 'qweirdo_global_fresco_v2';
let memoryFallback = [];

async function readWall(env) {
  if (env && env.QWEIRDO_WALL) {
    try {
      const raw = await env.QWEIRDO_WALL.get(KV_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return memoryFallback;
}

async function writeWall(env, list) {
  const trimmed = list.slice(0, MAX_SLOTS);
  memoryFallback = trimmed;
  if (env && env.QWEIRDO_WALL) {
    try {
      await env.QWEIRDO_WALL.put(KV_KEY, JSON.stringify(trimmed));
    } catch {}
  }
  return trimmed;
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: getCorsHeaders(context.request) });
}

export async function onRequestGet(context) {
  const headers = getCorsHeaders(context.request);
  const url = new URL(context.request.url);
  const since = Number(url.searchParams.get('since') || 0);
  const all = await readWall(context.env);
  const approved = all.filter(p => p.status !== 'rejected');
  const paintings = since > 0 ? approved.filter(p => (p.timestamp || 0) > since) : approved;

  return new Response(JSON.stringify({
    ok: true,
    maxSlots: MAX_SLOTS,
    total: approved.length,
    serverTime: Date.now(),
    paintings
  }), { status: 200, headers });
}

export async function onRequestPost(context) {
  const headers = getCorsHeaders(context.request);

  // 1. Early Content-Length check
  const contentLength = Number(context.request.headers.get('content-length') || 0);
  if (contentLength > 32768) {
    return new Response(JSON.stringify({ ok: false, error: 'Payload exceeds 32KB limit' }), { status: 413, headers });
  }

  // 2. Client IP Rate Limiting (max 20 posts per minute)
  const clientIp = context.request.headers.get('cf-connecting-ip') || '127.0.0.1';
  if (!checkRateLimit(clientIp, 20, 60000)) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many requests. Rate limit exceeded.' }), {
      status: 429,
      headers: { ...headers, 'Retry-After': '60' }
    });
  }

  try {
    const rawBody = await context.request.text();
    if (rawBody.length > 32768) {
      return new Response(JSON.stringify({ ok: false, error: 'Payload exceeds 32KB limit' }), { status: 413, headers });
    }

    const body = JSON.parse(rawBody);

    // 3. Cloudflare Turnstile Verification
    const turnstileToken = context.request.headers.get('CF-Turnstile-Token') || body.turnstileToken;
    const isHuman = await verifyTurnstile(turnstileToken, context.env?.TURNSTILE_SECRET, clientIp);
    if (!isHuman) {
      return new Response(JSON.stringify({ ok: false, error: 'Cloudflare Turnstile verification failed' }), { status: 403, headers });
    }

    // 4. Strict Schema & Content Validation
    const validation = validateWallPiece(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ ok: false, error: validation.error }), { status: 400, headers });
    }

    const piece = validation.piece;
    const current = await readWall(context.env);

    current.unshift(piece);
    const updated = await writeWall(context.env, current);

    return new Response(JSON.stringify({
      ok: true,
      slot: 1,
      maxSlots: MAX_SLOTS,
      total: updated.length,
      piece
    }), { status: 201, headers });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid wall packet' }), { status: 400, headers });
  }
}
