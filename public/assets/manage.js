import { $, $$, h, api, icon, showScreen, slugFromPath, fmtAgo, addStars, copyText, colorFor, initials, toast } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { friendUrl, recipientUrl, qrSvg, shareRow, recipientCard, printQrCard } from './share.js';

addStars($('#app'), 16, 30);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const slug = slugFromPath();
const key = new URLSearchParams(location.search).get('k') || '';
let scene;

async function load() {
  let data;
  try {
    data = await api(`/api/manage?slug=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}`);
  } catch (e) {
    $('#errorText').textContent = e.message;
    return showScreen('error');
  }
  const { gift, openKey, messages } = data;
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
      h('span', { class: 'small', style: { color: m.sent ? '#7FE0B0' : 'var(--muted)', fontWeight: '700' } }, m.sent ? 'Sent' : 'Not sent')));
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
  $('#delivery').append(recipientCard(gift, openKey));
  $('#openReveal').href = recipientUrl(gift, openKey);
  $('#demoCard').hidden = messages.filter((m) => m.demo).length >= 12; // stays if a run was cut short
  showScreen('main');
}

$('#refresh').addEventListener('click', load);
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
