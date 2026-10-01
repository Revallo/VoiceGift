// The recipient's page: countdown → candles light up → listen to each voice → blow them out → keepsake.
import { $, h, api, icon, showScreen, slugFromPath, fmtWhen, addStars, toast, colorFor, initials, tone, copyText } from './common.js';
import { createCake, candleSpots } from './cake.js';

addStars($('#app'), 26, 55);

const slug = slugFromPath();
const NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760];
const el = { eyebrow: $('#eyebrow'), title: $('#title'), sub: $('#sub'), panel: $('#panel'), bottom: $('#bottom') };

let gift, first = '', messages = [], cake, ac;
let clockOffset = 0;
let phase = 'loading';
const buffers = [];
const bufferJobs = [];
const played = new Set();
let current = null;
let queue = [];
let chips = [];
let timers = [];

const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
const now = () => Date.now() + clockOffset;
const people = (n) => `${n} ${n === 1 ? 'person' : 'people'}`;
const greeting = () => (gift.occasion === 'birthday' ? `Happy birthday, ${first}!` : `Congratulations, ${first}!`);
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
    data = await api(`/api/reveal?slug=${encodeURIComponent(slug)}`);
  } catch (e) {
    $('#errorText').textContent = e.status === 404 ? 'This gift link doesn’t exist. Check the link and try again.' : e.message;
    return showScreen('error');
  }
  clockOffset = Date.parse(data.now) - Date.now();
  gift = data.gift;
  first = gift.recipient.split(/\s+/)[0];
  document.title = `A voice gift for ${first}`;
  if (!cake) cake = createCake($('#cake'), gift.cake);
  showScreen('scene');
  if (data.locked) return showLocked(data.count);
  messages = data.messages;
  if (!messages.length) return showEmpty();
  showReady();
}

// ---------- before it opens ----------
function showLocked(count) {
  phase = 'locked';
  cake.setCandles(count, { spots: Math.max(12, count) });
  cake.setDim(1);
  const when = fmtWhen(gift.unlockAt);
  header(`For ${first}`, count ? `${people(count)} prepared a surprise for you` : 'Something is being prepared for you', `It opens ${when}.`);
  const pile = h('div', { class: 'facepile' });
  for (let i = 0; i < Math.min(Math.max(count, 3), 12); i++) pile.append(h('i', {}, '?'));
  setPanel(h('div', { class: 'row' }, pile, h('span', { class: 'small soft' }, 'Who? A secret until it opens.')));

  const boxes = [h('b'), h('b'), h('b')];
  const labels = [h('small'), h('small'), h('small')];
  const box = (i) => h('div', { class: 'box' }, boxes[i], labels[i]);
  const cd = h('div', { class: 'countdown', role: 'timer' }, box(0), h('span', { class: 'sep' }, ':'), box(1), h('span', { class: 'sep' }, ':'), box(2));
  const remind = btn('Remind me', { ghost: true, icon: icon.bell(16), onclick: () => toast('Keep this page. It opens by itself at that time.') });
  setBottom(cd, h('p', { class: 'small muted center', style: { margin: '0' } }, `Opens ${when}`), remind);

  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const left = Math.max(0, Date.parse(gift.unlockAt) - now());
    const s = Math.floor(left / 1000);
    const d = Math.floor(s / 86400);
    const parts = d > 0 ? [[d, 'days'], [Math.floor((s % 86400) / 3600), 'hours'], [Math.floor((s % 3600) / 60), 'min']] : [[Math.floor(s / 3600), 'hours'], [Math.floor((s % 3600) / 60), 'min'], [s % 60, 'sec']];
    parts.forEach(([v, l], i) => { boxes[i].textContent = pad(v); labels[i].textContent = l; });
    if (left <= 0) {
      clearInterval(iv);
      later(load, 800);
    }
  };
  const iv = setInterval(tick, 1000);
  tick();
}

function showEmpty() {
  phase = 'empty';
  cake.setCandles(0, { spots: 12 });
  header(`For ${first}`, 'No messages yet', `Ask ${gift.organizer} to share the link with your friends, then come back.`);
  setPanel(null);
  setBottom(btn('Check again', { ghost: true, onclick: load }));
}

// ---------- it's time ----------
function showReady() {
  phase = 'ready';
  cake.setCandles(messages.length, { colors: messages.map((m, i) => colorFor(i)), onTap: (i) => phase === 'cake' && play(i, false) });
  cake.setDim(0.7);
  header(`For ${first}`, 'It’s time!', `${people(messages.length)} recorded something for you. Turn your sound on.`);
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
    bufferJobs[i] = fetch(`/api/audio?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(messages[i].id)}`)
      .then((r) => { if (!r.ok) throw new Error('audio ' + r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => ac.decodeAudioData(ab, res, rej)))
      .then((b) => (buffers[i] = b));
    bufferJobs[i].catch(() => { bufferJobs[i] = null; });
  }
  return bufferJobs[i];
}

