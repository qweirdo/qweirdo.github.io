// Cloudflare Pages Function: Protected Workers AI Vector Sketch Generator
import {
  getCorsHeaders,
  checkRateLimit,
  verifyTurnstile,
  isBadText,
  cleanStr,
  ALLOWED_SCHEMES
} from './_validate.js';

const sketchCache = new Map();

function seededRng(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function() {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildProceduralMural(prompt, cx, cy, nx, ny, scheme) {
  const rng = seededRng(prompt + '_' + cx + '_' + cy);
  const primitives = [];
  const rings = 3 + Math.floor(rng() * 2);

  for (let r = 0; r < rings; r++) {
    const rad = 26 + r * 24 + rng() * 10;
    const pts = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * (3 + r)) * 0.2;
      pts.push([
        Math.round(cx + Math.cos(a) * rad * wobble),
        Math.round(cy + Math.sin(a) * rad * wobble)
      ]);
    }
    primitives.push({ type: 'poly', closed: true, pts, scheme, width: 1.9 - r * 0.25, alpha: 0.85 - r * 0.1 });
  }

  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + rng() * 0.4;
    const len = 42 + rng() * 68;
    const x1 = Math.round(cx + Math.cos(a) * 12);
    const y1 = Math.round(cy + Math.sin(a) * 12);
    const ctrlX = Math.round(cx + Math.cos(a + 0.38) * (len * 0.6));
    const ctrlY = Math.round(cy + Math.sin(a + 0.38) * (len * 0.6));
    const x2 = Math.round(cx + Math.cos(a) * len);
    const y2 = Math.round(cy + Math.sin(a) * len);
    primitives.push({ type: 'bezier', pts: [[x1, y1], [ctrlX, ctrlY], [x2, y2]], scheme, width: 2.1, alpha: 0.88 });
  }

  const bridges = [];
  if (nx && ny && Math.hypot(nx - cx, ny - cy) < 520) {
    for (let b = 0; b < 3; b++) {
      const midX = Math.round((cx + nx) / 2 + (rng() - 0.5) * 85);
      const midY = Math.round((cy + ny) / 2 + (rng() - 0.5) * 65);
      bridges.push({
        type: 'bezier',
        pts: [[Math.round(cx), Math.round(cy)], [midX, midY], [Math.round(nx), Math.round(ny)]],
        scheme,
        width: 1.2 + b * 0.35,
        alpha: 0.48
      });
    }
  }

  return { primitives, bridges, source: 'procedural-fallback' };
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: getCorsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const headers = getCorsHeaders(context.request);

  // 1. Body size limit (max 16KB)
  const contentLength = Number(context.request.headers.get('content-length') || 0);
  if (contentLength > 16384) {
    return new Response(JSON.stringify({ ok: false, error: 'Payload exceeds 16KB limit' }), { status: 413, headers });
  }

  // 2. Client IP Rate Limiting (max 15 sketch requests per minute)
  const clientIp = context.request.headers.get('cf-connecting-ip') || '127.0.0.1';
  if (!checkRateLimit('sketch_' + clientIp, 15, 60000)) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many sketch requests. Rate limit exceeded.' }), {
      status: 429,
      headers: { ...headers, 'Retry-After': '60' }
    });
  }

  try {
    const body = await context.request.json();

    // 3. Turnstile check
    const turnstileToken = context.request.headers.get('CF-Turnstile-Token') || body.turnstileToken;
    const isHuman = await verifyTurnstile(turnstileToken, context.env?.TURNSTILE_SECRET, clientIp);
    if (!isHuman) {
      return new Response(JSON.stringify({ ok: false, error: 'Turnstile verification failed' }), { status: 403, headers });
    }

    const rawPrompt = String(body.prompt || 'urban sanctuary');
    if (isBadText(rawPrompt)) {
      return new Response(JSON.stringify({ ok: false, error: 'Prompt contains restricted content' }), { status: 400, headers });
    }

    const prompt = cleanStr(rawPrompt, 50, 'urban sanctuary');
    const cx = Math.max(100, Math.min(1500, Math.round(Number(body.cx) || 800)));
    const cy = Math.max(100, Math.min(700, Math.round(Number(body.cy) || 400)));
    const nx = Number(body.neighborX) || 0;
    const ny = Number(body.neighborY) || 0;
    const scheme = (typeof body.scheme === 'string' && ALLOWED_SCHEMES.has(body.scheme)) ? body.scheme : 'gold';

    // 4. In-memory caching
    const cacheKey = `${prompt}_${cx}_${cy}_${scheme}`;
    if (sketchCache.has(cacheKey)) {
      return new Response(JSON.stringify({ ok: true, ...sketchCache.get(cacheKey) }), { status: 200, headers });
    }

    // 5. Cloudflare Workers AI Call
    if (context.env && context.env.AI) {
      try {
        const sys = `You are a 2D vector muralist for a 1600x800 street wall. Output ONLY compact valid JSON with key "primitives": an array of 10 to 14 vector objects centered near (${cx},${cy}) within radius 115 representing "${prompt}". Each item: {"type":"bezier"|"poly","closed":true|false,"pts":[[x,y],...],"width":1.2..3.2}. No markdown.`;
        const aiRes = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `Draw "${prompt}" at (${cx},${cy}).` }
          ],
          max_tokens: 380,
          temperature: 0.72
        });

        const rawTxt = (aiRes && aiRes.response) ? aiRes.response : '';
        const match = rawTxt.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed.primitives) && parsed.primitives.length > 0) {
            const fallback = buildProceduralMural(prompt, cx, cy, nx, ny, scheme);
            const cleanPrims = parsed.primitives.slice(0, 16).map(p => ({
              type: p.type === 'bezier' ? 'bezier' : 'poly',
              closed: Boolean(p.closed),
              pts: Array.isArray(p.pts) ? p.pts.slice(0, 20).map(pt => [
                Math.max(20, Math.min(1580, Math.round(Number(pt[0]) || cx))),
                Math.max(20, Math.min(780, Math.round(Number(pt[1]) || cy)))
              ]) : [[cx, cy], [cx + 25, cy + 25]],
              scheme,
              width: Math.max(1.0, Math.min(3.5, Number(p.width) || 1.9)),
              alpha: 0.9
            }));

            const result = {
              primitives: cleanPrims,
              bridges: fallback.bridges,
              source: 'workers-ai'
            };
            sketchCache.set(cacheKey, result);
            return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers });
          }
        }
      } catch {}
    }

    const fallback = buildProceduralMural(prompt, cx, cy, nx, ny, scheme);
    sketchCache.set(cacheKey, fallback);
    return new Response(JSON.stringify({ ok: true, ...fallback }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Sketch synthesis failed' }), { status: 400, headers });
  }
}
