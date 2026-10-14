import { $, $$, h, api, icon, showScreen, slugFromPath, fmtAgo, addStars, copyText, colorFor, initials, toast, requireSignIn } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { friendUrl, recipientUrl, qrSvg, shareRow, recipientCard, printQrCard } from './share.js';

addStars($('#app'), 16, 30);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const slug = slugFromPath();
const key = new URLSearchParams(location.search).get('k') || ''; // only gifts made before accounts
let scene;

async function load() {
  await requireSignIn();
  let data;
  try {
    data = await api(`/api/manage?slug=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}`);
  } catch (e) {
    $('#errorText').textContent = e.message;
    return showScreen('error');
  }
  const { gift, openKey, opened, messages } = data;
  const t = applyTheme(gift.occasion);
  const name = t.callName(gift.recipient);
  const sentMsgs = messages.filter((m) => m.sent);
  const msgs = `${sentMsgs.length} ${sentMsgs.length === 1 ? 'message' : 'messages'}`;
  $('#title').textContent = `Gift for ${gift.recipient}`;
  $('#status').textContent = `${msgs} so far`;

  if (!scene) scene = createScene($('#cake'), gift);
  scene.setCandles(sentMsgs.length, { spots: Math.max(12, sentMsgs.length) });
  scene.lightAll();

  const list = $('#list');
  list.textContent = '';
  if (!messages.length) list.append(h('div', { class: 'item small muted' }, 'Nobody yet. Share the link below.'));
  messages.forEach((m, i) => {
    list.append(h('div', { class: 'item' },
      h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('div', { class: 'grow' }, h('b', {}, m.sender), h('div', { class: 'small muted' }, `${fmtAgo(m.createdAt)} · ${Math.round(m.durationSec)} s${m.demo ? ' · demo voice' : m.edited ? ' · fixed the caption' : ''}`)),
      h('span', { class: 'small', style: { color: m.sent ? '#7FE0B0' : 'var(--muted)', fontWeight: '700' } }, m.sent ? 'Sent' : 'Not sent'),
      h('button', { type: 'button', class: 'del', 'aria-label': `Delete ${m.sender}'s message`, html: icon.x(), onclick: () => remove(m) })));
  });

  const friend = friendUrl(gift);
  $('#inviteTitle').textContent = gift.occasion === 'wedding' ? 'Invite more guests' : 'Invite more friends';
  $('#friendLink').textContent = friend.replace(/^https?:\/\//, '');
  const b = $('#copyFriend');
  b.innerHTML = icon.copy(14);
  b.append(h('span', {}, 'Copy'));
  b.onclick = () => copyText(friend);
  $('#waBtn').replaceWith(Object.assign(shareRow(t.waFriends(name), friend), { id: 'waBtn' }));
  $('#qr').innerHTML = qrSvg(friend);
  $('#printQr').innerHTML = icon.print(14);
  $('#printQr').append(h('span', {}, 'Print'));
  $('#printQr').onclick = () => printQrCard(gift);

  $('#delivery').textContent = '';
  $('#delivery').append(opened ? openedCard(name, opened) : recipientCard(gift, openKey));
  $('#openReveal').href = recipientUrl(gift, openKey);
  $('#demoCard').hidden = messages.filter((m) => m.demo).length >= 12; // stays if a run was cut short
  showScreen('main');
}

// Once the recipient opened it, the gift belongs to their account. If the wrong person got the link,
// the organizer takes it back: a new link for the recipient, and the old one stops working.
function openedCard(name, opened) {
  return h('div', { class: 'card stack' },
    h('div', {}, h('b', {}, `${name} opened it`),
      h('div', { class: 'small muted' }, `${fmtAgo(opened.at)} with the account ${opened.name} · ${opened.email}. Only this account can listen now.`)),
    h('button', { type: 'button', class: 'btn ghost sm', style: { alignSelf: 'flex-start' }, onclick: unclaim }, 'Not them? Make a new link'));
}
async function unclaim() {
  if (!confirm('Take the gift back from this account? They lose access, and you get a new link to send.')) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'unclaim' } });
    toast('Done. Send the new link below.');
    await load();
  } catch (e) {
    toast(e.message);
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
$('#deleteGift').addEventListener('click', async () => {
  if (!confirm("Delete this whole gift, with every message and recording? This can't be undone.")) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'delete-gift' } });
    location.href = '/me';
  } catch (e) {
    toast(e.message);
  }
});
$('#addDemo').addEventListener('click', async () => {
  const b = $('#addDemo');
  b.disabled = true;
  b.textContent = 'Adding 12 voices…';
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'add-demo' } });
    toast('12 demo voices added');
    await load();
  } catch (e) {
    toast(e.message);
  } finally {
    b.disabled = false;
    b.textContent = 'Add 12 demo voices';
  }
});
load();
