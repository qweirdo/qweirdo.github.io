// Cloudflare Pages Function: Sub-Second Workers AI Vector Sketch & Seam-Bridge Generator
const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const prompt = String(body.prompt || 'urban sanctuary').replace(/[<>"'`]/g, '').trim().slice(0, 60);
    const cx = Math.max(100, Math.min(1500, Math.round(Number(body.cx) || 800)));
    const cy = Math.max(100, Math.min(700, Math.round(Number(body.cy) || 400)));
    const nx = Number(body.neighborX) || 0;
    const ny = Number(body.neighborY) || 0;
    const scheme = String(body.scheme || 'gold').slice(0, 20);

    if (context.env && context.env.AI) {
      try {
        const sys = `You are a 2D vector muralist for a 1600x800 street wall. Output ONLY compact valid JSON with key "primitives": an array of 10 to 14 vector objects centered near (${cx},${cy}) within radius 115 representing "${prompt}". Each item: {"type":"bezier"|"poly","closed":true|false,"pts":[[x,y],...],"width":1.2..3.2}. No markdown.`;
        const aiRes = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `Draw "${prompt}" at (${cx},${cy}).` }
          ],
          max_tokens: 420,
          temperature: 0.72
        });

        const rawTxt = (aiRes && aiRes.response) ? aiRes.response : '';
        const match = rawTxt.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed.primitives) && parsed.primitives.length > 0) {
            const fallback = buildProceduralMural(prompt, cx, cy, nx, ny, scheme);
            const cleanPrims = parsed.primitives.slice(0, 18).map(p => ({
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
            return new Response(JSON.stringify({
              ok: true,
              primitives: cleanPrims,
              bridges: fallback.bridges,
              source: 'workers-ai'
            }), { status: 200, headers: CORS });
          }
        }
      } catch (aiErr) {}
    }

    const fallback = buildProceduralMural(prompt, cx, cy, nx, ny, scheme);
    return new Response(JSON.stringify({ ok: true, ...fallback }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Sketch synthesis failed' }), { status: 400, headers: CORS });
  }
}
