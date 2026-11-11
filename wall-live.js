// Project Qweirdo · wall-live.js
// Powers: 1) Simple Doodler vs. Pro Writer Studio Mode Toggle
//         2) Simplified Resonance Sigil Forge + Wall Stencil Transfer + 2400px Transparent Stamp PNG + Pro Plotter Drawer
//         3) Cloudflare KV + Workers AI Global Co-Working Wall & Animated Seam Blending
//         4) Ambient Machine Conservator Bias around User Inscriptions

(function initQweirdoLiveModule() {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const API_WALL = '/api/wall';
  const API_SKETCH = '/api/sketch';
  const STORAGE_KEY = 'qweirdo_live_paintings_v2';
  const MAX_SLOTS = 50;

  let livePaintings = [];
  let renderedIds = new Set();
  let sessionStrokes = [];
  let currentPolyline = null;
  let lastCentroid = [800, 400];
  const channel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('qweirdo_global_wall_v2') : null;

  // =========================================================
  // 1. SIMPLE DOODLER vs. PRO WRITER STUDIO BAR TOGGLE
  // =========================================================
  function setupStudioModeToggle() {
    const bar = $('.studio-bar');
    if (!bar || $('#btnStudioMode')) return;

    let isPro = localStorage.getItem('qw_studio_pro') === '1';
    const applyMode = (pro) => {
      isPro = pro;
      document.body.classList.toggle('studio-simple', !pro);
      localStorage.setItem('qw_studio_pro', pro ? '1' : '0');
      const btn = $('#btnStudioMode');
      if (btn) {
        btn.setAttribute('aria-pressed', String(pro));
        btn.innerHTML = pro
          ? '⚙ Mode: <b>Pro Writer</b>'
          : '✦ Mode: <b>Simple Doodler</b>';
        btn.title = pro
          ? 'Switch to distraction-free Simple Doodler bar'
          : 'Unlock all aerosol caps, buff roller, loupe, audio & wildstyle stamps (100% Free)';
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
          ? 'Pro Writer Studio unlocked: all caps, stencils, audio & typography active.'
          : 'Simple Doodler mode active: clean, distraction-free common slate.');
      }
    });

    applyMode(isPro);
  }

  // =========================================================
  // 2. SIMPLIFIED RESONANCE SIGIL FORGE + PRO PLOTTER DRAWER
  // =========================================================
  function setupResonanceSimplification() {
    const panel = $('.res-panel');
    const slidersGrid = $('.res-sliders-grid');
    if (!panel || !slidersGrid || $('#resWordInput')) return;

    const keepPresets = new Set(['fifth', 'octave', 'rose', 'golden']);
    $$('.res-pill').forEach(pill => {
      if (!keepPresets.has(pill.dataset.preset)) {
        pill.classList.add('res-pro-only');
      }
    });

    const forgeBox = document.createElement('div');
    forgeBox.className = 'res-forge-box';
    forgeBox.innerHTML = `
      <label class="res-lbl" for="resWordInput">Personal Sigil Forge (Word-to-Geometry)</label>
      <div style="display:flex;gap:.45rem;margin-bottom:.35rem">
        <input type="text" id="resWordInput" maxlength="32" placeholder="Type your name or a word to spin a sigil…" style="flex:1;min-height:38px;padding:0 .85rem;border-radius:99px;border:1px solid var(--bd);background:var(--bg);color:var(--tx);font:inherit">
        <button type="button" id="btnResForgeWord" class="res-action-btn primary" title="Convert word into harmonic pendulum ratios">✦ Spin Sigil</button>
      </div>
      <div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.55rem">
        <button type="button" id="btnResLoadStencil" class="res-action-btn" style="flex:1;border-color:var(--gold)" title="Stamp or spray this geometric sigil onto the main Living Urban Wall">📐 Stamp Sigil onto Wall</button>
        <button type="button" id="btnResProToggle" class="res-action-btn" aria-expanded="false" aria-controls="resProDrawer" title="Toggle precision harmonic sliders & transparent/plotter exports (Free)">⚙ Pro Plotter Mode (Free)</button>
      </div>
    `;
    panel.insertBefore(forgeBox, panel.firstChild);

    slidersGrid.id = 'resProDrawer';
    slidersGrid.classList.add('res-pro-drawer');
    slidersGrid.hidden = true;

    const expCluster = $('.res-export-cluster');
    if (expCluster && !$('#btnResTransparentPng')) {
      const transBtn = document.createElement('button');
      transBtn.type = 'button';
      transBtn.id = 'btnResTransparentPng';
      transBtn.className = 'res-export-btn res-pro-only';
      transBtn.title = 'Download 2400×2400 Transparent Stamp PNG (for zines, print & overlays)';
      transBtn.innerHTML = '💎 Export 2400×2400 Transparent Stamp (Pro)';
      transBtn.addEventListener('click', exportTransparentSigilPng);
      expCluster.appendChild(transBtn);
    }

    const spinFromWord = () => {
      const val = ($('#resWordInput').value || '').trim();
      if (!val) return;
      let h = 2166136261 >>> 0;
      for (let i = 0; i < val.length; i++) {
        h ^= val.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const ratios = [[3,2],[2,1],[4,3],[5,4],[5,6],[7,5],[1.618,1],[3.01,2]];
      const pick = ratios[h % ratios.length];
      const detune = ((h >>> 8) % 9 - 4) * 0.01;
      const f1El = $('#sliderF1'), f2El = $('#sliderF2'), f3El = $('#sliderF3'), pEl = $('#sliderPhase');
      if (f1El && f2El && pEl) {
        f1El.value = (pick[0] + detune).toFixed(2);
        f2El.value = pick[1].toFixed(2);
        if (f3El) f3El.value = (((h >>> 12) % 5 - 2) * 0.25).toFixed(2);
        pEl.value = String(((h >>> 4) % 12) * 30);
        f1El.dispatchEvent(new Event('input'));
        pEl.dispatchEvent(new Event('input'));
      }
      const lbl = $('#resRatioLabel');
      if (lbl) lbl.textContent = `Sigil of "${val}" (${f1El ? f1El.value : '3.00'}:${f2El ? f2El.value : '2.00'})`;
    };

    $('#btnResForgeWord').addEventListener('click', spinFromWord);
    $('#resWordInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); spinFromWord(); }
    });

    $('#btnResProToggle').addEventListener('click', () => {
      const open = !slidersGrid.hidden;
      slidersGrid.hidden = open;
      $('#btnResProToggle').setAttribute('aria-expanded', String(!open));
      $('#btnResProToggle').classList.toggle('primary', !open);
      $$('.res-pro-only').forEach(el => { el.style.display = open ? 'none' : 'inline-flex'; });
    });
    $$('.res-pro-only').forEach(el => { el.style.display = 'none'; });

    $('#btnResLoadStencil').addEventListener('click', () => {
      const imprintBtn = $('#btnResImprint');
      if (imprintBtn) imprintBtn.click();
    });
  }

  function exportTransparentSigilPng() {
    const f1 = parseFloat(($('#sliderF1') && $('#sliderF1').value) || 3);
    const f2 = parseFloat(($('#sliderF2') && $('#sliderF2').value) || 2);
    const f3 = parseFloat(($('#sliderF3') && $('#sliderF3').value) || 0);
    const p1 = (parseFloat(($('#sliderPhase') && $('#sliderPhase').value) || 90) * Math.PI) / 180;
    const damp = parseFloat(($('#sliderDamp') && $('#sliderDamp').value) || 0.0014);
    const sw = parseFloat(($('#sliderWidth') && $('#sliderWidth').value) || 1.2);
    const activeInkBtn = $('.res-ink-dot.active');
    const inkMap = { gold: '#d4af37', oxblood: '#8b1c28', lapis: '#264380', verdigris: '#1b5e5a', bichrome: '#d4af37' };
    const color = inkMap[(activeInkBtn && activeInkBtn.dataset.ink) || 'gold'] || '#d4af37';

    const oc = document.createElement('canvas');
    oc.width = 2400; oc.height = 2400;
    const ox = oc.getContext('2d');
    ox.strokeStyle = color;
    ox.lineWidth = sw * 2.2;
    ox.lineCap = 'round';
    ox.lineJoin = 'round';

    ox.beginPath();
    const dt = 0.015;
    for (let i = 0; i < 6200; i++) {
      const t = i * dt;
      const dec = Math.exp(-damp * t);
      if (dec < 0.015) break;
      const xb = 920 * Math.sin(f1 * t + p1) * dec;
      const yb = 920 * Math.sin(f2 * t) * dec;
      const al = f3 * t * 0.2;
      const x = xb * Math.cos(al) - yb * Math.sin(al) + 1200;
      const y = xb * Math.sin(al) + yb * Math.cos(al) + 1200;
      if (i === 0) ox.moveTo(x, y);
      else ox.lineTo(x, y);
    }
    ox.stroke();

    const a = document.createElement('a');
    a.href = oc.toDataURL('image/png');
    a.download = `qweirdo-sigil-transparent-${f1.toFixed(2)}-${f2.toFixed(2)}.png`;
    a.click();
    if (window.__QW && window.__QW.msg) {
      window.__QW.msg('✦ Exported 2400×2400 Transparent Sigil Stamp PNG.');
    }
  }

  // =========================================================
  // 3. STROKE RECORDER & VECTOR CO-WORKING ENGINE
  // =========================================================
  function hookMainCanvasRecording() {
    const cv = $('#cv');
    if (!cv) return;

    const getCoords = e => {
      const r = cv.getBoundingClientRect();
      return [
        Math.round((e.clientX - r.left) * 1600 / r.width),
        Math.round((e.clientY - r.top) * 800 / r.height)
      ];
    };

    cv.addEventListener('pointerdown', e => {
      if (e.button && e.button !== 0) return;
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
      if (Math.hypot(x - px, y - py) >= 14 && currentPolyline.length < 120) {
        currentPolyline.push(x, y);
      }
    });

    const endStroke = () => {
      if (currentPolyline && currentPolyline.length >= 6) {
        sessionStrokes.push(currentPolyline);
        if (sessionStrokes.length > 36) sessionStrokes.shift();
      }
      currentPolyline = null;
    };
    cv.addEventListener('pointerup', endStroke);
    cv.addEventListener('pointercancel', endStroke);
  }

  function renderWallPacket(piece, animate = false, ageAlpha = 0.88) {
    if (!window.__QW) return;
    const { X, SCHEMES, drawAerosol, stampWildstyleBurner, stampBubbleSoftie, stampHandstyle } = window.__QW;
    if (!X) return;

    const drawPrimitives = (list, baseAlpha) => {
      if (!Array.isArray(list)) return;
      X.save();
      list.forEach(p => {
        const sc = SCHEMES[p.scheme] || SCHEMES[piece.scheme] || SCHEMES.gold;
        X.strokeStyle = sc.stroke;
        X.lineWidth = (p.width || 1.8);
        X.globalAlpha = (p.alpha || 0.65) * baseAlpha;
        X.lineCap = 'round';
        X.lineJoin = 'round';
        const pts = p.pts || [];
        if (pts.length < 2) return;
        X.beginPath();
        X.moveTo(pts[0][0], pts[0][1]);
        if (p.type === 'bezier' && pts.length >= 3) {
          X.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
        } else {
          for (let i = 1; i < pts.length; i++) X.lineTo(pts[i][0], pts[i][1]);
        }
        X.stroke();
      });
      X.restore();
    };

    drawPrimitives(piece.bridgePrimitives, ageAlpha * 0.75);
    drawPrimitives(piece.aiPrimitives, ageAlpha);

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
    window.__lastUserMarkCentroid = [cx, cy];

    if (piece.customTag && piece.tagStyle === 'wildstyle' && stampWildstyleBurner) {
      stampWildstyleBurner(piece.customTag, cx, cy, piece.scheme);
    } else if (piece.customTag && piece.tagStyle === 'bubble' && stampBubbleSoftie) {
      stampBubbleSoftie(piece.customTag, cx, cy, piece.scheme);
    } else if (piece.customTag && piece.tagStyle === 'handstyle' && stampHandstyle) {
      stampHandstyle(piece.customTag, cx, cy, piece.scheme);
    }

    if (piece.writer || piece.title) {
      X.save();
      X.globalAlpha = Math.min(0.85, ageAlpha);
      X.font = '600 11px "Hanken Grotesk", sans-serif';
      const label = `✦ ${piece.title || 'Mark'} · ${piece.writer || 'Anon'}`;
      const tw = X.measureText(label).width;
      const bx = Math.max(20, Math.min(1560 - tw, cx - tw / 2));
      const by = Math.min(782, cy + 54);
      X.fillStyle = 'rgba(20, 14, 8, 0.62)';
      X.fillRect(bx - 6, by - 11, tw + 12, 16);
      X.fillStyle = '#d4af37';
      X.fillText(label, bx, by);
      X.restore();
    }
  }

  function findNearestPiece(cx, cy) {
    let best = null, minD = 1e9;
    for (const p of livePaintings) {
      if (!p.cx || !p.cy) continue;
      const d = Math.hypot(p.cx - cx, p.cy - cy);
      if (d > 40 && d < minD) { minD = d; best = p; }
    }
    return best;
  }

  // =========================================================
  // 4. GLOBAL WALL SYNC, ARCHIVE TRAY & LIVE BROADCAST
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

  function formatTimeAgo(ts) {
    if (!ts) return 'now';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
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
      card.title = `Slot ${idx + 1}/50 · "${piece.title}" by ${piece.writer} — Click to blend onto your wall`;
      const thumbSrc = piece.image || '';
      card.innerHTML = `
        ${thumbSrc ? `<img class="live-card-thumb" src="${thumbSrc}" alt="${piece.title}" loading="lazy">` : `<div class="live-card-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--gold);font:600 .75rem var(--fd)">✦ Vector Mural</div>`}
        <div class="live-card-info">
          <div class="live-card-title"></div>
          <div class="live-card-sub"><span></span><span>${formatTimeAgo(piece.timestamp)}</span></div>
        </div>
      `;
      card.querySelector('.live-card-title').textContent = piece.title || 'Wall Mark';
      card.querySelector('.live-card-sub span').textContent = piece.writer || 'Anon';
      card.addEventListener('click', () => {
        if (window.__QW && window.__QW.saveUndo) window.__QW.saveUndo();
        renderWallPacket(piece, true, 0.92);
        if (window.__QW && window.__QW.msg) {
          window.__QW.msg(`✦ Blended "${piece.title}" by ${piece.writer} onto the wall.`);
        }
      });
      scrollEl.appendChild(card);
    });
  }

  async function syncGlobalWall(isInitial = false) {
    const statusEl = $('#liveSyncStatus');
    const dotEl = $('#livePulseDot');
    const indEl = $('#liveIndicator');
    try {
      const res = await fetch(API_WALL, { cache: 'no-store' });
      if (!res.ok) throw new Error('offline');
      const data = await res.json();
      if (data && Array.isArray(data.paintings)) {
        if (statusEl && !statusEl.textContent.includes('Edition:')) {
          statusEl.textContent = `● Global Wall Live (${data.paintings.length}/50)`;
        }
        if (dotEl) dotEl.style.background = '#10b981';
        if (indEl) indEl.style.background = '#10b981';

        const incoming = data.paintings;
        const fresh = incoming.filter(p => p.id && !renderedIds.has(p.id));
        livePaintings = incoming.slice(0, MAX_SLOTS);
        saveLocalCache();
        renderArchiveTray();

        if (isInitial) {
          const slice = livePaintings.slice(0, 8).reverse();
          slice.forEach((p, idx) => {
            renderedIds.add(p.id);
            const ageAlpha = 0.35 + (idx / Math.max(1, slice.length - 1)) * 0.6;
            renderWallPacket(p, false, ageAlpha);
          });
        } else if (fresh.length > 0) {
          fresh.reverse().forEach(p => {
            renderedIds.add(p.id);
            renderWallPacket(p, true, 0.95);
            if (window.__QW && window.__QW.msg) {
              window.__QW.msg(`📡 Live on Global Wall: "${p.title}" by ${p.writer}`);
            }
          });
        }
      }
    } catch (e) {
      if (statusEl && !statusEl.textContent.includes('Edition:')) {
        statusEl.textContent = '○ Local Peer Cache';
      }
    }
  }

  async function broadcastToGlobalWall() {
    if (!window.__QW) return;
    const { C, getState, msg, playCanRattle } = window.__QW;
    const wdInput = $('#wd');
    let promptText = wdInput ? wdInput.value.trim() : '';
    if (!promptText) {
      const p = window.prompt('Offer 1–5 words or a title for your wall mark (AI will weave bridging strokes around it):', 'neon midnight bloom');
      if (p === null) return;
      promptText = p.trim() || 'urban drift';
    }

    const savedCreds = JSON.parse(localStorage.getItem('qw_c') || '[]');
    const defaultWriter = (savedCreds.length && savedCreds[savedCreds.length - 1].name) || '';
    const writerInput = window.prompt('Your tag moniker (or leave blank for Anonymous Scribe):', defaultWriter);
    if (writerInput === null) return;
    const writer = writerInput.trim() || 'Anonymous Scribe';

    const st = getState();
    const [cx, cy] = lastCentroid;
    const neighbor = findNearestPiece(cx, cy);

    if (msg) msg('✦ Synthesizing AI seam-blending bridges & inscribing to Global Wall…');

    let aiPrimitives = [];
    let bridgePrimitives = [];
    try {
      const skRes = await fetch(API_SKETCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          cx,
          cy,
          neighborX: neighbor ? neighbor.cx : 0,
          neighborY: neighbor ? neighbor.cy : 0,
          scheme: st.scheme
        })
      });
      if (skRes.ok) {
        const skJson = await skRes.json();
        aiPrimitives = skJson.primitives || [];
        bridgePrimitives = skJson.bridges || [];
      }
    } catch (e) {}

    const snap = document.createElement('canvas');
    snap.width = 240; snap.height = 120;
    snap.getContext('2d').drawImage(C, 0, 0, 240, 120);
    let thumb = snap.toDataURL('image/webp', 0.42);
    if (thumb.length > 26000) thumb = snap.toDataURL('image/jpeg', 0.4);

    const payload = {
      title: promptText.slice(0, 50),
      writer: writer.slice(0, 40),
      substrate: st.substrate,
      cap: st.cap,
      scheme: st.scheme,
      tagStyle: 'handstyle',
      customTag: promptText.slice(0, 22),
      cx,
      cy,
      strokes: sessionStrokes.slice(-24),
      aiPrimitives,
      bridgePrimitives,
      image: thumb
    };

    renderWallPacket(payload, true, 0.96);
    if (playCanRattle) playCanRattle();

    try {
      const res = await fetch(API_WALL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.piece) {
          renderedIds.add(json.piece.id);
          livePaintings.unshift(json.piece);
          livePaintings = livePaintings.slice(0, MAX_SLOTS);
          saveLocalCache();
          renderArchiveTray();
          if (channel) channel.postMessage({ type: 'new_painting', piece: json.piece });
        }
        sessionStrokes = [];
        if (msg) msg(`✓ Merged "${payload.title}" by ${payload.writer} into the worldwide Living Urban Wall!`);
        const tray = $('#liveArchiveTray');
        if (tray) tray.style.display = 'block';
        return;
      }
    } catch (e) {}

    const localPiece = { ...payload, id: 'loc_' + Date.now(), timestamp: Date.now() };
    renderedIds.add(localPiece.id);
    livePaintings.unshift(localPiece);
    saveLocalCache();
    renderArchiveTray();
    if (msg) msg(`✓ Saved "${payload.title}" to local archive tray (offline mode).`);
  }

  function wireWallButtons() {
    const btnBroadcast = $('#btnLiveBroadcast');
    if (btnBroadcast) btnBroadcast.onclick = broadcastToGlobalWall;

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
            renderWallPacket(p, true, 0.95);
          }
        }
      };
    }
  }

  function boot() {
    setupStudioModeToggle();
    setupResonanceSimplification();
    hookMainCanvasRecording();
    loadLocalCache();
    renderArchiveTray();
    wireWallButtons();
    syncGlobalWall(true);
    setInterval(() => {
      if (!document.hidden) syncGlobalWall(false);
    }, 14000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
