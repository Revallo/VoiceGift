import { $, $$, h, api, icon, showScreen, addStars, toast, openSheet, closeSheet, swipeButton } from './common.js';
import { BRUSHES, NAME_FONTS, DEFAULT_FONT, BACKDROPS } from './stage.js';
import { TUNES, playTune } from './music.js';
import { THEMES, theme, createScene, applyTheme } from './themes.js';
import { me, forgetMe, authForm } from './auth.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const params = new URLSearchParams(location.search);
const state = {
  occasion: THEMES[params.get('occasion')] ? params.get('occasion') : 'birthday',
  flavor: '',
  shape: params.get('shape') || 'classic', // picked on the first page, or in the decorate step
  font: NAME_FONTS[params.get('font')] ? params.get('font') : DEFAULT_FONT, // the letters of the name on the gift
  brush: 0,
  nameTouched: false,
  sel: -1,
  created: null,
  verifyPin: String(1000 + Math.floor(Math.random() * 9000)), // the organizer can change it
  accent: '', pattern: '', topper: 'none', age: 21, backdrop: 'party', music: 'none',
  sketch: false
};
$('#deliverySummaryVal').textContent = state.verifyPin;
let t = theme(state.occasion);
const MAX_STICKERS = 30;

// ---------- steps + back ----------
function go(screen) {
  history.pushState({ screen }, '');
  showScreen(screen);
}
history.replaceState({ screen: 'who' }, '');
window.addEventListener('popstate', (e) => { stopPreview(); showScreen(e.state?.screen || 'who'); });
$$('[data-back]').forEach((b) => b.addEventListener('click', () => history.back()));

// ---------- step 1 ----------
swipeButton($('#nextBtn'));
let whoScene;
const sampleName = () => (state.occasion === 'wedding' ? 'Rina & Bayu' : state.occasion === 'graduation' ? 'Nadia' : 'Dimas');

// The gift is always shown at the top, so picking another occasion shows it straight away.
function renderWhoPreview() {
  const host = $('#whoPreview');
  host.textContent = '';
  const rec = $('#recipient').value.trim() || sampleName();
  whoScene = createScene(host, {
    occasion: state.occasion,
    recipient: rec,
    cake: decor(t.decorate.name(rec))
  });
  whoScene.setCandles(8);
  whoScene.lightAll();
}

// Everything picked in the decorate step, as stored in gift.cake.
const decor = (name) => ({ flavor: state.flavor || t.decorate.flavor, shape: state.shape, font: state.font, name, accent: state.accent, pattern: state.pattern, topper: state.topper, age: state.age, backdrop: state.backdrop, music: state.music });

let firstOccasion = true;
function setOccasion(key) {
  state.occasion = key;
  t = applyTheme(key);
  $$('#occasions .chip').forEach((c) => c.classList.toggle('on', c.dataset.v === key));
  $('#recipientLabel').textContent = t.recipientLabel;
  $('#recipient').placeholder = t.recipientPlaceholder;
  const nb = $('#nextBtn');
  const nbSpan = nb.querySelector('span');
  if (nbSpan) nbSpan.textContent = t.decorate.next;
  else nb.textContent = t.decorate.next;
  // the first time, take the flavor picked on the first page (?flavor=), if this scene has it
  const asked = firstOccasion && params.get('flavor');
  firstOccasion = false;
  state.flavor = asked && t.decorate.swatches[asked] ? asked : t.decorate.flavor;
  if (!t.decorate.shapes[state.shape]) state.shape = 'classic';
  state.accent = Object.keys(t.decorate.accents)[0];
  state.pattern = Object.keys(t.decorate.patterns)[0];
  state.topper = 'none';
  state.nameTouched = false;
  renderWhoPreview();
  buildDecorate();
}
$$('#occasions .chip').forEach((c) => c.addEventListener('click', () => { if (c.dataset.v !== state.occasion) setOccasion(c.dataset.v); }));
$('#recipient').addEventListener('input', () => {
  const rec = $('#recipient').value.trim() || sampleName();
  if (whoScene) {
    whoScene.setName(t.decorate.name(rec));
    whoScene.setNames?.(rec);
  }
});

