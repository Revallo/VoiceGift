// The recipient's page: the scene lights up (candles / flowers / lanterns) → listen to each voice
// → the finale (blow out the candles / throw your cap / release the lanterns) → keepsake.
import { $, h, api, icon, showScreen, slugFromPath, addStars, toast, colorFor, initials, tone, copyText } from './common.js';
import { createScene, applyTheme } from './themes.js';

addStars($('#app'), 26, 55);
if ($('#revLogo')) $('#revLogo').innerHTML = icon.gift(16);

const slug = slugFromPath();
const openKey = new URLSearchParams(location.search).get('k') || '';
const NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
const el = { eyebrow: $('#eyebrow'), title: $('#title'), sub: $('#sub'), panel: $('#panel'), bottom: $('#bottom') };

let gift, t, first = '', messages = [], scene, ac, preview = false;
let phase = 'loading';
const buffers = [];
const bufferJobs = [];
const played = new Set();
let current = null;
let queue = [];
let chips = [];
let timers = [];

const later = (fn, ms) => { const tm = setTimeout(fn, ms); timers.push(tm); return tm; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const fmtDur = (s) => { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`; };

function header(eyebrow, title, sub, italic = false) {
  el.eyebrow.textContent = eyebrow;
  el.title.textContent = title;
  el.title.style.fontStyle = italic ? 'italic' : '';
  el.sub.textContent = sub || '';
  el.sub.hidden = !sub;
}
function setPanel(node) { el.panel.textContent = ''; if (node) el.panel.append(node); }
function setBottom(...nodes) { el.bottom.textContent = ''; el.bottom.append(...nodes); }
function btn(label, opts = {}) {
  const b = h('button', { type: 'button', class: 'btn' + (opts.ghost ? ' ghost' : '') + (opts.pulse ? ' pulse' : ''), onclick: opts.onclick });
  if (opts.icon) b.innerHTML = opts.icon;
  b.append(h('span', {}, label));
  return b;
}

// ---------- load ----------
async function load() {
  let data;
  try {
    data = await api(`/api/reveal?slug=${encodeURIComponent(slug)}&k=${encodeURIComponent(openKey)}`);
  } catch (e) {
    $('#errorText').textContent = e.status === 404 ? 'This gift link doesn’t exist. Check the link and try again.' : e.message;
    return showScreen('error');
  }
  gift = data.gift;
  preview = data.preview;
  t = applyTheme(gift.occasion);
  first = t.callName(gift.recipient);
  document.title = `A voice gift for ${first}`;
  if (!scene) scene = createScene($('#cake'), gift);
  showScreen('scene');
  messages = data.messages;
  if (!messages.length) return showEmpty();
  showReady();
}

function showEmpty() {
  phase = 'empty';
  scene.setCandles(0, { spots: 12 });
  if (preview) header('Preview · only you see this', 'Their voices are for ' + first, `Only ${first} can hear what your friends recorded. To see how it works, add demo voices on your dashboard.`);
  else header(t.eyebrow(first), 'No messages yet', 'Nobody has recorded yet. Come back a bit later.');
  setPanel(null);
  setBottom(btn('Check again', { ghost: true, onclick: load }));
}

// ---------- it's time ----------
function showReady() {
  phase = 'ready';
  scene.setCandles(messages.length, { colors: messages.map((m, i) => colorFor(i)), onTap: (i) => phase === 'cake' && play(i, false) });
  scene.stage.classList.add('interactive');
  scene.setDim(0.7);
  header(preview ? 'Preview · only you see this' : t.eyebrow(first), 'It’s time!', `${t.people(messages.length)} recorded something for you. Turn your sound on.`);
  const pile = h('div', { class: 'facepile' });
  for (let i = 0; i < Math.min(messages.length, 12); i++) pile.append(h('i', {}, '?'));
  setPanel(h('div', { class: 'row' }, pile));
  setBottom(btn('Open your gift', { pulse: true, icon: icon.gift(18), onclick: openGift }));
}

async function openGift() {
  const AC = window.AudioContext || window.webkitAudioContext;
  ac = new AC();
  ac.resume().catch(() => {});
  const progress = h('p', { class: 'small muted center', style: { margin: '0' } }, 'Collecting voices…');
  setBottom(h('div', { class: 'loading', style: { flex: '0' } }, h('div', { class: 'spinner' }), progress));
  let done = 0;
  const total = Math.min(messages.length, 40);
  await runLimited(messages.slice(0, total).map((m, i) => () => loadBuffer(i).catch(() => null).finally(() => { done++; progress.textContent = `Collecting voices… ${done} of ${total}`; })), 4);
  startLighting();
}

async function runLimited(jobs, n) {
  const running = new Set();
  for (const job of jobs) {
    const p = job().finally(() => running.delete(p));
    running.add(p);
    if (running.size >= n) await Promise.race(running);
  }
  await Promise.all(running);
}

function loadBuffer(i) {
  if (!bufferJobs[i]) {
    bufferJobs[i] = fetch(`/api/audio?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(messages[i].id)}&k=${encodeURIComponent(openKey)}`)
      .then((r) => { if (!r.ok) throw new Error('audio ' + r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
      .then((b) => (buffers[i] = b));
    bufferJobs[i].catch(() => { bufferJobs[i] = null; });
  }
  return bufferJobs[i];
}

// ---------- the scene lights up, one voice at a time ----------
function startLighting() {
  phase = 'lighting';
  scene.setDim(0);
  const n = messages.length;
  const eyebrow = t.eyebrow(first);
  header(eyebrow, t.lightingTitle, t.lightingSub);
  const dots = messages.map(() => h('i', { style: { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--face)', transition: 'background .3s' } }));
  const count = h('p', { class: 'small soft center', style: { margin: '0' } }, t.progress(0, n));
  setBottom(h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap', gap: '7px' } }, n <= 40 ? dots : []), count);
  // Each item lights with a chime and the friend's name. No voices yet: they play when the recipient taps an item.
  let at = 300;
  messages.forEach((m, i) => {
    at += i === 0 ? 300 : Math.max(170, 700 * Math.pow(0.86, i));
    later(() => {
      scene.light(i);
      if (dots[i]) dots[i].style.background = colorFor(i);
      count.textContent = t.progress(i + 1, n);
      setPanel(h('div', { class: 'caller' },
        h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
        h('div', { class: 'shout' }, m.sender)));
      tone(ac, NOTES[i % NOTES.length], 0, 1.1, 0.05);
    }, at);
  });
  later(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(ac, f, k * 0.07, 1.9, 0.06));
    header(eyebrow, t.greeting(first), t.gaveLine(n));
  }, at + 700);
  later(enterScene, at + 3200);
}

// ---------- listen ----------
function enterScene() {
  phase = 'cake';
  scene.lightAll();
  scene.setBend(0);
  updateHeader();
  setPanel(idlePanel());
  const grid = h('div', { class: 'friends' });
  chips = messages.map((m, i) => {
    const chip = h('button', { type: 'button', class: 'friend', 'aria-label': `Play ${m.sender}'s message`, onclick: () => play(i, false) },
      h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('span', {}, m.sender));
    if (played.has(i)) chip.append(h('span', { class: 'tick', html: icon.check() }));
    grid.append(chip);
    return chip;
  });
  const heard = h('p', { class: 'small muted', id: 'heard', style: { margin: '0' } });
  const playAll = btn('Play all', { ghost: true, icon: icon.play(14), onclick: () => {
    const q = messages.map((m, i) => i).filter((i) => !played.has(i));
    queue = q.length ? q : messages.map((m, i) => i);
    play(queue.shift(), true);
  } });
  playAll.style.width = 'auto';
  const finaleBtn = btn(t.finaleBtn, { onclick: startFinale });
  finaleBtn.id = 'blowBtn';
  setBottom(grid, heard, h('div', { class: 'row' }, playAll, finaleBtn));
  updateHeard();
}

