import { $, $$, h, api, icon, showScreen, slugFromPath, fmtAgo, addStars, copyText, colorFor, initials, toast, openSheet, closeSheet } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { friendUrl, recipientUrl, shareRow, linkbox } from './share.js';
import { me } from './auth.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const slug = slugFromPath();
const key = new URLSearchParams(location.search).get('k') || '';
let scene;
let previewAudio = null, previewBtn = null, previewId = '';

function togglePreview(id, btn) {
  if (previewAudio && previewId === id && !previewAudio.paused) {
    previewAudio.pause();
    return;
  }
  if (previewAudio) {
    previewAudio.pause();
    if (previewBtn) { previewBtn.classList.remove('playing'); previewBtn.innerHTML = icon.play(11); }
  }
  previewId = id;
  previewBtn = btn;
  previewAudio = new Audio(`/api/audio?slug=${encodeURIComponent(slug)}&id=${encodeURIComponent(id)}&k=${encodeURIComponent(key)}`);
  btn.classList.add('playing');
  btn.innerHTML = icon.pause(11);
  previewAudio.onpause = () => { btn.classList.remove('playing'); btn.innerHTML = icon.play(11); };
  previewAudio.onended = () => { btn.classList.remove('playing'); btn.innerHTML = icon.play(11); };
  previewAudio.play().catch(() => { btn.classList.remove('playing'); btn.innerHTML = icon.play(11); });
}

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
  const t = applyTheme(gift.occasion);
  const name = t.callName(gift.recipient);
  const sentMsgs = messages.filter((m) => m.sent);
  document.title = `For ${gift.recipient} · Voice Gift`;
  $('#title').textContent = `For ${gift.recipient}`;
  $('#editDesignLink').href = `/new?edit=${encodeURIComponent(slug)}&k=${encodeURIComponent(key)}`;

  // the gift: one item per voice so far
  $('#cake').textContent = '';
  const scene = createScene($('#cake'), gift);
  scene.setCandles(sentMsgs.length, { spots: Math.max(12, sentMsgs.length) });
  scene.lightAll();

  // 1. invite friends
  const friends = gift.occasion === 'wedding' ? 'guests' : 'friends';
  const friend = friendUrl(gift);
  $('#inviteTitle').textContent = `Invite ${friends} to record`;
  $('#inviteLead').textContent = `Send this link to ${friends}. Each one records a 15-second wish for ${name}. Keep it a secret from ${name}!`;
  $('#friendLink').textContent = friend.replace(/^https?:\/\//, '');
  const b = $('#copyFriend');
  b.innerHTML = icon.copy(14);
  b.append(h('span', {}, 'Copy'));
  b.onclick = () => copyText(friend);
  $('#waBtn').replaceWith(Object.assign(shareRow(t.waFriends(name), friend), { id: 'waBtn' }));

  // 2. who recorded (names only: what they said is for the recipient)
  $('#whoTitle').textContent = `Who recorded (${sentMsgs.length})`;
  const list = $('#list');
  list.textContent = '';
  if (!messages.length) list.append(h('p', { class: 'small muted', style: { margin: 0 } }, `Nobody yet. Send the link above to your ${friends}.`));
  messages.forEach((m, i) => {
    // Only demo voices can be played here: friends' voices are for the recipient, not even for the organizer.
    const playBtn = m.demo && h('button', { type: 'button', class: 'play-mini', 'aria-label': `Play ${m.sender}'s voice`, html: icon.play(11), onclick: () => togglePreview(m.id, playBtn) });
    list.append(h('div', { class: 'who-row' },
      h('span', { class: 'avatar', style: { background: colorFor(i) } }, initials(m.sender)),
      h('div', { class: 'grow', style: { minWidth: 0 } },
        h('b', {}, m.sender),
        h('div', { class: 'tiny muted' }, `${fmtAgo(m.createdAt)} · ${Math.round(m.durationSec)}s${m.demo ? ' · demo' : m.sent ? '' : ' · not sent yet'}`)),
      playBtn,
      h('button', { type: 'button', class: 'del', 'aria-label': `Delete ${m.sender}'s message`, html: icon.x(12), onclick: () => remove(m) })));
  });
  $('#addDemo').hidden = messages.filter((m) => m.demo).length >= 12; // stays if a run was cut short

  // 3. send it to the recipient: their link + the PIN
  const pin = gift.verifyPin || '1234';
  const url = recipientUrl(gift, openKey);
  $('#sendTitle').textContent = `Send it to ${name}`;
  $('#sendLead').textContent = `When everyone has recorded (e.g. at 00:00), send ${name} this link and the PIN.`;
  $('#pinVal').textContent = pin;
  $('#recipientBox').replaceChildren(linkbox(url), shareRow(`${t.waRecipient(name)}
PIN: ${pin}`, url));
  $('#openReveal').href = url;
  $('#openReveal').textContent = `Preview what ${name} sees`;
  $('#openReveal').title = `Your preview only plays demo voices. Your friends’ voices are only for ${name}.`;
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
    h('div', { class: 'field' }, h('label', {}, 'PIN (4 digits)'), pinIn), saveBtn);
  openSheet({ title: 'PIN', subtitle: `${current.gift.recipient} types these 4 digits to open the gift`, content: form });
  setTimeout(() => pinIn.focus(), 60);
});

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
    try { localStorage.setItem('vg-mine', JSON.stringify(JSON.parse(localStorage.getItem('vg-mine') || '[]').filter((g) => g.slug !== slug))); } catch {}
    location.href = (await me()) ? '/account' : '/';
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
    b.textContent = '+ Add 12 demo voices';
  }
});
load();