// Logged in: "Your name" starts as the account's name.
// Logged out: log in first, then come back here.
me().then((u) => {
  if (!u) return location.replace('/login?next=' + encodeURIComponent(location.pathname + location.search));
  if (!$('#organizer').value.trim()) $('#organizer').value = u.name;
});

// The recipient's PIN: exactly 4 digits.
$('#openDeliverySheetBtn').addEventListener('click', () => {
  const pinIn = h('input', { class: 'input pin-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]{4}', maxlength: 4, autocomplete: 'off', value: state.verifyPin, placeholder: '1234',
    oninput: () => { pinIn.value = pinIn.value.replace(/\D/g, '').slice(0, 4); } });
  const errEl = h('p', { class: 'small err', hidden: true });
  const form = h('form', { class: 'stack', style: { gap: '12px' }, onsubmit: (ev) => {
    ev.preventDefault();
    const pin = pinIn.value.replace(/\D/g, '');
    if (pin.length !== 4) { errEl.textContent = 'The PIN needs 4 digits.'; errEl.hidden = false; return; }
    state.verifyPin = pin;
    $('#deliverySummaryVal').textContent = pin;
    closeSheet();
    toast('PIN saved');
  } },
    h('div', { class: 'field' }, h('label', {}, 'PIN (4 digits)'), pinIn,
      h('span', { class: 'tiny muted' }, 'You send this PIN with their link. Without it, the gift won’t open.')),
    errEl,
    h('button', { type: 'submit', class: 'btn' }, 'Save'));
  openSheet({ title: 'PIN for the gift', subtitle: 'they type these 4 digits to open the gift', content: form });
  setTimeout(() => pinIn.focus(), 60);
});

$('#whoForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const recipient = $('#recipient').value.trim();
  const organizer = $('#organizer').value.trim();
  const err = $('#whoError');
  let msg = '';
  if (!recipient) msg = 'Please enter who the gift is for.';
  else if (!organizer) msg = 'Please enter your name.';
  err.hidden = !msg;
  err.textContent = msg;
  if (msg) return;
  unlockAudio(); // inside the tap, so sliding the music strip can already play
  if (!state.nameTouched) $('#cakeName').value = t.decorate.name(recipient);
  scene.setName($('#cakeName').value);
  scene.setNames?.(recipient);
  go('decorate');
});

