import { $, $$, h, api, icon, showScreen, copyText, waShare, addStars, fmtWhen } from './common.js';
import { createCake, FLAVORS, BRUSHES } from './cake.js';
import qrcode from './vendor/qrcode.js'; // qrcode-generator 2.0.4 (MIT)

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));

const state = { occasion: 'birthday', flavor: 'strawberry', brush: 0, cakeNameTouched: false };

// ---------- step 1 ----------
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function nextMidnight() {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
}
const unlock = $('#unlock');
unlock.value = toLocalInput(nextMidnight());
function updateLockNote() {
  const d = new Date(unlock.value);
  $('#lockNote').innerHTML = icon.lock(14);
  $('#lockNote').append(h('span', {}, Number.isNaN(+d) ? 'Choose a date and time.' : `Locked until ${fmtWhen(d.toISOString())}. Nobody can listen before then.`));
}
updateLockNote();
unlock.addEventListener('input', updateLockNote);
$('#atMidnight').addEventListener('click', () => { unlock.value = toLocalInput(nextMidnight()); updateLockNote(); });
$('#inTwo').addEventListener('click', () => { unlock.value = toLocalInput(new Date(Date.now() + 2 * 60 * 1000)); updateLockNote(); });

$('#whoForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const recipient = $('#recipient').value.trim();
  const organizer = $('#organizer').value.trim();
  const err = $('#whoError');
  const when = new Date(unlock.value);
  let msg = '';
  if (!recipient) msg = 'Please enter who the gift is for.';
  else if (Number.isNaN(+when)) msg = 'Please choose when it should open.';
  else if (!organizer) msg = 'Please enter your name.';
  err.hidden = !msg;
  err.textContent = msg;
  if (msg) return;
  if (!state.cakeNameTouched) $('#cakeName').value = recipient.split(/\s+/)[0].slice(0, 14);
  cake.setName($('#cakeName').value);
  showScreen('decorate');
});

// ---------- step 2 ----------
const cake = createCake($('#decorCake'), { flavor: state.flavor, name: '' });
cake.setCandles(0, { spots: 12 });

const hit = document.createElement('div');
hit.className = 'draw-hit';
hit.setAttribute('aria-label', 'Draw on the cake');
cake.stage.append(hit);
hit.addEventListener('pointerdown', (e) => {
  hit.setPointerCapture?.(e.pointerId);
  cake._drawing = false;
  const p = cake.toStage(e);
  cake.addDot(p.x, p.y, state.brush);
  cake._drawing = true;
});
hit.addEventListener('pointermove', (e) => {
  if (!cake._drawing) return;
  const p = cake.toStage(e);
  cake.addDot(p.x, p.y, state.brush);
});
const endDraw = () => (cake._drawing = false);
hit.addEventListener('pointerup', endDraw);
hit.addEventListener('pointercancel', endDraw);

function renderSwatches() {
  const fl = $('#flavors');
  fl.textContent = '';
  for (const [key, f] of Object.entries(FLAVORS)) {
    fl.append(h('button', { type: 'button', class: 'swatch' + (key === state.flavor ? ' on' : ''), 'aria-label': f.label, onclick: () => { state.flavor = key; cake.setFlavor(key); renderSwatches(); } },
      h('i', { style: { background: f.b1, boxShadow: `inset 0 9px 0 ${f.frost}` } })));
  }
  const br = $('#brushes');
  br.textContent = '';
  BRUSHES.slice(0, 4).forEach((c, i) => {
    br.append(h('button', { type: 'button', class: 'swatch brush' + (i === state.brush ? ' on' : ''), 'aria-label': `Brush color ${i + 1}`, onclick: () => { state.brush = i; renderSwatches(); } },
      h('i', { style: { background: c } })));
  });
}
renderSwatches();
$('#cakeName').addEventListener('input', (e) => { state.cakeNameTouched = true; cake.setName(e.target.value); });
$('#clearDraw').addEventListener('click', () => cake.setDots([]));
$('#backWho').addEventListener('click', () => showScreen('who'));

$('#createBtn').addEventListener('click', async () => {
  const btn = $('#createBtn');
  const err = $('#createError');
  btn.disabled = true;
  btn.textContent = 'Creating…';
  err.hidden = true;
  try {
    const body = {
      recipient: $('#recipient').value.trim(),
      organizer: $('#organizer').value.trim(),
      occasion: state.occasion,
      unlockAt: new Date(unlock.value).toISOString(),
      cake: { flavor: state.flavor, name: $('#cakeName').value.trim(), dots: cake.getDots() }
    };
    const res = await api('/api/gifts', { method: 'POST', json: body });
    try {
      const mine = JSON.parse(localStorage.getItem('vg-mine') || '[]');
      mine.push({ slug: res.slug, key: res.manageKey, recipient: body.recipient, unlockAt: body.unlockAt });
      localStorage.setItem('vg-mine', JSON.stringify(mine.slice(-20)));
    } catch {}
    showShare(res, body);
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create the gift';
  }
});

// ---------- step 3 ----------
function showShare(res, body) {
  const origin = location.origin;
  const friend = `${origin}/g/${res.slug}`;
  const recip = `${origin}/r/${res.slug}`;
  const first = body.recipient.split(/\s+/)[0];
  $('#shareLead').textContent = `Send it to friends and family. Not to ${first}: it’s a surprise.`;
  $('#friendLink').textContent = friend.replace(/^https?:\/\//, '');
  $('#recipientLink').textContent = recip.replace(/^https?:\/\//, '');
  $('#recipientTitle').textContent = `Link for ${first}`;
  for (const [id, url] of [['#copyFriend', friend], ['#copyRecipient', recip]]) {
    const b = $(id);
    b.innerHTML = icon.copy(14);
    b.append(h('span', {}, 'Copy'));
    b.onclick = () => copyText(url);
  }
  const wa = $('#waBtn');
  wa.innerHTML = icon.share(18);
  wa.append(h('span', {}, 'Share to a WhatsApp group'));
  wa.href = waShare(`Yuk rekam ucapan 15 detik buat ${first}! Rahasia ya, jangan bilang dia. Dibuka ${fmtWhen(body.unlockAt)}.\n${friend}`);
  const qr = qrcode(0, 'M');
  qr.addData(friend);
  qr.make();
  $('#qr').innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
  $('#manageBtn').href = `/m/${res.slug}?k=${res.manageKey}`;
  showScreen('share');
}