// ---------- candles light up ----------
function startLighting() {
  phase = 'lighting';
  cake.setDim(0);
  const n = messages.length;
  header(`For ${first}`, 'Your friends are lighting the candles…', 'Every candle is one friend.');
  const dots = messages.map((m, i) => h('i', { style: { width: '10px', height: '10px', borderRadius: '50%', background: '#3A2338', transition: 'background .3s' } }));
  const count = h('p', { class: 'small soft center', style: { margin: '0' } }, `0 of ${n} candles lit`);
  setBottom(h('div', { class: 'row', style: { justifyContent: 'center', flexWrap: 'wrap', gap: '7px' } }, n <= 40 ? dots : []), count);
  let t = 300;
  messages.forEach((m, i) => {
    t += i === 0 ? 300 : Math.max(170, 700 * Math.pow(0.86, i));
    later(() => {
      cake.light(i);
      if (dots[i]) dots[i].style.background = colorFor(i);
      count.textContent = i + 1 === n ? `All ${n} candles are lit` : `${i + 1} of ${n} candles lit`;
      setPanel(h('div', { class: 'caller' },
        h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
        h('div', {}, h('div', { class: 'small soft', style: { fontWeight: '600' } }, m.sender), h('div', { class: 'shout' }, `“${first}!”`))));
      tone(ac, NOTES[i % NOTES.length], 0, 1.1, 0.05);
      playSnippet(i);
    }, t);
  });
  later(() => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(ac, f, k * 0.07, 1.9, 0.06));
    header(`For ${first}`, greeting(), `${people(n)} lit a candle for you.`);
  }, t + 700);
  later(enterCake, t + 3200);
}

// The first moment of each recording, as its candle lights (friends were asked to start with the name).
function playSnippet(i) {
  const b = buffers[i];
  if (!b) return;
  try {
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = b;
    const t = ac.currentTime;
    g.gain.setValueAtTime(0.9, t);
    g.gain.setValueAtTime(0.9, t + 1.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    src.connect(g);
    g.connect(ac.destination);
    src.start(t, 0, 1.45);
  } catch {}
}

// ---------- listen ----------
function enterCake() {
  phase = 'cake';
  cake.lightAll();
  cake.setBend(0);
  updateCakeHeader();
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
  const blowBtn = btn('Blow out the candles', { onclick: startBlow });
  blowBtn.id = 'blowBtn';
  setBottom(grid, heard, h('div', { class: 'row' }, playAll, blowBtn));
  updateHeard();
}

function updateCakeHeader() {
  const all = played.size >= messages.length;
  header(`For ${first}`, greeting(), current?.chain ? 'Playing every voice, one by one.' : all ? 'You heard everyone. Now make a wish.' : 'Each candle is a friend. Tap one to hear them.');
}
function updateHeard() {
  const heard = $('#heard');
  if (heard) heard.textContent = played.size >= messages.length ? `You heard all ${messages.length} voices` : `${played.size} of ${messages.length} voices heard`;
  $('#blowBtn')?.classList.toggle('pulse', played.size >= messages.length);
}

function idlePanel() {
  const p = h('div', { class: 'panel row' });
  const circle = h('span', { class: 'avatar', style: { background: 'var(--gold-soft)', color: 'var(--gold)' }, html: icon.play(16) });
  p.append(circle, h('div', {}, h('b', {}, 'Tap a candle to hear who lit it'), h('div', { class: 'small muted' }, 'Their words appear as they speak.')));
  return p;
}

function stopCurrent() {
  if (!current) return;
  cancelAnimationFrame(current.raf);
  if (current.src) { current.src.onended = null; try { current.src.stop(); } catch {} }
  cake.setActive(current.i, false);
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
  cake.setActive(i, true);

  const words = m.words.map((w) => h('span', {}, w.w + ' '));
  const bars = h('div', { class: 'bars' }, ...[0, 1, 2, 3].map(() => h('i', { style: { background: colorFor(i) } })));
  setPanel(h('div', { class: 'panel' },
    h('div', { class: 'who' }, h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('div', {}, h('div', { class: 'name' }, m.sender), h('div', { class: 'meta' }, fmtDur(m.durationSec))), bars),
    h('div', { class: 'caption' }, words)));
  updateCakeHeader();

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
    cake.setActive(i, false);
    cake.candles[i]?.classList.add('active');
    current = null;
    updateHeard();
    if (chain && queue.length) later(() => play(queue.shift(), true), 600);
    else updateCakeHeader();
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
    const t = ac.currentTime - startAt;
    let k = -1;
    m.words.forEach((w, idx) => { if (w.start <= t) k = idx; });
    words.forEach((w, idx) => { w.className = idx < k ? 'done' : idx === k ? 'now' : ''; });
    if (t < dur + 0.2 && current === me) me.raf = requestAnimationFrame(paint);
  };
  me.raf = requestAnimationFrame(paint);
}

