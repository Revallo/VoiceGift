import { $, $$, h, api, icon, showScreen, addStars, toast, openSheet, closeSheet, swipeButton } from './common.js';
import { BRUSHES, NAME_FONTS, DEFAULT_FONT, BACKDROPS } from './stage.js';
import { TUNES, playTune } from './music.js';
import { THEMES, theme, createScene, applyTheme } from './themes.js';
import { me, forgetMe, loginBox } from './auth.js';
import { LOCALES, detectLocal, localKey } from './local.js';
import { isTreat } from './bouquet.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const params = new URLSearchParams(location.search);
const askedTumpeng = params.get('occasion') === 'tumpeng'; // old links: tumpeng was an occasion, now a birthday kind
const state = {
  occasion: THEMES[params.get('occasion')] ? params.get('occasion') : 'birthday',
  flavor: '',
  shape: askedTumpeng ? 'tumpeng' : params.get('shape') || 'classic', // picked on the first page, or in the decorate step
  font: NAME_FONTS[params.get('font')] ? params.get('font') : DEFAULT_FONT, // the letters of the name on the gift
  brush: 0,
  nameTouched: false,
  sel: -1,
  created: null,
  verifyPin: String(1000 + Math.floor(Math.random() * 9000)), // the organizer can change it
  accent: '', pattern: '', topper: 'none', greens: 'leaf', age: 21, backdrop: 'party', music: 'none',
  local: detectLocal(), // the country's touches (local.js); a guess from the phone, changed in the decorate step
  sketch: false
};
$('#deliverySummaryVal').textContent = state.verifyPin;
let t = theme(state.occasion);
const MAX_STICKERS = 30;

// ---------- steps + back ----------
function go(screen) {
  history.pushState({ screen }, '');
  showScreen(screen);
  if (screen === 'decorate') renderPeeks();
}
history.replaceState({ screen: 'who' }, '');
window.addEventListener('popstate', (e) => {
  stopPreview();
  const to = e.state?.screen || 'who';
  showScreen(to);
  if (to === 'who') renderCarousel(); // the kinds now show the design made in Customize
});
$$('[data-back]').forEach((b) => b.addEventListener('click', () => history.back()));

// ---------- the first screen ----------
swipeButton($('#createBtn'));
const SAMPLE_NAMES = { wedding: 'Rina & Bayu', graduation: 'Nadia' };
const sampleName = () => SAMPLE_NAMES[state.occasion] || 'Dimas';
const recipientOr = () => $('#recipient').value.trim() || sampleName();

