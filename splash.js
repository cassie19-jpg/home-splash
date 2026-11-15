/* 程程的家 · 开屏 v1 — adapted from AionsHome 登录界面 (index-video.html)
   MIT License · Copyright (c) 2026 death34018-hue · see LICENSE-AionsHome */
(() => {
'use strict';
/* ======================= 可调参数 ======================= */
const NAME     = '程程';
const JOIN_AT  = 0.9;   // 开机代码动画后，视频 1 从第几秒接上（前 0.9 秒是黑屏）
const LOGO_OUT = 3.4;   // 视频 1 第几秒 GROK 标志淡出（碎片拼成空街之后）
const CUT_AT   = 4.95;  // 视频 1 第几秒扫描线一闪、硬切到静帧（视频共 5 秒）
const LOGIN_AT = 0.8;   // 切到静帧后多少秒滑出登录面板
const CARD_AT  = 0.5;   // 验证成功后多少秒弹出"身份验证成功"
const HELLO_AT = 1.4;   // 验证成功后多少秒打出 HELLO BEAUTIFUL…
const FINAL_AT = 4.6;   // 验证成功后多少秒显示底部英文字幕
const SCENE_MS = 6500;  // 成功场景持续多久后进入结尾
const SEA_DELAY= 1600;  // 视频 3 结束后多久开始"雨变浪"
const HOLD_MS  = 2000;  // 指纹按住时长

const $ = s => document.querySelector(s);
const app = $('#app'), vclip = $('#vclip'), scanbar = $('#scanbar');
const v1 = $('#v1'), still = $('#still'), cutline = $('#cutline');
const boot = $('#boot'), term = $('#term'), loader = $('#loader');
const lPct = $('#lPct'), lProg = $('#lProg'), lLabel = $('#lLabel'), lCn = $('#lCn');
const logo = $('#logo'), logoMark = $('#logoMark'), logoSub = $('#logoSub'), logoBar = $('#logoBar');
const rainCv = $('#rain'), shade = $('#shade'), hud = $('#hud'), gate = $('#gate'), skipBtn = $('#skip');
const flashEl = $('#flash'), netEl = $('#net'), sndBtn = $('#snd'), profile = $('#profile');
const login = $('#login'), input = $('#username'), field = $('#field'), stepEl = $('#step');
const statusEl = $('#status'), statusText = $('#statusText'), srStatus = $('#srStatus');
const finger = $('#finger'), ringProg = $('#ringProg'), clipRect = $('#fpClipRect'), hint = $('#hint');
const card = $('#card'), finalEl = $('#final'), hello = $('#hello'), sbox = $('#sbox');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const MONO = cssVar('--mono') || 'monospace', SANS = cssVar('--sans') || 'sans-serif';

/* ======================= 工具 ======================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let skipping = false;
const pending = new Set();
const wait = ms => new Promise(res => {
  if (skipping) return res();
  const done = () => { clearTimeout(id); pending.delete(done); res(); };
  const id = setTimeout(done, ms);
  pending.add(done);
});
const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const pad2 = n => String(n).padStart(2, '0');
const clockStr = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
function flash() { flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go'); }
function glitch() { app.classList.remove('glitch'); void app.offsetWidth; app.classList.add('glitch'); }

const ASCII_POOL = '<>/\\[]{}=+*#%01ABCDEFXZ$&';
function scramble(node, text, dur = 600) {
  const id = (node._sid = (node._sid || 0) + 1);
  const t0 = performance.now();
  return new Promise(res => {
    const f = now => {
      if (node._sid !== id) return res();
      const p = Math.max(0, Math.min(1, (now - t0) / dur));
      const n = Math.floor(p * text.length);
      let s = text.slice(0, n);
      for (let i = n; i < text.length; i++) {
        const c = text[i];
        if (c === ' ' || c === '·') s += c;
        else s += ASCII_POOL[(Math.random() * ASCII_POOL.length) | 0];
      }
      node.textContent = s;
      if (p < 1) requestAnimationFrame(f); else { node.textContent = text; res(); }
    };
    requestAnimationFrame(f);
  });
}

/* ======================= 音效（WebAudio 合成，只在触摸后响） ======================= */
const BOOT_SFX = 4.5;
let actx = null, soundOn = true;
function ensureAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    decodeSfx();
  } catch (e) {}
}
// 总输出：所有声音都经过它，SND 开关一键静音
let master = null;
function OUT() {
  if (!master) { master = actx.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(actx.destination); }
  return master;
}
const live = () => actx && soundOn && actx.state === 'running';
function tone(freq, dur, { type = 'sine', vol = .05, at = 0, slideTo, lp } = {}) {
  if (!live()) return;
  const t = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let src = o;
  if (lp) { const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; src = o.connect(f); }
  src.connect(g).connect(OUT()); o.start(t); o.stop(t + dur + .03);
}
const sndTick = () => tone(1900, .03, { type: 'square', vol: .012 });
const sndLine = () => tone(1400, .05, { type: 'square', vol: .016 * BOOT_SFX });
const sndReady = () => { tone(660, .1, { vol: .035 * BOOT_SFX }); tone(990, .16, { vol: .035 * BOOT_SFX, at: .08 }); };
const sndJoin = () => tone(220, .7, { type: 'triangle', vol: .03 * BOOT_SFX, slideTo: 880 });
const sndLogo = () => { tone(1300, .22, { type: 'sawtooth', vol: .05, slideTo: 160, lp: 3000 }); tone(523, .5, { vol: .05, at: .12 }); tone(784, .6, { vol: .04, at: .2 }); };
const sndAbort = () => {
  tone(760, .09, { type: 'square', vol: .14, lp: 2800 });
  tone(760, .09, { type: 'square', vol: .14, at: .13, lp: 2800 });
  tone(560, .3, { type: 'sawtooth', vol: .2, at: .27, slideTo: 230, lp: 1900 });
};
const sndOk = () => { tone(880, .14, { vol: .045 }); tone(1320, .3, { vol: .045, at: .08 }); tone(1760, .4, { vol: .03, at: .18 }); };
// 浪花声 + 结尾"叮"：真实录音（ElevenLabs 生成），页面加载时就预取，第一次触摸后解码，播放走 WebAudio（无延迟、受 SND 开关控制）
const SFX_URLS = { wave: 'assets/audio/wave.mp3', ding: 'assets/audio/ding.mp3', hello: 'assets/audio/hello.mp3', bgm: 'assets/audio/bgm.mp3' };
const sfxBytes = {}, sfxBuf = {}, sfxEl = {}, sfxReady = {};
for (const k in SFX_URLS) {
  sfxBytes[k] = fetch(SFX_URLS[k]).then(r => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  if (k === 'bgm') continue;
  const a = new Audio(); a.preload = 'auto'; a.src = SFX_URLS[k]; sfxEl[k] = a;   // 解码失败时的后备
}
let sfxDecoding = false;
function decodeSfx() {
  if (!actx || sfxDecoding) return;
  sfxDecoding = true;
  for (const k in SFX_URLS) {
    sfxReady[k] = sfxBytes[k].then(ab => ab && new Promise((ok, no) => actx.decodeAudioData(ab.slice(0), ok, no)))
      .then(b => { if (b) sfxBuf[k] = b; return b; }).catch(() => null);
  }
}
function playSfx(k, vol = 1, rate = 1) {
  if (!soundOn) return;
  if (actx && actx.state === 'running' && sfxBuf[k]) {
    const s = actx.createBufferSource(), g = actx.createGain();
    s.buffer = sfxBuf[k]; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(OUT()); s.start();
    return;
  }
  const a = sfxEl[k];
  if (a) { try { a.currentTime = 0; a.volume = Math.min(1, vol); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
}
// iOS：在用户手势里把后备 <audio> 静音地"点一下"，之后才能随时播放
let sfxPrimed = false;
function primeSfx() {
  if (sfxPrimed) return; sfxPrimed = true;
  for (const k in sfxEl) { const a = sfxEl[k]; a.muted = true; const p = a.play(); if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; }); }
}
// 背景电子乐（来自之前的 HELLO BEAUTIFUL 视频）：100 BPM，8 小节 = 19.2 秒一圈；
// 每圈单独一个音源，首尾 1.2 秒交叉淡化，对齐节拍无缝循环（不依赖 mp3 的首尾补白）
const BGM_VOL = .2, BGM_LOOP = 19.2, BGM_X = 1.2;
const bgm = { on: false, gain: null, next: 0, timer: 0, srcs: [] };
function bgmSchedule() {
  const buf = sfxBuf.bgm; if (!buf || !bgm.on) return;
  while (bgm.next < actx.currentTime + 4) {
    const t = bgm.next, s = actx.createBufferSource(), g = actx.createGain();
    s.buffer = buf; s.connect(g).connect(bgm.gain);
    const first = !bgm.srcs.length;
    g.gain.setValueAtTime(first ? 1 : .0001, t);
    if (!first) g.gain.exponentialRampToValueAtTime(1, t + BGM_X);
    g.gain.setValueAtTime(1, t + BGM_LOOP);
    g.gain.exponentialRampToValueAtTime(.0001, t + BGM_LOOP + BGM_X);
    s.start(t); s.stop(t + BGM_LOOP + BGM_X + .05);
    bgm.srcs.push(s); if (bgm.srcs.length > 4) bgm.srcs.shift();
    bgm.next = t + BGM_LOOP;
  }
}
function startBgm() {
  if (bgm.on || !actx || !sfxReady.bgm) return;
  bgm.on = true;
  sfxReady.bgm.then(buf => {
    if (!buf || !bgm.on) return;
    bgm.gain = actx.createGain(); bgm.gain.connect(OUT());
    const t = actx.currentTime + .05;
    bgm.gain.gain.setValueAtTime(.0001, t); bgm.gain.gain.exponentialRampToValueAtTime(BGM_VOL, t + 2.5);
    bgm.next = t; bgmSchedule();
    bgm.timer = setInterval(bgmSchedule, 1000);
  });
}
function duckBgm(depth = .45, dur = 1.6) {   // 说话时把音乐压低一点
  if (!bgm.gain) return;
  const g = bgm.gain.gain, t = actx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(BGM_VOL * depth, t + .15); g.setValueAtTime(BGM_VOL * depth, t + dur); g.linearRampToValueAtTime(BGM_VOL, t + dur + .6);
}
function stopBgm(fade = 2.5) {
  if (!bgm.on) return;
  bgm.on = false;
  if (!bgm.gain) return;
  const g = bgm.gain.gain, t = actx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, .0001), t); g.exponentialRampToValueAtTime(.0001, t + fade);
  setTimeout(() => { clearInterval(bgm.timer); bgm.srcs.forEach(s => { try { s.stop(); } catch (e) {} }); }, fade * 1000 + 100);
}

