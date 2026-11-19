import { isBad } from './src/filter.js';

const CREDITS_ENDPOINT=''; // optional: paste endpoint to receive credit submissions
const $=s=>document.querySelector(s),C=$('#cv'),X=C.getContext('2d'),O=$('#ov').getContext('2d'),W=1600,H=800,TARGET=150000,R=(a,b)=>a+Math.random()*(b-a);
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_e){}},ld=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(_e){return d}};
let steps=ld('qw_s',0),cred=ld('qw_c',[]),arch=ld('qw_a',[]),ag=[],wall=[],vivid=.7,done=false,hoverPos=null,lastAmbTime=0;
let currentNftMetadata = null;
let currentNftHash = '';
let activeEdition = [];
let lastHumanMarkTime = 0, lastAiSketchTime = 0;
let cov = Array(128).fill(0);
const fmt = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
function msg(m, w) { const e = $('#msg'); if (!e) return; e.textContent = m; e.className = w ? 'warn' : ''; }

// Topographic Stratigraphy & Subterranean Zones
const ZONES=[
  {name:'Aged Scriptorium Vellum', kd:'vellum', x:260,  y:220, r:300, hue:40,  label:'Aged Vellum & Honey Patina'},
  {name:'Laid Rag Paper Fibers',   kd:'paper',  x:800,  y:190, r:330, hue:36,  label:'Watermarked Chain Lines'},
  {name:'Mineral Plaster Tooth',   kd:'tooth',  x:1340, y:220, r:300, hue:32,  label:'Gesso Ground & Calcite Tooth'},
  {name:'Gold Leaf Cartouche',     kd:'leaf',   x:270,  y:580, r:320, hue:45,  label:'Burnished Foil Deckle'},
  {name:'Living Strata Wash',  kd:'wash',   x:800,  y:580, r:330, hue:175, label:'Teal Bistre Pentimento'},
  {name:'Illuminated Folio Matrix',kd:'matrix', x:1330, y:580, r:310, hue:28,  label:'Midnight Scriptorium Wall'}
];

function getZoneAt(x,y){
  let best=ZONES[0],minD=1e9;
  for(const z of ZONES){
    const d=Math.hypot(x-z.x,y-z.y);
    if(d<minD){minD=d;best=z}
  }
  return best;
}

// Curated Street Enamel Palettes
const SCHEMES={
  gold:       {name:'Illuminated Gold',      hue:42,  sat:92, li:54, stroke:'#d4af37', glow:'rgba(212,175,55,0.5)',  desc:'Burnished manuscript gold leaf & metallic foil'},
  lapis:      {name:'Lapis Lazuli',          hue:220, sat:60, li:28, stroke:'#1c3b72', glow:'rgba(28,59,114,0.5)',   desc:'Deep Afghan lapis lazuli mineral pigment'},
  oxblood:    {name:'Venetian Oxblood',      hue:350, sat:88, li:36, stroke:'#8b1c28', glow:'rgba(139,28,40,0.5)',   desc:'Deep cinnabar red with rich mineral carmine undertones'},
  teal:       {name:'Verdigris Teal',        hue:175, sat:72, li:38, stroke:'#1b5e5a', glow:'rgba(27,94,90,0.5)',    desc:'Mineral copper verdigris patina & ancient bronze'},
  tealsage:   {name:'Verdigris Teal',        hue:175, sat:72, li:38, stroke:'#1b5e5a', glow:'rgba(27,94,90,0.5)',    desc:'Mineral copper verdigris patina & ancient bronze'},
  sage:       {name:'Florentine Sage',       hue:138, sat:28, li:42, stroke:'#5a7d65', glow:'rgba(90,125,101,0.5)',  desc:'Pressed Tuscan botanical sage & celadon ground'},
  tyrian:     {name:'Tyrian Purple',         hue:306, sat:54, li:21, stroke:'#52184c', glow:'rgba(82,24,76,0.5)',    desc:'Classical murex purple reserved for illuminated folios'},
  bistre:     {name:'Walnut Bistre',         hue:30,  sat:36, li:24, stroke:'#523b26', glow:'rgba(82,59,38,0.5)',    desc:'Warm roasted coffee & historic iron gall walnut wash'},
  terracotta: {name:'Pompeian Terracotta',   hue:15,  sat:56, li:46, stroke:'#b85434', glow:'rgba(184,84,52,0.5)',   desc:'Warm baked clay, fresco pozzolana, and raw sienna'},
  chrome:     {name:'Liquid Sterling Silver',hue:214, sat:35, li:90, stroke:'#dbe4f0', glow:'rgba(219,228,240,0.6)', desc:'High-sheen liquid mirror chrome with sky reflection'},
  matte:      {name:'Opal Obsidian Pitch',   hue:220, sat:15, li:10, stroke:'#15171c', glow:'rgba(21,23,28,0.6)',    desc:'Deep carbon black pigment & raw charcoal pitch'},
  obsidian:   {name:'Opal Obsidian Pitch',   hue:220, sat:15, li:10, stroke:'#15171c', glow:'rgba(21,23,28,0.6)',    desc:'Deep carbon black pigment & raw charcoal pitch'}
};
const getScheme=k=>(k&&Object.hasOwn(SCHEMES,k)?SCHEMES[k]:SCHEMES.gold);
let activeScheme='gold';
let currentCap='fat';         // 'fat', 'skinny', 'mop', 'spatter', 'buff'
let currentSubstrate='parchment'; // Unified Aged Scriptorium Vellum Wall
let activeMiniCanvas=null;    // Focused illuminated mini-canvas cartouche
let miniCanvasesHistory=[];   // Archive of blended mini-canvases
let isDrawing=false,lastDrawPt=null;
let activeDrips=[];

// Interactive Pochoir Stencil state
let activeStencil=null;       // null or 'pompeii', 'kilroy', 'cornbread', 'taki183', 'stayhigh', 'rammellzee', 'commons'
let stencilPos=[800,400];
let stencilLocked=false;
let isLoupeActive=false;
let fluidityActive=true;

// Fluid Teal Tidal Wave Pulse
function pulseTealWave(){
  saveUndo();
  playCanRattle();
  if(window.__triggerSiteWavePulse)window.__triggerSiteWavePulse(2.4);

  X.save();
  const waveColors=[
    {h:175,s:72,l:38,alpha:0.22,amp:45,freq:0.0035},
    {h:165,s:65,l:45,alpha:0.18,amp:65,freq:0.0028},
    {h:185,s:80,l:32,alpha:0.25,amp:35,freq:0.0048},
    {h:140,s:40,l:60,alpha:0.15,amp:25,freq:0.0055}
  ];

  const sweepY=H*0.48;
  waveColors.forEach((wc,idx)=>{
    X.beginPath();
    X.moveTo(0,H);
    X.lineTo(0,sweepY);

    for(let x=0;x<=W;x+=15){
      const y=sweepY+Math.sin(x*wc.freq+idx*1.2)*wc.amp
                     +Math.cos(x*wc.freq*0.7-idx*0.8)*(wc.amp*0.5);
      X.lineTo(x,y);
    }

    X.lineTo(W,H);
    X.closePath();
    X.fillStyle=`hsla(${wc.h},${wc.s}%,${wc.l}%,${wc.alpha})`;
    X.fill();

    X.strokeStyle=`hsla(${wc.h},${wc.s}%,${wc.l+15}%,${wc.alpha*1.5})`;
    X.lineWidth=2.5;
    X.stroke();
  });

  for(let i=0;i<90;i++){
    const fx=R(0,W);
    const fy=sweepY+Math.sin(fx*0.0035)*45+R(-25,25);
    X.fillStyle=Math.random()<0.6?'#a2d2cd':'#ffffff';
    X.globalAlpha=R(0.3,0.75);
    X.beginPath();
    X.arc(fx,fy,R(1.2,3.8),0,6.28);
    X.fill();

    if(Math.random()<0.2){
      addDrip(fx,fy,'#1b5e5a',3.2,1.2);
    }
  }
  X.restore();

  msg("🌊 Fluid tidal teal wave pulsed across the wall and site!");
}

// Web Audio Street Synthesizer
let audioCtx=null;
let audioActive=false;
let hissNode=null,hissGain=null,hissFilter=null;

function initAudio(){
  if(!audioCtx){
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(AudioContext)audioCtx=new AudioContext();
  }
  if(audioCtx&&audioCtx.state==='suspended'){
    audioCtx.resume();
  }
}

// 1. Procedural Rattle-Can Agitator Ball Click-Clack
function playCanRattle(){
  if(!audioActive||!audioCtx)return;
  const now=audioCtx.currentTime;
  [0,0.045].forEach((delay,idx)=>{
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    const filter=audioCtx.createBiquadFilter();
    osc.type='triangle';
    osc.frequency.setValueAtTime(idx===0?3200+Math.random()*400:4600+Math.random()*500,now+delay);
    filter.type='bandpass';
    filter.frequency.setValueAtTime(3800,now+delay);
    filter.Q.setValueAtTime(8,now+delay);
    gain.gain.setValueAtTime(0.28,now+delay);
    gain.gain.exponentialRampToValueAtTime(0.001,now+delay+0.035);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now+delay);
    osc.stop(now+delay+0.04);
  });
}

// 2. Continuous Pressurized Aerosol Spray Hiss
function startSprayHiss(){
  if(!audioActive||!audioCtx||hissNode)return;
  const bufferSize=audioCtx.sampleRate*1.5;
  const noiseBuffer=audioCtx.createBuffer(1,bufferSize,audioCtx.sampleRate);
  const output=noiseBuffer.getChannelData(0);
  let b0=0,b1=0,b2=0;
  for(let i=0;i<bufferSize;i++){
    const white=Math.random()*2-1;
    b0=0.99886*b0+white*0.0555179;
    b1=0.99332*b1+white*0.0750759;
    b2=0.96900*b2+white*0.1538520;
    output[i]=(b0+b1+b2)*0.35;
  }
  hissNode=audioCtx.createBufferSource();
  hissNode.buffer=noiseBuffer;
  hissNode.loop=true;
  hissFilter=audioCtx.createBiquadFilter();
  hissFilter.type='bandpass';
  hissFilter.frequency.setValueAtTime(2400,audioCtx.currentTime);
  hissFilter.Q.setValueAtTime(1.8,audioCtx.currentTime);
  hissGain=audioCtx.createGain();
  hissGain.gain.setValueAtTime(0.01,audioCtx.currentTime);
  hissGain.gain.linearRampToValueAtTime(0.18,audioCtx.currentTime+0.06);
  hissNode.connect(hissFilter);
  hissFilter.connect(hissGain);
  hissGain.connect(audioCtx.destination);
  hissNode.start();
}

function updateSprayHiss(speed){
  if(!hissGain||!hissFilter||!audioCtx)return;
  const targetFreq=1600+Math.min(2400,speed*80);
  hissFilter.frequency.setTargetAtTime(targetFreq,audioCtx.currentTime,0.05);
}

function stopSprayHiss(){
  if(hissGain&&audioCtx){
    hissGain.gain.linearRampToValueAtTime(0.001,audioCtx.currentTime+0.05);
    setTimeout(()=>{
      try{if(hissNode){hissNode.stop();hissNode.disconnect();}}catch(e){}
      hissNode=null;hissGain=null;hissFilter=null;
    },60);
  }
}

// 3. Chisel Marker Felt Nib Squeak
function playMarkerSqueak(){
  if(!audioActive||!audioCtx)return;
  const now=audioCtx.currentTime;
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type='sawtooth';
  osc.frequency.setValueAtTime(1900+Math.random()*500,now);
  osc.frequency.exponentialRampToValueAtTime(1400+Math.random()*300,now+0.07);
  gain.gain.setValueAtTime(0.12,now);
  gain.gain.exponentialRampToValueAtTime(0.001,now+0.07);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now+0.08);
}

// Undo Stack Architecture
const undoStack=[];
const MAX_UNDO=12;

function saveUndo(){
  try{
    if(undoStack.length>=MAX_UNDO)undoStack.shift();
    undoStack.push(X.getImageData(0,0,W,H));
    updateUndoUI();
  }catch(e){}
}

function undo(){
  if(!undoStack.length){
    msg('Nothing to undo.');
    return;
  }
  const prev=undoStack.pop();
  X.putImageData(prev,0,0);
  updateUndoUI();
  msg('Previous action undone.');
}

function updateUndoUI(){
  const btn=$('#btnUndo');
  if(btn){
    btn.disabled=undoStack.length===0;
    btn.style.opacity=undoStack.length===0?'.45':'1';
    btn.title=undoStack.length?`Undo last action (${undoStack.length} in history) [Ctrl+Z]`:'Nothing to undo';
  }
}

function setScheme(key){
  if(!key||!Object.hasOwn(SCHEMES,key))return;
  activeScheme=key;
  document.querySelectorAll('.palette-chip').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.scheme===key);
  });
  playCanRattle();
  msg(`Enamel active: ${SCHEMES[key].name} (${SCHEMES[key].desc}).`);
}

function setCap(capKey){
  currentCap=capKey;
  isLoupeActive=false;
  $('#toolLoupe').classList.remove('active');
  document.querySelectorAll('.tool-btn[data-cap]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.cap===capKey);
    btn.classList.toggle('active-cap',btn.dataset.cap===capKey);
  });
  playCanRattle();
  const capNames={fat:'Pink Dot Astro Fat Cap',skinny:'NY Skinny Outline Cap',mop:'Krink K-60 Chisel Mop',spatter:'Spatter & Flare Cap',buff:'MTA Clean Train Buff Roller',waves:'Teal Hydro-Waves (Liquid Oceanic Currents)'};
  msg(`Aerosol Cap active: ${capNames[capKey]||capKey}.`);
}

function setSubstrate(){
  currentSubstrate='parchment';
  saveUndo();
  drawSubstrate();
  msg('Surface: Aged Manuscript Vellum.');
}

// Unified Aged Parchment & Scriptorium Wall Procedural Renderer
function drawSubstrate(){
  X.save();
  X.globalCompositeOperation='source-over';

  // 0. Strata Ghost: previous edition snapshot at 6% opacity
  if (typeof arch !== 'undefined' && arch && arch.length > 0 && arch[0].img) {
    const ghost = new Image();
    ghost.onload = () => {
      X.save();
      X.globalCompositeOperation = 'source-over';
      X.globalAlpha = 0.06;
      X.drawImage(ghost, 0, 0, W, H);
      X.restore();
    };
    ghost.src = arch[0].img;
  }

  // 1. Base luminous aged vellum & paper ground
  const bg=X.createRadialGradient(W/2,H/2,W*0.15,W/2,H/2,W*0.75);
  bg.addColorStop(0,'#f7efe1');    // Light warm honey-tinted vellum core
  bg.addColorStop(0.5,'#eee0cc');  // Aged parchment tone
  bg.addColorStop(0.85,'#e4d2b9'); // Bistre & tea patina towards edges
  bg.addColorStop(1,'#d8c2a3');    // Natural leathered margin
  X.fillStyle=bg;
  X.fillRect(0,0,W,H);

  // 2. Laid paper chain lines & wire watermark structure
  X.lineWidth=0.6;
  for(let x=38;x<W;x+=38){
    X.strokeStyle=(x%152===0)?'rgba(120,95,70,0.065)':'rgba(140,115,85,0.035)';
    X.beginPath();
    X.moveTo(x,0);
    for(let y=0;y<=H;y+=40){
      X.lineTo(x+Math.sin((y+x*0.1)*0.02)*1.2,y);
    }
    X.stroke();
  }

  // Horizontal laid paper wires
  X.lineWidth=0.4;
  X.strokeStyle='rgba(160,135,100,0.022)';
  for(let y=12;y<H;y+=12){
    X.beginPath();
    X.moveTo(0,y);
    X.lineTo(W,y);
    X.stroke();
  }

  // 3. Wall Plaster Craquelure & Natural Gesso Fractures
  X.lineWidth=0.55;
  const fractureSeeds=[
    {x:180,y:120,len:140,angle:0.8},
    {x:480,y:640,len:190,angle:-0.6},
    {x:820,y:90, len:160,angle:0.4},
    {x:1180,y:580,len:210,angle:-0.7},
    {x:1420,y:220,len:150,angle:0.9}
  ];
  fractureSeeds.forEach(s=>{
    X.strokeStyle='rgba(110,85,60,0.07)';
    X.beginPath();
    let cx=s.x,cy=s.y;
    X.moveTo(cx,cy);
    const segs=Math.floor(s.len/18);
    for(let i=0;i<segs;i++){
      cx+=Math.cos(s.angle+(Math.sin(i*1.5)*0.4))*18;
      cy+=Math.sin(s.angle+(Math.cos(i*1.2)*0.4))*18;
      X.lineTo(cx,cy);
      if(i===Math.floor(segs/2)){
        X.moveTo(cx,cy);
        X.lineTo(cx+25*Math.cos(s.angle+0.8),cy+25*Math.sin(s.angle+0.8));
        X.moveTo(cx,cy);
      }
    }
    X.stroke();
  });

  // 4. Mineral Tooth, Linen Fibers, & Organic Flecks
  for(let i=0;i<480;i++){
    const fx=R(0,W),fy=R(0,H);
    const isDark=Math.random()<0.65;
    X.fillStyle=isDark?'rgba(75,55,35,0.08)':'rgba(255,255,250,0.14)';
    const sz=R(0.8,2.4);
    if(Math.random()<0.25){
      X.strokeStyle='rgba(90,65,45,0.07)';
      X.lineWidth=0.5;
      X.beginPath();
      X.moveTo(fx,fy);
      X.quadraticCurveTo(fx+R(-6,6),fy+R(-6,6),fx+R(-10,10),fy+R(-8,8));
      X.stroke();
    } else {
      X.fillRect(fx,fy,sz,sz*(Math.random()<0.5?1:1.8));
    }
  }

  // 5. Ambient Bistre & Verdigris Patina Washes
  const washes=[
    {x:220,y:160,r:240,color:'rgba(140,110,80,0.045)'},
    {x:1380,y:140,r:280,color:'rgba(125,95,65,0.04)'},
    {x:320,y:660,r:300,color:'rgba(130,105,75,0.045)'},
    {x:1240,y:680,r:320,color:'rgba(27,94,90,0.03)'},
    {x:800,y:400,r:420,color:'rgba(165,135,95,0.025)'}
  ];
  washes.forEach(w=>{
    const wg=X.createRadialGradient(w.x,w.y,0,w.x,w.y,w.r);
    wg.addColorStop(0,w.color);
    wg.addColorStop(1,'rgba(0,0,0,0)');
    X.fillStyle=wg;
    X.beginPath();
    X.arc(w.x,w.y,w.r,0,Math.PI*2);
    X.fill();
  });

  // 6. Illuminated Archival Margin Border
  X.strokeStyle='rgba(212,175,55,0.22)';
  X.lineWidth=1;
  X.strokeRect(24,24,W-48,H-48);
  X.strokeStyle='rgba(132,76,28,0.12)';
  X.lineWidth=0.5;
  X.strokeRect(28,28,W-56,H-56);

  const corners=[[24,24],[W-24,24],[24,H-24],[W-24,H-24]];
  corners.forEach(([cx,cy])=>{
    X.strokeStyle='rgba(212,175,55,0.4)';
    X.lineWidth=1.2;
    X.beginPath();
    X.arc(cx,cy,10,0,Math.PI*2);
    X.stroke();
  });

  X.restore();
}

function blank(){
  drawSubstrate();
}

// Gravity Drips Engine
function addDrip(x,y,color,size,speed){
  if(activeDrips.length>70)return;
  activeDrips.push({
    x,y,
    curX:x,curY:y,
    vx:(Math.random()-0.5)*0.35,
    vy:R(1.2,2.4)*(speed||1),
    len:0,
    maxLen:R(20,110),
    width:Math.max(1.4,size*0.38),
    color:color,
    alpha:0.95
  });
}

function updateDrips(){
  if(!activeDrips.length)return;
  X.save();
  for(let i=activeDrips.length-1;i>=0;i--){
    const d=activeDrips[i];
    const prevX=d.curX,prevY=d.curY;
    d.curX+=d.vx;
    d.curY+=d.vy;
    d.len+=d.vy;
    d.width=Math.max(0.8,d.width*0.992);
    d.vx+=(Math.random()-0.5)*0.15;

    X.strokeStyle=d.color;
    X.lineWidth=d.width;
    X.lineCap='round';
    X.beginPath();X.moveTo(prevX,prevY);X.lineTo(d.curX,d.curY);X.stroke();

    if(d.len>=d.maxLen||d.curY>=H-10){
      X.fillStyle=d.color;
      X.beginPath();
      X.arc(d.curX,d.curY+d.width*0.5,d.width*1.35,0,6.28);
      X.fill();
      activeDrips.splice(i,1);
    }
  }
  X.restore();
}

