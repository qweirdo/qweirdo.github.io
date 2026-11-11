// Cloudflare Pages Function: Workers AI Vector Sketch & Seam-Bridge Generator
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
  const rings = 3 + Math.floor(rng() * 3);

  for (let r = 0; r < rings; r++) {
    const rad = 28 + r * 24 + rng() * 12;
    const pts = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wobble = 1 + Math.sin(a * (3 + r)) * 0.18;
      pts.push([
        Math.round(cx + Math.cos(a) * rad * wobble),
        Math.round(cy + Math.sin(a) * rad * wobble)
      ]);
    }
    primitives.push({ type: 'poly', pts, scheme, width: 1.8 - r * 0.3, alpha: 0.72 - r * 0.12 });
  }

  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rng() * 0.5;
    const len = 45 + rng() * 65;
    const x1 = Math.round(cx + Math.cos(a) * 14);
    const y1 = Math.round(cy + Math.sin(a) * 14);
    const ctrlX = Math.round(cx + Math.cos(a + 0.35) * (len * 0.6));
    const ctrlY = Math.round(cy + Math.sin(a + 0.35) * (len * 0.6));
    const x2 = Math.round(cx + Math.cos(a) * len);
    const y2 = Math.round(cy + Math.sin(a) * len);
    primitives.push({ type: 'bezier', pts: [[x1, y1], [ctrlX, ctrlY], [x2, y2]], scheme, width: 2.2, alpha: 0.78 });
  }

  const bridges = [];
  if (nx && ny && Math.hypot(nx - cx, ny - cy) < 680) {
    for (let b = 0; b < 3; b++) {
      const midX = Math.round((cx + nx) / 2 + (rng() - 0.5) * 90);
      const midY = Math.round((cy + ny) / 2 + (rng() - 0.5) * 70);
      bridges.push({
        type: 'bezier',
        pts: [[Math.round(cx), Math.round(cy)], [midX, midY], [Math.round(nx), Math.round(ny)]],
        scheme,
        width: 1.1 + b * 0.4,
        alpha: 0.36
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
    const scheme = ['gold','chrome','oxblood','tealsage','matte'].includes(body.scheme) ? body.scheme : 'gold';

    if (context.env && context.env.AI) {
      try {
        const sys = `You are a generative 2D vector muralist for a 1600x800 urban graffiti wall. Output ONLY valid JSON with key "primitives": an array of 10 to 16 vector objects centered near (${cx}, ${cy}) within radius 110 representing "${prompt}". Each object must be {"type":"bezier"|"poly"|"arc","pts":[[x,y],...],"width":1..3.5,"alpha":0.35..0.9}. No markdown, no prose.`;
        const aiRes = await context.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: `Generate vector mural for "${prompt}" at (${cx},${cy}).` }
          ],
          max_tokens: 700,
          temperature: 0.65
        });

        const rawTxt = (aiRes && aiRes.response) ? aiRes.response : '';
        const match = rawTxt.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed.primitives) && parsed.primitives.length > 0) {
            const fallback = buildProceduralMural(prompt, cx, cy, nx, ny, scheme);
            const cleanPrims = parsed.primitives.slice(0, 20).map(p => ({
              type: ['bezier','poly','arc'].includes(p.type) ? p.type : 'poly',
              pts: Array.isArray(p.pts) ? p.pts.slice(0, 24).map(pt => [
                Math.max(20, Math.min(1580, Math.round(Number(pt[0]) || cx))),
                Math.max(20, Math.min(780, Math.round(Number(pt[1]) || cy)))
              ]) : [[cx, cy], [cx + 25, cy + 25]],
              scheme,
              width: Math.max(0.8, Math.min(4, Number(p.width) || 1.8)),
              alpha: Math.max(0.25, Math.min(0.92, Number(p.alpha) || 0.7))
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