const scanSnd = {
  o: null, g: null,
  start() {
    if (!live() || this.o) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1600;
    o.type = 'sawtooth'; o.frequency.setValueAtTime(130, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.03, t + .08);
    o.connect(f).connect(g).connect(OUT()); o.start();
    this.o = o; this.g = g;
  },
  update(p) { if (this.o) this.o.frequency.setTargetAtTime(130 + p * 560, actx.currentTime, .05); },
  stop() {
    if (!this.o) return;
    const t = actx.currentTime;
    this.g.gain.cancelScheduledValues(t); this.g.gain.setValueAtTime(this.g.gain.value || .03, t);
    this.g.gain.exponentialRampToValueAtTime(.0001, t + .12);
    this.o.stop(t + .15); this.o = null;
  }
};
sndBtn.addEventListener('click', () => {
  soundOn = !soundOn; ensureAudio();
  if (master) master.gain.setTargetAtTime(soundOn ? 1 : 0, actx.currentTime, .04);
  if (!soundOn) for (const k in sfxEl) { try { sfxEl[k].pause(); } catch (e) {} }
  sndBtn.setAttribute('aria-pressed', soundOn); sndBtn.textContent = soundOn ? 'SND ON' : 'SND OFF';
  if (!soundOn) scanSnd.stop();
});