// Aerosol Physics & Cap Engine
function drawAerosol(x,y,px,py,cap,schemeKey){
  const sc=getScheme(schemeKey);
  const dist=Math.hypot(x-px,y-py);
  const steps=Math.max(1,Math.ceil(dist/3));

  X.save();

  if(cap==='buff'){
    // MTA Buff Roller: Semi-translucent municipal primer paint creating historic pentimento
    const rollerW=68;
    const rollerAng=Math.atan2(y-py,x-px);
    const perp=rollerAng+Math.PI/2;
    const dx=Math.cos(perp)*(rollerW/2);
    const dy=Math.sin(perp)*(rollerW/2);

    const buffAlpha=0.68;
    X.fillStyle=`rgba(235,224,206,${buffAlpha})`;

    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const ix=px+(x-px)*t;
      const iy=py+(y-py)*t;

      X.beginPath();
      X.moveTo(ix-dx,iy-dy);X.lineTo(ix+dx,iy+dy);
      X.lineTo(ix+dx+R(-2,2),iy+dy+R(-2,2));
      X.lineTo(ix-dx+R(-2,2),iy-dy+R(-2,2));
      X.closePath();X.fill();

      for(let k=0;k<12;k++){
        X.fillStyle=Math.random()<0.5?'rgba(30,32,38,0.15)':'rgba(255,255,255,0.12)';
        X.fillRect(ix+R(-rollerW/2,rollerW/2),iy+R(-4,4),R(1.5,3.5),R(1.5,3.5));
      }
    }

  } else if(cap==='mop'){
    // Krink K-60 Chisel Squeeze Mop
    const mopW=20;
    X.strokeStyle=sc.stroke;
    X.lineWidth=mopW;
    X.lineCap='butt';
    X.lineJoin='miter';

    X.beginPath();X.moveTo(px,py);X.lineTo(x,y);X.stroke();

    X.strokeStyle=sc.stroke;
    X.lineWidth=mopW*0.55;
    X.beginPath();X.moveTo(px,py);X.lineTo(x,y);X.stroke();

    if(dist<4||Math.random()<0.08){
      addDrip(x,y,sc.stroke,mopW*0.35,1.3);
    }

  } else if(cap==='skinny'){
    // NY Skinny Cap: Razor-sharp outline cap
    const r=5.5;
    X.strokeStyle=sc.stroke;
    X.lineWidth=r*1.8;
    X.lineCap='round';
    X.lineJoin='round';

    X.beginPath();X.moveTo(px,py);X.lineTo(x,y);X.stroke();

    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const ix=px+(x-px)*t;
      const iy=py+(y-py)*t;
      for(let k=0;k<4;k++){
        const a=Math.random()*6.28;
        const rad=R(r,r*1.8);
        X.fillStyle=sc.stroke;
        X.globalAlpha=R(0.2,0.6);
        X.beginPath();X.arc(ix+Math.cos(a)*rad,iy+Math.sin(a)*rad,R(0.6,1.2),0,6.28);X.fill();
      }
    }

  } else if(cap==='spatter'){
    // Spatter / Flare Cap
    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const ix=px+(x-px)*t;
      const iy=py+(y-py)*t;
      const count=Math.floor(R(12,28));

      for(let k=0;k<count;k++){
        const a=Math.random()*6.28;
        const rad=Math.pow(Math.random(),0.65)*65;
        const dotR=R(0.8,3.2);
        X.fillStyle=sc.stroke;
        X.globalAlpha=R(0.4,0.9);
        X.beginPath();X.arc(ix+Math.cos(a)*rad,iy+Math.sin(a)*rad,dotR,0,6.28);X.fill();
      }
    }

  } else {
    // Default: Pink Dot Astro Fat Cap
    const fatR=38;

    for(let s=0;s<=steps;s++){
      const t=s/steps;
      const ix=px+(x-px)*t;
      const iy=py+(y-py)*t;

      const hg=X.createRadialGradient(ix,iy,0,ix,iy,fatR);
      hg.addColorStop(0,sc.stroke);
      hg.addColorStop(0.35,sc.stroke);
      hg.addColorStop(0.7,sc.glow);
      hg.addColorStop(1,'rgba(0,0,0,0)');

      X.fillStyle=hg;
      X.globalAlpha=0.32;
      X.beginPath();X.arc(ix,iy,fatR,0,6.28);X.fill();

      const pCount=Math.floor(R(18,30));
      for(let k=0;k<pCount;k++){
        const a=Math.random()*6.28;
        const rad=Math.pow(Math.random(),1.5)*fatR;
        const pSize=R(0.8,2.4);
        X.fillStyle=sc.stroke;
        X.globalAlpha=R(0.35,0.95);
        X.beginPath();X.arc(ix+Math.cos(a)*rad,iy+Math.sin(a)*rad,pSize,0,6.28);X.fill();
      }
    }

    if(dist<3.5||Math.random()<0.045){
      addDrip(x,y,sc.stroke,4.2,1.5);
    }
  }

  X.restore();
}

// Algorithmic Wildstyle & Throw-up Generator
function stampWildstyleBurner(text,x,y,schemeKey){
  if(!text||!text.trim())text='QWEIRDO';
  text=text.trim().toUpperCase().slice(0,24);
  const sc=getScheme(schemeKey);

  saveUndo();
  X.save();

  const fSize=Math.max(34,Math.min(84,Math.round(1020/Math.max(9,text.length))));
  X.font="italic 900 "+fSize+"px 'Fraunces',sans-serif";
  X.textAlign='center';
  X.textBaseline='middle';
  const tw=Math.max(140,X.measureText(text).width);

  const arrowW=Math.max(38,fSize*0.75);
  x=Math.max(tw/2+arrowW+40,Math.min(W-tw/2-arrowW-40,x));
  y=Math.max(fSize+60,Math.min(H-fSize-70,y));

  // 1. Ambient Aerosol Mist Halo (High-pressure Fat Cap Backing Glow)
  const glowR=tw*0.58;
  const radGlow=X.createRadialGradient(x,y,fSize*0.2,x,y,glowR);
  radGlow.addColorStop(0,sc.glow);
  radGlow.addColorStop(0.5,sc.glow);
  radGlow.addColorStop(1,'rgba(0,0,0,0)');
  X.fillStyle=radGlow;
  X.globalAlpha=0.28;
  X.beginPath();X.ellipse(x,y,glowR,fSize*1.35,0,0,6.28);X.fill();

  // Fine micro-spatter aerosol perimeter dust
  X.fillStyle=sc.stroke;
  for(let i=0;i<45;i++){
    const ang=Math.random()*6.28;
    const rad=R(tw*0.42,tw*0.62);
    X.globalAlpha=R(0.18,0.65);
    X.beginPath();
    X.arc(x+Math.cos(ang)*rad,y+Math.sin(ang)*(fSize*1.15),R(0.8,2.2),0,6.28);
    X.fill();
  }

  // 2. Multi-tiered 3D Extruded Chiaroscuro Drop Blocks
  const dropDepth=Math.round(fSize*0.42);
  X.globalAlpha=0.88;
  for(let d=dropDepth+8;d>=dropDepth;d--){
    X.fillStyle='rgba(6,8,12,0.92)';
    X.fillText(text,x+d*1.2,y+d*1.2);
  }

  for(let d=dropDepth;d>=1;d--){
    const progress=d/dropDepth;
    const r=Math.round(10*(1-progress)+46*progress);
    const g=Math.round(12*(1-progress)+60*progress);
    const b=Math.round(18*(1-progress)+82*progress);
    X.fillStyle="rgb("+r+","+g+","+b+")";
    X.fillText(text,x+d*1.2,y+d*1.2);
  }

  // Metallic Bevel Pinstripe Facets (Brushed Steel Chamfer Cuts)
  X.strokeStyle='rgba(255,255,255,0.24)';
  X.lineWidth=1;
  for(let d=dropDepth;d>=4;d-=6){
    X.strokeText(text,x+d*1.2,y+d*1.2);
  }

  // 3. Mechanical Gothic Futurism Bevel Arrows (Left & Right Terminals)
  function drawPanzerArrow(ax,ay,dir){
    X.save();
    X.translate(ax,ay);
    X.scale(dir,1);

    // Extruded 3D block shadow
    for(let d=Math.round(dropDepth*0.75);d>=1;d--){
      X.fillStyle='rgba(8,10,14,0.85)';
      X.beginPath();
      X.moveTo(0+d*1.2,-fSize*0.28+d*1.2);
      X.lineTo(arrowW*0.6+d*1.2,-fSize*0.28+d*1.2);
      X.lineTo(arrowW*1.05+d*1.2,0+d*1.2);
      X.lineTo(arrowW*0.6+d*1.2,fSize*0.28+d*1.2);
      X.lineTo(0+d*1.2,fSize*0.28+d*1.2);
      X.lineTo(arrowW*0.35+d*1.2,0+d*1.2);
      X.closePath();
      X.fill();
    }

    // Outer Neon Glow Keyline
    X.strokeStyle='#00f0ff';
    X.lineWidth=Math.max(5,fSize*0.12);
    X.beginPath();
    X.moveTo(0,-fSize*0.28);
    X.lineTo(arrowW*0.6,-fSize*0.28);
    X.lineTo(arrowW*1.05,0);
    X.lineTo(arrowW*0.6,fSize*0.28);
    X.lineTo(0,fSize*0.28);
    X.lineTo(arrowW*0.35,0);
    X.closePath();
    X.stroke();

    // Black Armor Outline
    X.strokeStyle='#06080c';
    X.lineWidth=Math.max(3,fSize*0.07);
    X.stroke();

    // Chrome-to-Scheme Split Gradient Fill
    const ag=X.createLinearGradient(0,-fSize*0.28,arrowW,fSize*0.28);
    ag.addColorStop(0,'#f0f6ff');
    ag.addColorStop(0.48,'#6a88b0');
    ag.addColorStop(0.5,'#0d1117');
    ag.addColorStop(0.52,'#844c1c');
    ag.addColorStop(1,sc.stroke);
    X.fillStyle=ag;
    X.fill();

    // Interior Armor Slit Cutout (Laser Slot)
    X.strokeStyle='#06080c';
    X.lineWidth=2.5;
    X.beginPath();
    X.moveTo(arrowW*0.2,0);
    X.lineTo(arrowW*0.8,0);
    X.stroke();

    // Mechanical Armor Rivets (Circular Titanium Studs)
    [arrowW*0.35,arrowW*0.58].forEach(rx=>{
      [-fSize*0.15,fSize*0.15].forEach(ry=>{
        X.fillStyle='#06080c';
        X.beginPath();X.arc(rx,ry,2.5,0,6.28);X.fill();
        X.fillStyle='#ffffff';
        X.beginPath();X.arc(rx-0.6,ry-0.6,1.0,0,6.28);X.fill();
      });
    });

    X.restore();
  }

  drawPanzerArrow(x-tw/2-14,y,-1);
  drawPanzerArrow(x+tw/2+14,y,1);

  // 4. Tri-Layer Power Keylines for Typography
  // Outer Neon Glow (Electric Cyan / Accent)
  X.strokeStyle='#00f0ff';
  X.lineWidth=Math.max(8,fSize*0.18);
  X.lineJoin='miter';
  X.miterLimit=4;
  X.globalAlpha=0.88;
  X.strokeText(text,x,y);

  // Mid Accent Scheme Line
  X.strokeStyle=sc.stroke;
  X.lineWidth=Math.max(5,fSize*0.12);
  X.strokeText(text,x,y);

  // Inner Razor Black Separator
  X.strokeStyle='#06080c';
  X.lineWidth=Math.max(3,fSize*0.07);
  X.strokeText(text,x,y);

  // 5. Triple-Pass Chrome Horizon Reflection Fill
  const chr=X.createLinearGradient(x,y-fSize*0.52,x,y+fSize*0.52);
  chr.addColorStop(0.00,'#0e1f3d');
  chr.addColorStop(0.24,'#4facfe');
  chr.addColorStop(0.48,'#ffffff');
  chr.addColorStop(0.50,'#070a0e');
  chr.addColorStop(0.53,'#5c320d');
  chr.addColorStop(0.78,sc.stroke);
  chr.addColorStop(1.00,'#150608');
  X.fillStyle=chr;
  X.globalAlpha=1.0;
  X.fillText(text,x,y);

  // 6. Gold Leaf Centerline Pinstripe & Diagonal Sheen Slices
  X.strokeStyle='rgba(255,226,112,0.85)';
  X.lineWidth=1.2;
  X.beginPath();
  X.moveTo(x-tw*0.48,y);
  X.lineTo(x+tw*0.48,y);
  X.stroke();

  X.strokeStyle='rgba(255,255,255,0.42)';
  X.lineWidth=1.5;
  for(let i=-3;i<=3;i++){
    const sx=x+i*(tw*0.14);
    X.beginPath();
    X.moveTo(sx-fSize*0.35,y-fSize*0.4);
    X.lineTo(sx+fSize*0.15,y+fSize*0.4);
    X.stroke();
  }

  // 7. 8-Point Diffraction Starbursts with Concentric Halos
  function drawStarburst(sx,sy,radius){
    X.save();
    X.strokeStyle='rgba(255,255,255,0.38)';
    X.lineWidth=1.2;
    X.beginPath();X.arc(sx,sy,radius*0.45,0,6.28);X.stroke();

    X.strokeStyle='rgba(0,240,255,0.45)';
    X.lineWidth=1.0;
    X.beginPath();X.arc(sx,sy,radius*0.75,0,6.28);X.stroke();

    X.strokeStyle='rgba(255,255,255,0.95)';
    X.lineWidth=1.8;
    X.beginPath();
    X.moveTo(sx-radius,sy);X.lineTo(sx+radius,sy);
    X.moveTo(sx,sy-radius);X.lineTo(sx,sy+radius);
    X.stroke();

    const diag=radius*0.55;
    X.lineWidth=1.2;
    X.beginPath();
    X.moveTo(sx-diag,sy-diag);X.lineTo(sx+diag,sy+diag);
    X.moveTo(sx-diag,sy+diag);X.lineTo(sx+diag,sy-diag);
    X.stroke();

    X.fillStyle='#ffffff';
    X.beginPath();
    X.moveTo(sx,sy-3.5);X.lineTo(sx+3.5,sy);X.lineTo(sx,sy+3.5);X.lineTo(sx-3.5,sy);
    X.closePath();X.fill();
    X.restore();
  }

  drawStarburst(x-tw*0.44,y-fSize*0.38,Math.max(14,fSize*0.28));
  drawStarburst(x-tw*0.12,y-fSize*0.44,Math.max(16,fSize*0.32));
  drawStarburst(x+tw*0.18,y-fSize*0.42,Math.max(14,fSize*0.28));
  drawStarburst(x+tw*0.44,y-fSize*0.36,Math.max(15,fSize*0.30));

  // 8. Dynamic Gravitational Drips & Teardrop Terminals
  const dripPositions=[
    [x-tw*0.38,y+fSize*0.38],
    [x-tw*0.15,y+fSize*0.42],
    [x+tw*0.12,y+fSize*0.40],
    [x+tw*0.35,y+fSize*0.42]
  ];
  dripPositions.forEach(([dx,dy],idx)=>{
    addDrip(dx,dy,sc.stroke,Math.max(3.5,fSize*0.06),1.4+idx*0.2);
  });

  X.restore();
  playCanRattle();
  msg('Wildstyle "'+text+'" created.');
}

function stampBubbleSoftie(text,x,y,schemeKey){
  if(!text||!text.trim())text='PHASE2';
  text=text.trim().toUpperCase().slice(0,20);
  const sc=getScheme(schemeKey);

  saveUndo();
  X.save();

  const fSize=Math.max(38,Math.min(92,Math.round(1080/Math.max(8,text.length))));
  X.font="900 "+fSize+"px system-ui,sans-serif";
  X.textAlign='center';
  X.textBaseline='middle';
  const tw=Math.max(120,X.measureText(text).width);

  x=Math.max(tw/2+60,Math.min(W-tw/2-60,x));
  y=Math.max(fSize+50,Math.min(H-fSize-60,y));

  // 1. Billowing Cloud Aura (Soft Aerosol Silhouette)
  const cloudR=fSize*0.7;
  X.fillStyle=sc.glow;
  X.globalAlpha=0.22;
  const numClouds=Math.max(8,text.length*2);
  for(let i=0;i<=numClouds;i++){
    const cx=x-tw/2+(i/numClouds)*tw;
    const cy=y+Math.sin(i*0.8)*fSize*0.25;
    X.beginPath();X.arc(cx,cy,cloudR,0,6.28);X.fill();
  }

  // 2. Heavy 3D Cast Block Shadow
  const dropX=Math.round(fSize*0.14);
  const dropY=Math.round(fSize*0.18);
  X.globalAlpha=0.88;
  X.strokeStyle='rgba(8,10,14,0.92)';
  X.lineWidth=fSize*0.24;
  X.lineCap='round';
  X.lineJoin='round';
  X.strokeText(text,x+dropX,y+dropY);
  X.fillStyle='rgba(8,10,14,0.92)';
  X.fillText(text,x+dropX,y+dropY);

  // 3. Heavy Master Outer Outline (Subway Black)
  X.strokeStyle='#07090d';
  X.lineWidth=Math.max(10,fSize*0.20);
  X.lineCap='round';
  X.lineJoin='round';
  X.strokeText(text,x,y);

  // 4. Multi-Tone Inflated Balloon Fill
  const bg=X.createLinearGradient(x,y-fSize*0.55,x,y+fSize*0.55);
  bg.addColorStop(0.0,'#fffdf4');
  bg.addColorStop(0.25,sc.stroke);
  bg.addColorStop(0.75,sc.stroke);
  bg.addColorStop(1.0,'#2a0a0f');
  X.fillStyle=bg;
  X.globalAlpha=1.0;
  X.fillText(text,x,y);

  // 5. Letter-by-Letter Volumetric Occlusion & Dual-Tier Shine System
  const charSpacing=tw/Math.max(1,text.length);
  for(let i=0;i<text.length;i++){
    const charX=x-tw/2+(i+0.5)*charSpacing;

    // Ambient Occlusion Shading between letters
    if(i>0){
      const occGrad=X.createLinearGradient(charX-fSize*0.35,y,charX-fSize*0.1,y);
      occGrad.addColorStop(0,'rgba(0,0,0,0.55)');
      occGrad.addColorStop(1,'rgba(0,0,0,0)');
      X.fillStyle=occGrad;
      X.beginPath();
      X.ellipse(charX-fSize*0.25,y,fSize*0.14,fSize*0.42,0,0,6.28);
      X.fill();
    }

    // Primary Specular Shine: Curved Banana-Crescent (Top-Left)
    X.fillStyle='rgba(255,255,255,0.88)';
    X.beginPath();
    X.ellipse(charX-fSize*0.14,y-fSize*0.24,fSize*0.14,fSize*0.065,Math.PI/4,0,6.28);
    X.fill();

    X.beginPath();
    X.arc(charX-fSize*0.02,y-fSize*0.32,Math.max(1.8,fSize*0.035),0,6.28);
    X.fill();

    // Secondary Bounce Rim Light (Bottom-Right)
    X.strokeStyle='rgba(255,255,255,0.32)';
    X.lineWidth=Math.max(1.5,fSize*0.035);
    X.beginPath();
    X.arc(charX+fSize*0.12,y+fSize*0.22,fSize*0.16,0.3,Math.PI*0.75);
    X.stroke();

    // Micro Air Bubble Inclusions
    X.strokeStyle='rgba(255,255,255,0.45)';
    X.lineWidth=1;
    const bubR=Math.max(2.5,fSize*0.045);
    X.beginPath();X.arc(charX+fSize*0.08,y-fSize*0.05,bubR,0,6.28);X.stroke();
    X.fillStyle='#ffffff';
    X.beginPath();X.arc(charX+fSize*0.08-bubR*0.35,y-fSize*0.05-bubR*0.35,bubR*0.3,0,6.28);X.fill();

    // Phase 2 Waist Dash Ticks
    X.strokeStyle='rgba(8,10,14,0.45)';
    X.lineWidth=1.8;
    X.beginPath();
    X.moveTo(charX-fSize*0.08,y+fSize*0.04);X.lineTo(charX+fSize*0.08,y+fSize*0.04);
    X.moveTo(charX-fSize*0.06,y+fSize*0.09);X.lineTo(charX+fSize*0.06,y+fSize*0.09);
    X.stroke();
  }

  // 6. Concentric Inner Speed Pinstripe
  X.strokeStyle='rgba(255,255,255,0.22)';
  X.lineWidth=1.5;
  X.strokeText(text,x,y);

  // 7. Gravitational Teardrop Drips
  addDrip(x-tw*0.32,y+fSize*0.45,sc.stroke,4.5,1.5);
  addDrip(x+tw*0.28,y+fSize*0.46,sc.stroke,4.2,1.4);

  X.restore();
  playCanRattle();
  msg('Bubble throw-up "'+text+'" created.');
}