function updateHeader() {
  const all = played.size >= messages.length;
  header(t.eyebrow(first), t.greeting(first), current?.chain ? 'Playing every voice, one by one.' : all ? t.allHeard : t.tapHint);
}
function updateHeard() {
  const heard = $('#heard');
  if (heard) heard.textContent = played.size >= messages.length ? `You heard all ${messages.length} voices` : `${played.size} of ${messages.length} voices heard`;
  $('#blowBtn')?.classList.toggle('pulse', played.size >= messages.length);
}

function idlePanel() {
  const p = h('div', { class: 'panel row' });
  const circle = h('span', { class: 'avatar', style: { background: 'var(--gold-soft)', color: 'var(--gold)' }, html: icon.play(16) });
  p.append(circle, h('div', {}, h('b', {}, t.idleTitle), h('div', { class: 'small muted' }, 'Their words appear as they speak.')));
  return p;
}

function stopCurrent() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  if (current.src) { current.src.onended = null; try { current.src.stop(); } catch {} }
  scene.setActive(current.i, false);
  chips[current.i]?.classList.remove('on');
  current = null;
}

async function play(i, chain) {
  if (phase !== 'cake' || i === undefined) return;
  stopCurrent();
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const m = messages[i];
  const me = { i, chain, raf: 0, src: null };
  current = me;
  chips.forEach((c, k) => c.classList.toggle('on', k === i));
  scene.setActive(i, true);

  const words = m.words.map((w) => h('span', {}, w.w + ' '));
  const bars = h('div', { class: 'bars' }, ...[0, 1, 2, 3].map(() => h('i', { style: { background: colorFor(i) } })));
  setPanel(h('div', { class: 'panel' },
    h('div', { class: 'who' }, h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('div', {}, h('div', { class: 'name' }, m.sender), h('div', { class: 'meta' }, fmtDur(m.durationSec))), bars),
    h('div', { class: 'caption' }, words)));
  updateHeader();

  let buf = buffers[i];
  if (!buf) {
    try { buf = await loadBuffer(i); } catch { buf = null; }
    if (current !== me) return;
  }
  const finish = () => {
    if (current !== me) return;
    cancelAnimationFrame(me.raf);
    words.forEach((w) => { w.className = 'done'; });
    bars.remove();
    played.add(i);
    if (!chips[i].querySelector('.tick')) chips[i].append(h('span', { class: 'tick', html: icon.check() }));
    scene.setActive(i, false);
    scene.candles[i]?.classList.add('active');
    current = null;
    updateHeard();
    if (chain && queue.length) later(() => play(queue.shift(), true), 600);
    else updateHeader();
  };
  const dur = buf ? buf.duration : m.durationSec;
  const startAt = ac.currentTime;
  if (buf) {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.onended = finish;
    src.start();
    me.src = src;
  } else {
    toast('This voice could not be loaded. Showing the words only.');
    later(finish, dur * 1000);
  }
  const paint = () => {
    const el = ac.currentTime - startAt;
    let k = -1;
    m.words.forEach((w, idx) => { if (w.start <= el) k = idx; });
    words.forEach((w, idx) => { w.className = idx < k ? 'done' : idx === k ? 'now' : ''; });
    if (el < dur + 0.2 && current === me) me.raf = requestAnimationFrame(paint);
  };
  me.raf = requestAnimationFrame(paint);
}