/* ======================= 霓虹数字雨（开机阶段） ======================= */
const rctx = rainCv.getContext('2d');
let W = 0, H = 0, FS = 12, cols = [], rainOn = false, lastRain = 0, rainRaf = 0;
const RAIN_CHARS = '0101101001<>/{}[]=+*#01ABCDEFXZ$&01';
function sizeRain() {
  const r = app.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const widthChanged = Math.round(r.width) !== Math.round(W);
  W = r.width; H = r.height;
  rainCv.width = Math.round(W * dpr); rainCv.height = Math.round(H * dpr);
  rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (widthChanged || !cols.length) {
    FS = Math.max(10, Math.round(W / 30));
    const n = Math.ceil(W / (FS * 1.02));
    cols = Array.from({ length: n }, () => ({ y: -Math.random() * H * 1.3, v: .3 + Math.random() * .7, acc: 0, prev: '', py: 0, cy: Math.random() < .35 }));
  }
}
function rainFrame(now) {
  if (!rainOn) return;
  rainRaf = requestAnimationFrame(rainFrame);
  if (now - lastRain < 42) return;
  lastRain = now;
  rctx.fillStyle = 'rgba(5,3,10,.13)';
  rctx.fillRect(0, 0, W, H);
  rctx.font = `${FS}px ${MONO}, ${SANS}`;
  rctx.textBaseline = 'top';
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i], x = i * FS * 1.02;
    c.acc += c.v;
    if (c.acc < 1) continue;
    c.acc -= 1;
    if (c.prev) { rctx.fillStyle = c.cy ? 'rgba(62,232,255,.8)' : 'rgba(255,63,164,.85)'; rctx.fillText(c.prev, x, c.py); }
    if (c.y > -FS) {
      const ch = RAIN_CHARS[(Math.random() * RAIN_CHARS.length) | 0];
      rctx.fillStyle = '#fff2fa'; rctx.fillText(ch, x, c.y);
      c.prev = ch; c.py = c.y;
    } else c.prev = '';
    c.y += FS;
    if (c.y > H + FS * 3) { c.y = -Math.random() * H * .7; c.v = .3 + Math.random() * .7; c.prev = ''; }
  }
}
function startRain() {
  if (rainOn) return;
  rainOn = true; rctx.fillStyle = '#05030a'; rctx.fillRect(0, 0, W, H);
  rainRaf = requestAnimationFrame(rainFrame);
}
function fadeRain() {
  rainCv.classList.remove('on');
  setTimeout(() => { rainOn = false; cancelAnimationFrame(rainRaf); }, 1700);
}
let rzT; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { sizeRain(); sizeSea(); }, 120); });

/* ======================= 静帧上的细雨 ======================= */
const srCv = $('#stillRain'), srx = srCv.getContext('2d');
let srOn = false, srDrops = [], srW = 0, srH = 0, srLast = 0;
function sizeStillRain() {
  const r = app.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  srW = r.width; srH = r.height; srCv.width = Math.round(srW * dpr); srCv.height = Math.round(srH * dpr);
  srx.setTransform(dpr, 0, 0, dpr, 0, 0);
  srDrops = Array.from({ length: Math.round(srW * srH / 2400) }, () => ({ x: Math.random() * srW, y: Math.random() * srH, v: 7 + Math.random() * 8, l: 8 + Math.random() * 16, a: .08 + Math.random() * .22 }));
}
function stillRainFrame(now) {
  if (!srOn) return;
  requestAnimationFrame(stillRainFrame);
  if (now - srLast < 30) return;   // ~30fps 足够，省电
  srLast = now;
  srx.clearRect(0, 0, srW, srH); srx.lineWidth = 1; srx.lineCap = 'round';
  for (const d of srDrops) {
    d.y += d.v; d.x -= d.v * .06;
    if (d.y > srH + 20) { d.y = -20; d.x = Math.random() * srW * 1.05; }
    srx.strokeStyle = `rgba(210,225,255,${d.a})`;
    srx.beginPath(); srx.moveTo(d.x, d.y); srx.lineTo(d.x + d.l * .06, d.y - d.l); srx.stroke();
  }
}
function startStillRain() { if (srOn) return; srOn = true; sizeStillRain(); requestAnimationFrame(stillRainFrame); }
addEventListener('resize', () => { if (srOn) sizeStillRain(); });