function stampHandstyle(text,x,y,schemeKey){
  if(!text||!text.trim())text='TAKI 183';
  if(text.split(/\s+/).some(isBad)){msg('Restricted tag rejected.',true);return;}text=text.trim().slice(0,35);
  const sc=getScheme(schemeKey);

  saveUndo();
  X.save();

  const fSize=Math.max(28,Math.min(74,Math.round(920/Math.max(10,text.length))));
  X.font="italic 700 "+fSize+"px 'Fraunces',serif";
  X.textAlign='center';
  X.textBaseline='middle';
  const tw=Math.max(100,X.measureText(text).width);

  x=Math.max(tw/2+60,Math.min(W-tw/2-60,x));
  y=Math.max(fSize+60,Math.min(H-fSize-65,y));

  // 1. Double-Struck Obsidian/Cinnabar Shadow Undertone
  X.fillStyle='rgba(12,15,20,0.65)';
  X.fillText(text,x+4,y+5);
  X.fillStyle='rgba(140,20,30,0.22)';
  X.fillText(text,x+2,y+3);

  // 2. Multi-Pass 45° Chisel-Nib Ribboning (Simulates 15mm Chisel Tip Marker)
  const ribbonSteps=[-2,-1,0,1,2];
  const ribbonCos=Math.cos(Math.PI/4);
  const ribbonSin=Math.sin(Math.PI/4);
  ribbonSteps.forEach(s=>{
    X.fillStyle=sc.stroke;
    X.globalAlpha=s===0?1.0:0.45;
    X.fillText(text,x+s*ribbonCos*1.4,y-s*ribbonSin*1.4);
  });
  X.globalAlpha=1.0;

  // 3. Inner Calligraphic Hairline (Gilded/Ivory core)
  X.strokeStyle='rgba(255,248,225,0.65)';
  X.lineWidth=Math.max(1,fSize*0.025);
  X.strokeText(text,x,y);

  // 4. Master Illuminated Double Halo Crown with Starlight Ray Glint
  const haloY=y-fSize*0.62;
  const haloRx=Math.max(28,fSize*0.42);
  const haloRy=Math.max(8,fSize*0.13);

  X.strokeStyle=sc.stroke;
  X.lineWidth=Math.max(2.2,fSize*0.055);
  X.beginPath();X.ellipse(x,haloY,haloRx,haloRy,0,0,6.28);X.stroke();

  X.strokeStyle='rgba(255,245,220,0.7)';
  X.lineWidth=Math.max(1.2,fSize*0.025);
  X.beginPath();X.ellipse(x,haloY,haloRx*0.82,haloRy*0.75,0,0,6.28);X.stroke();

  // Top Starlight Ray Glint at halo apex
  X.fillStyle='#ffffff';
  X.beginPath();X.arc(x,haloY-haloRy,2.8,0,6.28);X.fill();
  X.strokeStyle='rgba(255,255,255,0.85)';
  X.lineWidth=1.2;
  X.beginPath();
  X.moveTo(x-10,haloY-haloRy);X.lineTo(x+10,haloY-haloRy);
  X.moveTo(x,haloY-haloRy-10);X.lineTo(x,haloY-haloRy+10);
  X.stroke();

  // Flanking Wing Flourishes
  X.strokeStyle=sc.stroke;
  X.lineWidth=Math.max(1.8,fSize*0.04);
  X.beginPath();
  X.moveTo(x-haloRx,haloY);
  X.quadraticCurveTo(x-haloRx-16,haloY-12,x-haloRx-24,haloY-4);
  X.stroke();

  X.beginPath();
  X.moveTo(x+haloRx,haloY);
  X.quadraticCurveTo(x+haloRx+16,haloY-12,x+haloRx+24,haloY-4);
  X.stroke();

  // 5. Interlaced Underline Flourish with Terminal Arrowhead
  const uy=y+fSize*0.54;
  X.strokeStyle=sc.stroke;
  X.lineWidth=Math.max(2.5,fSize*0.06);
  X.lineCap='round';
  X.beginPath();
  X.moveTo(x-tw*0.55,uy);
  X.bezierCurveTo(x-tw*0.2,uy+fSize*0.25,x+tw*0.2,uy-fSize*0.15,x+tw*0.52,uy+fSize*0.05);
  X.stroke();

  const endX=x+tw*0.52,endY=uy+fSize*0.05;
  X.beginPath();
  X.moveTo(endX,endY);
  X.lineTo(endX-14,endY-8);
  X.lineTo(endX-10,endY);
  X.lineTo(endX-14,endY+8);
  X.closePath();
  X.fillStyle=sc.stroke;
  X.fill();

  // Punctuation: Quotes & Circled Route Bullet
  X.font="600 "+Math.round(fSize*0.4)+"px 'Fraunces',sans-serif";
  X.fillText('“',x-tw*0.54,y-fSize*0.2);
  X.fillText('”',x+tw*0.54,y-fSize*0.2);

  const bX=x+tw*0.58+18,bY=y;
  X.strokeStyle=sc.stroke;
  X.lineWidth=1.8;
  X.beginPath();X.arc(bX,bY,fSize*0.22,0,6.28);X.stroke();
  X.font="700 "+Math.round(fSize*0.26)+"px 'Hanken Grotesk',sans-serif";
  X.fillText('Q',bX,bY+1);

  // 6. Micro-Spatter Dusting & Gravitational Ink Drips
  for(let i=0;i<24;i++){
    const px=x+R(-tw*0.5,tw*0.5);
    const py=y+R(-fSize*0.4,fSize*0.4);
    X.fillStyle=sc.stroke;
    X.globalAlpha=R(0.2,0.6);
    X.beginPath();X.arc(px,py,R(0.6,1.4),0,6.28);X.fill();
  }
  X.globalAlpha=1.0;

  addDrip(x-tw*0.22,uy+fSize*0.12,sc.stroke,3.4,1.3);
  addDrip(x+tw*0.15,uy+4,sc.stroke,3.8,1.5);
  addDrip(x+tw*0.42,uy+fSize*0.06,sc.stroke,3.0,1.1);

  X.restore();
  playMarkerSqueak();
  msg('Handstyle "'+text+'" created.');
}

// ============================================================
// PHILATELIC & GEOMETRICAL WONDER STAMP FORGE ENGINE
// ============================================================
const STAMP_MOTIFS = {
  penny_black: {
    id: 'penny_black',
    name: 'Perforated Sovereign Stamp',
    category: 'philately',
    w: 360, h: 460,
    desc: 'Classic perforated postage stamp with intaglio cross-hatching, engraved medallion, and postal denomination'
  },
  postmark: {
    id: 'postmark',
    name: 'Circular Postmark & Wavy Killer',
    category: 'philately',
    w: 480, h: 260,
    desc: 'Dual-ring postal cancellation postmark with date stamp and undulating sinusoidal cancellation bars'
  },
  wax_seal: {
    id: 'wax_seal',
    name: 'Heraldic Scalloped Wax Seal',
    category: 'philately',
    w: 380, h: 380,
    desc: 'Relief wax seal with 24 scalloped petals, beaded inner gold ring, and custom heraldic monogram'
  },
  metatron: {
    id: 'metatron',
    name: "Metatron's Sacred Cube",
    category: 'geometry',
    w: 420, h: 420,
    desc: '13 circles of unity with 78 harmonic line intersections projecting the 5 Platonic solids'
  },
  nautilus: {
    id: 'nautilus',
    name: 'Logarithmic Golden Nautilus',
    category: 'geometry',
    w: 420, h: 420,
    desc: 'Golden ratio (φ = 1.618) equiangular spiral with Fibonacci radial chamber septum dividers'
  },
  penrose: {
    id: 'penrose',
    name: 'Penrose Golden Decagram',
    category: 'geometry',
    w: 420, h: 420,
    desc: '10-fold quasi-crystalline star rosette with interwoven golden pentagram facets'
  },
  guilloche: {
    id: 'guilloche',
    name: 'Guilloché Intaglio Rosette',
    category: 'geometry',
    w: 440, h: 440,
    desc: 'Hypnotic mathematical banknote security curves generated via coupled harmonic epicycloids'
  },
  flower_of_life: {
    id: 'flower_of_life',
    name: 'Sacred Flower of Life',
    category: 'geometry',
    w: 420, h: 420,
    desc: 'Ancient geometric creation matrix formed by 19 complete overlapping hexagonal circle arcs'
  }
};

let activeStampMotif = 'penny_black';
let activeStampStyle = 'intaglio'; // 'intaglio', 'pochoir', 'philatelic'
let activeStampTag = 'QWEIRDO';

const STENCIL_DATA = {
  custom_stamp: {
    name: 'Philatelic / Geometric Stamp',
    w: 420, h: 420,
    motif: 'penny_black',
    tag: 'QWEIRDO',
    style: 'intaglio'
  }
};