// ---------- step 2 ----------
let scene;
function buildDecorate() {
  const d = t.decorate;
  $('#decorTitle').textContent = d.title;
  $('#decorLead').textContent = d.lead;
  $('#swatchLabel').textContent = d.swatchLabel;
  $('#accentLabel').textContent = d.accentLabel;
  $('#patternLabel').textContent = d.patternLabel;
  $('#topperLabel').textContent = d.topperLabel;
  $('#nameLabel').textContent = d.nameLabel;
  $('#drawRow').hidden = !d.draw;
  const name = $('#cakeName');
  name.maxLength = d.nameMax;
  name.placeholder = d.namePlaceholder || '';
  name.value = d.name($('#recipient').value.trim());
  name.style.fontSize = d.nameMax > 20 ? '14px' : '';

  const host = $('#decorCake');
  host.textContent = '';
  scene = createScene(host, { occasion: state.occasion, recipient: $('#recipient').value.trim(), cake: decor(name.value) });
  scene.setCandles(0, { spots: 12 });
  scene.lightAll();
  if (d.draw && scene.drawArea) {
    const a = scene.drawArea;
    const hit = h('div', { class: 'draw-hit', 'aria-label': 'Draw with your finger', style: { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` }, hidden: !state.sketch });
    state.hit = hit;
    scene.stage.insertBefore(hit, scene.stickers.layer); // stickers stay on top, so they can still be dragged
    let drawing = false;
    hit.addEventListener('pointerdown', (e) => {
      hit.setPointerCapture?.(e.pointerId);
      const p = scene.toStage(e);
      scene.addDot(p.x, p.y, state.brush, false);
      drawing = true;
      selectSticker(-1);
    });
    hit.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = scene.toStage(e);
      scene.addDot(p.x, p.y, state.brush, true);
    });
    const end = () => (drawing = false);
    hit.addEventListener('pointerup', end);
    hit.addEventListener('pointercancel', end);
  }
  state.sel = -1;
  scene.stage.classList.add('editing');
  scene.stickers.onRender = wireStickers;
  renderShapes();
  renderFonts();
  renderSwatches();
  renderDetails();
  renderStickerTray();
}

// A sideways strip that you slide: whichever item stops in the middle is the chosen one.
function wheel(box, entries, current, draw, onPick) {
  box._stop?.();
  const items = entries.map(([key, v]) => { const el = draw(key, v); el.dataset.v = key; return el; });
  box.replaceChildren(...items);
  let chosen = current, settled = false, raf = 0;
  const mark = () => items.forEach((el) => el.classList.toggle('on', el.dataset.v === chosen));
  const center = (el, behavior) => box.scrollTo({ left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior });
  // The strip has no width while its screen is hidden, so it centres itself whenever it gets one.
  const ro = new ResizeObserver(() => {
    if (!box.clientWidth) return;
    center(items.find((el) => el.dataset.v === chosen) || items[0], 'auto');
    settled = true;
  });
  ro.observe(box);
  const onScroll = () => {
    if (!settled) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const mid = box.scrollLeft + box.clientWidth / 2;
      const near = items.reduce((a, b) => (Math.abs(b.offsetLeft + b.offsetWidth / 2 - mid) < Math.abs(a.offsetLeft + a.offsetWidth / 2 - mid) ? b : a));
      if (near.dataset.v === chosen) return;
      chosen = near.dataset.v;
      mark();
      onPick(chosen);
    });
  };
  box.addEventListener('scroll', onScroll, { passive: true });
  items.forEach((el) => el.addEventListener('click', () => center(el, 'smooth')));
  box._stop = () => { ro.disconnect(); box.removeEventListener('scroll', onScroll); };
  mark();
}
const chip = (label, style) => h('button', { type: 'button', class: 'chip', style }, label);
const swatch = (label, style, cls = '') => h('button', { type: 'button', class: `swatch ${cls}`, 'aria-label': label, title: label }, h('i', { style }));

// Swipe the big gift sideways to change its kind. Stickers and drawing keep their own gestures.
function stepShape(dir) {
  const keys = Object.keys(t.decorate.shapes);
  state.shape = keys[(keys.indexOf(state.shape) + dir + keys.length) % keys.length];
  scene.setShape(state.shape);
  scene.wrap.animate([{ transform: `translateX(${dir * 70}px)`, opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
  renderShapes();
  renderWhoPreview();
}
let swipeFrom = null;
$('#shapePrev').addEventListener('click', () => stepShape(-1));
$('#shapeNext').addEventListener('click', () => stepShape(1));
$('#decorCake').addEventListener('pointerdown', (e) => {
  swipeFrom = state.sketch || e.target.closest('.sticker') ? null : e.clientX;
  if (swipeFrom !== null) $('#decorCake').setPointerCapture?.(e.pointerId); // the swipe counts even if it ends outside the gift
});
$('#decorCake').addEventListener('pointerup', (e) => {
  if (swipeFrom === null) return;
  const dx = e.clientX - swipeFrom;
  swipeFrom = null;
  if (Math.abs(dx) > 36) stepShape(dx < 0 ? 1 : -1);
});
$('#decorCake').addEventListener('pointercancel', () => (swipeFrom = null));

function renderDetails() {
  const d = t.decorate;
  wheel($('#accents'), Object.entries(d.accents), state.accent, (k, v) => swatch(v.label, { background: v.color }), (k) => { state.accent = k; scene.setAccent(k); });
  wheel($('#patterns'), Object.entries(d.patterns), state.pattern, (k, v) => chip(v.label), (k) => { state.pattern = k; scene.setPattern(k); });
  wheel($('#toppers'), Object.entries(d.toppers), state.topper, (k, v) => chip(v.emoji ? `${v.emoji} ${v.label}` : v.label), (k) => { state.topper = k; scene.setTopper(k, state.age); showAge(); });
  wheel($('#backdrops'), Object.entries(BACKDROPS), state.backdrop, (k, v) => chip(v.label), (k) => { state.backdrop = k; scene.setBackdrop(k); });
  wheel($('#tunes'), Object.entries(TUNES), state.music, (k, v) => chip(v.label), (k) => { state.music = k; if (tuneAc?.state === 'running') startTune(); });
  $('#ageRange').value = state.age;
  showAge();
}
function showAge() {
  $('#ageRow').hidden = !t.decorate.toppers[state.topper]?.age;
  $('#ageVal').textContent = state.age;
}
$('#ageRange').addEventListener('input', (e) => { state.age = Number(e.target.value); showAge(); scene.setTopper(state.topper, state.age); });

// Music plays as soon as it's picked, so you hear what you're choosing. Stops by itself after two rounds.
let tuneAc = null, stopTune = null, tuneTimer = 0;
function unlockAudio() { // browsers only allow sound after a tap
  tuneAc ||= new (window.AudioContext || window.webkitAudioContext)();
  tuneAc.resume().catch(() => {});
}
function stopPreview() {
  stopTune?.();
  stopTune = null;
  clearTimeout(tuneTimer);
  $('#musicPlay').innerHTML = icon.play(16);
}
function startTune() {
  stopPreview();
  const tune = TUNES[state.music];
  if (!tune?.notes) return;
  stopTune = playTune(tuneAc, state.music);
  $('#musicPlay').innerHTML = icon.pause(16);
  tuneTimer = setTimeout(stopPreview, tune.notes.length * tune.beat * 2000);
}
stopPreview();
$('[data-screen="decorate"]').addEventListener('pointerup', unlockAudio);
$('#tunes').addEventListener('click', (e) => {
  unlockAudio();
  if (e.target.closest('[data-v]')?.dataset.v === state.music) startTune(); // already in the middle, so no slide will pick it
});
$('#musicPlay').addEventListener('click', () => {
  if (stopTune) return stopPreview();
  unlockAudio();
  if (!TUNES[state.music]?.notes) return $('#tunes [data-v="party"]').click(); // "No music" has nothing to play: go to the first tune
  startTune();
});

$('#sketchToggle').addEventListener('click', () => {
  state.sketch = !state.sketch;
  $('#sketchToggle').textContent = state.sketch ? '✓ Done' : '✏️ Draw';
  $('#brushes').hidden = $('#clearDraw').hidden = !state.sketch;
  if (state.hit) state.hit.hidden = !state.sketch;
});

// The kind of cake / bouquet / lanterns. Changing it keeps the drawing and the stickers.
function renderShapes() {
  const keys = Object.keys(t.decorate.shapes);
  $('#shapeName').textContent = t.decorate.shapes[state.shape].label;
  $('#shapeName').dataset.v = state.shape;
  $('#shapeCount').textContent = `${keys.indexOf(state.shape) + 1} / ${keys.length}`;
}

// The letters of the name: each choice is written in its own font.
function renderFonts() {
  wheel($('#fonts'), Object.entries(NAME_FONTS), state.font, (k, f) => { const b = chip(f.label, f.css); b.classList.add('font-chip'); return b; },
    (k) => { state.font = k; scene.setFont(k); renderWhoPreview(); });
}

function renderSwatches() {
  const d = t.decorate;
  wheel($('#flavors'), Object.entries(d.swatches), state.flavor, (k, f) => swatch(f.label, d.swatch(f)), (k) => { state.flavor = k; scene.setFlavor(k); });
  wheel($('#brushes'), BRUSHES.map((c, i) => [String(i), c]), String(state.brush), (k, c) => swatch(`Brush color ${Number(k) + 1}`, { background: c }, 'brush'), (k) => { state.brush = Number(k); });
}

// ---------- stickers ----------
function renderStickerTray() {
  const tray = $('#stickerTray');
  tray.textContent = '';
  for (const emoji of t.decorate.stickers) {
    const btn = h('button', { type: 'button', class: 'sticker-btn', 'aria-label': `Add sticker ${emoji}`, onclick: () => { if (!dragged) addSticker(emoji); dragged = false; } }, emoji);
    dragFromTray(btn, emoji);
    tray.append(btn);
  }
}

// Slide a sticker up out of the tray and drop it on the gift, exactly where it should go.
let dragged = false;
function dragFromTray(btn, emoji) {
  let start = null, ghost = null;
  const place = (e) => { ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`; };
  btn.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; dragged = false; });
  btn.addEventListener('pointermove', (e) => {
    if (!start) return;
    const up = start.y - e.clientY;
    if (!ghost && up > 12 && up > Math.abs(e.clientX - start.x)) {
      btn.setPointerCapture?.(e.pointerId);
      ghost = h('div', { class: 'sticker-ghost' }, emoji);
      document.body.append(ghost);
      dragged = true;
    }
    if (ghost) place(e);
  });
  const end = (e) => {
    start = null;
    if (!ghost) return;
    ghost.remove();
    ghost = null;
    const r = scene.stage.getBoundingClientRect();
    if (e.type === 'pointerup' && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
      const p = scene.toStage(e);
      addSticker(emoji, p.x, p.y);
    }
  };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
}

function addSticker(emoji, atX, atY) {
  const list = scene.stickers.get();
  if (list.length >= MAX_STICKERS) return toast(`Up to ${MAX_STICKERS} stickers`);
  // Land near the middle of the scene, a little apart from the last one.
  const { w, h: hgt } = scene.size;
  const x = Math.round(atX ?? w / 2 + (Math.random() - 0.5) * 160);
  const y = Math.round(atY ?? hgt * 0.6 + (Math.random() - 0.5) * 90);
  list.push([emoji, x, y]);
  state.sel = list.length - 1;
  scene.stickers.set(list);
}

function selectSticker(i) {
  if (state.sel === i) return;
  state.sel = i;
  scene.stickers.render();
}

// Called after every render: drag to move, tap to select (selected shows × to remove).
function wireStickers() {
  const st = scene.stickers;
  const { w, h: hgt } = scene.size;
  const clamp = (v, max) => Math.max(24, Math.min(max - 24, Math.round(v))); // keeps the × on screen
  for (const el of st.layer.children) {
    const i = Number(el.dataset.i);
    if (i === state.sel) {
      el.classList.add('sel');
      el.append(h('button', { type: 'button', class: 'x', 'aria-label': 'Remove sticker',
        onpointerdown: (e) => e.stopPropagation(),
        onclick: (e) => { e.stopPropagation(); const l = st.get(); l.splice(i, 1); state.sel = -1; st.set(l); } }, '×'));
    }
    el.addEventListener('pointerdown', (e) => {
      if (e.target !== el) return;
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      const start = scene.toStage(e);
      const list = st.get();
      const [, x0, y0] = list[i];
      let moved = false;
      const pos = (ev) => { const p = scene.toStage(ev); return [clamp(x0 + p.x - start.x, w), clamp(y0 + p.y - start.y, hgt)]; };
      const move = (ev) => {
        const [x, y] = pos(ev);
        if (Math.abs(x - x0) + Math.abs(y - y0) > 4) moved = true;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      };
      const up = (ev) => {
        el.removeEventListener('pointermove', move);
        if (moved) [list[i][1], list[i][2]] = pos(ev);
        state.sel = moved || state.sel !== i ? i : -1;
        st.set(list);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up, { once: true });
      el.addEventListener('pointercancel', up, { once: true });
    });
  }
}

$('#cakeName').addEventListener('input', (e) => { state.nameTouched = true; scene.setName(e.target.value); });
$('#clearDraw').addEventListener('click', () => scene.setDots([]));

// Create the gift (then its page opens), or save the changes when editing from the gift's page.
$('#createBtn').addEventListener('click', async () => {
  if (!state.created && !(await me())) return askAccount(); // a new gift needs an account
  const btn = $('#createBtn');
  const err = $('#createError');
  const label = state.created ? 'Save changes' : 'Create the gift';
  btn.disabled = true;
  btn.textContent = state.created ? 'Saving…' : 'Creating…';
  err.hidden = true;
  try {
    const recTrim = $('#recipient').value.trim();
    const body = {
      recipient: recTrim,
      organizer: $('#organizer').value.trim(),
      occasion: state.occasion,
      verifyPin: state.verifyPin,
      cake: { ...decor($('#cakeName').value.trim()), dots: t.decorate.draw ? scene.getDots() : [], stickers: scene.stickers.get() }
    };
    if (state.created) {
      await api('/api/gifts', { method: 'PATCH', json: { ...body, slug: state.created.slug, key: state.created.manageKey } });
    } else {
      state.created = await api('/api/gifts', { method: 'POST', json: body }); // listed on the account page
    }
    // everything else (invite friends, who recorded, send it) is on the gift's one page
    return location.replace(`/m/${state.created.slug}?k=${state.created.manageKey}`);
  } catch (e) {
    if (e.status === 401) { forgetMe(); return askAccount(); } // logged out in another tab
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = state.created ? 'Save changes' : label;
  }
});

// ---------- account (only when logged out) ----------
// Create an account or log in, then back to step 2, which creates the gift.
const ACCOUNT_LEAD = {
  signup: 'Create a free account to keep it. You’ll find its dashboard on any phone you log in on.',
  login: 'Log in and it’s saved to your account.'
};
function askAccount() {
  $('#accountLead').textContent = ACCOUNT_LEAD.signup;
  $('#accountBox').replaceChildren(authForm({
    name: $('#organizer').value.trim(),
    onMode: (mode) => ($('#accountLead').textContent = ACCOUNT_LEAD[mode]),
    onDone: () => {
      window.addEventListener('popstate', () => $('#createBtn').click(), { once: true });
      history.back();
    }
  }));
  go('account');
}

setOccasion(state.occasion);

// /new?edit=slug&k=key: "Edit design" on the gift's page
const editSlug = params.get('edit');
const editKey = params.get('k');
if (editSlug && editKey) {
  api(`/api/manage?slug=${encodeURIComponent(editSlug)}&key=${encodeURIComponent(editKey)}`).then(({ gift }) => {
    state.created = { slug: gift.slug, manageKey: editKey };
    $('#whoBack').href = `/m/${gift.slug}?k=${editKey}`;
    setOccasion(gift.occasion);
    $('#recipient').value = gift.recipient || '';
    $('#organizer').value = gift.organizer || '';
    if (/^\d{4}$/.test(gift.verifyPin || '')) { state.verifyPin = gift.verifyPin; $('#deliverySummaryVal').textContent = gift.verifyPin; }
    if (gift.cake) {
      for (const k of ['flavor', 'shape', 'font', 'accent', 'pattern', 'topper', 'backdrop', 'music']) if (gift.cake[k]) state[k] = gift.cake[k];
      if (gift.cake.age) state.age = gift.cake.age;
      if (!NAME_FONTS[state.font]) state.font = DEFAULT_FONT;
      buildDecorate();
      renderWhoPreview();
      if (gift.cake.name) { state.nameTouched = true; $('#cakeName').value = gift.cake.name; scene.setName(gift.cake.name); }
      if (Array.isArray(gift.cake.dots)) scene.setDots(gift.cake.dots);
      if (Array.isArray(gift.cake.stickers)) scene.stickers.set(gift.cake.stickers);
    }
    $('#createBtn').textContent = 'Save changes';
    go('decorate');
  }).catch(() => {});
}