// The kinds of the picked occasion, as big live gifts you slide: the one in the middle is the gift.
// The middle one carries the design made in Customize; its neighbours show their own look.
let kindScenes = [];
function renderCarousel() {
  const box = $('#kinds');
  const rec = recipientOr();
  kindScenes = [];
  wheel(box, Object.entries(t.decorate.shapes), state.shape, (key, s) => {
    const mini = h('div', { class: 'mini' });
    const el = h('button', { type: 'button', class: 'kind', role: 'radio', 'aria-label': s.label }, mini);
    const kt = theme(state.occasion, key);
    const mine = key === state.shape;
    const cake = mine && scene
      ? { ...decor($('#cakeName').value || kt.decorate.name(rec)), dots: t.decorate.draw ? scene.getDots() : [], stickers: scene.stickers.get() }
      : { flavor: kt.scene === t.scene && !kt.decorate.accent ? state.flavor : kt.decorate.flavor, shape: key, font: state.font, name: kt.decorate.name(rec), greens: state.greens, local: state.local,
        accent: kt.decorate.accent, pattern: kt.decorate.pattern, topper: kt.decorate.topper, backdrop: kt.decorate.backdrop || (kt.scene === t.scene ? state.backdrop : 'party') };
    const sc = createScene(mini, { occasion: state.occasion, recipient: rec, cake });
    sc.setCandles(state.occasion === 'birthday' ? 6 : 8);
    sc.lightAll();
    sc.kindKey = key;
    kindScenes.push(sc);
    return el;
  }, (k) => setShape(k));
  for (const el of box.children) el.setAttribute('aria-checked', String(el.dataset.v === state.shape));
  showKindName();
}
function showKindName() {
  const label = t.decorate.shapes[state.shape]?.label || '';
  $('#kindName').textContent = label;
  $('#decorKindName').textContent = label;
  for (const el of $('#kinds').children) el.setAttribute('aria-checked', String(el.dataset.v === state.shape));
  const keys = Object.keys(t.decorate.shapes);
  $('#kindDots').replaceChildren(...keys.map((k) => h('i', { class: k === state.shape ? 'on' : '' })));
}
// In Customize the kinds before and after peek in at the sides, so it's plain the gift can be swiped.
function renderPeeks() {
  if (!scene || $('[data-screen="decorate"]').hidden) return;
  const keys = Object.keys(t.decorate.shapes), at = keys.indexOf(state.shape), rec = recipientOr();
  for (const [id, dir] of [['#kindPrev', -1], ['#kindNext', 1]]) {
    const key = keys[(at + dir + keys.length) % keys.length], kt = theme(state.occasion, key);
    const mini = h('div', { class: 'mini' });
    $(id).replaceChildren(mini);
    $(id).setAttribute('aria-label', `${dir < 0 ? 'Previous' : 'Next'} kind: ${kt.decorate.shapes[key]?.label || key}`);
    const sc = createScene(mini, { occasion: state.occasion, recipient: rec, cake: { flavor: kt.decorate.flavor, shape: key, font: state.font, name: kt.decorate.name(rec), greens: state.greens, local: state.local,
      accent: kt.decorate.accent, pattern: kt.decorate.pattern, topper: kt.decorate.topper, backdrop: kt.decorate.backdrop || (kt.scene === t.scene ? state.backdrop : 'party') } });
    sc.setCandles(state.occasion === 'birthday' ? 6 : 8);
    sc.lightAll();
  }
}

// Everything picked in the decorate step, as stored in gift.cake.
const decor = (name) => ({ flavor: state.flavor || t.decorate.flavor, shape: state.shape, font: state.font, name, accent: state.accent, pattern: state.pattern, topper: state.topper, greens: state.greens, age: state.age, backdrop: state.backdrop, music: state.music, local: state.local });
// Lists with local entries (backdrops, lantern motifs) show only the ones of the picked country.
const forLocal = (list) => Object.entries(list).filter(([, v]) => !v.local || v.local === state.local);

let firstOccasion = true;
function setOccasion(key) {
  state.occasion = key;
  t = theme(key);
  if (!t.decorate.shapes[state.shape]) state.shape = 'classic';
  t = applyTheme(key, state.shape);
  $$('#occasions .occ').forEach((c) => { c.classList.toggle('on', c.dataset.v === key); c.setAttribute('aria-checked', String(c.dataset.v === key)); });
  $('#recipient').placeholder = t.recipientPlaceholder;
  // the first time, take the flavor picked on the first page (?flavor=), if this scene has it
  const asked = firstOccasion && params.get('flavor');
  firstOccasion = false;
  state.flavor = asked && t.decorate.swatches[asked] ? asked : t.decorate.flavor;
  state.accent = t.decorate.accent || Object.keys(t.decorate.accents)[0];
  state.pattern = t.decorate.pattern || Object.keys(t.decorate.patterns)[0];
  state.topper = t.decorate.topper || 'none';
  state.backdrop = t.decorate.backdrop || (BACKDROPS[state.backdrop]?.local ? state.backdrop : 'party');
  state.greens = 'leaf';
  state.nameTouched = false;
  buildDecorate();
  renderCarousel();
}
$$('#occasions .occ').forEach((c) => c.addEventListener('click', () => { if (c.dataset.v !== state.occasion) setOccasion(c.dataset.v); }));
$('#recipient').addEventListener('input', () => {
  const rec = recipientOr();
  for (const sc of kindScenes) { sc.setName(theme(state.occasion, sc.kindKey).decorate.name(rec)); sc.setNames?.(rec); }
  if (!state.nameTouched) { $('#cakeName').value = t.decorate.name(rec); scene.setName($('#cakeName').value); }
  scene.setNames?.(rec);
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
    pinIn, errEl,
    h('button', { type: 'submit', class: 'btn' }, 'Save'));
  openSheet({ title: 'PIN', subtitle: 'Send it with their link. It opens the gift.', content: form });
  setTimeout(() => pinIn.focus(), 60);
});

