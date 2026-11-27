import { $, $$, h, api, icon, showScreen, slugFromPath, fmtAgo, copyText, colorFor, initials, toast, openSheet, closeSheet } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { friendUrl, recipientUrl, shareRow, linkbox } from './share.js';
import { me } from './auth.js';

$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const slug = slugFromPath();
const key = new URLSearchParams(location.search).get('k') || '';
let scene;

let current = null; // { gift, openKey }

async function load() {
  let data;
  try {
    data = await api(`/api/manage?slug=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}`);
  } catch (e) {
    $('#errorText').textContent = e.message;
    return showScreen('error');
  }
  const { gift, openKey, messages } = data;
  current = { gift, openKey };
  const t = applyTheme(gift.occasion, gift.cake?.shape, gift.cake?.family);
  const name = t.callName(gift.recipient);
  const sentMsgs = messages.filter((m) => m.sent);
  document.title = `For ${gift.recipient} · Voice Gift`;
  $('#title').textContent = `For ${gift.recipient}`;
  $('#editDesignLink').href = `/new?edit=${encodeURIComponent(slug)}&k=${encodeURIComponent(key)}`;

  // the gift: one item per voice so far
  $('#cake').textContent = '';
  const scene = createScene($('#cake'), gift);
  scene.setCandles(sentMsgs.length, { spots: sentMsgs.length || 12, styles: sentMsgs.map((m) => m.candle) });
  scene.lightAll();

  // 1. invite friends
  const friends = t.who.many; // friends, or guests at a wedding
  const friend = friendUrl(gift);
  $('#inviteActSub').textContent = friends;
  $('#inviteLead').textContent = `Send it to ${friends}. Keep it secret from ${name}!`;
  $('#friendLink').textContent = friend.replace(/^https?:\/\//, '');
  const b = $('#copyFriend');
  b.innerHTML = icon.copy(14);
  b.append(h('span', {}, 'Copy'));
  b.onclick = () => copyText(friend);
  $('#waBtn').replaceWith(Object.assign(shareRow(t.waFriends(name), friend), { id: 'waBtn' }));

  // 2. who recorded (names only: what they said is for the recipient)
  $('#voicesActCount').textContent = sentMsgs.length;
  const pile = $('#facepile');
  pile.replaceChildren(...messages.slice(0, 6).map((m, i) => h('i', { style: { background: colorFor(i) } }, initials(m.sender))),
    h('span', {}, messages.length ? `${sentMsgs.length} ${sentMsgs.length === 1 ? 'voice' : 'voices'}` : `No voices yet`));
  const list = $('#list');
  list.textContent = '';
  if (!messages.length) list.append(h('p', { class: 'small muted', style: { margin: 0 } }, `Nobody yet. Invite your ${friends}.`));
  messages.forEach((m, i) => {
    list.append(h('div', { class: 'who-row' },
      h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('div', { class: 'grow', style: { minWidth: 0 } },
        h('b', {}, m.sender),
        h('div', { class: 'tiny muted' }, `${m.demo ? 'demo · ' : ''}${fmtAgo(m.createdAt)} · ${Math.round(m.durationSec)}s${m.sent ? '' : ' · not sent yet'}`)),
      h('button', { type: 'button', class: 'del', 'aria-label': `Delete ${m.sender}'s message`, html: icon.x(12), onclick: () => remove(m) })));
  });

  // Demo messages: the server says how many there are; "more" brings back ones deleted one by one.
  const demos = messages.filter((m) => m.demo).length;
  const demoMax = data.demoCount || 5;
  const demoBtn = $('#demoBtn');
  demoBtn.hidden = !demos && data.demoAvailable === false; // no recordings yet for this occasion
  demoBtn.textContent = demos ? `Remove demos` : `+ ${demoMax} demo voices`;
  demoBtn.onclick = () => demoAction(demos ? 'remove-demo' : 'add-demo', demoBtn);
  const moreDemos = $('#demoMoreBtn');
  moreDemos.hidden = !(demos > 0 && demos < demoMax);
  moreDemos.textContent = `+ ${demoMax - demos} more demos`;
  moreDemos.onclick = () => demoAction('add-demo', moreDemos);

  // 3. send it to the recipient: their link + the PIN
  const pin = gift.verifyPin || '1234';
  const url = recipientUrl(gift, openKey);
  $('#sendActSub').textContent = `To ${name}`;
  $('#sendLead').textContent = `When everyone’s in (e.g. at 00:00), send ${name} the link and the PIN.`;
  $('#pinVal').textContent = pin;
  $('#recipientBox').replaceChildren(linkbox(url), shareRow(`${t.waRecipient(name)}
PIN: ${pin}`, url));
  showScreen('main');
}

// Change the PIN: exactly 4 digits.
$('#pinRow').addEventListener('click', () => {
  const pinIn = h('input', { class: 'input pin-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]{4}', maxlength: 4, autocomplete: 'off', value: current.gift.verifyPin || '1234', placeholder: '1234',
    oninput: () => { pinIn.value = pinIn.value.replace(/\D/g, '').slice(0, 4); } });
  const saveBtn = h('button', { type: 'submit', class: 'btn' }, 'Save PIN');
  const form = h('form', { class: 'stack', style: { gap: '12px' }, onsubmit: async (ev) => {
    ev.preventDefault();
    const pin = pinIn.value.replace(/\D/g, '');
    if (pin.length !== 4) return toast('The PIN needs 4 digits.');
    saveBtn.disabled = true;
    try {
      await api('/api/manage', { method: 'POST', json: { slug, key, action: 'update-delivery', verifyPin: pin } });
      closeSheet();
      toast('PIN saved');
      await load();
    } catch (e) {
      toast(e.message);
    } finally {
      saveBtn.disabled = false;
    }
  } },
    pinIn, saveBtn);
  openSheet({ title: 'PIN', subtitle: `${current.gift.recipient} types it to open the gift`, content: form });
  setTimeout(() => pinIn.focus(), 60);
});

async function demoAction(action, btn) {
  if (action === 'remove-demo' && !confirm('Take the demo voices out of this gift?')) return;
  btn.disabled = true;
  btn.textContent = action === 'add-demo' ? 'Adding demo voices…' : 'Removing…';
  try {
    const r = await api('/api/manage', { method: 'POST', json: { slug, key, action } });
    toast(action === 'add-demo' ? `${r.added} demo voices added` : 'Demo voices removed');
  } catch (e) {
    toast(e.message);
  } finally {
    btn.disabled = false;
    await load();
  }
}

// Gone for good: the server deletes the message and its recording.
async function remove(m) {
  if (!confirm(`Delete ${m.sender}'s message? This can't be undone.`)) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'delete', id: m.id } });
    toast('Message deleted');
    await load();
  } catch (e) {
    toast(e.message);
  }
}

$('#refresh').addEventListener('click', load);

// The three actions: each opens its panel in a sheet. The panel goes back into the page when the sheet closes.
function sheetFor(panel, title) {
  const home = panel.parentElement, next = panel.nextSibling;
  panel.hidden = false;
  openSheet({ title, content: panel, onClose: () => { panel.hidden = true; home.insertBefore(panel, next); } });
}
$('#inviteAct').addEventListener('click', () => sheetFor($('#invitePanel'), 'Invite'));
$('#voicesAct').addEventListener('click', () => sheetFor($('#voicesPanel'), 'Who recorded'));
$('#facepile').addEventListener('click', () => sheetFor($('#voicesPanel'), 'Who recorded'));
$('#sendAct').addEventListener('click', () => sheetFor($('#sendPanel'), `Send it`));
$('#deleteGift').addEventListener('click', async () => {
  if (!confirm("Delete this whole gift, with every message and recording? This can't be undone.")) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'delete-gift' } });
    try { localStorage.setItem('vg-mine', JSON.stringify(JSON.parse(localStorage.getItem('vg-mine') || '[]').filter((g) => g.slug !== slug))); } catch {}
    location.href = (await me()) ? '/gifts' : '/';
  } catch (e) {
    toast(e.message);
  }
});
load();
