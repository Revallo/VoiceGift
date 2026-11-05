import { $, $$, h, api, icon, showScreen, copyText, addStars, toast, initials } from './common.js';
import { BRUSHES } from './stage.js';
import { THEMES, theme, createScene, applyTheme } from './themes.js';
import { friendUrl, qrSvg, shareRow, printQrCard } from './share.js';
import { me, forgetMe, authForm } from './auth.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const params = new URLSearchParams(location.search);
const state = { occasion: THEMES[params.get('occasion')] ? params.get('occasion') : 'birthday', flavor: '', brush: 0, nameTouched: false, sel: -1, created: null };
let t = theme(state.occasion);
const MAX_STICKERS = 30;

// ---------- steps + back ----------
function go(screen) {
  history.pushState({ screen }, '');
  showScreen(screen);
}
history.replaceState({ screen: 'who' }, '');
window.addEventListener('popstate', (e) => showScreen(e.state?.screen || 'who'));
$$('[data-back]').forEach((b) => b.addEventListener('click', () => history.back()));

// ---------- step 1 ----------
let whoScene;
function updateWhoPill() {
  const rec = $('#recipient').value.trim();
  const defName = state.occasion === 'wedding' ? 'Rina & Bayu' : state.occasion === 'graduation' ? 'Nadia' : 'Dimas';
  if ($('#whoAvatar')) $('#whoAvatar').textContent = initials(rec || defName);
  if ($('#whoPillName')) $('#whoPillName').textContent = rec ? `For ${rec}` : 'New voice gift';
  if ($('#whoPillSub')) $('#whoPillSub').textContent = `**** ${state.occasion} transfer`;
}

function renderWhoPreview() {
  const host = $('#whoPreview');
  if (!host) return;
  host.textContent = '';
  const rec = $('#recipient').value.trim() || (state.occasion === 'wedding' ? 'Rina & Bayu' : state.occasion === 'graduation' ? 'Nadia' : 'Dimas');
  whoScene = createScene(host, {
    occasion: state.occasion,
    recipient: rec,
    cake: { flavor: state.flavor || t.decorate.flavor, name: t.decorate.name(rec) }
  });
  whoScene.setCandles(8);
  whoScene.lightAll();
}

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
  state.flavor = t.decorate.flavor;
  state.nameTouched = false;
  updateWhoPill();
  renderWhoPreview();
  buildDecorate();
}
$$('#occasions .chip').forEach((c) => c.addEventListener('click', () => { if (c.dataset.v !== state.occasion) setOccasion(c.dataset.v); }));
$('#recipient').addEventListener('input', () => {
  updateWhoPill();
  const rec = $('#recipient').value.trim() || (state.occasion === 'wedding' ? 'Rina & Bayu' : state.occasion === 'graduation' ? 'Nadia' : 'Dimas');
  if (whoScene) {
    whoScene.setName(t.decorate.name(rec));
    whoScene.setNames?.(rec);
  }
});

$('#whoPreviewToggle')?.addEventListener('click', () => {
  const dr = $('#whoPreviewDrawer');
  if (!dr) return;
  dr.hidden = !dr.hidden;
  $('#whoPreviewToggle').textContent = dr.hidden ? 'preview' : 'hide';
  if (!dr.hidden) renderWhoPreview();
});