// Names first: both are needed before the gift is made.
function checkNames() {
  const err = $('#whoError');
  let msg = '';
  if (!$('#recipient').value.trim()) msg = 'Who is it for?';
  else if (!$('#organizer').value.trim()) msg = 'Add your name.';
  err.hidden = !msg;
  err.textContent = msg;
  if (msg) (msg.startsWith('Who') ? $('#recipient') : $('#organizer')).focus();
  return !msg;
}
$('#whoForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (checkNames()) saveGift();
});

// Customize: its own page. The gift there already carries the recipient's name.
$('#customizeBtn').addEventListener('click', () => {
  unlockAudio(); // inside the tap, so sliding the music strip can already play
  if (!state.nameTouched) { $('#cakeName').value = t.decorate.name(recipientOr()); scene.setName($('#cakeName').value); }
  scene.setNames?.(recipientOr());
  go('decorate');
});
$('#saveDecorBtn').addEventListener('click', () => {
  if (state.created) { if (checkNames()) saveGift(); else history.back(); } // editing: save straight away
  else history.back();
});

// ---------- step 2 ----------
let scene;
function buildDecorate() {
  const d = t.decorate;
  const name = $('#cakeName');
  name.maxLength = d.nameMax;
  name.placeholder = d.namePlaceholder || '';
  name.value = d.name(recipientOr());
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
      remember();
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
  undoStack.length = 0;
  $('#undoDraw').disabled = true;
  scene.stage.classList.add('editing');
  scene.stickers.onRender = wireStickers;
  renderLocals();
  showKindName();
  renderTools();
  renderFonts();
  renderSwatches();
  renderDetails();
  renderStickerTray();
}