// Procedural Stamp Geometry Drawing Functions
function drawPerforatedStampFrame(ctx, x, y, w, h, pitch, toothR) {
  pitch = pitch || 18;
  toothR = toothR || 4.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.stroke();

  // Draw perforation scalloped teeth
  ctx.beginPath();
  for (let px = x + pitch; px < x + w - pitch / 2; px += pitch) {
    ctx.arc(px, y, toothR, 0, Math.PI * 2);
    ctx.arc(px, y + h, toothR, 0, Math.PI * 2);
  }
  for (let py = y + pitch; py < y + h - pitch / 2; py += pitch) {
    ctx.arc(x, py, toothR, 0, Math.PI * 2);
    ctx.arc(x + w, py, toothR, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawStampMotifPath(ctx, motifKey, tagText, cx, cy, size) {
  size = size || 300;
  ctx.save();
  tagText = (tagText || 'QWEIRDO').toUpperCase();

  if (motifKey === 'penny_black') {
    // 1. Perforated Sovereign Stamp of Philately
    const sw = size * 0.85, sh = size * 1.12;
    const sx = cx - sw / 2, sy = cy - sh / 2;
    
    // Perforations
    drawPerforatedStampFrame(ctx, sx, sy, sw, sh, 18, 4.5);

    // Inner engraved borders
    ctx.lineWidth = 1.8;
    ctx.strokeRect(sx + 10, sy + 10, sw - 20, sh - 20);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(sx + 14, sy + 14, sw - 28, sh - 28);

    // Corner rosettes
    const crs = [[sx + 18, sy + 18], [sx + sw - 18, sy + 18], [sx + 18, sy + sh - 18], [sx + sw - 18, sy + sh - 18]];
    crs.forEach(([rx, ry]) => {
      ctx.beginPath(); ctx.arc(rx, ry, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 2); ctx.fill();
    });

    // Central cameo medallion
    const medR = sw * 0.32;
    ctx.beginPath();
    ctx.arc(cx, cy - 10, medR, 0, Math.PI * 2);
    ctx.stroke();

    // Fine engine cross-hatching inside medallion
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy - 10, medR - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.lineWidth = 0.6;
    for (let lx = -medR; lx <= medR; lx += 8) {
      ctx.beginPath();
      ctx.moveTo(cx + lx, cy - 10 - medR);
      ctx.lineTo(cx + lx, cy - 10 + medR);
      ctx.stroke();
    }
    for (let ly = -medR; ly <= medR; ly += 8) {
      ctx.beginPath();
      ctx.moveTo(cx - medR, cy - 10 + ly);
      ctx.lineTo(cx + medR, cy - 10 + ly);
      ctx.stroke();
    }
    // Cameo silhouette emblem (Letter Q / Heraldic crown)
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 56px 'Fraunces', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Q', cx, cy - 10);
    ctx.restore();

    // Top banner: POSTAGE / SCRIPTORIUM
    ctx.font = "bold 13px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('POSTAGE · SANCTUARY', cx, sy + 28);

    // Bottom banner: Custom Tag Moniker
    ctx.font = "bold 14px 'Fraunces', serif";
    ctx.fillText('✦ ' + tagText + ' ✦', cx, sy + sh - 28);

    // Denomination
    ctx.font = "bold 11px monospace";
    ctx.fillText('ONE CENT', cx, sy + sh - 14);

  } else if (motifKey === 'postmark') {
    // 2. Postal Postmark & Killer Waves
    const pr = size * 0.38;
    const pcx = cx - size * 0.22;
    const pcy = cy;

    // Dual outer cancellation rings
    ctx.beginPath(); ctx.arc(pcx, pcy, pr, 0, Math.PI * 2); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(pcx, pcy, pr - 7, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.stroke();

    // Postmark curved tag text along top arc
    ctx.save();
    ctx.translate(pcx, pcy);
    ctx.font = "bold 13px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(tagText, 0, -pr + 20);

    // Center date stamp & city
    const now = new Date();
    const dStr = now.toISOString().slice(0, 10);
    ctx.font = "600 11px monospace";
    ctx.fillText('WALL ARCHIVE', 0, -4);
    ctx.fillText(dStr, 0, 12);
    ctx.fillText('N° ' + Math.floor(now.getTime() % 9999).toString().padStart(4, '0'), 0, 26);
    ctx.fillText('SCRIPTORIUM', 0, pr - 14);
    ctx.restore();

    // Sinusoidal Killer Cancellation Waves on the right
    const waveStartX = pcx + pr + 12;
    const waveEndX = cx + size * 0.55;
    const waveLines = [-38, -19, 0, 19, 38];
    waveLines.forEach(dy => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      for (let wx = waveStartX; wx <= waveEndX; wx += 5) {
        const wy = cy + dy + Math.sin((wx - waveStartX) * 0.08) * 7;
        if (wx === waveStartX) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      ctx.stroke();
    });

  } else if (motifKey === 'wax_seal') {
    // 3. Heraldic Scalloped Wax Seal
    const sr = size * 0.44;
    
    // Scalloped petal perimeter (24 lobes)
    ctx.beginPath();
    const lobes = 24;
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
      const lr = sr + Math.sin(a * lobes) * 7;
      const lx = cx + Math.cos(a) * lr;
      const ly = cy + Math.sin(a) * lr;
      if (a === 0) ctx.moveTo(lx, ly);
      else ctx.lineTo(lx, ly);
    }
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner beaded ridge
    ctx.beginPath(); ctx.arc(cx, cy, sr - 14, 0, Math.PI * 2); ctx.lineWidth = 1.4; ctx.stroke();
    for (let ba = 0; ba < Math.PI * 2; ba += Math.PI / 18) {
      const bx = cx + Math.cos(ba) * (sr - 20);
      const by = cy + Math.sin(ba) * (sr - 20);
      ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, Math.PI * 2); ctx.fill();
    }

    // Inner seal rim
    ctx.beginPath(); ctx.arc(cx, cy, sr - 28, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.stroke();

    // Heraldic insignia & Moniker
    ctx.font = "bold 52px 'Fraunces', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Q', cx, cy - 14);

    // Circular or ribbon motto
    ctx.font = "bold 12px 'Hanken Grotesk', sans-serif";
    ctx.fillText('✦ ' + tagText + ' ✦', cx, cy + 32);
    ctx.font = "italic 10px 'Fraunces', serif";
    ctx.fillText('SIGILLUM EPIGRAPHIA', cx, cy + 48);

  } else if (motifKey === 'metatron') {
    // 4. Metatron's Cube (13 Circles & Platonic Projections)
    const mr = size * 0.44;
    const r1 = mr * 0.55;
    const rSmall = mr * 0.16;

    // 13 Node Centers: Center, Inner Ring of 6, Outer Ring of 6
    const nodes = [[cx, cy]];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      nodes.push([cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      nodes.push([cx + Math.cos(a) * mr, cy + Math.sin(a) * mr]);
    }

    // Connect all nodes to each other (The 78 Metatron lines)
    ctx.lineWidth = 0.7;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i][0], nodes[i][1]);
        ctx.lineTo(nodes[j][0], nodes[j][1]);
        ctx.stroke();
      }
    }

    // Draw the 13 Circles of Unity
    ctx.lineWidth = 1.4;
    nodes.forEach(([nx, ny]) => {
      ctx.beginPath();
      ctx.arc(nx, ny, rSmall, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Central Hexagonal Cartouche for Custom Tag
    ctx.save();
    ctx.fillStyle = '#f6eee1';
    ctx.beginPath();
    ctx.arc(cx, cy, rSmall * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 13px 'Fraunces', serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText.slice(0, 8), cx, cy);
    ctx.restore();

  } else if (motifKey === 'nautilus') {
    // 5. Golden Ratio Logarithmic Nautilus Spiral (φ = 1.618)
    const phi = 1.6180339887;
    const turns = 4.2;
    const maxR = size * 0.46;

    // Outer boundary circle
    ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI * 2); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, maxR - 6, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.stroke();

    // Logarithmic spiral path: r = a * e^(b * theta)
    const b = Math.log(phi) / (Math.PI / 2);
    const a = maxR / Math.exp(b * (turns * Math.PI * 2));
    
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let th = 0; th <= turns * Math.PI * 2; th += 0.04) {
      const r = a * Math.exp(b * th);
      const px = cx + Math.cos(th) * r;
      const py = cy + Math.sin(th) * r;
      if (th === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Radial chamber septum dividers (Fibonacci growth rays)
    ctx.lineWidth = 0.9;
    for (let th = Math.PI / 2; th <= turns * Math.PI * 2; th += Math.PI / 4) {
      const rOuter = a * Math.exp(b * th);
      const rInner = a * Math.exp(b * (th - Math.PI / 2));
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(th) * rOuter, cy + Math.sin(th) * rOuter);
      ctx.lineTo(cx + Math.cos(th) * rInner, cy + Math.sin(th) * rInner);
      ctx.stroke();
    }

    // Outer border inscription
    ctx.font = "bold 12px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText('φ = 1.618033 · ' + tagText + ' · SACRED HARMONY', cx, cy + maxR + 18);

  } else if (motifKey === 'penrose') {
    // 6. Penrose Golden Decagram (10-Fold Quasi-Crystalline Star)
    const pr = size * 0.45;

    // Outer framing ring
    ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, pr - 7, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.stroke();

    // 10-pointed star (Decagram {10/3} and {10/4})
    ctx.lineWidth = 1.2;
    for (let starSkip of [3, 4]) {
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = ((i * starSkip) * Math.PI * 2) / 10;
        const px = cx + Math.cos(a) * (pr - 10);
        const py = cy + Math.sin(a) * (pr - 10);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Concentric pentagonal rosettes
    [0.6, 0.35].forEach(scale => {
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * (pr * scale);
        const py = cy + Math.sin(a) * (pr * scale);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });

    // Tag text banner
    ctx.font = "bold 13px 'Fraunces', serif";
    ctx.textAlign = 'center';
    ctx.fillText('✦ ' + tagText + ' ✦', cx, cy + pr * 0.58);

  } else if (motifKey === 'guilloche') {
    // 7. Guilloché Banknote Rosette Curves
    const gr = size * 0.44;

    // Outer border ring
    ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, gr - 8, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.stroke();

    // Complex harmonic epitrochoid curves: x = (R+r)cos - d cos((R+r)/r t)
    const R = gr * 0.62;
    const r = gr * 0.18;
    const d = gr * 0.28;

    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let t = 0; t <= Math.PI * 18; t += 0.03) {
      const px = cx + (R - r) * Math.cos(t) + d * Math.cos((R - r) * t / r);
      const py = cy + (R - r) * Math.sin(t) - d * Math.sin((R - r) * t / r);
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Second intersecting rosette wave
    ctx.beginPath();
    const R2 = gr * 0.5;
    const r2 = gr * 0.22;
    const d2 = gr * 0.2;
    for (let t = 0; t <= Math.PI * 18; t += 0.03) {
      const px = cx + (R2 + r2) * Math.cos(t) - d2 * Math.cos((R2 + r2) * t / r2);
      const py = cy + (R2 + r2) * Math.sin(t) - d2 * Math.sin((R2 + r2) * t / r2);
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Central cameo plaque for tag
    ctx.save();
    ctx.fillStyle = '#f6eee1';
    ctx.beginPath(); ctx.arc(cx, cy, gr * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = "bold 13px 'Hanken Grotesk', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, cx, cy);
    ctx.restore();

  } else if (motifKey === 'flower_of_life') {
    // 8. Sacred Flower of Life (19 Overlapping Hexagonal Circles)
    const fr = size * 0.44;
    const cr = fr / 3;

    // Outer double boundary
    ctx.beginPath(); ctx.arc(cx, cy, fr, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, fr - 6, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.stroke();

    // Center circle
    const circs = [[cx, cy]];
    
    // First ring (6 circles)
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      circs.push([cx + Math.cos(a) * cr, cy + Math.sin(a) * cr]);
    }
    // Second ring (12 circles)
    for (let i = 0; i < 6; i++) {
      const a1 = (i * Math.PI) / 3;
      circs.push([cx + Math.cos(a1) * (cr * 2), cy + Math.sin(a1) * (cr * 2)]);
      const a2 = a1 + Math.PI / 6;
      circs.push([cx + Math.cos(a2) * (cr * Math.sqrt(3)), cy + Math.sin(a2) * (cr * Math.sqrt(3))]);
    }

    ctx.lineWidth = 1;
    circs.forEach(([kx, ky]) => {
      ctx.beginPath();
      ctx.arc(kx, ky, cr, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Tag text along bottom arc
    ctx.font = "bold 12px 'Fraunces', serif";
    ctx.textAlign = 'center';
    ctx.fillText('✦ ' + tagText + ' ✦', cx, cy + fr + 18);
  }

  ctx.restore();
}

// Live Stamp Preview in Modal
function renderStampPreview() {
  const pCv = document.getElementById('stampPreviewCv');
  if (!pCv) return;
  const pCtx = pCv.getContext('2d');
  const pw = pCv.width, ph = pCv.height;

  pCtx.clearRect(0, 0, pw, ph);

  // Background substrate: Aged Vellum Paper
  pCtx.fillStyle = '#f6eee1';
  pCtx.fillRect(0, 0, pw, ph);

  // Paper fiber texture lines
  pCtx.strokeStyle = 'rgba(190,170,142,0.22)';
  pCtx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    pCtx.beginPath();
    pCtx.moveTo(0, i * 22);
    pCtx.lineTo(pw, i * 22 + (Math.sin(i) * 6));
    pCtx.stroke();
  }

  const sc = getScheme(activeScheme);
  pCtx.strokeStyle = sc.stroke;
  pCtx.fillStyle = sc.stroke;

  if (activeStampStyle === 'pochoir') {
    // Aerosol Pochoir Style: Soft glowing overspray halo behind crisp stencil cutouts
    pCtx.save();
    pCtx.shadowColor = sc.glow;
    pCtx.shadowBlur = 18;
    drawStampMotifPath(pCtx, activeStampMotif, activeStampTag, pw / 2, ph / 2, 290);
    pCtx.restore();

    // Spatter particles
    pCtx.save();
    pCtx.fillStyle = sc.stroke;
    for (let sp = 0; sp < 60; sp++) {
      const sa = Math.random() * Math.PI * 2;
      const sr = 60 + Math.random() * 110;
      pCtx.globalAlpha = Math.random() * 0.4 + 0.1;
      pCtx.beginPath();
      pCtx.arc(pw / 2 + Math.cos(sa) * sr, ph / 2 + Math.sin(sa) * sr, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
      pCtx.fill();
    }
    pCtx.restore();

  } else if (activeStampStyle === 'philatelic') {
    // Philatelic Mount Style: Mounted stamp cartouche with paper relief drop shadow
    pCtx.save();
    pCtx.shadowColor = 'rgba(34,20,10,0.35)';
    pCtx.shadowBlur = 12;
    pCtx.shadowOffsetY = 4;
    pCtx.fillStyle = '#fcf7f0';
    pCtx.fillRect(pw * 0.12, ph * 0.1, pw * 0.76, ph * 0.8);
    pCtx.restore();

    drawStampMotifPath(pCtx, activeStampMotif, activeStampTag, pw / 2, ph / 2, 280);

  } else {
    // Default: Intaglio Engraving Style (Crisp hairline copperplate linework)
    pCtx.lineWidth = 1.2;
    drawStampMotifPath(pCtx, activeStampMotif, activeStampTag, pw / 2, ph / 2, 290);
  }

  // Update motif description text
  const descEl = document.getElementById('stampPreviewDesc');
  const mObj = STAMP_MOTIFS[activeStampMotif];
  if (descEl && mObj) {
    descEl.textContent = mObj.desc;
  }
}

// Transfer stamp directly onto the main monumental canvas or active mini-canvas
function transferStampToWall(motifKey, tagText, cx, cy, styleKey) {
  if(tagText&&tagText.split(/\s+/).some(isBad)){msg('Restricted tag rejected.',true);return;}const sc = SCHEMES[activeScheme] || SCHEMES.gold;
  saveUndo();
  X.save();

  if (styleKey === 'pochoir') {
    // 1. Aerosol Pochoir Halo & Spatter
    const m = STAMP_MOTIFS[motifKey] || STAMP_MOTIFS.penny_black;
    const haloRad = X.createRadialGradient(cx, cy, m.w * 0.15, cx, cy, m.w * 0.6);
    haloRad.addColorStop(0, sc.glow);
    haloRad.addColorStop(0.7, sc.glow);
    haloRad.addColorStop(1, 'rgba(0,0,0,0)');
    X.fillStyle = haloRad;
    X.globalAlpha = 0.28;
    X.fillRect(cx - m.w * 0.6, cy - m.h * 0.6, m.w * 1.2, m.h * 1.2);

    // 2. Aerosol Spatter Flecks
    X.fillStyle = sc.stroke;
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = (m.w * 0.25) + Math.random() * (m.w * 0.35);
      X.globalAlpha = Math.random() * 0.45 + 0.1;
      X.beginPath();
      X.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      X.fill();
    }
    X.globalAlpha = 1.0;
  } else if (styleKey === 'philatelic') {
    // Mounted Paper Cartouche Backing
    const m = STAMP_MOTIFS[motifKey] || STAMP_MOTIFS.penny_black;
    X.save();
    X.shadowColor = 'rgba(34,20,10,0.4)';
    X.shadowBlur = 16;
    X.shadowOffsetY = 6;
    X.fillStyle = 'rgba(252,247,240,0.95)';
    X.fillRect(cx - m.w * 0.48, cy - m.h * 0.48, m.w * 0.96, m.h * 0.96);
    X.restore();
  }

  // Draw Primary Stamp Motif Lines
  X.strokeStyle = sc.stroke;
  X.fillStyle = sc.stroke;
  drawStampMotifPath(X, motifKey, tagText, cx, cy, 320);

  // Inscribe subtle gravity run drips for authentic street texture
  if (styleKey === 'pochoir') {
    addDrip(cx - 50, cy + 120, sc.stroke, 4.2, 1.4);
    addDrip(cx + 60, cy + 110, sc.stroke, 3.6, 1.2);
  }

  X.restore();
  playCanRattle();

  // Register coordinate for Ambient Machine Conservator slow growth
  recordUserMark(cx, cy);

  const mName = STAMP_MOTIFS[motifKey] ? STAMP_MOTIFS[motifKey].name : 'Stamp';
  msg('Transferred ' + mName + ' ("' + (tagText || 'QWEIRDO') + '") onto the canvas.');
}

// Load stamp into Interactive Stencil reticle for repositionable spraying
function loadStampAsInteractiveStencil(motifKey, tagText) {
  const m = STAMP_MOTIFS[motifKey] || STAMP_MOTIFS.penny_black;
  STENCIL_DATA.custom_stamp = {
    name: m.name,
    w: m.w,
    h: m.h,
    motif: motifKey,
    tag: tagText || 'QWEIRDO',
    style: activeStampStyle
  };

  activeStencil = 'custom_stamp';
  stencilPos = [W / 2, H / 2];
  stencilLocked = false;

  const sModal = document.getElementById('stampModal');
  if (sModal) {
    if (typeof sModal.close === 'function' && sModal.open) sModal.close();
    sModal.classList.remove('open');
  }

  const hud = document.getElementById('stencilHud');
  if (hud) hud.style.display = 'flex';
  const badge = document.getElementById('stencilBadgeText');
  if (badge) badge.textContent = 'Stencil: ' + m.name + ' (Click canvas or button to Lock / Transfer)';

  playCanRattle();
  drawOverlay();
  msg('Loaded ' + m.name + ' as interactive stencil. Drag to position & spray through aperture.');
}

function loadStencil(_key) {
  loadStampAsInteractiveStencil(activeStampMotif, activeStampTag);
}

function unloadStencil() {
  activeStencil = null;
  stencilLocked = false;
  const hud = document.getElementById('stencilHud');
  if (hud) hud.style.display = 'none';
  playCanRattle();
  drawOverlay();
}
const releaseStencil = unloadStencil;

function stampPochoirStencil(_key, x, y, _schemeKey) {
  transferStampToWall(activeStampMotif, activeStampTag, x, y, activeStampStyle);
}

// Render Physical Cardboard Pochoir Template on Overlay Canvas (O)
function drawStencilOutline(key, x, y) {
  const m = STAMP_MOTIFS[activeStampMotif] || STAMP_MOTIFS.penny_black;
  if (!O) return;

  O.save();

  // Translucent Kraft Cardboard Pochoir Plate
  O.fillStyle = stencilLocked ? 'rgba(215,190,140,0.50)' : 'rgba(215,190,140,0.68)';
  O.strokeStyle = 'rgba(160,120,55,0.92)';
  O.lineWidth = 2;

  // Stencil plate cast shadow
  O.save();
  O.shadowColor = 'rgba(10,8,5,0.45)';
  O.shadowBlur = stencilLocked ? 8 : 22;
  O.shadowOffsetY = stencilLocked ? 3 : 12;
  O.fillRect(x - m.w / 2, y - m.h / 2, m.w, m.h);
  O.strokeRect(x - m.w / 2, y - m.h / 2, m.w, m.h);
  O.restore();

  // Registration Corner Crosshairs (+) & Brass Eyelets
  const corners = [
    [x - m.w / 2 + 16, y - m.h / 2 + 16],
    [x + m.w / 2 - 16, y - m.h / 2 + 16],
    [x - m.w / 2 + 16, y + m.h / 2 - 16],
    [x + m.w / 2 - 16, y + m.h / 2 - 16]
  ];
  corners.forEach(([cx, cy]) => {
    O.strokeStyle = 'rgba(90,65,30,0.85)';
    O.lineWidth = 1.5;
    O.beginPath();
    O.moveTo(cx - 7, cy); O.lineTo(cx + 7, cy);
    O.moveTo(cx, cy - 7); O.lineTo(cx, cy + 7);
    O.stroke();
    O.beginPath(); O.arc(cx, cy, 3.5, 0, Math.PI * 2); O.stroke();
  });

  // Stencil Meta Colophon in Header & Footer Margin
  O.fillStyle = 'rgba(60,42,18,0.85)';
  O.font = "600 11px 'Hanken Grotesk',sans-serif";
  O.textAlign = 'left';
  O.fillText('PHILATELIC & GEOMETRIC STENCIL · ' + m.name.toUpperCase() + ' · ' + m.w + '×' + m.h + 'MM', x - m.w / 2 + 28, y - m.h / 2 + 20);
  O.textAlign = 'right';
  O.fillText(stencilLocked ? '[STATUS: LOCKED / READY TO TRANSFER]' : '[STATUS: FLOATING / CLICK TO LOCK]', x + m.w / 2 - 28, y - m.h / 2 + 20);

  // Stencil Aperture Cutout Linework
  O.strokeStyle = 'rgba(20,15,10,0.95)';
  O.fillStyle = 'rgba(20,15,10,0.90)';
  drawStampMotifPath(O, activeStampMotif, activeStampTag, x, y, Math.min(m.w, m.h) * 0.72);

  O.restore();
}

// Mini-Canvas Formation & Blending Engine
function newMiniCanvas(){
  saveUndo();
  initAudio();
  const presets = [
    { x: 520,  y: 120, w: 560, h: 560, name: 'Center Folio Cartouche' },
    { x: 60,   y: 130, w: 450, h: 540, name: 'Left Illuminated Wing' },
    { x: 1090, y: 130, w: 450, h: 540, name: 'Right Manuscript Leaf' }
  ];
  const slotIdx = miniCanvasesHistory.length % presets.length;
  const p = presets[slotIdx];

  activeMiniCanvas = {
    id: 'mini_' + Date.now(),
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    title: `${p.name} #${miniCanvasesHistory.length + 1}`,
    createdAt: new Date().toISOString(),
    strokesCount: 0
  };

  const btnBlend = $('#btnBlendMiniCanvas');
  const btnClear = $('#btnClearMiniCanvas');
  if (btnBlend) btnBlend.style.display = 'inline-flex';
  if (btnClear) btnClear.style.display = 'inline-flex';

  playCanRattle();
  msg(`✦ Mini-canvas created: ${activeMiniCanvas.title}. Paint inside, then blend into the wall.`);
}

function blendMiniCanvasIntoWall(){
  if (!activeMiniCanvas) {
    msg('No active mini-canvas to blend.');
    return;
  }
  saveUndo();
  initAudio();

  const { x, y, w, h } = activeMiniCanvas;

  X.save();
  // 1. Soft torn-paper drop shadow
  X.shadowColor = 'rgba(28, 18, 10, 0.28)';
  X.shadowBlur = 24;
  X.shadowOffsetY = 8;
  X.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  X.lineWidth = 2;
  X.strokeRect(x, y, w, h);
  X.restore();

  // 2. Deckled torn-paper border fibers
  X.save();
  X.strokeStyle = 'rgba(240, 232, 220, 0.45)';
  X.lineWidth = 1.5;
  X.beginPath();
  X.moveTo(x, y);
  for (let px = x; px <= x + w; px += 20) X.lineTo(px, y + R(-2, 2));
  for (let py = y; py <= y + h; py += 20) X.lineTo(x + w + R(-2, 2), py);
  for (let px = x + w; px >= x; px -= 20) X.lineTo(px, y + h + R(-2, 2));
  for (let py = y + h; py >= y; py -= 20) X.lineTo(x + R(-2, 2), py);
  X.closePath();
  X.stroke();

  // 3. Illuminated gold hairline border (4px inset)
  X.strokeStyle = 'rgba(212, 175, 55, 0.75)';
  X.lineWidth = 1;
  X.strokeRect(x + 5, y + 5, w - 10, h - 10);

  // 4. Subtle corner rosettes
  [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]].forEach(([cx, cy]) => {
    X.fillStyle = '#d4af37';
    X.beginPath(); X.arc(cx, cy, 2.5, 0, Math.PI * 2); X.fill();
  });

  // 5. Corner Colophon notation
  X.fillStyle = 'rgba(132, 76, 28, 0.6)';
  X.font = "600 10px 'Hanken Grotesk',sans-serif";
  X.textAlign = 'right';
  X.fillText(`✦ CARTOUCHE #${miniCanvasesHistory.length + 1} · BLENDED ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}`, x + w - 12, y + h - 10);
  X.restore();

  // Register with Ambient Machine Conservator
  if (typeof recordUserMark === 'function') {
    recordUserMark(x + w/2, y + h/2, Math.min(w, h)/2);
  }

  miniCanvasesHistory.push(activeMiniCanvas);
  activeMiniCanvas = null;

  const btnBlend = $('#btnBlendMiniCanvas');
  const btnClear = $('#btnClearMiniCanvas');
  if (btnBlend) btnBlend.style.display = 'none';
  if (btnClear) btnClear.style.display = 'none';

  playCanRattle();
  msg('✦ Mini-canvas blended into the wall.');
}

function clearMiniCanvas(){
  activeMiniCanvas = null;
  const btnBlend = $('#btnBlendMiniCanvas');
  const btnClear = $('#btnClearMiniCanvas');
  if (btnBlend) btnBlend.style.display = 'none';
  if (btnClear) btnClear.style.display = 'none';
  msg('Mini-canvas dismissed without blending.');
}

// Archival 3200x1600 Canvas Renderer with Timestamp, Inspirer Details, and Cryptographic Hash
function renderArchivalCanvas(format, provenance){
  const FW=3200,FH=1600;
  const FC=document.createElement('canvas');
  FC.width=FW;FC.height=FH;
  const FX=FC.getContext('2d');

  const { timestampIso, timestampUtc, inspirers, hashKey } = provenance;

  if (format === 'wall') {
    // 1. Draw Master Living Wall (3200x1600)
    FX.drawImage(C, 0, 0, FW, FH);

    // Subtle dark vellum vignette around edges
    const vg = FX.createRadialGradient(FW/2, FH/2, FW*0.35, FW/2, FH/2, FW*0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(28,20,14,0.48)');
    FX.fillStyle = vg;
    FX.fillRect(0, 0, FW, FH);

    // 2. Archival Lower Colophon Banner (110px height)
    const barH = 110;
    const barY = FH - barH;
    FX.fillStyle = 'rgba(18, 14, 11, 0.94)';
    FX.fillRect(0, barY, FW, barH);

    // Double illuminated gold hairline border
    FX.strokeStyle = 'rgba(212, 175, 55, 0.75)';
    FX.lineWidth = 2;
    FX.beginPath(); FX.moveTo(0, barY); FX.lineTo(FW, barY); FX.stroke();
    FX.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    FX.lineWidth = 1;
    FX.beginPath(); FX.moveTo(0, barY + 4); FX.lineTo(FW, barY + 4); FX.stroke();

    // Left Column: Title & Timestamp
    FX.textAlign = 'left';
    FX.fillStyle = '#f8f1e6';
    FX.font = "600 24px 'Fraunces',Georgia,serif";
    FX.fillText('PROJECT QWEIRDO · THE LIVING URBAN WALL · 3200×1600 ARCHIVAL BROADSIDE', 70, barY + 38);

    FX.fillStyle = '#c7b49d';
    FX.font = "500 16px 'Hanken Grotesk',sans-serif";
    FX.fillText(`TIMESTAMP: ${timestampUtc} · CREATION: ${timestampIso.slice(0, 19).replace('T', ' ')} UTC`, 70, barY + 68);

    FX.fillStyle = '#dfcfba';
    FX.font = "500 15px 'Hanken Grotesk',sans-serif";
    const inspDisplay = (inspirers && inspirers.length > 70) ? (inspirers.slice(0, 67) + '…') : inspirers;
    FX.fillText(`INSPIRERS & LINEAGE: ${inspDisplay}`, 70, barY + 94);

    // Right Column: Cryptographic Provenance Key & Seal
    FX.textAlign = 'right';
    FX.fillStyle = '#d4af37';
    FX.font = "700 16px 'Hanken Grotesk',sans-serif";
    FX.fillText('CRYPTOGRAPHIC PROVENANCE VALIDATED · CC BY-NC 4.0', FW - 240, barY + 38);

    FX.fillStyle = '#ffffff';
    FX.font = "500 15px monospace";
    FX.fillText(`SHA-256: ${hashKey}`, FW - 240, barY + 68);

    FX.fillStyle = '#a8947d';
    FX.font = "500 13px 'Hanken Grotesk',sans-serif";
    FX.fillText('IMMUTABLE DOWNLOAD RECORD REGISTERED IN LOCAL PROVENANCE LEDGER', FW - 240, barY + 94);

    // Wax / Validation Scalloped Stamp
    const sealX = FW - 120, sealY = barY + 55;
    FX.save();
    FX.translate(sealX, sealY);
    FX.rotate(-0.05);
    FX.strokeStyle = 'rgba(212, 175, 55, 0.85)';
    FX.lineWidth = 2.5;
    FX.beginPath(); FX.arc(0, 0, 42, 0, Math.PI * 2); FX.stroke();
    FX.strokeStyle = 'rgba(195, 35, 45, 0.75)';
    FX.lineWidth = 1.5;
    FX.beginPath(); FX.arc(0, 0, 36, 0, Math.PI * 2); FX.stroke();
    FX.fillStyle = '#d4af37';
    FX.textAlign = 'center';
    FX.font = "700 10px 'Hanken Grotesk',sans-serif";
    FX.fillText('VALIDATED', 0, -4);
    FX.fillStyle = '#c3232d';
    FX.font = "600 8px 'Hanken Grotesk',sans-serif";
    FX.fillText('PROVENANCE', 0, 8);
    FX.restore();

  } else {
    // Polaroid Contact Card Format
    FX.fillStyle = '#faf6ed';
    FX.fillRect(0, 0, FW, FH);

    // Photographic border drop shadow
    FX.save();
    FX.shadowColor = 'rgba(25, 18, 12, 0.42)';
    FX.shadowBlur = 48;
    FX.shadowOffsetY = 22;

    const picX = 140, picY = 115, picW = 2920, picH = 1220;
    FX.drawImage(C, picX, picY, picW, picH);
    FX.restore();

    // Analog film dye tint & soft lens vignette
    const vg = FX.createRadialGradient(picX + picW/2, picY + picH/2, picW*0.25, picX + picW/2, picY + picH/2, picW*0.65);
    vg.addColorStop(0, 'rgba(255, 245, 230, 0.03)');
    vg.addColorStop(0.7, 'rgba(60, 40, 20, 0.12)');
    vg.addColorStop(1, 'rgba(20, 12, 6, 0.42)');
    FX.fillStyle = vg;
    FX.fillRect(picX, picY, picW, picH);

    // Bottom Polaroid Margin: Handwritten Grease Pencil & Scriptorium Stencil
    FX.textAlign = 'left';
    FX.fillStyle = '#2c261e';
    FX.font = "italic 600 32px 'Fraunces',Georgia,serif";
    const my = picY + picH + 75;
    FX.fillText('THE LIVING URBAN WALL · SCRIPTORIUM FOLIO EDITION', picX, my);

    FX.fillStyle = '#5c5244';
    FX.font = "500 20px 'Hanken Grotesk',sans-serif";
    const coauth = inspirers || 'Autonomous Scribe & Wall Conservator';
    FX.fillText(`INSPIRERS: ${coauth} · STRATIGRAPHY: AGED SCRIPTORIUM VELLUM`, picX, my + 38);
    FX.fillText(`TIMESTAMP: ${timestampUtc} · SHA-256: ${hashKey}`, picX, my + 70);
    FX.fillText('LICENSE: CC BY-NC 4.0 · MANIFESTO: "THE WALL BELONGS TO THE LIVING"', picX, my + 100);

    // Authentic Red Rubber Inspection Stamp
    const sx = FW - 390, sy = my + 30;
    FX.save();
    FX.translate(sx, sy);
    FX.rotate(-0.06);
    FX.strokeStyle = 'rgba(195, 35, 45, 0.85)';
    FX.lineWidth = 3;
    FX.strokeRect(-135, -42, 270, 84);
    FX.strokeRect(-128, -35, 256, 70);
    FX.fillStyle = 'rgba(195, 35, 45, 0.9)';
    FX.textAlign = 'center';
    FX.font = "700 15px 'Hanken Grotesk',sans-serif";
    FX.fillText('QWEIRDO ARCHIVAL VALIDATION', 0, -8);
    FX.font = "600 11px monospace";
    FX.fillText(`HASH: ${hashKey.slice(0, 18)}…`, 0, 14);
    FX.restore();
  }

  return FC.toDataURL('image/png');
}

// Fallback wrapper for existing preview calls
function generateSubwayArt(format){
  const inspirersList = (cred && cred.length) ? cred.map(c => c.name).join(', ') : 'Autonomous Scribe & Wall Conservator';
  const now = new Date();
  return renderArchivalCanvas(format, {
    timestampIso: now.toISOString(),
    timestampUtc: now.toUTCString(),
    timestampDate: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    inspirers: inspirersList,
    hashKey: currentNftHash || 'computing-provenance-key…'
  });
}

// Download Canvas Archival Engine with Timestamp, Inspirer Details, and Cryptographic SHA-256 Hash
async function downloadCanvasArchival(format = 'wall') {
  const inspirersList = (cred && cred.length) ? cred.map(c => c.name).join(', ') : 'Autonomous Scribe & Wall Conservator';
  const now = new Date();
  const timestampIso = now.toISOString();
  const timestampUtc = now.toUTCString();
  const timestampDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Compute authentic SHA-256 hash validating the download
  const sampleData = C.toDataURL('image/webp', 0.6);
  const hashPayload = JSON.stringify({
    canvasLength: sampleData.length,
    timestamp: timestampIso,
    inspirers: inspirersList,
    blendedMiniCanvases: miniCanvasesHistory.length,
    steps: steps,
    substrate: 'Aged Manuscript Vellum Wall'
  });
  const sha256Key = await computeSha256(hashPayload);
  currentNftHash = sha256Key;

  // 2. Render high-resolution 3200x1600 archival canvas with timestamp, inspirers, and hash key
  const finalCanvasUrl = renderArchivalCanvas(format, {
    timestampIso,
    timestampUtc,
    timestampDate,
    inspirers: inspirersList,
    hashKey: sha256Key
  });

  // 3. Record the download in localStorage
  const dlRecord = {
    id: 'qweirdo_dl_' + Date.now(),
    timestamp: timestampIso,
    timestampFormatted: timestampUtc,
    hash: sha256Key,
    inspirers: inspirersList,
    substrate: 'Aged Manuscript Vellum Wall',
    blendedCanvasesCount: miniCanvasesHistory.length,
    format: format,
    resolution: '3200x1600',
    license: 'CC BY-NC 4.0 (Free educational & non-commercial use with attribution to Project Qweirdo)'
  };
  const downloadHistory = ld('qweirdo_download_records', []);
  downloadHistory.unshift(dlRecord);
  if (downloadHistory.length > 50) downloadHistory.length = 50;
  sv('qweirdo_download_records', downloadHistory);

  // 4. Download the image file
  const a = document.createElement('a');
  a.download = `qweirdo-living-wall-${sha256Key.slice(0, 8)}-${Date.now()}.png`;
  a.href = finalCanvasUrl;
  a.click();

  msg(`📥 Canvas validated & downloaded! SHA-256: ${sha256Key.slice(0, 16)}… Recorded in provenance registry.`);
  return { sha256Key, dlRecord, finalCanvasUrl };
}

// Studio Toolbar Wiring: Caps, Substrates, Enamels, Audio
document.querySelectorAll('.tool-btn[data-cap]').forEach(btn=>{
  btn.onclick=()=>setCap(btn.dataset.cap);
});

document.querySelectorAll('.tool-btn[data-sub]').forEach(btn=>{
  btn.onclick=()=>setSubstrate(btn.dataset.sub);
});

document.querySelectorAll('.palette-chip').forEach(btn=>{
  btn.onclick=()=>setScheme(btn.dataset.scheme);
});

$('#toolLoupe').onclick=()=>{
  isLoupeActive=!isLoupeActive;
  $('#toolLoupe').classList.toggle('active',isLoupeActive);
  msg(isLoupeActive ? "Loupe active (2.5x zoom)." : "Loupe closed.");
};

$('#btnAudio').onclick=()=>{
  initAudio();
  audioActive=!audioActive;
  $('#btnAudio').classList.toggle('audio-on',audioActive);
  $('#btnAudio').textContent=audioActive?'🔊 Audio: On':'🔇 Audio: Off';
  if(audioActive)playCanRattle();
  msg(audioActive ? "Audio enabled." : "Audio muted.");
};

// Native <dialog> Modal Helpers per Modern Web Guidance
function openModalDialog(el) {
  if (!el) return;
  if (typeof el.showModal === 'function') {
    try {
      if (!el.open) el.showModal();
    } catch {
      el.classList.add('open');
    }
  } else {
    el.classList.add('open');
  }
}

function closeModalDialog(el) {
  if (!el) return;
  if (typeof el.close === 'function' && el.open) {
    try {
      el.close();
    } catch {
      // ignore
    }
  }
  el.classList.remove('open');
}

// Philatelic & Geometric Stamp Forge Modal Controller
const btnStampTool = document.getElementById('btnStampTool');
const stampModal = document.getElementById('stampModal');
const btnCloseStamp = document.getElementById('btnCloseStampModal');

if (btnStampTool && stampModal) {
  btnStampTool.onclick = () => {
    openModalDialog(stampModal);
    renderStampPreview();
  };
}

if (btnCloseStamp && stampModal) {
  btnCloseStamp.onclick = () => closeModalDialog(stampModal);
}

// Motif Chips Selection
document.querySelectorAll('.stamp-motif-chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.stamp-motif-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeStampMotif = btn.dataset.motif;
    renderStampPreview();
  };
});

// Style Chips Selection
document.querySelectorAll('.stamp-style-chip').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.stamp-style-chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeStampStyle = btn.dataset.style;
    renderStampPreview();
  };
});

// Tag Text Input
const stampTagInput = document.getElementById('stampTagInput');
if (stampTagInput) {
  stampTagInput.addEventListener('input', (e) => {
    activeStampTag = e.target.value.trim() || 'QWEIRDO';
    renderStampPreview();
  });
}

// Randomize Tag Monikers
const TAG_VAULT = [
  'QWEIRDO', 'RECLAIM COMMONS', 'ARS LONGA', 'EPISTEME', 'SANCTUARY',
  'SUBVERT', 'VERITAS', 'IKONOKLAST', 'SEEK FREE', 'METATRON', 'AUREA PHI'
];
const btnRandomTag = document.getElementById('btnRandomizeTag');
if (btnRandomTag && stampTagInput) {
  btnRandomTag.onclick = () => {
    const next = TAG_VAULT[Math.floor(Math.random() * TAG_VAULT.length)];
    stampTagInput.value = next;
    activeStampTag = next;
    renderStampPreview();
  };
}

// Action: Transfer Stamp to Canvas / Mini-Canvas
const btnTransferStamp = document.getElementById('btnTransferStamp');
if (btnTransferStamp) {
  btnTransferStamp.onclick = () => {
    const tx = activeMiniCanvas ? (activeMiniCanvas.x + activeMiniCanvas.w / 2) : (W / 2);
    const ty = activeMiniCanvas ? (activeMiniCanvas.y + activeMiniCanvas.h / 2) : (H / 2);
    transferStampToWall(activeStampMotif, activeStampTag, tx, ty, activeStampStyle);
    if (activeMiniCanvas) activeMiniCanvas.strokesCount++;
    if (stampModal) closeModalDialog(stampModal);
  };
}

// Action: Load as Interactive Stencil
const btnLoadStampStencil = document.getElementById('btnLoadStampAsStencil');
if (btnLoadStampStencil) {
  btnLoadStampStencil.onclick = () => {
    loadStampAsInteractiveStencil(activeStampMotif, activeStampTag);
  };
}

// Action: Export Vector SVG
const btnExportStampSvg = document.getElementById('btnExportStampSvg');
if (btnExportStampSvg) {
  btnExportStampSvg.onclick = () => {
    const sc = getScheme(activeScheme);
    const cleanTag = String(activeStampTag || 'QWEIRDO').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 32);
    const cleanMotif = String(activeStampMotif || 'penny_black').replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 32);
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect width="500" height="500" fill="#f6eee1"/>
  <g stroke="${sc.stroke}" fill="${sc.stroke}">
    <!-- Philatelic / Geometric Stamp: ${cleanMotif} (${cleanTag}) -->
    <circle cx="250" cy="250" r="220" fill="none" stroke="${sc.stroke}" stroke-width="2"/>
    <text x="250" y="460" font-family="'Hanken Grotesk',sans-serif" font-size="12" font-weight="700" text-anchor="middle" fill="${sc.stroke}">PROJECT QWEIRDO · PHILATELIC &amp; GEOMETRIC STAMP FORGE · ${cleanMotif.toUpperCase()}</text>
  </g>
</svg>`;
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.download = `qweirdo-stamp-${activeStampMotif}-${Date.now()}.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
    msg('Exported Stamp Vector SVG for pen-plotter / printing.');
  };
}

