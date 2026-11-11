// Cloudflare Pages Function: Global Shared Fresco Ledger (KV + Memory Fallback)
const MAX_SLOTS = 50;
const KV_KEY = 'qweirdo_global_fresco_v2';
let memoryFallback = [];

const BAD = ['fuck','shit','bitch','cunt','dick','cock','pussy','asshole','bastard','slut','whore','nigg','fag','retard','rape','porn','nazi','cum','sex','ass','tits','piss','twat','wank','hitler','isis','qaeda','taliban','jihad','kafir','infidel','blasphem','sacrileg'];
const SUB = ['fuck','shit','bitch','cunt','pussy','asshole','whore','nigg','retard','porn','nazi','wank','hitler','terror','isis'];
const norm = w => String(w || '').toLowerCase().replace(/0/g,'o').replace(/[1!|]/g,'i').replace(/3/g,'e').replace(/[4@]/g,'a').replace(/[5$]/g,'s').replace(/[^a-z]/g,'');
const isBadText = str => String(str || '').split(/\s+/).some(w => { const n = norm(w); return BAD.includes(n) || SUB.some(s => n.includes(s)); });
const cleanStr = (s, max = 48, def = '') => {
  const c = String(s || '').replace(/[<>"'`]/g, '').trim().slice(0, max);
  if (!c || isBadText(c)) return def;
  return c;
};

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function readWall(env) {
  if (env && env.QWEIRDO_WALL) {
    try {
      const raw = await env.QWEIRDO_WALL.get(KV_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
  }
  return memoryFallback;
}

async function writeWall(env, list) {
  const trimmed = list.slice(0, MAX_SLOTS);
  memoryFallback = trimmed;
  if (env && env.QWEIRDO_WALL) {
    try {
      await env.QWEIRDO_WALL.put(KV_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }
  return trimmed;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet(context) {
  const paintings = await readWall(context.env);
  return new Response(JSON.stringify({
    ok: true,
    maxSlots: MAX_SLOTS,
    count: paintings.length,
    paintings
  }), { status: 200, headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const rawBody = await context.request.text();
    if (rawBody.length > 65000) {
      return new Response(JSON.stringify({ ok: false, error: 'Payload exceeds 65KB limit' }), { status: 413, headers: CORS });
    }
    const body = JSON.parse(rawBody);
    const current = await readWall(context.env);

    const writer = cleanStr(body.writer, 40, 'Anonymous Scribe');
    const title = cleanStr(body.title, 50, 'Untitled Wall Mark');
    const customTag = cleanStr(body.customTag, 32, '');
    const substrate = ['mta','tile','brick','billboard'].includes(body.substrate) ? body.substrate : 'mta';
    const cap = ['fat','skinny','mop','spatter','waves','buff'].includes(body.cap) ? body.cap : 'fat';
    const scheme = ['gold','chrome','oxblood','tealsage','matte'].includes(body.scheme) ? body.scheme : 'gold';
    const tagStyle = ['wildstyle','bubble','handstyle','none'].includes(body.tagStyle) ? body.tagStyle : 'none';

    const cx = Math.max(80, Math.min(1520, Number(body.cx) || 800));
    const cy = Math.max(80, Math.min(720, Number(body.cy) || 400));

    const strokes = Array.isArray(body.strokes)
      ? body.strokes.slice(0, 40).map(st => Array.isArray(st) ? st.slice(0, 124).map((n, i) => i < 2 ? String(n) : Math.round(Number(n) || 0)) : [])
      : [];

    const aiPrimitives = Array.isArray(body.aiPrimitives) ? body.aiPrimitives.slice(0, 32) : [];
    const bridgePrimitives = Array.isArray(body.bridgePrimitives) ? body.bridgePrimitives.slice(0, 12) : [];
    const sigilPts = Array.isArray(body.sigilPts) ? body.sigilPts.slice(0, 300) : [];

    const image = (typeof body.image === 'string' && body.image.startsWith('data:image/') && body.image.length < 28000)
      ? body.image
      : '';

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
      sigilPts,
      image
    };

    current.unshift(piece);
    const updated = await writeWall(context.env, current);

    return new Response(JSON.stringify({
      ok: true,
      slot: 1,
      maxSlots: MAX_SLOTS,
      total: updated.length,
      piece
    }), { status: 201, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid wall packet' }), { status: 400, headers: CORS });
  }
}
