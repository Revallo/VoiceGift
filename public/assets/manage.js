import { $, $$, h, api, icon, showScreen, slugFromPath, fmtWhen, fmtAgo, addStars, copyText, waShare, colorFor, initials, toast } from './common.js';
import { createCake } from './cake.js';

addStars($('#app'), 16, 30);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));

const slug = slugFromPath();
const key = new URLSearchParams(location.search).get('k') || '';
let cake;

async function load() {
  let data;
  try {
    data = await api(`/api/manage?slug=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}`);
  } catch (e) {
    $('#errorText').textContent = e.message;
    return showScreen('error');
  }
  const { gift, messages } = data;
  const first = gift.recipient.split(/\s+/)[0];
  const sentMsgs = messages.filter((m) => m.sent);
  $('#title').textContent = `Gift for ${gift.recipient}`;
  $('#status').textContent = gift.unlocked
    ? `Opened on ${fmtWhen(gift.unlockAt)} · ${sentMsgs.length} ${sentMsgs.length === 1 ? 'message' : 'messages'}`
    : `Opens ${fmtWhen(gift.unlockAt)} · ${sentMsgs.length} ${sentMsgs.length === 1 ? 'message' : 'messages'} so far`;

  if (!cake) cake = createCake($('#cake'), gift.cake);
  cake.setCandles(sentMsgs.length, { spots: Math.max(12, sentMsgs.length) });
  cake.lightAll();

  const list = $('#list');
  list.textContent = '';
  if (!messages.length) list.append(h('div', { class: 'item small muted' }, 'Nobody yet. Share the link below.'));
  messages.forEach((m, i) => {
    list.append(h('div', { class: 'item' },
      h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('div', { class: 'grow' }, h('b', {}, m.sender), h('div', { class: 'small muted' }, `${fmtAgo(m.createdAt)} · ${Math.round(m.durationSec)} s${m.edited ? ' · fixed the caption' : ''}`)),
      h('span', { class: 'small', style: { color: m.sent ? '#7FE0B0' : 'var(--muted)', fontWeight: '700' } }, m.sent ? 'Sent' : 'Not sent')));
  });

  const friend = `${location.origin}/g/${gift.slug}`;
  const recip = `${location.origin}/r/${gift.slug}`;
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
  wa.append(h('span', {}, 'Share to WhatsApp'));
  wa.href = waShare(`Yuk rekam ucapan 15 detik buat ${first}! Rahasia ya. Dibuka ${fmtWhen(gift.unlockAt)}.\n${friend}`);
  $('#openReveal').href = recip;
  $('#demoCard').hidden = gift.unlocked;
  showScreen('main');
}

$('#refresh').addEventListener('click', load);
$('#unlockNow').addEventListener('click', async () => {
  if (!confirm('Open the gift now? Anyone with the recipient link will be able to listen.')) return;
  try {
    await api('/api/manage', { method: 'POST', json: { slug, key, action: 'unlock-now' } });
    toast('The gift is open');
    load();
  } catch (e) {
    toast(e.message);
  }
});

load();