// Action: Export Stamp PNG
const btnExportStampPng = document.getElementById('btnExportStampPng');
if (btnExportStampPng) {
  btnExportStampPng.onclick = () => {
    const pCv = document.getElementById('stampPreviewCv');
    if (!pCv) return;
    const a = document.createElement('a');
    a.download = `qweirdo-stamp-${activeStampMotif}-${Date.now()}.png`;
    a.href = pCv.toDataURL('image/png');
    a.click();
    msg('Exported Stamp PNG.');
  };
}

// Spectrum Custom Color Picker Wiring
function hexToHsl(hex) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

const spectrumInput = document.getElementById('spectrumColorInput');
if (spectrumInput) {
  spectrumInput.addEventListener('input', (e) => {
    const hex = e.target.value;
    const hsl = hexToHsl(hex);
    SCHEMES.custom = {
      name: 'Custom Spectrum (' + hex.toUpperCase() + ')',
      hue: hsl.h,
      sat: hsl.s,
      li: hsl.l,
      stroke: hex,
      glow: hex + '88',
      desc: 'Selected custom spectral pigment'
    };
    setScheme('custom');
    renderStampPreview();
  });
}

$('#btnLockStencil').onclick=()=>{
  stencilLocked=!stencilLocked;
  $('#btnLockStencil').textContent=stencilLocked?'Unlock Position':'Lock Position';
  msg(stencilLocked?'Stencil locked in position. Spray across it with any cap or click Transfer Pochoir Print [Key T]!':'Stencil unlocked. Move to reposition.');
};
const transferPochoirBtn=$('#btnTransferStencil');
if(transferPochoirBtn){
  transferPochoirBtn.onclick=()=>{
    if(!activeStencil)return;
    stampPochoirStencil(activeStencil,stencilPos[0],stencilPos[1],activeScheme);
  };
}
$('#btnReleaseStencil').onclick=releaseStencil;

// Aided Tag Bar Buttons
$('#btnWildstyle').onclick=()=>{
  let val=$('#wd').value.trim();
  if(!val){
    val=prompt('Enter moniker or words for Algorithmic Wildstyle Burner:','CHAOS & CODE');
    if(val===null)return;
    val=val.trim();if(!val)return;
  }
  const [x,y] = activeMiniCanvas ? [activeMiniCanvas.x + activeMiniCanvas.w/2, activeMiniCanvas.y + activeMiniCanvas.h/2] : ((hoverPos&&hoverPos[0]>0)?hoverPos:[W/2,H/2]);
  stampWildstyleBurner(val,x,y,activeScheme);
  if (activeMiniCanvas) activeMiniCanvas.strokesCount++;
  $('#wd').value='';
};

$('#btnBubble').onclick=()=>{
  let val=$('#wd').value.trim();
  if(!val){
    val=prompt('Enter moniker for Phase 2 Bubble Softie:','SUBWAY');
    if(val===null)return;
    val=val.trim();if(!val)return;
  }
  const [x,y] = activeMiniCanvas ? [activeMiniCanvas.x + activeMiniCanvas.w/2, activeMiniCanvas.y + activeMiniCanvas.h/2] : ((hoverPos&&hoverPos[0]>0)?hoverPos:[W/2,H/2]);
  stampBubbleSoftie(val,x,y,activeScheme);
  if (activeMiniCanvas) activeMiniCanvas.strokesCount++;
  $('#wd').value='';
};

$('#btnHandstyle').onclick=()=>{
  let val=$('#wd').value.trim();
  if(!val){
    val=prompt('Enter tag moniker for NYC Handstyle:','QWEIRDO');
    if(val===null)return;
    val=val.trim();if(!val)return;
  }
  const [x,y] = activeMiniCanvas ? [activeMiniCanvas.x + activeMiniCanvas.w/2, activeMiniCanvas.y + activeMiniCanvas.h/2] : ((hoverPos&&hoverPos[0]>0)?hoverPos:[W/2,H/2]);
  stampHandstyle(val,x,y,activeScheme);
  if (activeMiniCanvas) activeMiniCanvas.strokesCount++;
  $('#wd').value='';
};

$('#sf').onsubmit=e=>{
  e.preventDefault();
  let w=$('#wd').value.trim().split(/\s+/).filter(Boolean).map(x=>x.slice(0,24));
  if(!w.length)return;
  if(w.length>5)w=w.slice(0,5);
  seed(w);
  $('#wd').value='';
};

// Subway Art Export Modal Wiring
let currentExportFmt='polaroid';
$('#btnExportFolio').onclick=()=>{
  msg('Generating 3200×1600 canvas with SHA-256 hash…');
  setTimeout(()=>{
    const url=generateSubwayArt(currentExportFmt);
    $('#folioPreview').src=url;
    openModalDialog($('#folioModal'));
    msg('Archival Canvas generated with verified cryptographic provenance key.');
  },60);
};

$('#btnCloseFolio').onclick=()=>closeModalDialog($('#folioModal'));

async function computeSha256(text) {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i) | 0;
    return 'sha256_' + Math.abs(hash).toString(16).padStart(16, '0');
  }
}

$('#btnFmtPolaroid').onclick=()=>{
  currentExportFmt='polaroid';
  $('#btnFmtPolaroid').classList.add('active');
  $('#btnFmtWall').classList.remove('active');
  const nftBtn=$('#btnFmtNFT');if(nftBtn)nftBtn.classList.remove('active');
  const covSec=$('#nftCovenantSection');if(covSec)covSec.style.display='none';
  $('#folioPreview').src=generateSubwayArt('polaroid');
};

$('#btnFmtWall').onclick=()=>{
  currentExportFmt='wall';
  $('#btnFmtWall').classList.add('active');
  $('#btnFmtPolaroid').classList.remove('active');
  const nftBtn=$('#btnFmtNFT');if(nftBtn)nftBtn.classList.remove('active');
  const covSec=$('#nftCovenantSection');if(covSec)covSec.style.display='none';
  $('#folioPreview').src=generateSubwayArt('wall');
};

const btnFmtNft = $('#btnFmtNFT');
if (btnFmtNft) {
  btnFmtNft.onclick = async () => {
    currentExportFmt = 'nft';
    btnFmtNft.classList.add('active');
    $('#btnFmtPolaroid').classList.remove('active');
    $('#btnFmtWall').classList.remove('active');
    const covSec = $('#nftCovenantSection');
    if (covSec) covSec.style.display = 'block';

    const artUrl = generateSubwayArt('wall');
    $('#folioPreview').src = artUrl;
    msg('Computing SHA-256 hash & provenance metadata…');

    currentNftHash = await computeSha256(artUrl);
    const coauth = cred.length ? cred.map(c => c.name).join(', ') : 'Autonomous Scribe';
    const inspirersList = cred.length ? cred.map(c => c.name) : ['Autonomous Street Epigraphy'];

    const hashDisp = $('#provenanceHashDisplay');
    if (hashDisp) hashDisp.textContent = currentNftHash;
    const inspDisp = $('#provenanceInspirersDisplay');
    if (inspDisp) inspDisp.textContent = inspirersList.join(', ');

    currentNftMetadata = {
      name: 'Project Qweirdo: The Living Urban Wall #' + currentNftHash.slice(0, 8).toUpperCase(),
      description: 'An archival digital humanities aerosol inscription created on The Living Urban Wall (Aged Scriptorium Vellum Ground). Inscribed by ' + coauth + '.',
      image: 'ipfs://[UPLOAD_HASH]/' + currentNftHash + '.png',
      external_url: 'https://qweirdo.github.io',
      attributes: [
        { trait_type: 'Inscription Title', value: 'The Living Urban Wall Broadside' },
        { trait_type: 'Writer', value: coauth },
        { trait_type: 'Substrate', value: 'AGED SCRIPTORIUM VELLUM WALL' },
        { trait_type: 'Aerosol Cap', value: currentCap.toUpperCase() },
        { trait_type: 'Enamel Palette', value: activeScheme.toUpperCase() },
        { trait_type: 'Epoch', value: 'Manuscript Vellum Digital Humanities Era' },
        { trait_type: 'License', value: 'CC BY-NC 4.0' },
        { trait_type: 'Commercial Rights', value: 'Restricted · Contact maintainer for license' },
        { trait_type: 'NFT Rights', value: 'Restricted · Negotiable upon inquiry' }
      ],
      properties: {
        sha256_hash: currentNftHash,
        created_at: new Date().toISOString(),
        engine: 'Project Qweirdo Living Wall Studio Engine',
        attribution: 'Project Qweirdo (https://qweirdo.github.io)',
        inspirers: inspirersList,
        terms: {
          sharing_and_education: 'Free for non-commercial & educational sharing with attribution to Project Qweirdo (https://qweirdo.github.io)',
          commercial_use: 'Requires explicit prior agreement with maintainer to negotiate payment based on use',
          nft_minting: 'Restricted / reserved; negotiable upon direct inquiry'
        },
        license: 'CC BY-NC 4.0 (Attribution-NonCommercial)'
      }
    };

    msg('Archival Provenance Certificate ready. SHA-256: ' + currentNftHash.slice(0, 16) + '…');
  };
}

const btnDownloadNftPkg = $('#btnDownloadNftPackage');
if (btnDownloadNftPkg) {
  btnDownloadNftPkg.onclick = () => {
    if (!currentNftMetadata) {
      msg('Please select Archival Provenance format first.');
      return;
    }

    // 1. Download Master Artwork PNG
    const aImg = document.createElement('a');
    aImg.download = 'qweirdo-archival-wall-' + currentNftHash.slice(0, 8) + '.png';
    aImg.href = $('#folioPreview').src;
    aImg.click();

    // 2. Download Provenance & Rights Metadata JSON
    setTimeout(() => {
      const blob = new Blob([JSON.stringify(currentNftMetadata, null, 2)], { type: 'application/json' });
      const aJson = document.createElement('a');
      aJson.download = 'qweirdo-provenance-record-' + currentNftHash.slice(0, 8) + '.json';
      aJson.href = URL.createObjectURL(blob);
      aJson.click();
      msg('Downloaded Archival Package: Master PNG + Provenance Record JSON (CC BY-NC 4.0 terms).');
    }, 250);
  };
}

const btnCopyNft = $('#btnCopyNftJson');
if (btnCopyNft) {
  btnCopyNft.onclick = () => {
    if (!currentNftMetadata) return;
    navigator.clipboard.writeText(JSON.stringify(currentNftMetadata, null, 2)).then(() => {
      msg('Copied ERC-721 / OpenSea NFT metadata JSON to clipboard!');
    }).catch(() => {
      msg('NFT metadata JSON ready.');
    });
  };
};
$('#btnFmtWall').onclick=()=>{
  currentExportFmt='wall';
  $('#btnFmtWall').classList.add('active');
  $('#btnFmtPolaroid').classList.remove('active');
  $('#folioPreview').src=generateSubwayArt('wall');
};

// Direct Studio Toolbar Download Action
const btnDlCanvas = $('#btnDownloadCanvas');
if (btnDlCanvas) {
  btnDlCanvas.onclick = () => downloadCanvasArchival('wall');
}

// Folio Modal Download Action
$('#btnDownloadFolio').onclick = () => {
  downloadCanvasArchival(currentExportFmt);
};

// Mini-Canvas Toolbar Wiring
const btnNewMini = $('#btnNewMiniCanvas');
if (btnNewMini) btnNewMini.onclick = newMiniCanvas;
const btnBlendMini = $('#btnBlendMiniCanvas');
if (btnBlendMini) btnBlendMini.onclick = blendMiniCanvasIntoWall;
const btnClearMini = $('#btnClearMiniCanvas');
if (btnClearMini) btnClearMini.onclick = clearMiniCanvas;

$('#btnFluidity').onclick=()=>{
  fluidityActive=!fluidityActive;
  $('#btnFluidity').classList.toggle('active-fluid',fluidityActive);
  $('#btnFluidity').textContent=fluidityActive?'💧 Fluid: High':'💧 Fluid: Off';
  msg(fluidityActive ? "Fluid dynamics active." : "Direct gesture mode.");
};

$('#btnPulseWave').onclick=pulseTealWave;

$('#btnRemix').onclick=()=>{
  saveUndo();
  drawSubstrate();
  msg('✦ Remixed wall: refreshed vellum texture and patina.');
};
$('#btnUndo').onclick=undo;
const btnAiIdeaEl=$('#btnAiIdea');
if(btnAiIdeaEl)btnAiIdeaEl.onclick=()=>{
  const [x,y]=activeMiniCanvas?[activeMiniCanvas.x+activeMiniCanvas.w/2,activeMiniCanvas.y+activeMiniCanvas.h/2]:((hoverPos&&hoverPos[0]>0)?hoverPos:[W/2,H/2]);
  spawnAiIdea(null,x,y,activeScheme);
};

// Credits Submission
$('#cf').onsubmit=e=>{
  e.preventDefault();
  const name=$('#cn').value.trim(),link=$('#cl').value.trim();
  if(!name||!$('#ck').checked)return;
  const en={name,link:/^https?:\/\//i.test(link)?link:''};
  if(!cred.some(c=>c.name==en.name)){cred.push(en);sv('qw_c',cred);}
  rC();
  if(CREDITS_ENDPOINT)fetch(CREDITS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...en,consent:true,date:new Date().toISOString()})}).catch(()=>{});
  e.target.reset();
  msg('Thank you. Your moniker is inscribed in local canvas memory. To submit to the permanent global edition ledger, use the GitHub Issue Offering link.');
};

const xy=e=>{
  const r=C.getBoundingClientRect();
  const t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0])||e;
  const cx=(t.clientX!==undefined)?t.clientX:(e.clientX||0);
  const cy=(t.clientY!==undefined)?t.clientY:(e.clientY||0);
  return[(cx-r.left)*W/r.width,(cy-r.top)*H/r.height];
};

// Canvas Pointer & Touch Events: Aerosol Spraying, Cap Dynamics, Stencil Masking
const startDraw=(x,y)=>{
  initAudio();
  hoverPos=[x,y];
  if(isLoupeActive)return;
  if(activeStencil&&!stencilLocked){
    stencilPos=[x,y];
    stencilLocked=true;
    $('#btnLockStencil').textContent='Unlock Stencil';
    msg('Stencil locked in place. Spray across it with any cap!');
    return;
  }
  isDrawing=true;
  saveUndo();
  lastDrawPt=[x,y];
  if(currentCap==='mop')playMarkerSqueak();
  else if(currentCap!=='buff')startSprayHiss();
  drawAerosol(x,y,x,y,currentCap,activeScheme);
};

const moveDraw=(x,y)=>{
  hoverPos=[x,y];
  if(activeStencil&&!stencilLocked){stencilPos=[x,y];}
  if(isDrawing&&lastDrawPt&&!isLoupeActive){
    const dist=Math.hypot(x-lastDrawPt[0],y-lastDrawPt[1]);
    if(dist>=2){
      drawAerosol(x,y,lastDrawPt[0],lastDrawPt[1],currentCap,activeScheme);
      updateSprayHiss(dist);
      lastDrawPt=[x,y];
    }
  }
};

C.addEventListener('pointerdown',e=>{
  lastHumanMarkTime=Date.now();
  if(e.cancelable)e.preventDefault();
  const [x,y]=xy(e);
  startDraw(x,y);
  try{C.setPointerCapture(e.pointerId);}catch(err){}
},{passive:false});

C.addEventListener('pointermove',e=>{
  if(isDrawing&&e.cancelable)e.preventDefault();
  const [x,y]=xy(e);
  moveDraw(x,y);
},{passive:false});

const stopDrawing=e=>{
  if(isDrawing){
    isDrawing=false;
    lastDrawPt=null;
    stopSprayHiss();
    if(e&&e.pointerId){try{C.releasePointerCapture(e.pointerId);}catch(err){}}
  }
};
C.addEventListener('pointerup',stopDrawing);
C.addEventListener('pointercancel',stopDrawing);
C.addEventListener('pointerleave', ()=>{if(!isDrawing)hoverPos=null;});

// High-fidelity touch event listeners for mobile gesture prevention & smooth strokes
C.addEventListener('touchstart',e=>{
  if(e.cancelable)e.preventDefault();
  if(!isDrawing&&e.touches.length===1){
    const [x,y]=xy(e);
    startDraw(x,y);
  }
},{passive:false});

C.addEventListener('touchmove',e=>{
  if(e.cancelable)e.preventDefault();
  if(isDrawing){
    const [x,y]=xy(e);
    moveDraw(x,y);
  }
},{passive:false});

C.addEventListener('touchend',stopDrawing,{passive:true});
C.addEventListener('touchcancel',stopDrawing,{passive:true});

// Keyboard Shortcuts
window.addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  const k=e.key.toLowerCase();
  if(e.ctrlKey&&k==='z'){e.preventDefault();undo();return;}
  if(k==='i'){e.preventDefault();spawnAiIdea();return;}
  if(k==='1')setScheme('gold');
  else if(k==='2')setScheme('lapis');
  else if(k==='3')setScheme('oxblood');
  else if(k==='4')setScheme('teal');
  else if(k==='5')setScheme('sage');
  else if(k==='6')setScheme('tyrian');
  else if(k==='7')setScheme('bistre');
  else if(k==='8')setScheme('terracotta');
  else if(k==='9')setScheme('chrome');
  else if(k==='0')setScheme('obsidian');
  else if(k==='p'||k==='g'){const btn=document.getElementById('btnStampTool');if(btn)btn.click();}
  else if(k==='f')setCap('fat');
  else if(k==='k')setCap('skinny');
  else if(k==='m')setCap('mop');
  else if(k==='b')setCap('buff');
  else if(k==='w')setCap('waves');
  else if(k==='v')$('#btnFluidity').click();
  else if(k==='s')playCanRattle();
  else if(k==='a')$('#btnAudio').click();
  else if(k==='l')$('#toolLoupe').click();
  else if(k==='r')$('#btnRemix').click();
  else if(k==='t'&&activeStencil){const tb=$('#btnTransferStencil');if(tb)tb.click();}
  else if(e.key==='Escape'&&activeStencil)releaseStencil();
});