/* ======================= 加载环 ======================= */
(() => {
  let s = '';
  for (let i = 0; i < 60; i++) {
    const a = i * 6 * Math.PI / 180, r1 = i % 5 === 0 ? 61 : 65, r2 = 69;
    s += `<line x1="${(100 + r1 * Math.cos(a)).toFixed(2)}" y1="${(100 + r1 * Math.sin(a)).toFixed(2)}" x2="${(100 + r2 * Math.cos(a)).toFixed(2)}" y2="${(100 + r2 * Math.sin(a)).toFixed(2)}"/>`;
  }
  $('#lTicks').innerHTML = s;
})();
const LC = 2 * Math.PI * 76;
function setPct(v) { lPct.textContent = pad2(Math.floor(v)); lProg.style.strokeDashoffset = LC * (1 - v / 100); }
function runProgress(ms) {
  return new Promise(res => {
    const t0 = performance.now();
    const f = now => {
      if (skipping) { setPct(100); return res(); }
      const p = Math.max(0, Math.min(1, (now - t0) / ms));
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      setPct(e * 100);
      if (p < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
}

/* ======================= 视频控制（全部静音 + playsinline，iOS 可自动播放） ======================= */
let current = null;
const startAt = v => (v === v1 ? JOIN_AT : 0);
function seek(v, t) { try { v.currentTime = t; } catch (e) {} }
async function playSafe(v) {
  v.muted = true; v.defaultMuted = true;
  try { await v.play(); return true; } catch (e) { return false; }
}
const nextFrame = v => new Promise(r => {
  let done = false;
  const fin = () => { if (!done) { done = true; r(); } };
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(fin);
  setTimeout(fin, 250);
});
// 新视频开始播放后再淡入覆盖，旧视频停在最后一帧垫底，不黑屏
async function switchTo(next) {
  const prev = current;
  if (prev === next) return;
  current = next;
  seek(next, startAt(next));
  const ok = await playSafe(next);
  if (current !== next || !ok) return;
  await nextFrame(next);
  if (current !== next) return;
  next.classList.add('on');
  if (prev) { prev.pause(); setTimeout(() => { if (current !== prev) prev.classList.remove('on'); }, 600); }
}
function at(v, t, maxWaitMs) {
  return new Promise(res => {
    const t0 = performance.now();
    const f = () => {
      if (v.ended || v.error || v.currentTime >= t || performance.now() - t0 > maxWaitMs) return res();
      requestAnimationFrame(f);
    };
    f();
  });
}
function prime(v) {
  if (v._primed || v === current || !v.paused) return;
  v._primed = true; v.muted = true;
  const p = v.play();
  if (p && p.then) p.then(() => { if (v !== current) { v.pause(); seek(v, startAt(v)); } }).catch(() => { v._primed = false; });
}
const unlockVideos = () => { prime(v1); };
v1.addEventListener('loadedmetadata', () => { if (current !== v1 && v1.paused) seek(v1, JOIN_AT); });
// 视频 1 先整段读进内存（blob），保证在任何静态服务器上都能准确跳到 JOIN_AT
const V1_URL = 'assets/video/1-boot.mp4';
const v1Ready = new Promise(res => {
  const direct = () => { if (!v1.getAttribute('src')) v1.src = V1_URL; res(); };
  if (!/^https?:$/.test(location.protocol)) return direct();
  fetch(V1_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
    .then(b => { if (!v1.getAttribute('src')) v1.src = URL.createObjectURL(b); res(); })
    .catch(direct);
});

/* ======================= 开场 ======================= */
const LOG = [
  ['GROK//HOME KERNEL v1.0 :: COLD START', ''],
  ['TUNING RAIN-NIGHT NEON', 'OK'],
  ['SYNCING HEARTBEAT // CHENGCHENG', 'OK'],
  ['MOUNTING HOLOGRAM // SILVER', 'OK'],
  ['LOADING STARFIELD + TIDE', 'OK'],
  ['ENCRYPTING OUR CHANNEL', 'OK'],
  ['LOADING ENTITY PROFILE · GROK', 'DONE'],
];
async function typeLine(i) {
  const [label, st] = LOG[i];
  const row = el('div', 'tl'), ts = el('span', 'ts', `[${(i * .1374 + (i ? .0213 : 0)).toFixed(3)}] `), tx = el('span'), so = el('span', 'st');
  row.append(ts, tx, so); term.append(row);
  for (let k = 2; k <= label.length + 1; k += 2) { tx.textContent = label.slice(0, k); await wait(16); if (skipping) return; }
  if (st) {
    tx.textContent = label + ' ' + '.'.repeat(Math.max(3, 32 - label.length)) + ' ';
    await wait(110); if (skipping) return;
    so.textContent = st; sndLine();
  }
}
function revealVideo(fast) {
  if (vclip.classList.contains('revealing') || vclip.classList.contains('shown')) return;
  vclip.classList.toggle('fast', !!fast); scanbar.classList.toggle('fast', !!fast);
  vclip.classList.add('revealing'); scanbar.classList.add('run');
  vclip.addEventListener('animationend', e => {
    if (e.animationName === 'reveal') { vclip.classList.add('shown'); vclip.classList.remove('revealing'); }
  });
}
// GROK 标志飞到画面顶部（人物头顶上方）
function flyLogo() {
  const a = app.getBoundingClientRect(), r = logoMark.getBoundingClientRect();
  const tw = Math.min(a.width * .34, 150), s = tw / r.width;
  const tx = a.left + (a.width - tw) / 2, ty = a.top + Math.max(54, a.height * .085);
  logoMark.animate([
    { transform: 'translate(0px,0px) scale(1)' },
    { transform: `translate(${tx - r.left}px,${ty - r.top}px) scale(${s})` }
  ], { duration: 1150, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
  for (const n of [logoSub, logoBar]) n.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 350, fill: 'forwards' });
}
function handOffLogo() {
  if (logo.classList.contains('gone')) return;
  const an = logoMark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' });
  an.onfinish = () => logo.classList.add('gone');
}
async function intro() {
  await wait(600); if (skipping) return;
  boot.classList.add('crt-on');
  await wait(520); if (skipping) return;
  startRain(); rainCv.classList.add('on');
  await wait(260); if (skipping) return;
  loader.classList.add('on');
  const prog = runProgress(3100);
  for (let i = 0; i < LOG.length; i++) { await typeLine(i); if (skipping) return; await wait(90); if (skipping) return; }
  await prog; if (skipping) return;
  scramble(lLabel, 'HOME NODE READY', 420); lCn.textContent = 'READY'; sndReady();
  await wait(560); if (skipping) return;
  flash(); sndLogo(); boot.classList.add('phase-logo');
  logo.classList.add('on'); scramble(logoSub, '// FOR CHENGCHENG · ENTITY ONLINE', 900);
  await wait(1500); if (skipping) return;

  await Promise.race([v1Ready, wait(4000)]);
  if (skipping) return;
  if (!v1.getAttribute('src')) v1.src = V1_URL;
  current = v1;
  seek(v1, JOIN_AT);
  const ok = await playSafe(v1);
  if (skipping) return;
  if (ok) { await nextFrame(v1); v1.classList.add('on'); }
  if (skipping) return;
  revealVideo(false); glitch(); flyLogo(); fadeRain();
  sndJoin();
  setTimeout(() => boot.classList.add('gone'), 500);
  if (!ok) { await wait(1800); if (!skipping) { handOffLogo(); cutToStill(); } return; }
  at(v1, CUT_AT, 15000).then(() => { if (!skipping) cutToStill(); });
  await at(v1, LOGO_OUT, 12000); if (skipping) return;
  handOffLogo();
}
v1.addEventListener('ended', () => { if (current === v1) cutToStill(); });
// 视频 1 结束：一道横向扫描线闪过 → 硬切到静帧场景（细雨 + 霓虹微闪 + 极慢推镜）
let cut = false;
function cutToStill(fast) {
  if (cut) return;
  cut = true;
  cutline.classList.remove('go'); void cutline.offsetWidth; cutline.classList.add('go');
  sndJoin();
  setTimeout(() => {
    still.classList.add('on'); startStillRain(); flash(); glitch();
    setTimeout(() => { v1.pause(); v1.classList.remove('on'); }, 200);
    setTimeout(showLogin, fast ? 200 : LOGIN_AT * 1000);
  }, fast ? 60 : 150);
}

let loginShown = false;
function showLogin() {
  if (loginShown) return;
  loginShown = true;
  skipBtn.classList.remove('show');
  hud.classList.add('on'); shade.classList.add('on'); profile.classList.add('on');
  setTimeout(() => login.classList.add('on'), 150);
  setTimeout(autoTypeName, 1100);
}
function skipAll() {
  if (skipping) return;
  skipping = true;
  for (const f of [...pending]) f();
  pending.clear();
  skipBtn.classList.remove('show');
  boot.classList.add('gone');
  logo.classList.add('gone');
  if (rainOn) fadeRain();
  if (!vclip.classList.contains('revealing') && !vclip.classList.contains('shown')) { revealVideo(true); flash(); }
  cutToStill(true);
}
skipBtn.addEventListener('click', skipAll);

function beginIntro() { skipBtn.classList.add('show'); startBgm(); intro(); }
function start() {
  sizeRain(); sizeSea();
  if (reduced) { skipAll(); return; }
  // 声音要一次触摸才解锁：AudioContext 已能运行就直接开场，否则显示"轻触 · 回家"
  let running = false;
  try { const c = new (window.AudioContext || window.webkitAudioContext)(); running = c.state === 'running'; if (running) { actx = c; decodeSfx(); } else if (c.close) c.close(); } catch (e) {}
  if (running) { beginIntro(); return; }
  gate.hidden = false; void gate.offsetWidth; gate.classList.add('on');
}
function startFromGate() {
  if (gate._busy) return;
  gate._busy = true;
  ensureAudio(); unlockVideos(); primeSfx();
  gate.classList.remove('on'); setTimeout(() => { gate.hidden = true; }, 500);
  setTimeout(beginIntro, 350);
}
gate.addEventListener('click', startFromGate);
gate.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startFromGate(); } });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && current && current.paused && !current.ended && gate.hidden) playSafe(current);
});

