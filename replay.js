export function initReplay(edition, mountEl, options = {}) {
  if (!Array.isArray(edition) || !edition.length) return;
  const N = edition.length;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const modal = document.createElement('div');
  modal.className = 'folio-modal active rp-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Edition Replay');

  modal.innerHTML = `<div class="folio-card rp-card">
    <div class="rp-hdr">
      <div><h2 class="rp-title">Edition Replay · <em>${N} Offerings</em></h2></div>
      <button type="button" class="tool-btn" id="rpClose">✕ Close</button>
    </div>
    <div class="rp-wrap">
      <canvas id="rpCv" width="1600" height="800"></canvas>
      <div id="rpTip" class="rp-tip"></div>
    </div>
    <div class="rp-ctrls">
      <div class="rp-bar">
        <input type="range" id="rpRange" min="0" max="1" step="0.001" value="0" aria-label="Timeline scrubber" class="rp-slider">
        <div id="rpTicks" class="rp-ticks"></div>
      </div>
      <div class="rp-row">
        <div class="rp-btns">
          <button type="button" class="tool-btn active" id="rpPlay" aria-label="Play replay">▶ Play</button>
          <button type="button" class="tool-btn" id="rpBack" aria-label="Step back">⏮ Back</button>
          <button type="button" class="tool-btn" id="rpNext" aria-label="Step forward">⏭ Next</button>
          <span id="rpLbl" class="rp-lbl"></span>
        </div>
        <div id="rpExpWrap"></div>
      </div>
    </div>
  </div>`;

  document.body.appendChild(modal);

  const cv = modal.querySelector('#rpCv'), ctx = cv.getContext('2d'), slider = modal.querySelector('#rpRange');
  const tip = modal.querySelector('#rpTip'), tickBox = modal.querySelector('#rpTicks'), btnPlay = modal.querySelector('#rpPlay');
  const lbl = modal.querySelector('#rpLbl'), expWrap = modal.querySelector('#rpExpWrap');

  let t=0,isPlaying=false,animId=null,lastTime=0;
  const DURATION=10000;

  function draw(newT) {
    t = Math.max(0, Math.min(1, newT));
    ctx.fillStyle = '#ebe0ce';
    ctx.fillRect(0, 0, 1600, 800);
    if (window.renderEdition) window.renderEdition(edition, t, ctx, 1600, 800);
    slider.value = t;
    lbl.textContent = `${Math.min(N, Math.floor(t * N) + 1)} / ${N} (${Math.round(t * 100)}%)`;
  }

  function play() {
    if (isPlaying) return;
    isPlaying = true; btnPlay.textContent = '⏸ Pause'; btnPlay.setAttribute('aria-label', 'Pause replay');
    lastTime = performance.now();
    function tick(now) {
      if (!isPlaying) return;
      const nextT = t + (now - lastTime) / DURATION;
      lastTime = now;
      if (nextT >= 1) { draw(1); pause(); return; }
      draw(nextT);
      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);
  }

  function pause() {
    isPlaying = false;
    if (animId) cancelAnimationFrame(animId);
    btnPlay.textContent = '▶ Play'; btnPlay.setAttribute('aria-label', 'Play replay');
  }

  edition.forEach((item, i) => {
    const dot = document.createElement('div'), frac = i / N;
    dot.className = 'rp-dot';
    dot.style.left = (frac * 100) + '%';
    dot.tabIndex = 0;
    dot.setAttribute('aria-label', `Offering #${item.id}: ${(item.words||0).join(' ')}`);
    const hover = () => { tip.style.display = 'block'; tip.textContent = `"${(item.words||0).join(' ')}" · ${item.name||'Anonymous'}`; };
    dot.onmouseenter = hover; dot.onfocus = hover;
    dot.onmouseleave = () => { tip.style.display = 'none'; }; dot.onblur = () => { tip.style.display = 'none'; };
    dot.onclick = () => { pause(); draw(frac); };
    dot.onkeydown = e => { if (e.key === 'Enter') { pause(); draw(frac); } };
    tickBox.appendChild(dot);
  });

  slider.oninput = () => { pause(); draw(parseFloat(slider.value)); };
  btnPlay.onclick = () => { if (isPlaying) pause(); else play(); };
  modal.querySelector('#rpBack').onclick = () => { pause(); draw(Math.max(0, (Math.floor(t * N) - 1) / N)); };
  modal.querySelector('#rpNext').onclick = () => { pause(); draw(Math.min(1, (Math.floor(t * N) + 1) / N)); };
  modal.querySelector('#rpClose').onclick = () => { pause(); removeEventListener('keydown', onKey); modal.remove(); };

  if (typeof cv.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
    const btnExp = document.createElement('button');
    btnExp.type = 'button'; btnExp.className = 'tool-btn rp-exp-btn';
    btnExp.textContent = '🎬 Export Film'; btnExp.setAttribute('aria-label', 'Export replay film as WebM');

    btnExp.onclick = () => {
      pause(); btnExp.disabled = true; btnExp.textContent = '⏳ Recording…';
      draw(0);
      const stream = cv.captureStream(30), rec = new MediaRecorder(stream, { mimeType: 'video/webm' }), chunks = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
        a.download = `qweirdo-edition-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        btnExp.disabled = false; btnExp.textContent = '🎬 Export Film';
      };
      rec.start(); play();
      setTimeout(() => { if (rec.state === 'recording') { rec.stop(); pause(); } }, DURATION + 350);
    };
    expWrap.appendChild(btnExp);
  }

  function onKey(e) {
    if (e.target && ['input', 'textarea'].includes(e.target.tagName.toLowerCase())) return;
    if (e.code === 'Space') { e.preventDefault(); if (isPlaying) pause(); else play(); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); pause(); draw(Math.max(0, (Math.floor(t * N) - 1) / N)); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); pause(); draw(Math.min(1, (Math.floor(t * N) + 1) / N)); }
    else if (e.code === 'Escape') modal.querySelector('#rpClose').click();
  }
  addEventListener('keydown', onKey);

  draw(0);
  if (!prefersReduced && options.autoplay !== false) play();
}