// ---------- the finale ----------
function startFinale() {
  stopCurrent();
  queue = [];
  clearTimers();
  phase = 'blow';
  setPanel(null);
  header('Last step', t.finaleTitle, t.finaleSub(messages.length), true);
  if (t.key === 'birthday') startBlow();
  else startTap();
}

// Birthday: press and hold, or blow into the phone. Candles go out left to right.
let mic = null;
function startBlow() {
  const order = scene.finaleOrder(messages.length);
  const th = [];
  order.forEach((ci, r) => (th[ci] = 0.1 + (0.85 * r) / Math.max(1, order.length - 1)));

  const ring = h('button', { type: 'button', class: 'holdbtn', 'aria-label': 'Press and hold to blow out the candles' });
  const inner = h('span', { html: icon.wind(30) });
  inner.append(h('span', {}, 'Hold to blow'));
  ring.append(inner);
  const micLine = h('p', { class: 'small muted center', style: { margin: '0' } }, 'Press and hold, or blow into your phone.');
  setBottom(ring, micLine);

  let holding = false, progress = 0, last = performance.now(), out = 0, analyser = null, buf = null;
  const down = (e) => { e.preventDefault(); holding = true; ring.classList.add('down'); ring.setPointerCapture?.(e.pointerId); };
  const up = () => { holding = false; ring.classList.remove('down'); };
  ring.addEventListener('pointerdown', down);
  ring.addEventListener('pointerup', up);
  ring.addEventListener('pointercancel', up);
  ring.addEventListener('contextmenu', (e) => e.preventDefault());

  if (navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then((stream) => {
      if (phase !== 'blow') { stream.getTracks().forEach((tr) => tr.stop()); return; }
      mic = stream;
      const src = ac.createMediaStreamSource(stream);
      analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      buf = new Float32Array(analyser.fftSize);
      micLine.textContent = 'Mic is on. Blow into your phone.';
    }).catch(() => {});
  }

  const step = (ts) => {
    if (phase !== 'blow') return;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    let blowing = holding;
    if (analyser) {
      analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      if (Math.sqrt(s / buf.length) > 0.12) blowing = true;
    }
    if (blowing) progress = Math.min(1, progress + dt / 1.4);
    scene.setBend(blowing ? 1 : 0.15);
    const deg = Math.round(progress * 360);
    ring.style.background = `conic-gradient(var(--coral) ${deg}deg, var(--line) ${deg}deg)`;
    const nowOut = th.filter((x) => progress >= x).length;
    if (nowOut > out) {
      th.forEach((x, ci) => { if (progress >= x) scene.finaleOut(ci); });
      noise(0.22, 900, 0.2);
      out = nowOut;
    }
    if (progress >= 1) return finishFinale();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Graduation and wedding: one tap, everyone together.
function startTap() {
  const ring = h('button', { type: 'button', class: 'holdbtn', 'aria-label': t.finaleAction, style: { background: 'rgba(255,255,255,0.14)' } });
  const inner = h('span', { html: t.key === 'graduation' ? icon.cap(32) : icon.sparkle(30) });
  inner.append(h('span', {}, t.finaleAction));
  ring.append(inner);
  setBottom(ring, h('p', { class: 'small muted center', style: { margin: '0' } }, t.finaleHint));
  ring.addEventListener('click', () => {
    if (phase !== 'blow') return;
    phase = 'finale';
    ring.classList.add('down');
    ring.disabled = true;
    if (t.key === 'graduation') {
      throwCaps();
      later(finishFinale, 2300);
    } else {
      const order = scene.finaleOrder(messages.length);
      const stepMs = Math.min(220, 2600 / Math.max(1, order.length));
      order.forEach((ci, r) => later(() => { scene.finaleOut(ci); tone(ac, NOTES[(r * 2) % NOTES.length], 0, 1.6, 0.035); }, 150 + r * stepMs));
      later(finishFinale, 150 + order.length * stepMs + 1800);
    }
  });
}

function noise(dur, freq, vol) {
  try {
    const len = Math.floor(ac.sampleRate * dur);
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2);
    const s = ac.createBufferSource();
    s.buffer = b;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(ac.destination);
    s.start();
  } catch {}
}

function finishFinale() {
  if (mic) { mic.getTracks().forEach((tr) => tr.stop()); mic = null; }
  scene.setBend(0);
  phase = 'done';
  [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(ac, f, k * 0.07, 1.9, 0.07));
  [1046.5, 1318.51, 1567.98, 2093].forEach((f, k) => tone(ac, f, 0.3 + k * 0.09, 0.9, 0.04));
  confetti();
  if (t.key === 'wedding') skyLanterns();
  showKeepsake();
}

// ---------- keepsake ----------
const NAMES_SHOWN = 24;
function showKeepsake() {
  const n = messages.length;
  const total = messages.reduce((s, m) => s + (m.durationSec || 0), 0);
  header(t.eyebrow(first), t.greeting(first), t.keepSub(n));
  const card = h('div', { class: 'panel row', style: { borderStyle: 'dashed', borderColor: 'rgba(246,185,59,0.5)' } },
    h('span', { class: 'avatar', style: { background: 'var(--gold-soft)', color: 'var(--gold)' }, html: icon.gift(18) }),
    h('div', {}, h('b', {}, `${n} ${n === 1 ? 'voice' : 'voices'} · ${fmtDur(total)}`), h('div', { class: 'small muted' }, preview ? 'Your preview, with demo voices only. It still opens fresh for them.' : 'Kept here. Open this link again any time.')));
  setPanel(card);
  const nameChip = (m, i) => h('span', {}, h('i', { style: { background: colorFor(i) } }), m.sender);
  const names = h('div', { class: 'names' }, messages.slice(0, NAMES_SHOWN).map(nameChip));
  if (n > NAMES_SHOWN) {
    const more = h('button', { type: 'button', class: 'more', onclick: () => { more.replaceWith(...messages.slice(NAMES_SHOWN).map((m, k) => nameChip(m, NAMES_SHOWN + k))); } },
      `+${n - NAMES_SHOWN} more ${t.people(2).split(' ')[1]}`);
    names.append(more);
  }
  const save = btn('Save video', { icon: icon.download(16), onclick: () => exportKeepsakeVideo(save) });
  const share = btn('Share', { ghost: true, icon: icon.share(16), onclick: async () => {
    if (navigator.share) { try { await navigator.share({ title: 'My voice gift', url: location.href }); } catch {} }
    else copyText(location.href);
  } });
  const again = btn('Listen again', { ghost: true, icon: icon.redo(15), onclick: () => { scene.reset(); enterScene(); } });
  setBottom(h('div', { class: 'eyebrow' }, 'With love from'), names, h('div', { class: 'row' }, save, share), again);
}

async function exportKeepsakeVideo(saveBtn) {
  const cv = document.createElement('canvas');
  cv.width = 720;
  cv.height = 900;
  const ctx = cv.getContext('2d');

  const drawFrame = (activeIdx, wordText, progressRatio) => {
    ctx.fillStyle = '#0F0F0F';
    ctx.fillRect(0, 0, cv.width, cv.height);

    // Emerald Hero Card at top
    ctx.fillStyle = '#266A61';
    ctx.beginPath();
    ctx.roundRect?.(40, 40, cv.width - 80, 140, 28) || ctx.rect(40, 40, cv.width - 80, 140);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 15px -apple-system, sans-serif';
    ctx.fillText(t.eyebrow(first).toLowerCase(), 72, 86);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 40px -apple-system, sans-serif';
    ctx.fillText(t.greeting(first), 72, 138);

    // Stage well preview card
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.roundRect?.(40, 204, cv.width - 80, 310, 24) || ctx.rect(40, 204, cv.width - 80, 310);
    ctx.fill();

    // Draw glowing voice orbs inside stage well
    const total = Math.min(messages.length, 16);
    for (let i = 0; i < total; i++) {
      const angle = (i / total) * Math.PI * 2;
      const cx = cv.width / 2 + Math.cos(angle) * 140;
      const cy = 360 + Math.sin(angle) * 85;
      ctx.fillStyle = colorFor(i);
      ctx.beginPath();
      ctx.arc(cx, cy, i === activeIdx ? 18 : 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Active speaker & caption box
    const msg = messages[activeIdx] || messages[0];
    if (msg) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 24px -apple-system, sans-serif';
      ctx.fillText(msg.sender, 56, 575);

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '400 23px -apple-system, sans-serif';
      const words = String(wordText || msg.text || '').split(/\s+/);
      let line = '', y = 625;
      for (const w of words) {
        if ((line + w).length > 38) {
          ctx.fillText(line.trim(), 56, y);
          line = w + ' ';
          y += 36;
        } else line += w + ' ';
      }
      if (line.trim()) ctx.fillText(line.trim(), 56, y);
    }

    // Progress bar
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(56, 820, cv.width - 112, 6);
    ctx.fillStyle = '#389B8E';
    ctx.fillRect(56, 820, (cv.width - 112) * Math.min(1, Math.max(0, progressRatio)), 6);
  };

  if (typeof MediaRecorder === 'undefined' || !cv.captureStream || !ac) {
    drawFrame(0, messages[0]?.text || '', 1);
    const url = cv.toDataURL('image/png');
    const a = h('a', { href: url, download: `voice-gift-${slug}.png` });
    a.click();
    toast('Saved keepsake card');
    return;
  }

  saveBtn.disabled = true;
  const span = saveBtn.querySelector('span');
  if (span) span.textContent = 'Rendering…';
  try {
    const dest = ac.createMediaStreamDestination();
    const vStream = cv.captureStream(24);
    const combined = new MediaStream([...vStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
    const rec = new MediaRecorder(combined, mime ? { mimeType: mime } : {});
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    const stopped = new Promise((res) => (rec.onstop = res));
    rec.start();

    const clipCount = Math.min(messages.length, 4);
    for (let i = 0; i < clipCount; i++) {
      const buf = buffers[i] || (await loadBuffer(i).catch(() => null));
      const dur = Math.min(2.2, buf ? buf.duration : 1.5);
      if (buf) {
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.connect(dest);
        src.start();
        src.stop(ac.currentTime + dur);
      }
      const steps = Math.max(6, Math.round(dur * 15));
      for (let s = 0; s < steps; s++) {
        drawFrame(i, messages[i].text, (i + s / steps) / clipCount);
        await new Promise((r) => setTimeout(r, (dur * 1000) / steps));
      }
    }
    rec.stop();
    await stopped;
    const blob = new Blob(chunks, { type: mime || 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `voice-gift-${slug}.webm` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('Video saved');
  } catch {
    drawFrame(0, messages[0]?.text || '', 1);
    const url = cv.toDataURL('image/png');
    const a = h('a', { href: url, download: `voice-gift-${slug}.png` });
    a.click();
    toast('Saved keepsake card');
  } finally {
    saveBtn.disabled = false;
    if (span) span.textContent = 'Save video';
  }
}

// ---------- effects (confetti, caps, sky lanterns) ----------
let fxTimer;
function effects(nodes, ms) {
  const box = $('#confetti');
  box.hidden = false;
  box.append(...nodes);
  clearTimeout(fxTimer);
  fxTimer = setTimeout(() => { box.hidden = true; box.textContent = ''; }, ms);
}

function confetti() {
  const cols = messages.map((m, i) => colorFor(i)).concat(['#FFFFFF', '#FFFFFF', '#F6B93B']);
  const bits = [];
  for (let j = 0; j < 46; j++) {
    const round = Math.random() < 0.3;
    const dur = 3.2 + Math.random() * 2.6;
    bits.push(h('i', { style: {
      left: `${Math.random() * 100}%`, width: `${round ? 8 : 5 + Math.random() * 4}px`, height: `${round ? 8 : 9 + Math.random() * 7}px`,
      borderRadius: round ? '50%' : '2px', background: cols[j % cols.length],
      animationDuration: `${dur.toFixed(2)}s`, animationDelay: `${(Math.random() * 1.1).toFixed(2)}s`, animationIterationCount: '2'
    } }));
  }
  effects(bits, 13000);
}

// A mortarboard; the tassel takes the friend's colour (palette colours only, never user text).
const capSvg = (c) => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 22v9c6 5 18 5 24 0v-9l-12 6z" fill="#20264A"/><path d="M24 8 46 18 24 28 2 18z" fill="#2B3263" stroke="#4E5796" stroke-width="1.2"/><path d="M24 18 39 24v10" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle cx="39" cy="36" r="3.2" fill="${c}"/><circle cx="24" cy="18" r="2.2" fill="${c}"/></svg>`;

function throwCaps() {
  $('#confetti').textContent = '';
  noise(0.6, 2400, 0.12);
  const n = Math.min(Math.max(messages.length + 1, 10), 30); // yours + your friends' (a few extra when there are only a few)
  const caps = [];
  for (let j = 0; j < n; j++) {
    const cap = h('i', { class: 'cap', html: capSvg(j === 0 ? '#F6B93B' : colorFor(j - 1)), style: {
      left: `${8 + Math.random() * 76}%`, animationDelay: `${(j * 0.035 + Math.random() * 0.12).toFixed(2)}s`,
      width: j === 0 ? '60px' : '46px', height: j === 0 ? '60px' : '46px'
    } });
    cap.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 180)}px`);
    cap.style.setProperty('--up', `${Math.round(window.innerHeight * (0.62 + Math.random() * 0.3))}px`);
    cap.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 1000)}deg`);
    caps.push(cap);
  }
  effects(caps, 4000);
}

// Wedding keepsake: the released lanterns keep rising across the whole screen.
function skyLanterns() {
  const lights = [];
  for (let j = 0; j < Math.min(18, messages.length + 6); j++) {
    const c = colorFor(j);
    const s = 0.7 + Math.random() * 0.6;
    const l = h('i', { class: 'sky', style: {
      left: `${4 + Math.random() * 90}%`, width: `${Math.round(16 * s)}px`, height: `${Math.round(22 * s)}px`,
      background: `radial-gradient(ellipse at 50% 60%, rgba(255,255,255,0.8), rgba(255,255,255,0) 65%), ${c}`,
      boxShadow: `0 0 14px 4px ${c}88`, animationDuration: `${(9 + Math.random() * 6).toFixed(1)}s`, animationDelay: `${(Math.random() * 4).toFixed(1)}s`
    } });
    l.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 120)}px`);
    lights.push(l);
  }
  effects(lights, 20000);
}

load();