// The country shows on the gift itself: the cake's mat and garland, the print on the bouquet's wrap, what hangs
// over a wedding. Its stickers come first in the tray, its backdrop and lantern motif join the strips, and a
// money / snack bouquet uses its money and snacks. It never swaps the backdrop: that stays the organizer's pick.
function renderLocals() {
  wheel($('#locals'), Object.entries(LOCALES), state.local, (k, v) => chip(v.label), (k) => {
    state.local = k;
    scene.setLocal?.(k);
    if (BACKDROPS[state.backdrop]?.local && BACKDROPS[state.backdrop].local !== k) { state.backdrop = 'party'; scene.setBackdrop(state.backdrop); }
    if (t.decorate.patterns[state.pattern]?.local && t.decorate.patterns[state.pattern].local !== k) { state.pattern = Object.keys(t.decorate.patterns)[0]; scene.setPattern(state.pattern); }
    renderDetails();
    renderStickerTray();
    renderPeeks();
  });
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

// Some kinds draw another scene (a birthday tumpeng, a wedding angpao tree or river): then the gift is drawn again
// with that scene's own flavours, accents, patterns and toppers, keeping the name, the stickers and the drawing.
function switchScene() {
  const before = t.scene, beforeTheme = t.theme || t.key, hadBackdrop = t.decorate.backdrop;
  t = applyTheme(state.occasion, state.shape);
  if (t.scene === before && (t.theme || t.key) === beforeTheme) return false;
  const d = t.decorate;
  state.flavor = d.flavor;
  state.accent = d.accent || Object.keys(d.accents)[0];
  state.pattern = d.pattern || Object.keys(d.patterns)[0];
  state.topper = d.topper || 'none';
  if (d.backdrop) state.backdrop = d.backdrop;
  else if (hadBackdrop && state.backdrop === hadBackdrop) state.backdrop = 'party';
  const keep = { name: $('#cakeName').value, stickers: scene.stickers.get(), dots: scene.getDots() };
  buildDecorate();
  if (state.nameTouched) { $('#cakeName').value = keep.name; scene.setName(keep.name); }
  scene.stickers.set(keep.stickers);
  if (d.draw) scene.setDots(keep.dots);
  return true;
}

// A new kind: from the carousel on the first screen, or by swiping the big gift in Customize.
function setShape(k) {
  if (k === state.shape) return;
  state.shape = k;
  if (!switchScene()) { scene.setShape(k); renderTools(); }
  showKindName();
  renderPeeks();
}
function stepShape(dir) {
  const keys = Object.keys(t.decorate.shapes);
  setShape(keys[(keys.indexOf(state.shape) + dir + keys.length) % keys.length]);
  scene.wrap.animate([{ transform: `translateX(${Math.sign(dir) * 70}px)`, opacity: 0.25 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
}
$('#kindPrev').addEventListener('click', () => stepShape(-1));
$('#kindNext').addEventListener('click', () => stepShape(1));
let swipeFrom = null;
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
  wheel($('#patterns'), forLocal(d.patterns), state.pattern, (k, v) => chip(v.label), (k) => { state.pattern = k; scene.setPattern(k); });
  wheel($('#toppers'), Object.entries(d.toppers), state.topper, (k, v) => chip(v.emoji ? `${v.emoji} ${v.label}` : v.label), (k) => { state.topper = k; scene.setTopper(k, state.age); showAge(); });
  if (d.greens) wheel($('#greens'), Object.entries(d.greens), state.greens, (k, v) => chip(v.label), (k) => { state.greens = k; scene.setGreens?.(k); });
  wheel($('#backdrops'), forLocal(BACKDROPS), state.backdrop, (k, v) => chip(v.label), (k) => { state.backdrop = k; scene.setBackdrop(k); });
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
  $('#sketchToggle').textContent = state.sketch ? 'Done' : 'Draw';
  $('#brushes').hidden = $('#clearDraw').hidden = $('#undoDraw').hidden = !state.sketch;
  if (state.hit) state.hit.hidden = !state.sketch;
});

// The tools, one at a time: a strip of icon tabs, the picked tool's row under it. No long page to scroll.
const TOOL_ICONS = { color: 'palette', accent: 'ribbon', pattern: 'pattern', topper: 'crown', greens: 'leaf', text: 'text', stickers: 'sticker', draw: 'pen', music: 'music', backdrop: 'image', local: 'globe' };
let tool = 'color';
function renderTools() {
  const d = t.decorate;
  const tools = [
    ['color', d.swatchLabel],
    ['accent', d.accentLabel],
    // a money or snack bouquet has no petals to pick
    !(state.occasion === 'graduation' && isTreat(state.shape)) && ['pattern', d.patternLabel],
    ['topper', d.topperLabel],
    d.greens && ['greens', 'Greens'],
    ['text', d.nameLabel],
    ['stickers', 'Stickers'],
    d.draw && ['draw', 'Draw'],
    ['music', 'Music'],
    ['backdrop', 'Backdrop'],
    ['local', 'Local']
  ].filter(Boolean);
  if (!tools.some(([k]) => k === tool)) tool = 'color';
  $('#toolTabs').replaceChildren(...tools.map(([k, label]) => h('button', {
    type: 'button', class: `tool-tab ${k === tool ? 'on' : ''}`, role: 'tab', 'data-tool': k, 'aria-selected': String(k === tool),
    onclick: () => showTool(k), html: `${icon[TOOL_ICONS[k]](22)}<span></span>`
  })));
  $$('#toolTabs .tool-tab').forEach((b, i) => (b.lastChild.textContent = tools[i][1]));
  showTool(tool);
}
function showTool(k) {
  tool = k;
  for (const b of $$('#toolTabs .tool-tab')) { const on = b.dataset.tool === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); }
  for (const p of $$('#decorTools .tool-pane')) p.hidden = p.dataset.tool !== k;
  if (k !== 'draw' && state.sketch) $('#sketchToggle').click(); // leaving Draw stops drawing, so the gift can be swiped again
}

// The letters of the name: each choice is written in its own font.
function renderFonts() {
  wheel($('#fonts'), Object.entries(NAME_FONTS), state.font, (k, f) => { const b = chip(f.label, f.css); b.classList.add('font-chip'); return b; },
    (k) => { state.font = k; scene.setFont(k); });
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
  const own = LOCALES[localKey(state.local)].stickers;
  const all = [...own, ...t.decorate.stickers.filter((e) => !own.includes(e))];
  all.forEach((emoji, i) => {
    if (own.length && i === own.length) tray.append(h('i', { class: 'sticker-sep', 'aria-hidden': 'true' }));
    const btn = h('button', { type: 'button', class: 'sticker-btn', 'aria-label': `Add sticker ${emoji}`, onclick: () => { if (!dragged) addSticker(emoji); dragged = false; } }, emoji);
    dragFromTray(btn, emoji);
    tray.append(btn);
  });
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
$('#clearDraw').addEventListener('click', () => { if (scene.getDots().length) { remember(); scene.setDots([]); } });

// Undo: every stroke (and Clear) keeps the drawing as it was before, so it can come back.
const undoStack = [];
function remember() {
  undoStack.push(scene.getDots());
  if (undoStack.length > 40) undoStack.shift();
  $('#undoDraw').disabled = false;
}
$('#undoDraw').addEventListener('click', () => {
  if (undoStack.length) scene.setDots(undoStack.pop());
  $('#undoDraw').disabled = !undoStack.length;
});

// Create the gift (then its page opens), or save the changes when editing from the gift's page.
let saving = false;
async function saveGift() {
  if (saving) return;
  if (!state.created && !(await me())) return askAccount(); // a new gift needs an account
  const btn = state.created ? $('#saveDecorBtn') : $('#createBtn');
  const label = btn.querySelector('span') || btn;
  const was = label.textContent;
  const err = $('#createError');
  saving = true;
  btn.disabled = true;
  label.textContent = state.created ? 'Saving…' : 'Creating…';
  err.hidden = true;
  try {
    const recTrim = $('#recipient').value.trim();
    if (!state.nameTouched) $('#cakeName').value = t.decorate.name(recTrim);
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
    if (state.created && $('[data-screen="decorate"]:not([hidden])')) toast(e.message);
  } finally {
    saving = false;
    btn.disabled = false;
    label.textContent = was;
  }
}

// ---------- account (only when logged out) ----------
// Log in (Google), then back to step 2, which creates the gift.
function askAccount() {
  $('#accountLead').textContent = 'Log in to keep it. You’ll find its dashboard on any phone you log in on.';
  $('#accountBox').replaceChildren(loginBox({
    onDone: () => {
      window.addEventListener('popstate', () => saveGift(), { once: true });
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
    const oldTumpeng = gift.occasion === 'tumpeng';
    setOccasion(oldTumpeng ? 'birthday' : gift.occasion);
    $('#recipient').value = gift.recipient || '';
    $('#organizer').value = gift.organizer || '';
    if (/^\d{4}$/.test(gift.verifyPin || '')) { state.verifyPin = gift.verifyPin; $('#deliverySummaryVal').textContent = gift.verifyPin; }
    if (gift.cake) {
      for (const k of ['flavor', 'shape', 'font', 'accent', 'pattern', 'topper', 'greens', 'backdrop', 'music']) if (gift.cake[k]) state[k] = gift.cake[k];
      if (oldTumpeng) state.shape = 'tumpeng';
      t = applyTheme(state.occasion, state.shape);
      state.local = localKey(gift.cake.local); // older gifts: no country
      if (gift.cake.age) state.age = gift.cake.age;
      if (!NAME_FONTS[state.font]) state.font = DEFAULT_FONT;
      buildDecorate();
      if (gift.cake.name) { state.nameTouched = true; $('#cakeName').value = gift.cake.name; scene.setName(gift.cake.name); }
      if (Array.isArray(gift.cake.dots)) scene.setDots(gift.cake.dots);
      if (Array.isArray(gift.cake.stickers)) scene.stickers.set(gift.cake.stickers);
    }
    $('#saveDecorBtn').textContent = 'Save changes';
    $('#createBtn span').textContent = 'Save changes';
    $('#whoPill').textContent = 'Edit gift';
    renderCarousel();
    go('decorate');
  }).catch(() => {});
}
