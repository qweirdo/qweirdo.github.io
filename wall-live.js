// Project Qweirdo · wall-live.js
// 1) Simple Doodler (Default) vs. Pro Writer Toolbar Toggle
// 2) Zero-Popup Real-Time Auto-Sync (2.5s debounce + 4s delta polling)
// 3) 4-Pass Chiaroscuro & Cross-Hatch Relief Shader for High-Detail Creations
// 4) Sub-Second Hybrid Workers AI + Procedural Detailer & Connected Wall Weaving

(function initQweirdoLiveModule() {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const CF_ORIGIN = window.location.hostname.endsWith('.pages.dev') ? '' : 'https://qweirdo.pages.dev';
  const API_WALL = CF_ORIGIN + '/api/wall';
  const API_SKETCH = CF_ORIGIN + '/api/sketch';
  const STORAGE_KEY = 'qweirdo_live_paintings_v2';
  const MAX_SLOTS = 50;

  let livePaintings = [];
  let renderedIds = new Set();
  let lastSyncTs = 0;
  let sessionStrokes = [];
  let currentPolyline = null;
  let lastCentroid = [800, 400];
  let autoSyncTimer = null;
  let isPublishing = false;
  window.__wallNodes = window.__wallNodes || [];

  const channel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('qweirdo_global_wall_v2') : null;

  // =========================================================
  // 1. SIMPLE DOODLER (DEFAULT) vs. PRO WRITER MODE TOGGLE
  // =========================================================
  function setupStudioModeToggle() {
    const bar = $('.studio-bar');
    if (!bar || $('#btnStudioMode')) return;

    // Default to Simple Doodler ('0') unless user explicitly locked Pro ('1')
    let isPro = localStorage.getItem('qw_studio_pro') === '1';
    const applyMode = (pro) => {
      isPro = pro;
      document.body.classList.toggle('studio-simple', !pro);
      localStorage.setItem('qw_studio_pro', pro ? '1' : '0');
      const btn = $('#btnStudioMode');
      if (btn) {
        btn.setAttribute('aria-pressed', String(pro));
        btn.innerHTML = pro ? '⚙ Mode: <b>Pro Writer</b>' : '✦ Mode: <b>Simple Doodler</b>';
        btn.title = pro
          ? 'Switch to clean 1-row Simple Doodler toolbar'
          : 'Unlock all aerosol caps, mini-canvases, stamp forge, audio & folio tools';
      }
    };

    const modeWrap = document.createElement('div');
    modeWrap.className = 'studio-group';
    modeWrap.innerHTML = `<button type="button" class="tool-btn" id="btnStudioMode" aria-pressed="false"></button>`;
    bar.insertBefore(modeWrap, bar.firstChild);

    $('#btnStudioMode').addEventListener('click', () => {
      applyMode(!isPro);
      if (window.__QW && window.__QW.msg) {
        window.__QW.msg(isPro
          ? 'Pro Writer mode active: full studio tools unlocked.'
          : 'Simple Doodler mode active: clean, distraction-free wall.');
      }
    });

    applyMode(isPro);
  }

  // =========================================================
  // 2. 4-PASS CHIAROSCURO & CROSS-HATCH RELIEF SHADER
  // =========================================================
  function resolveStrokeColor(schemeKey) {
    if (window.__QW && window.__QW.SCHEMES && window.__QW.SCHEMES[schemeKey]) {
      return window.__QW.SCHEMES[schemeKey].stroke;
    }
    const fallbacks = {
      gold: '#b38600', lapis: '#264380', oxblood: '#8b1c28',
      teal: '#1b5e5a', tealsage: '#1b5e5a', obsidian: '#1a1c22', matte: '#1a1c22'
    };
    return fallbacks[schemeKey] || '#844c1c';
  }

  function drawChiaroscuroPrimitives(list, baseAlpha = 0.94, defaultScheme = 'gold') {
    if (!Array.isArray(list) || !list.length || !window.__QW || !window.__QW.X) return;
    const { X, addDrip } = window.__QW;

    X.save();
    X.lineCap = 'round';
    X.lineJoin = 'round';

    list.forEach(p => {
      const pts = p.pts || [];
      if (pts.length < 2) return;
      const color = resolveStrokeColor(p.scheme || defaultScheme);
      const w = Math.max(1.2, p.width || 1.8);
      const alpha = Math.min(1, (p.alpha || 0.88) * baseAlpha);

      const tracePath = (dx = 0, dy = 0) => {
        X.beginPath();
        X.moveTo(pts[0][0] + dx, pts[0][1] + dy);
        if (p.type === 'bezier' && pts.length >= 3) {
          X.quadraticCurveTo(pts[1][0] + dx, pts[1][1] + dy, pts[2][0] + dx, pts[2][1] + dy);
        } else {
          for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0] + dx, pts[i][1] + dy);
          if (p.closed) X.closePath();
        }
      };

      // Pass A: Umber Ground Shadow (+2.5px, +3px) for 3D relief on pale vellum/brick
      X.strokeStyle = 'rgba(28, 16, 8, 0.28)';
      X.lineWidth = w * 1.85;
      X.globalAlpha = alpha * 0.85;
      tracePath(2.5, 3.0);
      X.stroke();

      // Pass B: Interior 45-degree Engraving Hatching & Micro-Stipple Grain
      if (p.closed && pts.length >= 4) {
        X.save();
        tracePath(0, 0);
        X.clip();
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        pts.forEach(([x, y]) => {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        });
        X.strokeStyle = color;
        X.lineWidth = 0.65;
        X.globalAlpha = alpha * 0.26;
        X.beginPath();
        for (let d = minX - (maxY - minY); d < maxX + (maxY - minY); d += 7) {
          X.moveTo(d, minY);
          X.lineTo(d + (maxY - minY), maxY);
        }
        X.stroke();
        X.restore();
      }

      // Micro-stipple ink dots around vertices
      X.fillStyle = color;
      X.globalAlpha = alpha * 0.55;
      for (let i = 0; i < Math.min(pts.length, 10); i++) {
        const [vx, vy] = pts[i];
        for (let s = 0; s < 3; s++) {
          const ang = (i * 2.1 + s * 2.09);
          const rad = 4 + (s * 4);
          X.fillRect(vx + Math.cos(ang) * rad, vy + Math.sin(ang) * rad, 1.3, 1.3);
        }
      }

      // Pass C: Primary Variable-Taper Mineral Pigment
      X.strokeStyle = color;
      X.lineWidth = w;
      X.globalAlpha = alpha;
      tracePath(0, 0);
      X.stroke();

      // Pass D: Specular Leaf Glint (-1px, -1px) + Micro Gravity Drip on lowest vertex
      X.strokeStyle = 'rgba(255, 250, 230, 0.72)';
      X.lineWidth = 0.8;
      X.globalAlpha = alpha * 0.75;
      tracePath(-1, -1);
      X.stroke();

      if (addDrip && Math.random() < 0.22) {
        const lowest = pts.reduce((a, b) => (b[1] > a[1] ? b : a), pts[0]);
        addDrip(lowest[0], lowest[1], color, 2.2, 0.9);
      }
    });

    X.restore();
  }

  // =========================================================
  // 3. CONNECTED WALL WEAVING (MYCELIUM & AEROSOL BRIDGES)
  // =========================================================
  function registerAndWeaveNode(x, y, scheme = 'gold', writer = 'Anon') {
    if (!window.__QW || !window.__QW.X) return;
    const { X } = window.__QW;
    const node = { x, y, scheme, writer };

    // Find 2 nearest neighbor nodes within 480px
    const neighbors = window.__wallNodes
      .map(n => ({ n, d: Math.hypot(n.x - x, n.y - y) }))
      .filter(item => item.d > 35 && item.d < 480)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);

    const color = resolveStrokeColor(scheme);
    X.save();
    neighbors.forEach(({ n }, idx) => {
      const mx = (x + n.x) / 2 + (idx === 0 ? 28 : -28);
      const my = (y + n.y) / 2 + (idx === 0 ? -24 : 26);

      // Connecting botanical/aerosol filament
      X.strokeStyle = color;
      X.lineWidth = 1.1;
      X.globalAlpha = 0.42;
      X.beginPath();
      X.moveTo(x, y);
      X.quadraticCurveTo(mx, my, n.x, n.y);
      X.stroke();

      // Tiny leaf/node bud along the filament
      const bx = 0.25 * x + 0.5 * mx + 0.25 * n.x;
      const by = 0.25 * y + 0.5 * my + 0.25 * n.y;
      X.fillStyle = color;
      X.globalAlpha = 0.55;
      X.beginPath();
      X.ellipse(bx, by, 4.5, 2.2, Math.atan2(n.y - y, n.x - x) + 0.5, 0, Math.PI * 2);
      X.fill();
    });
    X.restore();

    window.__wallNodes.push(node);
    if (window.__wallNodes.length > 25) window.__wallNodes.shift();
  }

  // =========================================================
  // 4. STROKE RECORDER & ZERO-POPUP AUTO-SYNC
  // =========================================================
  function scheduleAutoSync() {
    if (autoSyncTimer) clearTimeout(autoSyncTimer);
    autoSyncTimer = setTimeout(() => {
      if (sessionStrokes.length > 0 && !isPublishing) {
        publishToGlobalWall({ silent: true });
      }
    }, 2500);
  }

  function hookCanvasAndForms() {
    const cv = $('#cv');
    if (cv) {
      const getCoords = e => {
        const r = cv.getBoundingClientRect();
        return [
          Math.round((e.clientX - r.left) * 1600 / r.width),
          Math.round((e.clientY - r.top) * 800 / r.height)
        ];
      };

      cv.addEventListener('pointerdown', e => {
        if (e.button && e.button !== 0) return;
        if (autoSyncTimer) clearTimeout(autoSyncTimer);
        const [x, y] = getCoords(e);
        lastCentroid = [x, y];
        window.__lastUserMarkCentroid = [x, y];
        const st = window.__QW ? window.__QW.getState() : { cap: 'fat', scheme: 'gold' };
        currentPolyline = [st.cap, st.scheme, x, y];
      });

      cv.addEventListener('pointermove', e => {
        if (!currentPolyline) return;
        const [x, y] = getCoords(e);
        const len = currentPolyline.length;
        const px = currentPolyline[len - 2], py = currentPolyline[len - 1];
        if (Math.hypot(x - px, y - py) >= 12 && currentPolyline.length < 120) {
          currentPolyline.push(x, y);
        }
      });

      const finishStroke = () => {
        if (currentPolyline && currentPolyline.length >= 6) {
          sessionStrokes.push(currentPolyline);
          if (sessionStrokes.length > 36) sessionStrokes.shift();
          const st = window.__QW ? window.__QW.getState() : { scheme: 'gold' };
          registerAndWeaveNode(lastCentroid[0], lastCentroid[1], st.scheme, 'Local');
          scheduleAutoSync();
        }
        currentPolyline = null;
      };
      cv.addEventListener('pointerup', finishStroke);
      cv.addEventListener('pointercancel', finishStroke);
    }

    // Hook AI Idea button for instant 4-pass detail + async Workers AI enrichment
    const aiBtn = $('#btnAiIdea');
    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        const st = window.__QW ? window.__QW.getState() : { scheme: 'gold' };
        const [cx, cy] = [Math.round(240 + Math.random() * 1120), Math.round(160 + Math.random() * 480)];
        lastCentroid = [cx, cy];
        registerAndWeaveNode(cx, cy, st.scheme, 'AI Conservator');
        fetchHybridAiPrimitives('sacred street architecture', cx, cy, st.scheme, true);
      });
    }

    // Hook bottom offering bar (#sf) so planting words/tags triggers hybrid AI + live sync
    const sfForm = $('#sf');
    if (sfForm) {
      sfForm.addEventListener('submit', () => {
        const wd = ($('#wd') && $('#wd').value || '').trim();
        if (!wd) return;
        const st = window.__QW ? window.__QW.getState() : { scheme: 'gold' };
        setTimeout(() => {
          publishToGlobalWall({ silent: true, explicitPrompt: wd });
        }, 250);
      });
    }
  }

  // Sub-Second Hybrid Workers AI Fetcher (2200ms AbortController timeout)
  async function fetchHybridAiPrimitives(promptText, cx, cy, scheme, paintImmediately = false) {
    const neighbor = window.__wallNodes.length ? window.__wallNodes[window.__wallNodes.length - 1] : null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2200);
    try {
      const res = await fetch(API_SKETCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          prompt: promptText,
          cx,
          cy,
          neighborX: neighbor ? neighbor.x : 0,
          neighborY: neighbor ? neighbor.y : 0,
          scheme
        })
      });
      clearTimeout(timer);
      if (!res.ok) return { primitives: [], bridges: [] };
      const data = await res.json();
      if (paintImmediately && data.primitives) {
        drawChiaroscuroPrimitives(data.bridges || [], 0.72, scheme);
        drawChiaroscuroPrimitives(data.primitives || [], 0.94, scheme);
      }
      return { primitives: data.primitives || [], bridges: data.bridges || [] };
    } catch (e) {
      clearTimeout(timer);
      return { primitives: [], bridges: [] };
    }
  }

  function renderWallPacket(piece, animate = false, ageAlpha = 0.92) {
    if (!window.__QW || !window.__QW.X) return;
    const { X, drawAerosol, stampWildstyleBurner, stampBubbleSoftie, stampHandstyle } = window.__QW;

    drawChiaroscuroPrimitives(piece.bridgePrimitives, ageAlpha * 0.75, piece.scheme);
    drawChiaroscuroPrimitives(piece.aiPrimitives, ageAlpha, piece.scheme);

    const strokes = Array.isArray(piece.strokes) ? piece.strokes : [];
    if (strokes.length > 0 && typeof drawAerosol === 'function') {
      if (!animate) {
        X.save();
        X.globalAlpha = ageAlpha;
        strokes.forEach(st => {
          const cap = st[0] || piece.cap || 'fat';
          const scheme = st[1] || piece.scheme || 'gold';
          for (let i = 2; i < st.length - 2; i += 2) {
            drawAerosol(st[i + 2], st[i + 3], st[i], st[i + 1], cap, scheme);
          }
        });
        X.restore();
      } else {
        let sIdx = 0;
        const stepAnim = () => {
          if (sIdx >= strokes.length) return;
          const st = strokes[sIdx++];
          const cap = st[0] || piece.cap || 'fat';
          const scheme = st[1] || piece.scheme || 'gold';
          for (let i = 2; i < st.length - 2; i += 2) {
            drawAerosol(st[i + 2], st[i + 3], st[i], st[i + 1], cap, scheme);
          }
          requestAnimationFrame(stepAnim);
        };
        requestAnimationFrame(stepAnim);
      }
    }

    const cx = piece.cx || 800, cy = piece.cy || 400;
    registerAndWeaveNode(cx, cy, piece.scheme || 'gold', piece.writer || 'Anon');

    if (piece.customTag && piece.tagStyle === 'wildstyle' && stampWildstyleBurner) {
      stampWildstyleBurner(piece.customTag, cx, cy, piece.scheme);
    } else if (piece.customTag && piece.tagStyle === 'bubble' && stampBubbleSoftie) {
      stampBubbleSoftie(piece.customTag, cx, cy, piece.scheme);
    } else if (piece.customTag && piece.tagStyle === 'handstyle' && stampHandstyle) {
      stampHandstyle(piece.customTag, cx, cy, piece.scheme);
    }

    if (piece.writer || piece.title) {
      X.save();
      X.globalAlpha = Math.min(0.88, ageAlpha);
      X.font = '600 11px "Hanken Grotesk", sans-serif';
      const label = `✦ ${piece.title || 'Wall Mark'} · ${piece.writer || 'Anonymous Scribe'}`;
      const tw = X.measureText(label).width;
      const bx = Math.max(20, Math.min(1560 - tw, cx - tw / 2));
      const by = Math.min(782, cy + 52);
      X.fillStyle = 'rgba(20, 14, 8, 0.68)';
      X.fillRect(bx - 6, by - 11, tw + 12, 16);
      X.fillStyle = '#d4af37';
      X.fillText(label, bx, by);
      X.restore();
    }
  }

  // =========================================================
  // 5. GLOBAL WALL POLLING (4s DELTA) & SILENT BROADCAST
  // =========================================================
  function loadLocalCache() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) livePaintings = parsed.slice(0, MAX_SLOTS);
      }
    } catch (e) {}
  }

  function saveLocalCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(livePaintings.slice(0, MAX_SLOTS)));
    } catch (e) {}
  }

  function renderArchiveTray() {
    const scrollEl = $('#liveArchiveScroll');
    const emptyHint = $('#liveEmptyHint');
    const countEl = $('#liveSlotCount');
    if (countEl) countEl.textContent = String(livePaintings.length);
    if (!scrollEl) return;

    scrollEl.innerHTML = '';
    if (!livePaintings.length) {
      if (emptyHint) {
        emptyHint.style.display = 'block';
        scrollEl.appendChild(emptyHint);
      }
      return;
    }

    livePaintings.forEach((piece, idx) => {
      const card = document.createElement('div');
      card.className = 'live-card';
      card.title = `Slot ${idx + 1}/50 · "${piece.title}" by ${piece.writer}`;
      const thumbSrc = piece.image || '';
      card.innerHTML = `
        ${thumbSrc ? `<img class="live-card-thumb" src="${thumbSrc}" alt="${piece.title}" loading="lazy">` : `<div class="live-card-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--gold);font:600 .75rem var(--fd)">✦ Live Mark</div>`}
        <div class="live-card-info">
          <div class="live-card-title"></div>
          <div class="live-card-sub"><span></span><span>live</span></div>
        </div>
      `;
      card.querySelector('.live-card-title').textContent = piece.title || 'Wall Mark';
      card.querySelector('.live-card-sub span').textContent = piece.writer || 'Anon';
      card.addEventListener('click', () => {
        if (window.__QW && window.__QW.saveUndo) window.__QW.saveUndo();
        renderWallPacket(piece, true, 0.94);
      });
      scrollEl.appendChild(card);
    });
  }

  async function syncGlobalWall(isInitial = false) {
    const statusEl = $('#liveSyncStatus');
    const dotEl = $('#livePulseDot');
    const indEl = $('#liveIndicator');
    try {
      const query = (!isInitial && lastSyncTs > 0) ? `?since=${lastSyncTs}` : '';
      const res = await fetch(API_WALL + query, { cache: 'no-store' });
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      if (data && Array.isArray(data.paintings)) {
        if (data.serverTime) lastSyncTs = data.serverTime;
        const totalCount = data.total ?? data.paintings.length;
        if (statusEl) statusEl.textContent = `● Live Wall (${totalCount}/50)`;
        if (dotEl) dotEl.style.background = '#10b981';
        if (indEl) indEl.style.background = '#10b981';

        const incoming = data.paintings;
        const fresh = incoming.filter(p => p.id && !renderedIds.has(p.id));

        if (isInitial) {
          livePaintings = incoming.slice(0, MAX_SLOTS);
          saveLocalCache();
          renderArchiveTray();
          const slice = livePaintings.slice(0, 10).reverse();
          slice.forEach((p, idx) => {
            renderedIds.add(p.id);
            const ageAlpha = 0.42 + (idx / Math.max(1, slice.length - 1)) * 0.56;
            renderWallPacket(p, false, ageAlpha);
          });
        } else if (fresh.length > 0) {
          fresh.reverse().forEach(p => {
            renderedIds.add(p.id);
            livePaintings.unshift(p);
            renderWallPacket(p, true, 0.96);
            if (window.__QW && window.__QW.msg) {
              window.__QW.msg(`📡 Live mark by ${p.writer}: "${p.title}"`);
            }
          });
          livePaintings = livePaintings.slice(0, MAX_SLOTS);
          saveLocalCache();
          renderArchiveTray();
        }
      }
    } catch (e) {
      if (statusEl) statusEl.textContent = '○ Local Cache';
    }
  }

  async function publishToGlobalWall({ silent = false, explicitPrompt = '' } = {}) {
    if (!window.__QW || isPublishing) return;
    isPublishing = true;
    const { C, getState, msg } = window.__QW;

    try {
      const wdVal = ($('#wd') && $('#wd').value || '').trim();
      const title = (explicitPrompt || wdVal || 'Wall Gesture').slice(0, 50);
      const savedCreds = JSON.parse(localStorage.getItem('qw_c') || '[]');
      const writer = ((savedCreds.length && savedCreds[savedCreds.length - 1].name) || 'Anonymous Scribe').slice(0, 40);

      const st = getState();
      const [cx, cy] = lastCentroid;

      const aiData = await fetchHybridAiPrimitives(title, cx, cy, st.scheme, false);

      const snap = document.createElement('canvas');
      snap.width = 240; snap.height = 120;
      snap.getContext('2d').drawImage(C, 0, 0, 240, 120);
      let thumb = snap.toDataURL('image/webp', 0.42);
      if (thumb.length > 26000) thumb = snap.toDataURL('image/jpeg', 0.4);

      const payload = {
        title,
        writer,
        substrate: st.substrate,
        cap: st.cap,
        scheme: st.scheme,
        tagStyle: wdVal ? 'handstyle' : 'none',
        customTag: wdVal.slice(0, 22),
        cx,
        cy,
        strokes: sessionStrokes.slice(-28),
        aiPrimitives: aiData.primitives,
        bridgePrimitives: aiData.bridges,
        image: thumb
      };

      drawChiaroscuroPrimitives(aiData.bridges, 0.72, st.scheme);
      drawChiaroscuroPrimitives(aiData.primitives, 0.94, st.scheme);

      const res = await fetch(API_WALL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        if (json.piece) {
          renderedIds.add(json.piece.id);
          lastSyncTs = Math.max(lastSyncTs, json.piece.timestamp || Date.now());
          livePaintings.unshift(json.piece);
          livePaintings = livePaintings.slice(0, MAX_SLOTS);
          saveLocalCache();
          renderArchiveTray();
          if (channel) channel.postMessage({ type: 'new_painting', piece: json.piece });
        }
        sessionStrokes = [];
        if (!silent && msg) {
          msg(`✓ Published "${title}" by ${writer} to the worldwide Living Urban Wall.`);
        }
      }
    } catch (e) {
    } finally {
      isPublishing = false;
    }
  }

  function wireControls() {
    const btnBroadcast = $('#btnLiveBroadcast');
    if (btnBroadcast) {
      btnBroadcast.onclick = () => publishToGlobalWall({ silent: false });
    }

    const btnToggle = $('#btnToggleArchive');
    const tray = $('#liveArchiveTray');
    if (btnToggle && tray) {
      btnToggle.onclick = () => {
        const hidden = tray.style.display === 'none';
        tray.style.display = hidden ? 'block' : 'none';
        if (hidden) renderArchiveTray();
      };
    }

    const btnClose = $('#btnCloseArchiveTray');
    if (btnClose && tray) btnClose.onclick = () => { tray.style.display = 'none'; };

    const btnRefresh = $('#btnRefreshArchive');
    if (btnRefresh) btnRefresh.onclick = () => syncGlobalWall(false);

    if (channel) {
      channel.onmessage = e => {
        if (e.data && e.data.type === 'new_painting' && e.data.piece) {
          const p = e.data.piece;
          if (!renderedIds.has(p.id)) {
            renderedIds.add(p.id);
            livePaintings.unshift(p);
            renderArchiveTray();
            renderWallPacket(p, true, 0.96);
          }
        }
      };
    }
  }

  function boot() {
    setupStudioModeToggle();
    hookCanvasAndForms();
    loadLocalCache();
    renderArchiveTray();
    wireControls();
    syncGlobalWall(true);
    setInterval(() => {
      if (!document.hidden) syncGlobalWall(false);
    }, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();