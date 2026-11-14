// Cloudflare Pages Function: Global Shared Fresco Ledger (KV + Delta Sync)
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

const SAFE_THUMB = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isValidImage(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length > 28000 || !SAFE_THUMB.test(dataUrl)) {
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
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true;
    return false;
  } catch (e) {
    return false;
  }
}

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
  const url = new URL(context.request.url);
  const since = Number(url.searchParams.get('since') || 0);
  const all = await readWall(context.env);
  const paintings = since > 0 ? all.filter(p => (p.timestamp || 0) > since) : all;

  return new Response(JSON.stringify({
    ok: true,
    maxSlots: MAX_SLOTS,
    total: all.length,
    serverTime: Date.now(),
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

    if (body.image) {
      if (!isValidImage(body.image)) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid image format or magic bytes' }), { status: 400, headers: CORS });
      }
    }

    const writer = cleanStr(body.writer, 40, 'Anonymous Scribe');
    const title = cleanStr(body.title, 50, 'Untitled Wall Mark');
    const customTag = cleanStr(body.customTag, 32, '');
    const substrate = ['mta','tile','brick','billboard'].includes(body.substrate) ? body.substrate : 'mta';
    const cap = ['fat','skinny','mop','spatter','waves','buff'].includes(body.cap) ? body.cap : 'fat';
    const scheme = ['gold','chrome','oxblood','tealsage','matte','lapis','teal','obsidian'].includes(body.scheme) ? body.scheme : 'gold';
    const tagStyle = ['wildstyle','bubble','handstyle','none'].includes(body.tagStyle) ? body.tagStyle : 'none';

    const cx = Math.max(80, Math.min(1520, Number(body.cx) || 800));
    const cy = Math.max(80, Math.min(720, Number(body.cy) || 400));

    const strokes = Array.isArray(body.strokes)
      ? body.strokes.slice(0, 40).map(st => Array.isArray(st) ? st.slice(0, 124).map((n, i) => i < 2 ? String(n) : Math.round(Number(n) || 0)) : [])
      : [];

    const aiPrimitives = Array.isArray(body.aiPrimitives) ? body.aiPrimitives.slice(0, 32) : [];
    const bridgePrimitives = Array.isArray(body.bridgePrimitives) ? body.bridgePrimitives.slice(0, 12) : [];
    const image = body.image || '';

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