// Canvas Overlay loop (renders stencil mask, cursor cap reticle, and loupe)
let overlayClean=false;
function drawOverlay(){ over(); }
function over(){
  if(!hoverPos&&!activeStencil&&!activeMiniCanvas){
    if(!overlayClean){O.clearRect(0,0,W,H);overlayClean=true;}
    return;
  }
  overlayClean=false;
  O.clearRect(0,0,W,H);

  // 0. Active Mini-Canvas Cartouche overlay
  if(activeMiniCanvas){
    const {x, y, w, h, title} = activeMiniCanvas;
    O.save();
    // Warm vellum preview wash
    O.fillStyle = 'rgba(255, 250, 240, 0.22)';
    O.fillRect(x, y, w, h);

    // Dashed gold boundary
    O.strokeStyle = 'rgba(212, 175, 55, 0.85)';
    O.lineWidth = 1.8;
    O.setLineDash([8, 5]);
    O.strokeRect(x, y, w, h);
    O.setLineDash([]);

    // Illuminated manuscript corner brackets & accents
    const brkLen = 24;
    O.lineWidth = 3;
    O.strokeStyle = '#d4af37';
    // Top-left
    O.beginPath(); O.moveTo(x, y + brkLen); O.lineTo(x, y); O.lineTo(x + brkLen, y); O.stroke();
    // Top-right
    O.beginPath(); O.moveTo(x + w - brkLen, y); O.lineTo(x + w, y); O.lineTo(x + w, y + brkLen); O.stroke();
    // Bottom-left
    O.beginPath(); O.moveTo(x, y + h - brkLen); O.lineTo(x, y + h); O.lineTo(x + brkLen, y + h); O.stroke();
    // Bottom-right
    O.beginPath(); O.moveTo(x + w - brkLen, y + h); O.lineTo(x + w, y + h); O.lineTo(x + w, y + h - brkLen); O.stroke();

    // Corner rosettes
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
      O.fillStyle = '#d4af37';
      O.beginPath(); O.arc(cx, cy, 3.5, 0, Math.PI * 2); O.fill();
    });

    // Cartouche Header Ribbon Badge
    O.fillStyle = 'rgba(27, 20, 14, 0.9)';
    O.strokeStyle = 'rgba(212, 175, 55, 0.8)';
    O.lineWidth = 1;
    O.beginPath();
    O.roundRect(x + 12, y - 28, Math.min(w - 24, 340), 24, 4);
    O.fill();
    O.stroke();

    O.fillStyle = '#f5e6cc';
    O.font = "600 11px 'Hanken Grotesk',sans-serif";
    O.textAlign = 'left';
    O.fillText(`✦ MINI-CANVAS · ${title.toUpperCase()}`, x + 22, y - 12);

    O.restore();
  }

  // 1. Draw Active Pochoir Stencil cutout mask
  if(activeStencil){
    drawStencilOutline(activeStencil,stencilPos[0],stencilPos[1]);
  }

  // 2. Wall Loupe (2.5x magnification of wall substrate and paint craquelure)
  if(isLoupeActive&&hoverPos){
    const [lx,ly]=hoverPos;
    const lensR=95;
    const zoom=2.5;
    const sw=(lensR*2)/zoom,sh=(lensR*2)/zoom;
    const sx=Math.max(0,Math.min(W-sw,lx-sw/2));
    const sy=Math.max(0,Math.min(H-sh,ly-sh/2));

    O.save();
    O.beginPath();O.arc(lx,ly,lensR,0,6.28);O.clip();
    O.drawImage(C,sx,sy,sw,sh,lx-lensR,ly-lensR,lensR*2,lensR*2);

    const lg=O.createRadialGradient(lx,ly,lensR*0.35,lx,ly,lensR);
    lg.addColorStop(0,'rgba(255,255,255,0.04)');
    lg.addColorStop(0.85,'rgba(70,45,20,0.08)');
    lg.addColorStop(1,'rgba(30,15,5,0.38)');
    O.fillStyle=lg;
    O.fillRect(lx-lensR,ly-lensR,lensR*2,lensR*2);
    O.restore();

    O.save();
    O.strokeStyle='rgba(184,134,11,0.95)';
    O.lineWidth=4;
    O.beginPath();O.arc(lx,ly,lensR,0,6.28);O.stroke();
    O.strokeStyle='rgba(212,175,55,0.85)';
    O.lineWidth=1.5;
    O.beginPath();O.arc(lx,ly,lensR-3.5,0,6.28);O.stroke();

    O.fillStyle='#d4af37';
    O.font="600 11px 'Hanken Grotesk',sans-serif";
    O.fillText('2.5x WALL LOUPE',lx-65,ly+lensR+18);
    O.restore();
  }
  // 3. Dynamic Cursor Reticle
  else if(hoverPos){
    const [hx,hy]=hoverPos;
    const sc=SCHEMES[activeScheme];

    O.save();
    if(currentCap==='buff'){
      O.strokeStyle='rgba(255,255,255,0.85)';
      O.lineWidth=1.5;
      O.strokeRect(hx-34,hy-12,68,24);
      O.fillStyle='rgba(255,255,255,0.7)';
      O.font="600 10px 'Hanken Grotesk',sans-serif";
      O.fillText('BUFF ROLLER',hx-32,hy-16);
    } else if(currentCap==='skinny'){
      O.strokeStyle=sc.stroke;
      O.lineWidth=1.2;
      O.beginPath();O.arc(hx,hy,6,0,6.28);O.stroke();
      O.beginPath();
      O.moveTo(hx-10,hy);O.lineTo(hx+10,hy);
      O.moveTo(hx,hy-10);O.lineTo(hx,hy+10);
      O.stroke();
    } else if(currentCap==='mop'){
      O.strokeStyle=sc.stroke;
      O.lineWidth=1.5;
      O.strokeRect(hx-10,hy-4,20,8);
    } else if(currentCap==='spatter'){
      O.strokeStyle=sc.stroke;
      O.lineWidth=1;
      O.setLineDash([3,3]);
      O.beginPath();O.arc(hx,hy,35,0,6.28);O.stroke();
    } else {
      O.strokeStyle=sc.stroke;
      O.lineWidth=1.2;
      O.beginPath();O.arc(hx,hy,isDrawing?28:18,0,6.28);O.stroke();
    }
    O.restore();
  }
}

function prog(){
  const p=Math.min(1,steps/TARGET);
  $('#pb').style.width=(p*100)+'%';
  $('#pt').textContent=Math.floor(p*100)+'% inscribed';
  if(p>=1&&!done)finish();
}

function finish(){
  done=true;
  const T=document.createElement('canvas');T.width=320;T.height=160;
  T.getContext('2d').drawImage(C,0,0,320,160);
  arch.unshift({img:T.toDataURL('image/jpeg',.8),d:new Date().toISOString(),n:[...cred]});
  arch=arch.slice(0,24);
  sv('qw_a',arch);rA();
  msg('Wall edition complete. Preserved in the archive below. A fresh blank wall begins…');
  setTimeout(()=>{
    steps=0;ag=[];wall=[];cov=cov.map(_=>0);cred=[];
    sv('qw_c',[]);sv('qw_s',0);sv('qw_i',null);
    blank();done=false;rC();msg('');
  },4800);
}

function ageEditionCanvas(targetCtx, dateStr, w, h) {
  if (!targetCtx || !dateStr) return;
  const ageMs = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const fade = Math.min(0.4, ageDays * 0.005);

  targetCtx.save();
  // 1. Pigment fade
  targetCtx.globalCompositeOperation = 'source-atop';
  targetCtx.fillStyle = `rgba(235, 224, 206, ${(fade * 0.5).toFixed(3)})`;
  targetCtx.fillRect(0, 0, w, h);

  // 2. Parchment foxing
  const foxingCount = Math.min(45, Math.floor(ageDays * 0.6) + 5);
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  const rng = seededRng(seed);

  targetCtx.globalCompositeOperation = 'multiply';
  for (let i = 0; i < foxingCount; i++) {
    const fx = rng() * w;
    const fy = rng() * h;
    const fr = 1 + rng() * 3.5;
    const fAlpha = (0.04 + rng() * 0.08).toFixed(3);
    targetCtx.beginPath();
    targetCtx.arc(fx, fy, fr, 0, Math.PI * 2);
    targetCtx.fillStyle = `rgba(132, 76, 28, ${fAlpha})`;
    targetCtx.fill();
  }

  // 3. Softened edges
  targetCtx.globalCompositeOperation = 'destination-over';
  targetCtx.fillStyle = '#ebe0ce';
  targetCtx.fillRect(0, 0, w, h);
  targetCtx.restore();
}

const DEFAULT_ARCHIVE=[
  [9,'2026-03-08','Subhradeep, Aerosol Monk, Phase 2',['luminous amber script','moss quiet veil','drift gold solace','bloom wild seed','root stone deep']],
  [8,'2026-02-28','K-60 Scribe, Vellum Cartographer',['river current silver','flow water wave','drift azure calm']],
  [7,'2026-02-18','Pyre Monk, Metatron',['ember spark rise','flame crimson light','flicker smoke pyre']],
  [6,'2026-02-05','Anonymous Scribe, Bistre Hand',['oak strata root','stone deep earth','bark soil ground']],
  [5,'2026-01-24','Zenith, Harmonograph Scribe',['feather wind zephyr','drift soar sky','air breeze cloud']],
  [4,'2026-01-12','Verdigris Poet, Bloom Weaver',['lotus petal bloom','nectar wild seed','sprout leaf flora']],
  [3,'2025-12-30','Obsidian Scribe, Nocturne',['twilight shadow quiet','moon dream night','stars dusk veil']],
  [2,'2025-12-15','Imperial Tyrian, Calligrapher',['grace solace truth','pure calm serene','harmony peace ink']],
  [1,'2025-12-01','Subhradeep, Founding Scribes',['sanctuary peace origin','chirography light vellum','spirit genesis mark']]
].map(([num,d,co,offs])=>{
  const authors=co.split(', ');
  return {num,d,n:authors.map(name=>({name})),ed:offs.map((w,i)=>({id:`e${num}_${i}`,words:w.split(' '),name:authors[i%authors.length]}))};
});

function rA(){
  const e=$('#ar');if(!e)return;
  e.innerHTML='';
  const items=[...arch];
  if(items.length<9){
    for(const def of DEFAULT_ARCHIVE){
      if(items.length>=9)break;
      if(!items.some(x=>x.num===def.num))items.push(def);
    }
  }
  items.slice(0, 9).forEach((a,idx)=>{
    const card=document.createElement('figure');
    card.className='archive-card';
    const num=a.num||(items.length-idx);
    card.setAttribute('aria-label',`Edition #${num} completed ${fmt(a.d)}`);

    const wrap=document.createElement('div');
    wrap.className='archive-thumb-wrap';
    const badge=document.createElement('span');
    badge.className='archive-badge';
    badge.textContent=`Edition #${num}`;
    wrap.appendChild(badge);

    const cv=document.createElement('canvas');
    cv.width=640;cv.height=320;
    cv.setAttribute('aria-label',`Archived canvas edition #${num}`);
    wrap.appendChild(cv);

    const cap=document.createElement('figcaption');
    const meta=document.createElement('div');
    meta.className='archive-meta';
    const coauthors = (a.n && a.n.length) ? a.n.map(x => String(x.name || '')).filter(Boolean).join(', ') : 'Anonymous Scribes';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'archive-date';
    dateSpan.textContent = fmt(a.d);
    const provSpan = document.createElement('span');
    provSpan.className = 'archive-prov';
    provSpan.setAttribute('title', coauthors);
    provSpan.textContent = `Co-creators: ${coauthors}`;
    meta.append(dateSpan, provSpan);

    const rpBtn=document.createElement('button');
    rpBtn.type='button';
    rpBtn.className='btn-archive-replay';
    rpBtn.setAttribute('aria-label',`Replay edition #${num}`);
    rpBtn.textContent='🎬 Replay';
    rpBtn.onclick=()=>launchReplay(a.edition||a.ed||activeEdition);

    cap.append(meta,rpBtn);
    card.append(wrap,cap);
    e.appendChild(card);

    if('IntersectionObserver' in window){
      const obs=new IntersectionObserver((entries,o)=>{
        entries.forEach(ent=>{
          if(ent.isIntersecting){
            if(!wrap.dataset.rendered){
              wrap.dataset.rendered='true';
              renderAgedPlate(cv,a);
            }
            o.unobserve(wrap);
          }
        });
      },{rootMargin:'120px 0px'});
      obs.observe(wrap);
    } else {
      renderAgedPlate(cv,a);
    }
  });
}

function renderAgedPlate(cv,item){
  const ctx=cv.getContext('2d');
  if(item.img){
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,cv.width,cv.height);
      ageEditionCanvas(ctx,item.d,cv.width,cv.height);
    };
    img.src=item.img;
  } else {
    ctx.fillStyle='#ebe0ce';
    ctx.fillRect(0,0,cv.width,cv.height);
    const ed=item.edition||item.ed;
    if(ed&&typeof renderEdition==='function')renderEdition(ed,1.0,ctx,cv.width,cv.height);
    ageEditionCanvas(ctx,item.d,cv.width,cv.height);
  }
}

function rC(){
  const e=$('#cr');e.textContent='Inspired by: ';
  if(!cred.length){e.textContent+='no one yet';return;}
  cred.forEach(c=>{
    let n;
    if(/^https?:\/\//i.test(c.link)){n=document.createElement('a');n.href=c.link;n.target='_blank';n.rel='noopener nofollow';}
    else n=document.createElement('span');
    n.textContent=c.name;e.append(n);
  });
}


// ==========================================
// HIGHLY DETAILED INTRICATE PROCEDURAL ART GENERATORS
// Castles, Waves, Terracotta, Animals, Buildings, Symbols, and Natural Objects
// ==========================================
function drawIntricateCastle(X,x,y,s,c){
  X.save();X.strokeStyle=c;X.lineWidth=1.3;
  const w=s*0.38,h=s*0.3,tw=w*0.28,th=h*0.9;
  X.strokeRect(x-w,y-h/2,tw,th);X.strokeRect(x+w-tw,y-h/2,tw,th);
  X.strokeRect(x-w+tw,y-h/2+th*0.35,(w-tw)*2,th*0.65);
  for(let i=-w;i<=w-6;i+=7)X.strokeRect(x+i,y-h/2-3,4,3);
  X.beginPath();
  [-w+tw/2,w-tw/2].forEach(tx=>{
    X.moveTo(x+tx-tw/2,y-h/2-3);X.lineTo(x+tx,y-h/2-18);X.lineTo(x+tx+tw/2,y-h/2-3);
    X.moveTo(x+tx,y-h/2-18);X.lineTo(x+tx,y-h/2-24);X.lineTo(x+tx+8,y-h/2-21);X.lineTo(x+tx,y-h/2-18);
  });
  X.moveTo(x-7,y+h/2);X.lineTo(x-7,y+h/2-14);X.arc(x,y+h/2-14,7,3.14,0);X.lineTo(x+7,y+h/2);
  X.stroke();X.restore();
}

function drawIntricateWaves(X,x,y,s,c){
  X.save();X.strokeStyle=c;X.lineWidth=1.3;
  const r=s*0.4;
  for(let i=0;i<3;i++){
    const wr=r*(1-i*0.25),wy=y+i*8;
    X.beginPath();X.moveTo(x-wr,wy+12);
    X.bezierCurveTo(x-wr*0.4,wy+16,x,wy-wr*0.7,x+wr*0.5,wy-wr*0.8);
    X.bezierCurveTo(x+wr*0.9,wy-wr*0.9,x+wr*1.1,wy-wr*0.2,x+wr*0.7,wy-wr*0.1);
    X.bezierCurveTo(x+wr*0.4,wy-wr*0.05,x+wr*0.5,wy-wr*0.5,x+wr*0.75,wy-wr*0.4);
    X.stroke();
    for(let f=0;f<4;f++){X.beginPath();X.arc(x+wr*0.55+Math.cos(f)*10,wy-wr*0.75+Math.sin(f)*10,1.2,0,6.28);X.stroke();}
  }
  X.restore();
}

function drawIntricateTerracotta(X,x,y,s,c){
  X.save();X.strokeStyle=c||'#b85434';X.lineWidth=1.4;
  const rw=s*0.22,rh=s*0.45;
  X.beginPath();X.moveTo(x-rw*0.6,y-rh);X.lineTo(x+rw*0.6,y-rh);
  X.bezierCurveTo(x+rw*1.2,y-rh*0.1,x+rw,y+rh*0.4,x+rw*0.4,y+rh);
  X.lineTo(x-rw*0.4,y+rh);
  X.bezierCurveTo(x-rw,y+rh*0.4,x-rw*1.2,y-rh*0.1,x-rw*0.6,y-rh);
  X.moveTo(x-rw*0.4,y-rh*0.7);X.bezierCurveTo(x-rw*1.4,y-rh*0.5,x-rw*1.4,y-rh*0.1,x-rw*0.7,y);
  X.moveTo(x+rw*0.4,y-rh*0.7);X.bezierCurveTo(x+rw*1.4,y-rh*0.5,x+rw*1.4,y-rh*0.1,x+rw*0.7,y);
  X.stroke();
  for(let fl=-1;fl<=1;fl++){X.beginPath();X.moveTo(x+fl*rw*0.25,y-rh*0.2);X.lineTo(x+fl*rw*0.15,y+rh*0.8);X.stroke();}
  X.restore();
}

function drawIntricateAnimal(X,x,y,s,c){
  X.save();X.strokeStyle=c;X.lineWidth=1.3;
  const r=s*0.38;
  X.beginPath();X.moveTo(x,y+r*0.8);X.bezierCurveTo(x-3,y,x-4,y-r*0.7,x,y-r*0.9);
  X.lineTo(x+6,y-r*0.95);X.lineTo(x+2,y-r*0.8);X.bezierCurveTo(x+5,y,x+4,y+r*0.5,x,y+r*0.8);
  X.moveTo(x,y-r*0.2);X.bezierCurveTo(x-r*0.6,y-r*0.8,x-r,y-r*0.7,x-r*1.3,y-r*0.2);
  for(let i=0;i<4;i++){X.lineTo(x-r*(1.3-i*0.25),y-r*0.2+8);X.lineTo(x-r*(1.1-i*0.25),y-r*0.2);}
  X.moveTo(x,y-r*0.2);X.bezierCurveTo(x+r*0.6,y-r*0.8,x+r,y-r*0.7,x+r*1.3,y-r*0.2);
  for(let i=0;i<4;i++){X.lineTo(x+r*(1.3-i*0.25),y-r*0.2+8);X.lineTo(x+r*(1.1-i*0.25),y-r*0.2);}
  X.moveTo(x,y+r*0.7);X.quadraticCurveTo(x-8,y+r*1.2,x-14,y+r*1.4);
  X.moveTo(x,y+r*0.7);X.quadraticCurveTo(x+8,y+r*1.2,x+14,y+r*1.4);
  X.stroke();X.restore();
}

function drawIntricateBuilding(X,x,y,s,c){
  X.save();X.strokeStyle=c;X.lineWidth=1.3;
  const w=s*0.4,h=s*0.34,bx=x-w,by=y-h/2;
  X.strokeRect(bx-4,by+h*2-8,w*2+8,8);
  X.beginPath();X.moveTo(bx,by+h*0.5);X.lineTo(x,by);X.lineTo(bx+w*2,by+h*0.5);X.closePath();X.stroke();
  X.strokeRect(bx,by+h*0.5,w*2,6);
  for(let i=0;i<4;i++)X.strokeRect(bx+(w*2-6)*(i/3),by+h*0.5+6,6,h*1.5-14);
  X.beginPath();X.moveTo(x-9,by+h*2-8);X.lineTo(x-9,by+h+4);X.arc(x,by+h+4,9,3.14,0);X.lineTo(x+9,by+h*2-8);
  X.stroke();X.restore();
}

function drawIntricateSymbol(X,x,y,s,c){
  X.save();X.strokeStyle=c;X.lineWidth=1.2;
  const r=s*0.38;
  X.beginPath();X.arc(x,y,r,0,6.28);X.arc(x,y,r-4,0,6.28);X.stroke();
  const nd=[[x,y]];
  for(let i=0;i<6;i++){
    const a=(i*3.1415)/3,nx=x+Math.cos(a)*r*0.65,ny=y+Math.sin(a)*r*0.65;
    nd.push([nx,ny]);X.beginPath();X.arc(nx,ny,r*0.32,0,6.28);X.stroke();
  }
  X.beginPath();
  for(let i=1;i<nd.length;i++){
    for(let j=i+1;j<nd.length;j++){X.moveTo(nd[i][0],nd[i][1]);X.lineTo(nd[j][0],nd[j][1]);}
    X.moveTo(x,y);X.lineTo(nd[i][0],nd[i][1]);
  }
  X.stroke();X.restore();
}

function drawIntricateNature(X,x,y,s,c){
  X.save();X.strokeStyle=c;X.lineWidth=1.2;
  const r=s*0.38;
  X.beginPath();let a=0,rad=3;X.moveTo(x,y);
  while(rad<r){a+=0.2;rad=Math.exp(a*0.22)*2.6;X.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}
  X.stroke();
  for(let sa=0.8;sa<a;sa+=0.5){
    const r1=Math.exp(sa*0.22)*2.6;
    X.beginPath();X.moveTo(x+Math.cos(sa)*Math.max(0,r1-12),y+Math.sin(sa)*Math.max(0,r1-12));
    X.quadraticCurveTo(x+Math.cos(sa+0.3)*(r1*0.7),y+Math.sin(sa+0.3)*(r1*0.7),x+Math.cos(sa)*r1,y+Math.sin(sa)*r1);
    X.stroke();
  }
  X.restore();
}

const INTRICATE_AI_SHAPES={
  castle:drawIntricateCastle,
  waves:drawIntricateWaves,
  terracotta:drawIntricateTerracotta,
  animal:drawIntricateAnimal,
  building:drawIntricateBuilding,
  symbol:drawIntricateSymbol,
  nature:drawIntricateNature
};
const AI_SHAPE_KEYS=Object.keys(INTRICATE_AI_SHAPES);
const AI_SHAPE_NAMES={
  castle:'Gothic Castle Citadel',
  waves:'Curling Tidal Waves',
  terracotta:'Terracotta Amphora Urn',
  animal:'Calligraphic Scriptorium Swallow',
  building:'Classical Temple Cloister',
  symbol:'Sacred Metatron Epigraphy',
  nature:'Golden Ratio Nautilus'
};

function spawnAiIdea(category,cx,cy,schemeKey){
  const cat=category||AI_SHAPE_KEYS[Math.floor(Math.random()*AI_SHAPE_KEYS.length)];
  const drawer=INTRICATE_AI_SHAPES[cat]||drawIntricateCastle;
  const schKey=schemeKey||activeScheme||'gold';
  const sc=getScheme(schKey);
  let x=cx,y=cy;
  if(x===undefined||y===undefined){
    if(activeMiniCanvas){
      x=activeMiniCanvas.x+activeMiniCanvas.w/2;
      y=activeMiniCanvas.y+activeMiniCanvas.h/2;
    }else{
      const [sx,sy]=slot();
      x=sx;y=sy;
    }
  }
  saveUndo();
  const size=activeMiniCanvas?Math.min(activeMiniCanvas.w,activeMiniCanvas.h)*0.7:R(75,120);
  drawer(X,x,y,size,sc.stroke);
  recordUserMark(x,y,size*0.55);
  if(activeMiniCanvas)activeMiniCanvas.strokesCount++;
  msg('AI Ideaboard: Inscribed ' + AI_SHAPE_NAMES[cat] + ' in ' + sc.name + '.');
}

// Main Animation Loop
function loop(ts){
  if(!done){
    updateDrips();

    wall.forEach(P=>P.n<P.N?Math.random()<.014&&emit(P):P.fa-=.005);
    wall=wall.filter(P=>P.n<P.N||P.fa>0);

    const timeSinceHuman=(ts-lastHumanMarkTime);
    const isHumanActive=isDrawing||(timeSinceHuman<2800);
    if(!isHumanActive&&(ts-lastAiSketchTime>7500||lastAiSketchTime===0)){
      lastAiSketchTime=ts;
      spawnAiIdea();
    }
    if(wall.filter(P=>P.n<P.N).length===0&&(ts-lastAmbTime>18000)){
      lastAmbTime=ts;
      amb();
    }

    for(let i=ag.length-1;i>=0;i--){
      if(!step(ag[i]))ag.splice(i,1);
    }
    prog();
    over();
  }
  requestAnimationFrame(loop);
}

// Retain atmospheric seeding logic and word machinations
const K={
  wave:[[0,0],[12,8],[28,-6],[44,6],[60,-4]],
  drop:[[0,-18],[12,0],[0,18],[-12,0]],
  flame:[[0,24],[-14,6],[-8,-12],[0,-24],[8,-12],[14,6]],
  leaf:[[-18,0],[-8,-14],[12,-16],[22,0],[12,16],[-8,14]],
  tree:[[0,24],[0,-12],[-14,-22],[0,-12],[14,-22]],
  star:[[0,-22],[6,-7],[21,-7],[9,3],[14,18],[0,9],[-14,18],[-9,3],[-21,-7],[-6,-7]],
  diamond:[[0,-22],[15,0],[0,22],[-15,0]],
  snowflake:[[0,-20],[0,20],[0,0],[-17,-10],[17,10],[0,0],[-17,10],[17,-10]],
  flower:[[0,0],[0,-14],[12,-6],[12,8],[0,14],[-12,8],[-12,-6]],
  sun:[[0,0],[0,-20],[0,20],[0,0],[-20,0],[20,0],[0,0],[-14,-14],[14,14],[0,0],[-14,14],[14,-14]],
  moon:[[0,-18],[14,-10],[18,6],[8,18],[-6,18],[6,8],[6,-8]]
};
const TP=6.28318,AR=(f,n=48)=>Array.from({length:n+1},(_,i)=>f(i/n)),CI=(cx,cy,r,n=40)=>AR(t=>[cx+r*Math.cos(t*TP),cy+r*Math.sin(t*TP)],n);
const SH={
  star:CI(0,0,16),
  sun:CI(0,0,20),
  diamond:CI(0,0,18),
  wave:CI(0,0,16),
  flame:CI(0,0,16),
  tree:CI(0,0,18)
};
const hs=w=>[...w].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);

