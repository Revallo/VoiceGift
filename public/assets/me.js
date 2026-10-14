// My gifts: everything of this account in one place, instead of links scattered over chats.
import { $, $$, h, api, icon, addStars, showScreen, requireSignIn, signOut } from './common.js';
import { theme } from './themes.js';

addStars($('#app'), 16, 30);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

function row(href, title, sub, action, actionColor = 'var(--gold)') {
  return h('a', { class: 'item', href, style: { color: '#fff', textDecoration: 'none' } },
    h('div', { class: 'grow' }, h('b', {}, title), h('div', { class: 'small muted' }, sub)),
    h('span', { class: 'small', style: { color: actionColor, fontWeight: '700' } }, action));
}
function fill(id, items, toRow, empty) {
  const box = $(`#${id}`);
  const list = $('.list', box);
  list.textContent = '';
  items.forEach((x) => list.append(toRow(x)));
  if (!items.length && empty) list.append(h('div', { class: 'item small muted' }, empty));
  box.hidden = !items.length && !empty;
}

async function load() {
  await requireSignIn();
  const d = await api('/api/me');
  $('#hello').textContent = `Hi, ${d.user.name}`;
  $('#email').textContent = d.user.email;
  const em = (g) => theme(g.occasion).emoji;
  fill('received', d.received, (g) => row(`/r/${g.slug}`, `${em(g)} ${theme(g.occasion).greeting(theme(g.occasion).callName(g.recipient))}`, `From ${g.organizer} and friends`, 'Open'));
  fill('made', d.made, (g) => row(`/m/${g.slug}`, `${em(g)} For ${g.recipient}`,
    `${g.count} ${g.count === 1 ? 'message' : 'messages'} · ${g.opened ? `${theme(g.occasion).callName(g.recipient)} opened it` : 'not sent yet'}`, 'Dashboard'),
  'No gifts yet. Make one for someone’s birthday, graduation or wedding.');
  fill('recorded', d.recorded, (m) => row(`/g/${m.slug}`, `${em(m)} For ${m.recipient}`,
    `${m.sent ? 'Sent' : 'Not sent'} · ${m.opened ? 'they opened it' : 'still a secret'} · as “${m.sender}”`, 'Record another', 'var(--soft)'));
  showScreen('main');
}

$('#signOut').addEventListener('click', () => signOut('/'));
load();