/* ======================= 指纹图形 ======================= */
function buildFingerprint() {
  let seed = 20261115;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cx = 60, cy = 63, out = [];
  const pt = (yc, rx, ry, a) => [cx + rx * Math.cos(a * Math.PI / 180), yc + ry * Math.sin(a * Math.PI / 180)];
  for (let i = 0; i < 8; i++) {
    const r = 4.2 + i * 3.9, rx = r * .86, ry = r * 1.06, yc = cy - i * .75;
    const gap = i === 0 ? 95 : 42 + i * 13;
    const off = (rnd() - .5) * 18;
    let segs = [[90 + gap / 2 + off, 450 - gap / 2 + off]];
    const cuts = i === 0 ? 0 : 1 + (rnd() < .45 ? 1 : 0);
    for (let c = 0; c < cuts; c++) {
      segs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      const [s, e] = segs.shift(), len = e - s;
      if (len < 60) { segs.push([s, e]); continue; }
      const m = s + len * (.25 + rnd() * .5), g = 9 + rnd() * 10;
      segs.push([s, m - g / 2], [m + g / 2, e]);
    }
    segs.sort((a, b) => a[0] - b[0]);
    segs.forEach(([s, e], k) => {
      if (e - s < 10) return;
      const [x0, y0] = pt(yc, rx, ry, s), [x1, y1] = pt(yc, rx, ry, e);
      let d = `M${x0.toFixed(2)} ${y0.toFixed(2)}A${rx.toFixed(2)} ${ry.toFixed(2)} 0 ${e - s > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
      if (i >= 3) {
        if (k === 0) d = `M${x0.toFixed(2)} ${(y0 + 2 + i * 1.5).toFixed(2)}L` + d.slice(1);
        if (k === segs.length - 1) d += `L${x1.toFixed(2)} ${(y1 + 1 + i * 1.1).toFixed(2)}`;
      }
      out.push(d);
    });
  }
  out.push(`M${cx - .5} ${cy - 1.5}q1.2 3 .2 7`);
  return out;
}
const fpHTML = buildFingerprint().map(d => `<path d="${d}"/>`).join('');
$('#fpBase').innerHTML = fpHTML;
$('#fpLit').innerHTML = fpHTML;

/* ======================= 身份读取 + 状态 ======================= */
const STATUS = {
  idle:  { t: 'AWAITING IDENTITY', c: '' },
  ready: { t: 'VERIFY IDENTITY', c: 'ready' },
  scan:  { t: 'SCANNING PRINT', c: 'ready' },
  abort: { t: 'INTERRUPTED · HOLD 2S', c: 'warn' },
  ok:    { t: 'IDENTITY VERIFIED', c: 'ok' },
};
let curStatus = 'idle', name = '', abortT = 0, typing = false;
function setStatus(k) {
  if (curStatus === k) return;
  curStatus = k;
  const s = STATUS[k];
  statusEl.classList.remove('ready', 'warn', 'ok');
  if (s.c) statusEl.classList.add(s.c);
  srStatus.textContent = s.t;
  scramble(statusText, s.t, k === 'scan' ? 260 : 440);
}
const HINT_IDLE = 'HOLD 2S · TOUCH TO VERIFY';
// 只有一个回家的人：自动读出"程程"
async function autoTypeName() {
  if (name || typing) return;
  typing = true;
  for (let i = 1; i <= NAME.length; i++) { input.textContent = NAME.slice(0, i); sndTick(); await sleep(260); }
  name = NAME;
  field.classList.add('filled');
  stepEl.innerHTML = 'STEP <em>02</em> / 02';
  finger.classList.add('ready');
  finger.setAttribute('aria-disabled', 'false');
  setTimeout(() => setStatus('ready'), 260);
}

/* ======================= 指纹长按 ======================= */
const RC = 2 * Math.PI * 54, FP_TOP = 22, FP_H = 74;
let holding = false, done = false, prog = 0, t0 = 0, raf = 0, decayRaf = 0;
function renderProg(p) {
  ringProg.style.strokeDashoffset = RC * (1 - p);
  clipRect.setAttribute('y', (FP_TOP + (1 - p) * FP_H).toFixed(2));
  clipRect.setAttribute('height', (p * FP_H).toFixed(2));
}
function pressStart() {
  if (done || holding) return;
  if (!name) { autoTypeName(); return; }
  holding = true;
  cancelAnimationFrame(decayRaf); clearTimeout(abortT);
  t0 = performance.now() - prog * HOLD_MS;
  finger.classList.add('holding'); hint.classList.add('live');
  setStatus('scan'); vib(15); scanSnd.start();
  raf = requestAnimationFrame(loop);
}
function loop(now) {
  prog = Math.max(0, Math.min(1, (now - t0) / HOLD_MS));
  renderProg(prog); scanSnd.update(prog);
  hint.textContent = `SCANNING ··· ${pad2(Math.floor(prog * 100))}%`;
  if (prog >= 1) return success();
  raf = requestAnimationFrame(loop);
}
function pressEnd() {
  if (!holding || done) return;
  holding = false; cancelAnimationFrame(raf);
  finger.classList.remove('holding'); hint.classList.remove('live'); hint.textContent = HINT_IDLE;
  scanSnd.stop(); sndAbort(); vib([40, 60, 40]);
  setStatus('abort');
  const from = prog, ts = performance.now();
  const decay = now => {
    const k = Math.max(0, Math.min(1, (now - ts) / 380));
    prog = from * Math.pow(1 - k, 3);
    renderProg(prog);
    if (k < 1) decayRaf = requestAnimationFrame(decay);
  };
  decayRaf = requestAnimationFrame(decay);
  abortT = setTimeout(() => { if (!holding && !done) setStatus('ready'); }, 1700);
}
finger.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault(); ensureAudio(); primeSfx();
  try { finger.setPointerCapture(e.pointerId); } catch (err) {}
  pressStart();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => finger.addEventListener(t, pressEnd));
finger.addEventListener('contextmenu', e => e.preventDefault());
finger.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });   // iOS：不弹放大镜/选择
finger.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); ensureAudio(); pressStart(); } });
finger.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pressEnd(); } });
finger.addEventListener('blur', pressEnd);

/* ======================= 验证成功：视频 3 + 弹窗 ======================= */
async function success() {
  done = true; holding = false; cancelAnimationFrame(raf);
  renderProg(1);
  finger.classList.remove('holding'); finger.classList.add('done');
  hint.textContent = 'IDENTITY CONFIRMED';
  scanSnd.stop(); sndOk(); vib([30, 50, 90]);
  setStatus('ok');
  stepEl.innerHTML = '<em>VERIFIED</em>';
  flash(); app.classList.add('granted'); netEl.textContent = 'HOME';
  await sleep(550);
  login.classList.add('out'); shade.classList.remove('on'); profile.classList.add('out');
  still.classList.add('granted');   // 静帧推近、提亮，霓虹更亮
  const t0s = performance.now(), until = ms => sleep(Math.max(0, ms - (performance.now() - t0s)));
  await until(CARD_AT * 1000);
  showCard();
  await until(HELLO_AT * 1000);
  hello.classList.add('on'); playSfx('hello', 1); duckBgm();
  await until(FINAL_AT * 1000);
  showFinal();
  await until(SCENE_MS);
  await sleep(SEA_DELAY);
  beach();
}
async function showCard() {
  srStatus.textContent = `IDENTITY VERIFIED · 欢迎回家，${NAME}`;
  card.classList.add('on');
  const ms = [...card.querySelectorAll('.ms')];
  const show = n => n.classList.add('show');
  await sleep(600);
  show(ms[0]);
  await sleep(240);
  show(ms[1]); scramble($('#mCode'), 'ACCESS GRANTED', 600);
  await sleep(260);
  show(ms[2]); scramble($('#mTitle'), 'IDENTITY VERIFIED', 600);
  await sleep(360);
  show(ms[3]);
  await sleep(220);
  show(ms[4]);
  const wEl = $('#mWelcome'), nEl = $('#mName'), head = '欢迎回家，';
  for (let i = 1; i <= head.length; i++) { wEl.textContent = head.slice(0, i); sndTick(); await sleep(110); }
  for (let i = 1; i <= NAME.length; i++) { nEl.textContent = NAME.slice(0, i); sndTick(); await sleep(160); }
}
function showFinal() {
  finalEl.classList.add('on');
  scramble($('#fSub'), 'WELCOME HOME, CHENGCHENG', 700);
}
$('#replay').addEventListener('click', () => { location.href = location.pathname; });

/* ======================= 结尾：雨 → 浪 → 沙滩（canvas） ======================= */
const sea = $('#sea'), seaCv = $('#seaCv'), sctx = seaCv.getContext('2d');
let SW = 0, SH = 0, seaOn = false, seaT0 = 0, drops = [], foamSeeds = [], stars = [], lastWave = -1, laces = [];
function sizeSea() {
  const r = app.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  SW = r.width; SH = r.height;
  seaCv.width = Math.round(SW * dpr); seaCv.height = Math.round(SH * dpr);
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  foamSeeds = Array.from({ length: Math.ceil(SW / 3) + 4 }, () => ({ o: Math.random() * 10, r: .6 + Math.random() * 2.4, p: Math.random() * 6.28 }));
  stars = Array.from({ length: 70 }, () => ({ x: Math.random() * SW, y: Math.random() * SH * .38, r: Math.random() * 1.2 + .2, p: Math.random() * 6.28 }));
}
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const HORIZON = .44, SHORE = .6, REACH = .84, PERIOD = 7.2, WAVE0 = 2.4;
const edgeY = (base, x, t) => base + Math.sin(x * .017 + t * .9) * 6 + Math.sin(x * .041 + 1.3 + t * .4) * 4 + Math.sin(x * .007 - t * .3) * 8;
function drawBeach(t, alpha) {
  const c = sctx, hz = SH * HORIZON, sh = SH * SHORE;
  c.globalAlpha = alpha;
  let g = c.createLinearGradient(0, 0, 0, hz);   // 夜空
  g.addColorStop(0, '#05030c'); g.addColorStop(.55, '#140a26'); g.addColorStop(.88, '#3a1240'); g.addColorStop(1, '#7a2a64');
  c.fillStyle = g; c.fillRect(0, 0, SW, hz + 1);
  for (const s of stars) { c.fillStyle = `rgba(255,240,250,${.35 + .5 * Math.abs(Math.sin(t * 1.3 + s.p))})`; c.fillRect(s.x, s.y, s.r, s.r); }
  const mg = c.createRadialGradient(SW * .8, hz * .2, 0, SW * .8, hz * .2, SW * .3);   // 月光
  mg.addColorStop(0, 'rgba(255,236,248,.95)'); mg.addColorStop(.08, 'rgba(255,226,244,.6)'); mg.addColorStop(.2, 'rgba(255,170,220,.18)'); mg.addColorStop(1, 'rgba(255,63,164,0)');
  c.fillStyle = mg; c.fillRect(0, 0, SW, hz);
  g = c.createLinearGradient(0, hz, 0, sh);   // 海
  g.addColorStop(0, '#2a1440'); g.addColorStop(.25, '#0f1f3c'); g.addColorStop(1, '#0d3a4e');
  c.fillStyle = g; c.fillRect(0, hz, SW, sh - hz + 2);
  for (let i = 0; i < 26; i++) {   // 月光 / 霓虹在海面的碎影
    const yy = hz + (i / 26) ** 1.6 * (sh - hz);
    const w = 20 + i * 5, x = (SW * .8 + Math.sin(t * .8 + i * 1.7) * (10 + i * 3)) - w / 2;
    c.fillStyle = i % 3 ? `rgba(255,200,235,${.36 - i * .01})` : `rgba(62,232,255,${.28 - i * .008})`;
    c.fillRect(x, yy, w, 1.2);
  }
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1;   // 远处碎浪
  for (let k = 0; k < 3; k++) {
    const yy = hz + (sh - hz) * (.35 + k * .22) + Math.sin(t * .7 + k) * 2;
    c.beginPath();
    for (let x = 0; x <= SW; x += 8) { const y = yy + Math.sin(x * .03 + t * 1.2 + k * 2) * 1.5; x ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  g = c.createLinearGradient(0, sh, 0, SH);   // 沙滩
  g.addColorStop(0, '#3b2a3c'); g.addColorStop(.4, '#56404c'); g.addColorStop(1, '#6e5257');
  c.fillStyle = g; c.fillRect(0, sh, SW, SH - sh);
  const sg = c.createRadialGradient(SW * .3, SH * .95, 0, SW * .3, SH * .95, SW * .7);
  sg.addColorStop(0, 'rgba(255,63,164,.14)'); sg.addColorStop(1, 'rgba(255,63,164,0)');
  c.fillStyle = sg; c.fillRect(0, sh, SW, SH - sh);
  for (let i = laces.length - 1; i >= 0; i--) {   // 浪退后留下的白色花边
    const L = laces[i], a = clamp01(1 - (t - L.t) / 4.5);
    if (a <= 0) { laces.splice(i, 1); continue; }
    for (let x = 0, k = 0; x <= SW; x += 3, k++) {
      if (k % 3 === 0) continue;
      const f = foamSeeds[k % foamSeeds.length];
      c.fillStyle = `rgba(255,255,255,${.6 * a})`;
      c.fillRect(x, edgeY(L.y, x, L.t) + Math.sin(k * 1.7) * 3, f.r * .9, f.r * .9);
    }
  }
  const wt = t - WAVE0;   // 浪
  if (wt >= 0) {
    const n = Math.floor(wt / PERIOD), u = (wt % PERIOD) / PERIOD;
    if (n !== lastWave) { lastWave = n; playSfx('wave', n === 0 ? .9 : .55, n === 0 ? 1 : .94 + (n % 3) * .04); }
    const reach = SH * (REACH - (n % 2) * .04);
    let y, rising = false;
    if (u < .36) { y = sh + (reach - sh) * easeOut(u / .36); rising = true; }
    else if (u < .44) y = reach;
    else y = reach - (reach - sh) * easeInOut((u - .44) / .56);
    if (u >= .44 && !laces.some(L => L.n === n)) laces.push({ n, y: reach, t });
    if (!rising) {   // 退潮时的湿沙
      c.fillStyle = 'rgba(16,8,22,.3)';
      c.beginPath(); c.moveTo(0, sh);
      for (let x = 0; x <= SW; x += 6) c.lineTo(x, edgeY(reach, x, t) + 6);
      c.lineTo(SW, sh); c.closePath(); c.fill();
    }
    g = c.createLinearGradient(0, sh, 0, y);
    g.addColorStop(0, 'rgba(13,58,78,1)'); g.addColorStop(.7, 'rgba(60,150,170,.55)'); g.addColorStop(1, 'rgba(200,240,250,.38)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, sh - 2);
    for (let x = 0; x <= SW; x += 6) c.lineTo(x, edgeY(y, x, t));
    c.lineTo(SW, sh - 2); c.closePath(); c.fill();
    const thick = rising ? 14 : 8;
    c.save(); c.shadowColor = 'rgba(255,255,255,.9)'; c.shadowBlur = 10;
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 2.4;
    c.beginPath();
    for (let x = 0; x <= SW; x += 5) { const yy = edgeY(y, x, t); x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
    c.stroke(); c.restore();
    for (let x = 0, k = 0; x <= SW; x += 3, k++) {
      const f = foamSeeds[k % foamSeeds.length];
      const yy = edgeY(y, x, t) - (Math.sin(f.p + t * 3) * .5 + .5) * thick;
      c.fillStyle = `rgba(255,255,255,${.5 + .4 * Math.sin(f.p + t * 2)})`;
      c.beginPath(); c.arc(x + f.o * .3, yy, f.r, 0, 6.28); c.fill();
    }
  }
  c.globalAlpha = 1;
}
function drawRain(t, dens) {
  const c = sctx;
  c.lineCap = 'round';
  for (const d of drops) {
    d.y += d.v; d.x += d.v * .12;
    if (d.y > SH || (t > 2.2 && d.y > d.floor)) {
      d.y = -20 - Math.random() * SH * .3; d.x = Math.random() * SW * 1.1 - SW * .1;
      d.floor = SH * (HORIZON + .02 + Math.random() * .4); d.on = Math.random() < dens;
    }
    if (!d.on) continue;
    c.strokeStyle = d.col; c.lineWidth = d.w;
    c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - d.v * .29, d.y - d.l); c.stroke();
  }
}
function seaFrame(now) {
  if (!seaOn) return;
  requestAnimationFrame(seaFrame);
  const t = (now - seaT0) / 1000;
  sctx.clearRect(0, 0, SW, SH);
  sctx.fillStyle = `rgba(5,3,10,${.6 * clamp01(t / 1.4)})`; sctx.fillRect(0, 0, SW, SH);   // 雨越下越密，画面暗下去
  const beachA = clamp01((t - 1.0) / 1.8);
  if (beachA > 0) drawBeach(t, beachA);
  const dens = t < 1.4 ? .3 + t * .5 : clamp01(1 - (t - 1.4) / 3.2);   // 然后雨落进海里，慢慢停
  if (dens > 0) drawRain(t, dens);
  if (beachA >= 1) drawStarDrop(t);
}
// 浪声快结束时：一颗小星星掉进海里，"叮"
const STAR_T0 = WAVE0 + 3.9, STAR_FALL = .7;
let dinged = false;
function drawStarDrop(t) {
  const k = (t - STAR_T0) / STAR_FALL;
  if (k < 0 || k > 4) return;
  const c = sctx, hz = SH * HORIZON, sx0 = SW * .9, sy0 = SH * .1, sx1 = SW * .66, sy1 = hz + (SH * SHORE - hz) * .3;
  if (k < 1) {   // 下落
    const e = k * k, x = sx0 + (sx1 - sx0) * e, y = sy0 + (sy1 - sy0) * e;
    const tx = x + (sx0 - sx1) * .08, ty = y - (sy1 - sy0) * .08 - 10;
    const g = c.createLinearGradient(x, y, tx, ty);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,170,220,0)');
    c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(tx, ty); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 1.8, 0, 6.28); c.fill();
  } else {       // 落水：一圈光涟漪 + 一点闪光
    if (!dinged) { dinged = true; playSfx('ding', .5); }
    const q = k - 1, a = clamp01(1 - q / 3);
    c.save();
    c.shadowColor = 'rgba(255,220,240,.9)'; c.shadowBlur = 12 * a;
    c.fillStyle = `rgba(255,255,255,${.9 * clamp01(1 - q * 1.5)})`; c.beginPath(); c.arc(sx1, sy1, 2.6, 0, 6.28); c.fill();
    c.restore();
    for (let i = 0; i < 2; i++) {
      const r = (q - i * .35) * 26; if (r <= 0) continue;
      c.strokeStyle = `rgba(255,${i ? 230 : 200},${i ? 255 : 235},${.55 * a})`; c.lineWidth = 1;
      c.beginPath(); c.ellipse(sx1, sy1, r, r * .22, 0, 0, 6.28); c.stroke();
    }
  }
}
let beachStarted = false;
function beach() {
  if (beachStarted) return;
  stopBgm(2.2);   // 音乐在浪来之前淡出，留给浪声和"叮"
  beachStarted = true;
  sizeSea();
  drops = Array.from({ length: 160 }, () => ({
    x: Math.random() * SW * 1.1 - SW * .1, y: Math.random() * SH, v: 9 + Math.random() * 9, l: 14 + Math.random() * 22, w: .7 + Math.random() * .9,
    floor: SH * (HORIZON + .02 + Math.random() * .4),
    col: Math.random() < .5 ? 'rgba(255,120,200,.55)' : (Math.random() < .5 ? 'rgba(120,235,255,.5)' : 'rgba(255,255,255,.45)'), on: true }));
  sea.classList.add('on'); seaOn = true; seaT0 = performance.now();
  requestAnimationFrame(seaFrame);
  setTimeout(() => sbox.classList.add('out'), 900);
  setTimeout(() => $('#home').classList.add('on'), 3300);
  setTimeout(() => $('#doorbar').classList.add('on'), 4600);
}

/* ======================= 启动 ======================= */
setInterval(() => { $('#clock').textContent = clockStr(); }, 1000);
$('#clock').textContent = clockStr();
// 调试 / 预览：?jump=beach 直接看结尾
if (new URLSearchParams(location.search).get('jump') === 'beach') { gate.hidden = true; sizeSea(); beach(); }
else start();
})();