// ---------- make a wish ----------
let mic = null;
function startBlow() {
  stopCurrent();
  queue = [];
  clearTimers();
  phase = 'blow';
  header('Last step', 'Make a wish…', 'Then blow into your phone. The candles go out.', true);
  setPanel(null);
  const n = messages.length;
  // candles go out left to right
  const spots = candleSpots(Math.min(n, 60));
  const order = spots.slice().sort((a, b) => a.x - b.x).map((s) => s.i);
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
      if (phase !== 'blow') { stream.getTracks().forEach((t) => t.stop()); return; }
      mic = stream;
      const src = ac.createMediaStreamSource(stream);
      analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      buf = new Float32Array(analyser.fftSize);
      micLine.textContent = 'Mic is on. Blow into your phone.';
    }).catch(() => {});
  }

  const step = (t) => {
    if (phase !== 'blow') return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    let blowing = holding;
    if (analyser) {
      analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      if (Math.sqrt(s / buf.length) > 0.12) blowing = true;
    }
    if (blowing) progress = Math.min(1, progress + dt / 1.4);
    cake.setBend(blowing ? 1 : 0.15);
    const deg = Math.round(progress * 360);
    ring.style.background = `conic-gradient(#FF5A5F ${deg}deg, rgba(255,255,255,0.14) ${deg}deg)`;
    const nowOut = th.filter((x) => progress >= x).length;
    if (nowOut > out) {
      th.forEach((x, ci) => { if (progress >= x) cake.blowOut(ci); });
      puff();
      out = nowOut;
    }
    if (progress >= 1) return finishBlow();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function puff() {
  try {
    const len = Math.floor(ac.sampleRate * 0.22);
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2);
    const s = ac.createBufferSource();
    s.buffer = b;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = ac.createGain();
    g.gain.value = 0.2;
    s.connect(f); f.connect(g); g.connect(ac.destination);
    s.start();
  } catch {}
}

function finishBlow() {
  if (mic) { mic.getTracks().forEach((t) => t.stop()); mic = null; }
  cake.setBend(0);
  phase = 'done';
  [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(ac, f, k * 0.07, 1.9, 0.07));
  [1046.5, 1318.51, 1567.98, 2093].forEach((f, k) => tone(ac, f, 0.3 + k * 0.09, 0.9, 0.04));
  confetti();
  showKeepsake();
}

// ---------- keepsake ----------
function showKeepsake() {
  const n = messages.length;
  const total = messages.reduce((s, m) => s + (m.durationSec || 0), 0);
  header(`For ${first}`, greeting(), `${people(n)} love you.`);
  const card = h('div', { class: 'panel row', style: { borderStyle: 'dashed', borderColor: 'rgba(246,185,59,0.5)' } },
    h('span', { class: 'avatar', style: { background: 'var(--gold-soft)', color: 'var(--gold)' }, html: icon.gift(18) }),
    h('div', {}, h('b', {}, `${n} ${n === 1 ? 'voice' : 'voices'} · ${fmtDur(total)}`), h('div', { class: 'small muted' }, 'Kept here. Open this link again any time.')));
  setPanel(card);
  const names = h('div', { class: 'names' }, messages.map((m, i) => h('span', {}, h('i', { style: { background: colorFor(i) } }), m.sender)));
  const save = btn('Save video', { icon: icon.download(16), onclick: () => toast('Coming soon: one video with every voice and caption.') });
  const share = btn('Share', { ghost: true, icon: icon.share(16), onclick: async () => {
    if (navigator.share) { try { await navigator.share({ title: `My voice gift`, url: location.href }); } catch {} }
    else copyText(location.href);
  } });
  const again = btn('Listen again', { ghost: true, icon: icon.redo(15), onclick: () => { cake.lightAll(); enterCake(); } });
  setBottom(h('div', { class: 'eyebrow' }, 'With love from'), names, h('div', { class: 'row' }, save, share), again);
}

function confetti() {
  const box = $('#confetti');
  box.textContent = '';
  box.hidden = false;
  const cols = messages.map((m, i) => colorFor(i)).concat(['#FFFFFF', '#FFFFFF', '#F6B93B']);
  for (let j = 0; j < 46; j++) {
    const round = Math.random() < 0.3;
    const dur = 3.2 + Math.random() * 2.6;
    box.append(h('i', { style: {
      left: `${Math.random() * 100}%`, width: `${round ? 8 : 5 + Math.random() * 4}px`, height: `${round ? 8 : 9 + Math.random() * 7}px`,
      borderRadius: round ? '50%' : '2px', background: cols[j % cols.length],
      animationDuration: `${dur.toFixed(2)}s`, animationDelay: `${(Math.random() * 1.1).toFixed(2)}s`, animationIterationCount: '2'
    } }));
  }
  setTimeout(() => { box.hidden = true; }, 13000);
}

load();