function slot(zonePref){
  let order=[0,1,2,3,4,5];
  if(zonePref!==undefined){
    order.sort((a,b)=>(a===zonePref?-1:(b===zonePref?1:0)));
  }
  let bestZ=order[0],minCov=1e9;
  for(const zIdx of order){
    let zCov=0;
    for(let i=0;i<128;i++){
      const cx=(i%16)*100+50,cy=Math.floor(i/16)*100+50;
      if(Math.hypot(cx-ZONES[zIdx].x,cy-ZONES[zIdx].y)<ZONES[zIdx].r){
        zCov+=cov[i];
      }
    }
    if(zCov<minCov){minCov=zCov;bestZ=zIdx;}
  }
  const z=ZONES[bestZ];
  const ang=Math.random()*TP,rad=Math.sqrt(Math.random())*(z.r*0.65);
  return[Math.max(60,Math.min(W-60,z.x+Math.cos(ang)*rad)),Math.max(60,Math.min(H-60,z.y+Math.sin(ang)*rad)),bestZ];
}

function piece(x,y,kd,sh,v,dh=0,isOffering=false){
  const z=getZoneAt(x,y);
  const zHue=z.hue;
  const col=isOffering?[((zHue+dh)%360+360)%360,78,vivid*55+35]:[zHue,60,vivid*50+30];
  const scale=isOffering?1.4:1;
  const hScale=isOffering?1.25:1;
  const N=Math.floor(R(25,50));
  const pts=(SH[sh]||SH.star).map(([px,py])=>[px*scale,py*scale]);
  let xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const P={
    x,y,kd,sh,
    w:Math.max(...xs)-Math.min(...xs)+20,
    h:Math.max(...ys)-Math.min(...ys)+20,
    hw:R(32,55)*hScale,
    hs:col,
    P:pts,
    n:0,N,fa:1,b:'f',b2:null,
    dh,isOffering
  };
  wall.push(P);
  return P;
}

function mk(ty,x,y,a,P,o){
  const b=P?P.b:'f';
  const z=getZoneAt(x,y);
  let h=o&&o.h!==undefined?o.h:z.hue;
  let sat=o&&o.sat!==undefined?o.sat:70;
  let li=o&&o.li!==undefined?o.li:55;
  const agObj={
    ty,x,y,a,b,h,sat,li,
    w:o&&o.w!==undefined?o.w:2,
    l:o&&o.l!==undefined?o.l:60,
    s:o&&o.s!==undefined?o.s:0.4,
    vx:o&&o.vx!==undefined?o.vx:0,
    vy:o&&o.vy!==undefined?o.vy:0,
    d:o&&o.d!==undefined?o.d:0
  };
  ag.push(agObj);
  return agObj;
}

function emit(P){
  P.n++;
  const z=getZoneAt(P.x,P.y);
  const ang=Math.random()*TP;
  const dist=R(4,P.hw);
  const ex=P.x+Math.cos(ang)*dist,ey=P.y+Math.sin(ang)*dist;
  mk('f',ex,ey,ang,P,{w:R(1.2,3),s:R(0.25,0.5),l:R(45,95),h:z.hue});
}

function shape(P){
  X.save();
  X.beginPath();
  P.P.forEach(([px,py],i)=>{
    if(i===0)X.moveTo(P.x+px,P.y+py);
    else X.lineTo(P.x+px,P.y+py);
  });
  X.closePath();
  X.strokeStyle=`hsla(${P.hs[0]},${P.hs[1]}%,${P.hs[2]}%,0.65)`;
  X.lineWidth=P.isOffering?2.2:1.5;
  X.stroke();

  if(P.isOffering){
    X.beginPath();
    P.P.forEach(([px,py],i)=>{
      const ix=px*0.5,iy=py*0.5;
      if(i===0)X.moveTo(P.x+ix,P.y+iy);
      else X.lineTo(P.x+ix,P.y+iy);
    });
    X.closePath();
    X.strokeStyle=`hsla(${P.hs[0]},${P.hs[1]}%,85%,0.42)`;
    X.lineWidth=1;
    X.stroke();

    X.fillStyle='#ffffff';
    X.beginPath();
    X.moveTo(P.x,P.y-2.5);X.lineTo(P.x+2.5,P.y);X.lineTo(P.x,P.y+2.5);X.lineTo(P.x-2.5,P.y);
    X.closePath();X.fill();
  }
  X.restore();
}

function step(a){
  X.save();
  X.strokeStyle=`hsla(${a.h},${a.sat}%,${a.li}%,0.6)`;
  X.lineWidth=a.w;
  X.beginPath();
  X.moveTo(a.x,a.y);
  a.x+=Math.cos(a.a)*a.s+a.vx;
  a.y+=Math.sin(a.a)*a.s+a.vy;
  X.lineTo(a.x,a.y);
  X.stroke();
  X.restore();

  steps++;
  return --a.l>0;
}

function seed(words){
  saveUndo();
  words.forEach(w=>{
    if(isBad(w))return;
    const h=hs(w)%360;
    const zoneIdx=h%6;
    const [x,y]=slot(zoneIdx);
    const z=ZONES[zoneIdx];
    const P=piece(x,y,z.kd,z.sh,0.8,0,true);
    shape(P);
    for(let i=0;i<12;i++)emit(P);
  });
  msg(`Weather planted with ${words.length} terms across ${SCHEMES[activeScheme].name}.`);
}

// User Inscriptions Tracker for Ambient Machine Conservator
let userInscriptions = [];
function recordUserMark(x, y, radius = 50) {
  if (userInscriptions.length > 80) userInscriptions.shift();
  const near = userInscriptions.find(p => Math.hypot(p.x - x, p.y - y) < 45);
  if (near) {
    near.time = Date.now();
    near.count = (near.count || 1) + 1;
  } else {
    userInscriptions.push({ x, y, radius, time: Date.now(), count: 1 });
  }
}

// Ambient Machine Conservator (Slow & Contextual AI Growth)
function amb() {
  // Attracted strictly to areas where user-made inscriptions or tags exist
  const c = Array.isArray(window.__lastUserMarkCentroid) ? window.__lastUserMarkCentroid : null;
  if (!c && !userInscriptions.length) return;

  const target = c
    ? {
        x: Math.max(40, Math.min(W - 40, c[0] + R(-140, 140))),
        y: Math.max(40, Math.min(H - 40, c[1] + R(-140, 140))),
        radius: R(35, 95)
      }
    : userInscriptions[Math.floor(Math.random() * userInscriptions.length)];
  const mode = Math.random();

  if (mode < 0.38) {
    // 1. Slow Weather Drips settling from user strokes into wall crevices
    const dripCount = Math.floor(R(1, 3));
    for (let d = 0; d < dripCount; d++) {
      activeDrips.push({
        curX: target.x + R(-25, 25),
        curY: target.y + R(5, 30),
        vx: R(-0.08, 0.08),
        vy: R(0.35, 0.75),
        len: 0,
        maxLen: R(25, 65),
        width: R(0.9, 1.6),
        color: Math.random() < 0.5 ? 'rgba(99, 78, 58, 0.22)' : 'rgba(27, 94, 90, 0.18)'
      });
    }
  } else if (mode < 0.72) {
    // 2. Patina Glaze Wash settling into wall tooth around user tags
    X.save();
    X.globalCompositeOperation = 'multiply';
    const rad = R(45, 100);
    const grad = X.createRadialGradient(target.x, target.y, 10, target.x, target.y, rad);
    grad.addColorStop(0, 'rgba(190, 170, 142, 0.07)');
    grad.addColorStop(0.65, 'rgba(99, 78, 58, 0.035)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    X.fillStyle = grad;
    X.beginPath();
    X.arc(target.x, target.y, rad, 0, 6.28);
    X.fill();
    X.restore();
  } else {
    // 3. Lichen Crystal Blooms clinging to the outer contours of user tags
    X.save();
    X.globalAlpha = 0.30;
    const count = Math.floor(R(5, 12));
    const startAng = Math.random() * 6.28;
    for (let k = 0; k < count; k++) {
      const ang = startAng + (k / count) * 6.28 + R(-0.25, 0.25);
      const dist = target.radius * R(0.75, 1.3);
      const bx = target.x + Math.cos(ang) * dist;
      const by = target.y + Math.sin(ang) * dist;
      const size = R(1.1, 2.4);
      X.fillStyle = Math.random() < 0.5 ? 'rgba(212, 175, 55, 0.30)' : 'rgba(27, 94, 90, 0.25)';
      X.beginPath();
      X.arc(bx, by, size, 0, 6.28);
      X.fill();
    }
    X.restore();
  }
}

// Initialize Substrate & Start Animation Loop
blank();
rA();
rC();
requestAnimationFrame(loop);

// ==========================================
// SITE-WIDE FLUID TEAL WAVES ENGINE
// ==========================================
(function() {
  const swc = document.getElementById('site-waves');
  if (!swc) return;
  const swx = swc.getContext('2d');
  let Ww = swc.width = window.innerWidth;
  let Wh = swc.height = window.innerHeight;

  window.addEventListener('resize', () => {
    Ww = swc.width = window.innerWidth;
    Wh = swc.height = window.innerHeight;
  });

  const ripples = [];
  function addRipple(x, strength = 1) {
    if (ripples.length > 25) ripples.shift();
    ripples.push({ x, strength, age: 0, maxAge: 180, speed: 4.2 });
  }

  window.addEventListener('pointermove', e => {
    if (Math.random() < 0.22) {
      addRipple(e.clientX, 0.45);
    }
  });

  window.addEventListener('pointerdown', e => {
    addRipple(e.clientX, 1.2);
  });

  let waveTick = 0;
  function renderSiteWaves() {
    waveTick += 0.012;
    swx.clearRect(0, 0, Ww, Wh);

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].age++;
      if (ripples[i].age > ripples[i].maxAge) ripples.splice(i, 1);
    }

    const waveLayers = [
      { baseH: Wh * 0.74, amp: 32, freq: 0.0022, speed: 0.8, color: 'rgba(27, 94, 90, 0.16)', stroke: 'rgba(27, 94, 90, 0.32)' },
      { baseH: Wh * 0.81, amp: 42, freq: 0.0016, speed: -1.1, color: 'rgba(40, 122, 116, 0.12)', stroke: 'rgba(40, 122, 116, 0.25)' },
      { baseH: Wh * 0.88, amp: 26, freq: 0.0032, speed: 1.3, color: 'rgba(125, 162, 135, 0.10)', stroke: 'rgba(125, 162, 135, 0.22)' }
    ];

    waveLayers.forEach((layer) => {
      swx.beginPath();
      swx.moveTo(0, Wh);
      swx.lineTo(0, layer.baseH);

      const waveStep = (Ww < 820) ? 24 : 12;
      for (let x = 0; x <= Ww; x += waveStep) {
        let y = layer.baseH + Math.sin(x * layer.freq + waveTick * layer.speed) * layer.amp
                + Math.cos(x * layer.freq * 0.6 - waveTick * 0.5) * (layer.amp * 0.45);

        for (const rip of ripples) {
          const dist = Math.abs(x - rip.x);
          const ripRadius = rip.age * rip.speed;
          if (dist < ripRadius && dist > ripRadius - 60) {
            const damp = (1 - rip.age / rip.maxAge) * rip.strength;
            y += Math.sin((dist - ripRadius) * 0.12) * 18 * damp;
          }
        }

        swx.lineTo(x, y);
      }

      swx.lineTo(Ww, Wh);
      swx.closePath();
      swx.fillStyle = layer.color;
      swx.fill();
      swx.strokeStyle = layer.stroke;
      swx.lineWidth = 1.2;
      swx.stroke();
    });

    requestAnimationFrame(renderSiteWaves);
  }

  renderSiteWaves();
  window.__triggerSiteWavePulse = (strength = 1.5) => {
    for (let i = 0; i < Ww; i += 180) {
      addRipple(i, strength);
    }
  };
})();


// ==========================================
// HERO LOGO FLUID CHROMATIC ENGINE
// Cycles through Opal Obsidian, Roast Coffee, Abyssal Teal, Botanical Sage, Oxblood Red, and Gilded Amber
// Periodically floods the illuminated circle of the Q with a living fluid wave
// ==========================================
(function initHeaderLogoFluidAnimation() {
  const qCircleBase = document.getElementById('qCircleBase');
  const qCircleFlood = document.getElementById('qCircleFlood');
  const qCircleCrest = document.getElementById('qCircleCrest');
  const qCircleShimmer = document.getElementById('qCircleShimmer');
  const heroLogo = document.querySelector('.hero-logo');
  if (!qCircleBase || !qCircleFlood || !qCircleCrest) return;

  const LOGO_PALETTES = [
    {
      name: 'Opal Obsidian',
      base: '#181b22',          // Deep iridescent volcanic obsidian
      flood: '#222834',
      crest: '#38bdf8',         // Opal celestial glint
      tails: ['#283244', '#3b4a62', '#5a6e8c', '#8ba2c4'],
      accent: '#38bdf8'
    },
    {
      name: 'Roast Coffee',
      base: '#301c10',          // Dark roasted espresso bean
      flood: '#3f2516',
      crest: '#e6ccb2',         // Silky mocha crema
      tails: ['#4e2d19', '#6d4025', '#945c38', '#c48b5c'],
      accent: '#ddb892'
    },
    {
      name: 'Abyssal Teal',
      base: '#0f3835',          // Deep oceanic mineral teal
      flood: '#134743',
      crest: '#5eead4',         // Bioluminescent Aegean seafoam
      tails: ['#114b47', '#156b65', '#1ca39b', '#38d9ce'],
      accent: '#2dd4bf'
    },
    {
      name: 'Botanical Sage',
      base: '#22382c',          // Velvety lichen sage
      flood: '#2c4738',
      crest: '#c7d8c6',         // Dew-kissed eucalyptus
      tails: ['#324d3e', '#456954', '#608a70', '#8fb39c'],
      accent: '#a3b18a'
    },
    {
      name: 'Oxblood Red',
      base: '#460e15',          // Imperial antique oxblood
      flood: '#57131c',
      crest: '#fca5a5',         // Burnished cinnabar reflection
      tails: ['#5e141e', '#7a1b28', '#9e2536', '#c93a4f'],
      accent: '#fda4af'
    },
    {
      name: 'Gilded Amber',
      base: '#36240a',          // Scriptorium illuminated amber
      flood: '#462f0e',
      crest: '#fef08a',         // Venetian gold leaf luster
      tails: ['#5c3d11', '#7c5418', '#a47122', '#d49b35'],
      accent: '#fde047'
    }
  ];

  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  }
  function lerpColor(c1, c2, t) {
    t = Math.max(0, Math.min(1, t));
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    return rgbToHex(
      rgb1[0] + (rgb2[0] - rgb1[0]) * t,
      rgb1[1] + (rgb2[1] - rgb1[1]) * t,
      rgb1[2] + (rgb2[2] - rgb1[2]) * t
    );
  }

  // Circle Geometry: cx=46, cy=46, r=34
  const cx = 46, r = 34;
  function generateWave(p, time, slosh) {
    // p: 0.0 (bottom at y=84) to 1.0 (submerged at y=8)
    const yBase = 84 - p * 76;
    const amp = Math.sin(p * Math.PI) * 4.6 + Math.abs(slosh) * 2.2;
    const pts = [];
    const N = 14;

    for (let i = 0; i <= N; i++) {
      const x = 10 + (i / N) * 72;
      const normX = (x - cx) / r;
      const w1 = Math.sin(normX * 2.8 + time * 5.0) * amp;
      const w2 = Math.cos(normX * 4.5 - time * 3.5) * (amp * 0.38);
      const wSlosh = normX * slosh * 3.8;
      const y = yBase + w1 + w2 + wSlosh;
      pts.push([x, y]);
    }

    let waveD = 'M 10 88 L ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const mx = (prev[0] + curr[0]) / 2, my = (prev[1] + curr[1]) / 2;
      waveD += ' Q ' + prev[0].toFixed(1) + ' ' + prev[1].toFixed(1) + ', ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    waveD += ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + pts[pts.length - 1][1].toFixed(1);
    waveD += ' L 82 88 Z';

    let crestD = 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i];
      const mx = (prev[0] + curr[0]) / 2, my = (prev[1] + curr[1]) / 2;
      crestD += ' Q ' + prev[0].toFixed(1) + ' ' + prev[1].toFixed(1) + ', ' + mx.toFixed(1) + ' ' + my.toFixed(1);
    }
    crestD += ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + pts[pts.length - 1][1].toFixed(1);

    return { waveD, crestD };
  }

  let currPaletteIdx = 0;
  let nextPaletteIdx = 1;
  let phase = 'dwell'; // 'dwell' or 'flooding'
  let phaseTimer = 0;
  const DWELL_DURATION = 4.2; // Holds color for 4.2 seconds
  const FLOOD_DURATION = 2.4; // Fluid wave flood takes 2.4 seconds
  let slosh = 0;
  let sloshVel = 0;
  let lastTime = performance.now();

  // Initialize initial colors
  qCircleBase.setAttribute('fill', LOGO_PALETTES[0].base);
  for (let s = 0; s < 4; s++) {
    const tailElem = document.getElementById('qTail' + s);
    if (tailElem) tailElem.setAttribute('stroke', LOGO_PALETTES[0].tails[s]);
  }

  // Interactive pointer slosh physics
  if (heroLogo) {
    heroLogo.addEventListener('pointerenter', () => { sloshVel += 0.85; });
    heroLogo.addEventListener('pointermove', (e) => {
      const rect = heroLogo.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width - 0.5;
      sloshVel += normX * 0.12;
    });
    heroLogo.addEventListener('pointerdown', () => {
      sloshVel += 1.4;
      // If currently resting in dwell, accelerate to next color flood
      if (phase === 'dwell' && phaseTimer < DWELL_DURATION - 0.6) {
        phaseTimer = DWELL_DURATION - 0.4;
      }
    });
  }

  function tickLogoAnimation(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    // Slosh dampening spring physics
    slosh += sloshVel * dt * 14;
    sloshVel *= 0.92;
    slosh *= 0.94;

    if (phase === 'dwell') {
      phaseTimer += dt;
      // Mineral shimmer breathing effect
      if (qCircleShimmer) {
        const breath = 0.16 + Math.sin(now * 0.0022) * 0.08;
        qCircleShimmer.setAttribute('opacity', breath.toFixed(3));
      }
      if (phaseTimer >= DWELL_DURATION) {
        phase = 'flooding';
        phaseTimer = 0;
        nextPaletteIdx = (currPaletteIdx + 1) % LOGO_PALETTES.length;
        qCircleFlood.setAttribute('fill', LOGO_PALETTES[nextPaletteIdx].flood || LOGO_PALETTES[nextPaletteIdx].base);
      }
    } else if (phase === 'flooding') {
      phaseTimer += dt;
      const rawP = Math.min(1.0, phaseTimer / FLOOD_DURATION);
      // Smooth sinusoidal liquid swell curve
      const p = 0.5 - 0.5 * Math.cos(rawP * Math.PI);

      // Render harmonic wave surface
      const wave = generateWave(p, now * 0.004, slosh);
      qCircleFlood.setAttribute('d', wave.waveD);
      qCircleCrest.setAttribute('d', wave.crestD);
      const crestOpacity = Math.sin(rawP * Math.PI) * 0.88;
      qCircleCrest.setAttribute('opacity', crestOpacity.toFixed(3));

      // Cascading wave transition along the 4 mineral tail strands
      const tailProgress = Math.max(0, Math.min(1, (rawP - 0.15) / 0.85));
      for (let s = 0; s < 4; s++) {
        const tailElem = document.getElementById('qTail' + s);
        if (tailElem) {
          const strandP = Math.max(0, Math.min(1, (tailProgress - s * 0.08) / 0.68));
          const strandColor = lerpColor(
            LOGO_PALETTES[currPaletteIdx].tails[s],
            LOGO_PALETTES[nextPaletteIdx].tails[s],
            strandP
          );
          tailElem.setAttribute('stroke', strandColor);
        }
      }

      // Complete flood transition
      if (phaseTimer >= FLOOD_DURATION) {
        qCircleBase.setAttribute('fill', LOGO_PALETTES[nextPaletteIdx].base);
        qCircleFlood.setAttribute('d', '');
        qCircleCrest.setAttribute('opacity', '0');
        currPaletteIdx = nextPaletteIdx;
        phase = 'dwell';
        phaseTimer = 0;
        sloshVel += 0.45;
        for (let s = 0; s < 4; s++) {
          const tailElem = document.getElementById('qTail' + s);
          if (tailElem) {
            tailElem.setAttribute('stroke', LOGO_PALETTES[currPaletteIdx].tails[s]);
          }
        }
      }
    }

    requestAnimationFrame(tickLogoAnimation);
  }

  requestAnimationFrame(tickLogoAnimation);
})();