$('#decorToolsToggle')?.addEventListener('click', () => {
  const card = $('#decorToolsCard');
  if (!card) return;
  card.hidden = !card.hidden;
  $('#decorToolsToggle').textContent = card.hidden ? 'show tools' : 'customize';
});
// Logged in: "Your name" starts as the account's name.
me().then((u) => { if (u && !$('#organizer').value.trim()) $('#organizer').value = u.name; });

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
  $('#nameLabel').textContent = d.nameLabel;
  $('#drawRow').hidden = !d.draw;
  const name = $('#cakeName');
  name.maxLength = d.nameMax;
  name.placeholder = d.namePlaceholder || '';
  name.value = d.name($('#recipient').value.trim());
  name.style.fontSize = d.nameMax > 20 ? '14px' : '';

  const host = $('#decorCake');
  host.textContent = '';
  scene = createScene(host, { occasion: state.occasion, recipient: $('#recipient').value.trim(), cake: { flavor: state.flavor, name: name.value } });
  scene.setCandles(0, { spots: 12 });
  scene.lightAll();
  if (d.draw && scene.drawArea) {
    const a = scene.drawArea;
    const hit = h('div', { class: 'draw-hit', 'aria-label': 'Draw with your finger', style: { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` } });
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
  renderSwatches();
  renderStickerTray();
}

function renderSwatches() {
  const d = t.decorate;
  const fl = $('#flavors');
  fl.textContent = '';
  for (const [key, f] of Object.entries(d.swatches)) {
    fl.append(h('button', { type: 'button', class: 'swatch' + (key === state.flavor ? ' on' : ''), 'aria-label': f.label, title: f.label, onclick: () => { state.flavor = key; scene.setFlavor(key); renderSwatches(); } },
      h('i', { style: d.swatch(f) })));
  }
  const br = $('#brushes');
  br.textContent = '';
  BRUSHES.forEach((c, i) => {
    br.append(h('button', { type: 'button', class: 'swatch brush' + (i === state.brush ? ' on' : ''), 'aria-label': `Brush color ${i + 1}`, onclick: () => { state.brush = i; renderSwatches(); } },
      h('i', { style: { background: c } })));
  });
}

// ---------- stickers ----------
function renderStickerTray() {
  const tray = $('#stickerTray');
  tray.textContent = '';
  for (const emoji of t.decorate.stickers) {
    tray.append(h('button', { type: 'button', class: 'sticker-btn', 'aria-label': `Add sticker ${emoji}`, onclick: () => addSticker(emoji) }, emoji));
  }
}

function addSticker(emoji) {
  const list = scene.stickers.get();
  if (list.length >= MAX_STICKERS) return toast(`Up to ${MAX_STICKERS} stickers`);
  // Land near the middle of the scene, a little apart from the last one.
  const { w, h: hgt } = scene.size;
  const x = Math.round(w / 2 + (Math.random() - 0.5) * 160);
  const y = Math.round(hgt * 0.6 + (Math.random() - 0.5) * 90);
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

// Create the gift, or save the changes when the organizer came back from step 3.
$('#createBtn').addEventListener('click', async () => {
  if (!state.created && !(await me())) return askAccount(); // a new gift needs an account
  const btn = $('#createBtn');
  const err = $('#createError');
  const label = state.created ? 'Save changes' : 'Create the gift';
  btn.disabled = true;
  btn.textContent = state.created ? 'Saving…' : 'Creating…';
  err.hidden = true;
  try {
    const body = {
      recipient: $('#recipient').value.trim(),
      organizer: $('#organizer').value.trim(),
      occasion: state.occasion,
      cake: { flavor: state.flavor, name: $('#cakeName').value.trim(), dots: t.decorate.draw ? scene.getDots() : [], stickers: scene.stickers.get() }
    };
    if (state.created) {
      await api('/api/gifts', { method: 'PATCH', json: { ...body, slug: state.created.slug, key: state.created.manageKey } });
      toast('Saved');
    } else {
      state.created = await api('/api/gifts', { method: 'POST', json: body }); // listed on the account page
    }
    showShare({ ...body, slug: state.created.slug }, state.created.manageKey);
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
// Create an account or log in, then back to step 2, which creates the gift. So step 3's back still goes to step 2.
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

// ---------- step 3 ----------
function showShare(gift, manageKey) {
  const friend = friendUrl(gift);
  const name = t.callName(gift.recipient);
  if ($('#shareHeroTitle')) $('#shareHeroTitle').textContent = `For ${name}`;
  $('#shareLead').textContent = gift.occasion === 'wedding'
    ? `share with guests`
    : `keep secret from ${name}`;
  $('#friendLink').textContent = friend.replace(/^https?:\/\//, '');
  const b = $('#copyFriend');
  b.innerHTML = icon.copy(14);
  b.append(h('span', {}, 'Copy'));
  b.onclick = () => copyText(friend);
  $('#waBtn').replaceWith(Object.assign(shareRow(t.waFriends(name), friend), { id: 'waBtn' }));
  $('#qr').innerHTML = qrSvg(friend);
  $('#qrNote').textContent = 'scan to record';
  $('#printQr').innerHTML = icon.print(14);
  $('#printQr').append(h('span', {}, 'Print'));
  $('#printQr').onclick = () => printQrCard(gift);
  $('#manageBtn').href = `/m/${gift.slug}?k=${manageKey}`;
  const sp = $('#sharePreview');
  if (sp) {
    sp.textContent = '';
    const s = createScene(sp, gift);
    s.setCandles(1, { spots: 12 });
    s.lightAll();
  }
  go('share');
}

setOccasion(state.occasion);

// Support /new?edit=slug&k=key from the Dashboard's "customize" button
const editSlug = params.get('edit');
const editKey = params.get('k');
if (editSlug && editKey) {
  api(`/api/manage?slug=${encodeURIComponent(editSlug)}&key=${encodeURIComponent(editKey)}`).then(({ gift }) => {
    state.created = { slug: gift.slug, manageKey: editKey };
    setOccasion(gift.occasion);
    $('#recipient').value = gift.recipient || '';
    $('#organizer').value = gift.organizer || '';
    updateWhoPill();
    if (gift.cake) {
      if (gift.cake.flavor) { state.flavor = gift.cake.flavor; scene.setFlavor(gift.cake.flavor); renderSwatches(); }
      if (gift.cake.name) { state.nameTouched = true; $('#cakeName').value = gift.cake.name; scene.setName(gift.cake.name); }
      if (Array.isArray(gift.cake.dots)) scene.setDots(gift.cake.dots);
      if (Array.isArray(gift.cake.stickers)) scene.stickers.set(gift.cake.stickers);
    }
    $('#createBtn').textContent = 'Save changes';
    go('decorate');
  }).catch(() => {});
}