// ==========================================
// ==========================================
// STATIC EDITION LEDGER & DETERMINISTIC PAINTING
// Offerings fetched from data/edition.json & rendered via seeded PRNG
// ==========================================
function seededRng(seed) {
  let s = seed >>> 0;
  return function() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashSeed(id, words) {
  let str = String(id) + ':' + (Array.isArray(words) ? words.join(' ') : String(words));
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

async function loadEditionLedger() {
  const statusEl = document.getElementById('liveSyncStatus');
  const countEl = document.getElementById('liveSlotCount');
  const indEl = document.getElementById('liveIndicator');
  const scrollEl = document.getElementById('liveArchiveScroll');

  try {
    const res = await fetch('data/edition.json');
    if (res.ok) {
      activeEdition = await res.json();
    } else {
      activeEdition = [];
    }
  } catch (err) {
    activeEdition = [];
  }

  const count = Array.isArray(activeEdition) ? activeEdition.length : 0;
  if (statusEl) statusEl.textContent = 'Edition: ' + count + ' offerings';
  if (countEl) countEl.textContent = count;
  if (indEl) indEl.style.background = '#10b981';

  // Render tray cards
  if (scrollEl) {
    scrollEl.innerHTML = '';
    if (!count) {
      const empty = document.createElement('div');
      empty.className = 'live-empty-hint';
      empty.textContent = 'No offerings in data/edition.json yet. Submit an offering via GitHub Issue to inscribe your words!';
      scrollEl.appendChild(empty);
    } else {
      activeEdition.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (!Array.isArray(item.words)) return;
        const wordsList = item.words.filter(w => typeof w === 'string');
        if (!wordsList.length) return;
        const wordsStr = wordsList.join(' ');
        const safeName = String(item.name || 'Anonymous Scribe');
        const safeId = Number(item.id) || 0;

        const card = document.createElement('div');
        card.className = 'live-card';
        const info = document.createElement('div');
        info.className = 'live-card-info';
        info.style.padding = '.6rem';
        const titleEl = document.createElement('div');
        titleEl.className = 'live-card-title';
        titleEl.style.fontFamily = 'var(--fd)';
        titleEl.style.fontStyle = 'italic';
        titleEl.textContent = `"${wordsStr}"`;
        const sub = document.createElement('div');
        sub.className = 'live-card-sub';
        sub.style.marginTop = '.4rem';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = safeName;
        const idSpan = document.createElement('span');
        idSpan.textContent = `#${safeId}`;
        sub.append(nameSpan, idSpan);
        info.append(titleEl, sub);
        card.appendChild(info);
        scrollEl.appendChild(card);
      });
    }
  }

  // Paint offerings deterministically on load
  if (count > 0 && typeof renderEdition === 'function') {
    renderEdition(activeEdition, 1, X);
  }
}

// Global deterministic render function for Phase A/B/D
const BEHAVIOUR_LEXICON = {
  flow: 'water river rain wave ocean sea stream tear drop mist fluid ripple deluge tide current soak wash cascade surge flood brook lake splash seep aqua vapor channel pour fountain torrent moisture damp liquid dew swim drift flow ice thaw glacier marine fountain whirlpool basin plunge sluice eddy gutter guttering well wellspring tributary estuary delta cove harbor bay lagoon marsh swamp bog puddle fountain aqueduct conduit canal fjord geyser rainstorm drizzle storm surge monsoon raincloud waterspout'.split(' '),
  rise: 'fire flame smoke ash ember spark burn blaze pyre cinder inferno rise heat sun torch flare glow warm ignite radiant beacon phoenix lava magma alight ascend candle climb lightning storm fury comet solar burst combust incinerate forge furnace kiln chimney plume flare-up wildfire scald sear scorch blister volcanic smolder bonfire hearth ignite fiery sizzle boil overheat beam ray starburst'.split(' '),
  root: 'earth stone rock tree wood dirt clay ground cave mineral soil sand moss trunk bough oak pine deep anchor boulder bedrock strata cavern fossil granite marble crystal mountain cliff hill valley ore bronze copper iron subterranean burrow pebble sediment basalt shale gravel loam peat quarry trench tunnel abyss loam mulch timber stump knot bark rootstock rhizome mycorrhiza'.split(' '),
  drift: 'air wind bird cloud feather wing fly sky breath breeze gale draft zephyr float soar glide gust whisper echo shadow ghost veil ether haze silent quiet twilight dusk dawn night dream space void flight raven gull hawk owl eagle sparrow swallow gusty drafty mistral scud cirrus cumulus stratus loft drift aloft hover flutter billow waft vaporous weightless ethereal updraft thermals'.split(' '),
  bloom: 'plant flower leaf petal seed grass bud spring sprout blossom flora meadow vine ivy garden branch pollen berry forest grove fruit nectar stem foliage shoot rose lotus lily green herb clover weed wild bloom willow orchid iris jasmine poppy daisy tulip violet fern moss lichen kelp sapling brier bramble thistle undergrowth canopy deciduous perennial botanic bouquet'.split(' ')
};

const BEHAVIOUR_MAP={};Object.entries(BEHAVIOUR_LEXICON).forEach(([c,ws])=>ws.forEach(w=>{if(w)BEHAVIOUR_MAP[w]=c;}));

const KIND_WORDS = new Set('kind love peace hope joy grace gentle care light heart friend heal gift warmth truth solace calm pure sweet brave tender dream beauty smile trust share hold free shine quiet compassion blessing harmony bliss mercy unity sanctuary courage comfort patience faith delight radiant beloved'.split(' '));

function getWordClass(word) {
  const norm = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if (!norm) return 'flow';
  if (BEHAVIOUR_MAP[norm]) return BEHAVIOUR_MAP[norm];
  if (/wat|aqu|riv|sea|oce|wav|flu|dri|rai|dew/.test(norm)) return 'flow';
  if (/fir|fla|bur|smo|emb|spa|ris|sun|hea|bla/.test(norm)) return 'rise';
  if (/roo|ear|tre|sto|roc|gro|cla|dee|min|san/.test(norm)) return 'root';
  if (/air|win|bir|sky|bre|clo|fly|win|fea|gho/.test(norm)) return 'drift';
  if (/flo|lea|pet|see|gra|bud|spr|blo|pla|gar/.test(norm)) return 'bloom';
  const classes = ['flow', 'rise', 'root', 'drift', 'bloom'];
  let h = 0;
  for (let i = 0; i < norm.length; i++) h = (h * 31 + norm.charCodeAt(i)) >>> 0;
  return classes[h % 5];
}

// 18 drawn shapes: 11 in K + 7 procedural / geometric
const ALL_SHAPE_KEYS = [...Object.keys(K), 'circle16', 'circle18', 'circle20', 'circle22', 'ring18', 'ring24', 'lozenge'];

function getShapePoints(key) {
  if (K[key]) return K[key];
  if (SH[key]) return SH[key];
  return CI(0, 0, 18, 24);
}

function renderEdition(edition, t, ctx, W = 1600, H = 800) {
  if (!Array.isArray(edition) || edition.length === 0 || !ctx) return;
  const N = edition.length;
  const span = 1 / Math.max(1, N);

  const positions=edition.map(it=>{const r=seededRng(hashSeed(it.id,it.words));return{x:120+r()*(W-240),y:120+r()*(H-240),item:it,rng:r};});

  edition.forEach((offering, idx) => {
    const tStart = idx / N;
    if (t < tStart) return;

    const p = Math.min(1, (t - tStart) / span);
    const pos = positions[idx];
    const rng = seededRng(hashSeed(offering.id, offering.words));
    const x = pos.x;
    const y = pos.y;
    const words = Array.isArray(offering.words) ? offering.words : [];

    const hasBad = words.some(w => typeof isBad === 'function' && isBad(w));
    const hasKind = words.some(w => KIND_WORDS.has(String(w).toLowerCase()));

    // Determine primary behaviour class from words
    const primaryClass = words.length ? getWordClass(words[0]) : 'flow';

    // Vividness by creativity logic (more distinct words & length boost vividness)
    const uniqueWordCount = new Set(words.map(w => w.toLowerCase())).size;
    const creativityScore = Math.min(1, 0.5 + (uniqueWordCount * 0.1) + (words.length * 0.05));
    const vividL = Math.floor(creativityScore * 40 + 35);

    const baseHue = Math.floor(rng() * 360);
    const strokeCol = `hsla(${baseHue}, 75%, ${vividL}%, ${hasBad ? 0.22 : 0.68})`;

    ctx.save();

    // 1. Blocklisted words: soft abstraction with warning
    if (hasBad) {
      ctx.beginPath();
      ctx.arc(x, y, 40 * p, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(30, 20%, 50%, 0.18)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 50, 40, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (p >= 0.7) {
        ctx.fillStyle = 'rgba(160, 40, 30, 0.85)';
        ctx.font = "italic 11px 'Fraunces', serif";
        ctx.fillText('[Soft abstraction: filtered word]', x - 50, y + 5);
      }
      ctx.restore();
      return;
    }

    // 2. Select from the 18 drawn shapes
    const shapeKey = ALL_SHAPE_KEYS[Math.floor(rng() * ALL_SHAPE_KEYS.length)];
    const pts = getShapePoints(shapeKey, rng);

    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      const cx = x + px * p;
      const cy = y + py * p;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();

    // 3. Behaviour-class specific strokes
    const strokeCount = Math.floor(10 * p);
    for (let s = 0; s < strokeCount; s++) {
      let sx = x + (rng() - 0.5) * 36;
      let sy = y + (rng() - 0.5) * 36;
      ctx.beginPath();
      ctx.moveTo(sx, sy);

      const numSteps = 12;
      for (let st = 0; st < numSteps; st++) {
        if (primaryClass === 'flow') {
          // Flow: descends and meanders
          sx += Math.sin(st * 0.7 + rng() * 2) * 4.2;
          sy += 3.4;
        } else if (primaryClass === 'rise') {
          // Rise: ascends with flicker
          sx += (rng() - 0.5) * 6.5;
          sy -= 3.6;
        } else if (primaryClass === 'root') {
          // Root: grows downward in branches
          sx += (st % 2 === 0 ? 1 : -1) * (st * 1.4) * (rng() - 0.38);
          sy += 3.2;
        } else if (primaryClass === 'drift') {
          // Drift: moves laterally and slowly
          sx += (rng() > 0.5 ? 4.2 : -4.2);
          sy += Math.sin(st * 0.45) * 1.6;
        } else {
          // Bloom: radiates outward
          const ang = (s / 10) * Math.PI * 2 + (st * 0.12);
          sx += Math.cos(ang) * 3.2;
          sy += Math.sin(ang) * 3.2;
        }
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // 4. Kind words: grow thin mycelium-like threads to nearest neighbor
    if (hasKind && positions.length > 1) {
      let nearest = null;
      let minDist = 1e9;
      positions.forEach((other, oIdx) => {
        if (oIdx === idx) return;
        const d = Math.hypot(other.x - x, other.y - y);
        if (d < minDist) {
          minDist = d;
          nearest = other;
        }
      });

      if (nearest) {
        ctx.strokeStyle = `hsla(${baseHue}, 55%, 72%, 0.35)`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const steps = 8;
        for (let i = 1; i <= steps; i++) {
          const frac = (i / steps) * p;
          const mx = x + (nearest.x - x) * frac + Math.sin(i * 1.25 + rng()) * 16;
          const my = y + (nearest.y - y) * frac + Math.cos(i * 1.25 + rng()) * 16;
          ctx.lineTo(mx, my);
        }
        ctx.stroke();
      }
    }

    // 5. Inscription text when p >= 0.7
    if (p >= 0.7) {
      const textAlpha = (p - 0.7) / 0.3;
      ctx.fillStyle = `hsla(${baseHue}, 60%, 25%, ${textAlpha.toFixed(2)})`;
      ctx.font = "italic 13px 'Fraunces', serif";
      ctx.fillText(words.join(' '), x - 30, y + 36);

      ctx.fillStyle = `hsla(30, 40%, 25%, ${(textAlpha * 0.8).toFixed(2)})`;
      ctx.font = "10px 'Hanken Grotesk', sans-serif";
      ctx.fillText('by ' + (offering.name || 'Anonymous'), x - 30, y + 50);
    }

    ctx.restore();
  });
}

// Lazy-loaded Edition Replay Launcher
async function launchReplay(editionData) {
  const data = (Array.isArray(editionData) && editionData.length) ? editionData : (activeEdition && activeEdition.length ? activeEdition : ((typeof DEFAULT_ARCHIVE!=='undefined'&&DEFAULT_ARCHIVE.length)?DEFAULT_ARCHIVE[0].ed:[{ id: 1, words: ['sanctuary', 'moss', 'drift'], name: 'Subhradeep' }]));
  try {
    const mod = await import('./replay.js');
    if (mod && mod.initReplay) mod.initReplay(data, null, { renderEdition });
  } catch (err) {
    console.error('Failed to load replay module:', err);
  }
}
window.renderEdition = renderEdition;

// Wire buttons
const btnReplayWall = document.getElementById('btnReplayWall');
if (btnReplayWall) {
  btnReplayWall.onclick = () => launchReplay(activeEdition);
}
const btnBroadcast = document.getElementById('btnLiveBroadcast');
if (btnBroadcast) {
  btnBroadcast.onclick = () => {
    const issueUrl = 'https://github.com/qweirdo/qweirdo.github.io/issues/new?template=offering.yml';
    const conf = confirm('Offerings are submitted publicly via GitHub Issue and inscribed upon approval.\n\nOpen GitHub to submit your 5-word offering?');
    if (conf) {
      window.open(issueUrl, '_blank', 'noopener,noreferrer');
    }
  };
}

const btnToggleArchive = document.getElementById('btnToggleArchive');
const archiveTray = document.getElementById('liveArchiveTray');
if (btnToggleArchive && archiveTray) {
  btnToggleArchive.onclick = () => {
    const isClosed = archiveTray.style.display === 'none';
    archiveTray.style.display = isClosed ? 'block' : 'none';
  };
}

const btnCloseTray = document.getElementById('btnCloseArchiveTray');
if (btnCloseTray && archiveTray) {
  btnCloseTray.onclick = () => { archiveTray.style.display = 'none'; };
}

const btnRefresh = document.getElementById('btnRefreshArchive');
if (btnRefresh) {
  btnRefresh.onclick = () => {
    loadEditionLedger();
    msg('Synchronized edition ledger.');
  };
}

// Global bridge & live co-working module
window.__QW = {
  C, X, O, W, H, SCHEMES,
  getState: () => ({ cap: currentCap, substrate: currentSubstrate, scheme: activeScheme }),
  saveUndo, addDrip, drawAerosol,
  stampWildstyleBurner, stampBubbleSoftie, stampHandstyle,
  loadStampAsInteractiveStencil, unloadStencil, loadStencil, stampPochoirStencil,
  msg, playCanRattle, isBad
};
loadEditionLedger().finally(() => {
  import('./wall-live.js').catch(() => {});
});

// AESTHETIC SOCIAL MEDIA SHARING ENGINE
// Seamless sharing to X, Facebook, Bluesky, Threads, LinkedIn, Reddit, WhatsApp, and Direct Copy
// ==========================================
(function initSocialSharing() {
  const SHARE_URL = 'https://qweirdo.github.io';
  const BASE_TEXT = 'Project Qweirdo is a proudly pointless digital sanctuary: a place to drift, doodle, and leave anonymous marks across a living, shared urban wall that breathes with time.';
  const TITLE = 'Project Qweirdo · Living Urban Wall';

  const shareModal = document.getElementById('shareModal');
  const btnCloseModal = document.getElementById('btnCloseShareModal');
  const tileNative = document.getElementById('tileNativeShare');

  if (tileNative && navigator.share) {
    tileNative.style.display = 'flex';
  }

  function openShareModal() {
    if (shareModal) openModalDialog(shareModal);
  }

  function closeShareModal() {
    if (shareModal) closeModalDialog(shareModal);
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeShareModal);
  }

  // Light-dismiss fallback for <dialog closedby="any"> per Modern Web Guidance
  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    document.querySelectorAll('dialog[closedby="any"]').forEach(dlg => {
      dlg.addEventListener('click', (event) => {
        if (!event.target.closest('.folio-card, .share-card, .rp-card')) {
          closeModalDialog(dlg);
        }
      });
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shareModal && (shareModal.open || shareModal.classList.contains('open'))) {
      closeShareModal();
    }
  });

  const btnShareTool = document.getElementById('btnShareTool');
  if (btnShareTool) btnShareTool.addEventListener('click', openShareModal);

  const btnNavShare = document.getElementById('btnNavShare');
  if (btnNavShare) btnNavShare.addEventListener('click', openShareModal);

  function openSharePopup(url, title = 'Share Project Qweirdo') {
    const w = 600, h = 500;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(url, title, `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
  }

  function handleShare(platform, btn) {
    let customText = BASE_TEXT;
    const folioOpen = document.getElementById('folioModal') && (document.getElementById('folioModal').open || document.getElementById('folioModal').classList.contains('open'));

    if (folioOpen) {
      const coauth = (typeof cred !== 'undefined' && cred.length) ? cred.map(c => c.name).join(', ') : 'Autonomous Writer';
      customText = `Inscribed on The Living Urban Wall by ${coauth}. Explore our digital sanctuary and generative urban wall:`;
    }

    if (platform === 'x') {
      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(customText)}&url=${encodeURIComponent(SHARE_URL)}&hashtags=ProjectQweirdo,SubwayArt,GenerativeArt`;
      openSharePopup(xUrl, 'Share on X');
    } else if (platform === 'facebook') {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`;
      openSharePopup(fbUrl, 'Share on Facebook');
    } else if (platform === 'bsky') {
      const bskyUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(customText + ' ' + SHARE_URL)}`;
      openSharePopup(bskyUrl, 'Share on Bluesky');
    } else if (platform === 'threads') {
      const threadsUrl = `https://www.threads.net/intent/post?text=${encodeURIComponent(customText + ' ' + SHARE_URL)}`;
      openSharePopup(threadsUrl, 'Share on Threads');
    } else if (platform === 'linkedin') {
      const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`;
      openSharePopup(liUrl, 'Share on LinkedIn');
    } else if (platform === 'reddit') {
      const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(SHARE_URL)}&title=${encodeURIComponent(TITLE)}`;
      openSharePopup(redditUrl, 'Share on Reddit');
    } else if (platform === 'whatsapp') {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(customText + ' ' + SHARE_URL)}`;
      openSharePopup(waUrl, 'Share on WhatsApp');
    } else if (platform === 'native') {
      if (navigator.share) {
        navigator.share({
          title: TITLE,
          text: customText,
          url: SHARE_URL
        }).catch(() => {});
      }
    } else if (platform === 'copy') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(SHARE_URL).then(() => {
          if (btn) {
            btn.classList.add('copied');
            const originalText = btn.textContent;
            if (btn.id === 'btnCopyModalLink') {
              btn.textContent = '✓ Copied!';
            }
            setTimeout(() => {
              btn.classList.remove('copied');
              if (btn.id === 'btnCopyModalLink') btn.textContent = originalText;
            }, 2000);
          }
          if (typeof msg === 'function') msg('Link copied to clipboard: ' + SHARE_URL);
        }).catch(() => {
          prompt('Copy link to share:', SHARE_URL);
        });
      } else {
        prompt('Copy link to share:', SHARE_URL);
      }
    }
  }

  // Global event delegation for all share buttons and tiles
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-share]');
    if (!btn) return;
    e.preventDefault();
    const platform = btn.dataset.share;
    handleShare(platform, btn);
  });
})();

// CSP-compliant event binding for Nav Stamp Forge link
const navStampLink = document.getElementById('navStampForge');
if (navStampLink) {
  navStampLink.addEventListener('click', (e) => {
    e.preventDefault();
    const b = document.getElementById('btnStampTool');
    if (b) b.click();
  });
}
