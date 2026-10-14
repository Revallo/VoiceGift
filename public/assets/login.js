// Sign in (prototype: name + email, no password). Everyone comes here first: the organizer from /new,
// friends from /g/<slug>, the recipient from /r/<slug>. Afterwards it goes back to where they came from.
import { $, $$, h, api, icon, addStars, getUser } from './common.js';
import { createScene, applyTheme } from './themes.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon](14)));

const raw = new URLSearchParams(location.search).get('next') || '/me';
const next = /^\/(?!\/)/.test(raw) ? raw : '/me'; // only pages on this site
const [, kind, slug] = next.split('?')[0].split('/');

function say(eyebrow, title, lead) {
  $('#eyebrow').textContent = eyebrow;
  $('#title').textContent = title;
  $('#lead').textContent = lead;
}

// Tell them why they sign in, with the gift's scene when they came from a gift link.
async function context() {
  if (kind === 'new') return say('Create a gift', 'First, who are you?', 'Your gifts stay in your account, so you never lose a link.');
  if (kind !== 'g' && kind !== 'r') return;
  let data;
  try { data = await api(`/api/gift?slug=${encodeURIComponent(slug)}`, { quiet: true }); } catch { return; }
  const { gift, count } = data;
  const t = applyTheme(gift.occasion);
  const name = t.callName(gift.recipient);
  const scene = createScene($('#cake'), gift);
  if (kind === 'g') {
    say(`${gift.organizer} invited you`, t.inviteTitle(name), `Sign in first, so ${name} knows it’s really you. It takes 10 seconds.`);
    scene.setCandles(count, { spots: Math.max(12, count + 1) });
    scene.lightAll();
  } else {
    say(t.eyebrow(name), 'Sign in to open your gift', 'It will be kept in your account. Only you can open it, even if the link gets passed around.');
    scene.setCandles(count, { spots: Math.max(12, count) });
    scene.setDim(0.7);
  }
}

getUser().then((user) => {
  if (user) return location.replace(next); // already signed in
  try { $('#name').value = localStorage.getItem('vg-name') || ''; } catch {}
  context();
});

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  const email = $('#email').value.trim();
  const err = $('#error');
  err.hidden = true;
  if (!name || !email) {
    err.textContent = !name ? 'Please enter your name.' : 'Please enter your email.';
    err.hidden = false;
    return;
  }
  $('#go').disabled = true;
  try {
    await api('/api/auth', { method: 'POST', json: { name, email } });
    try { localStorage.setItem('vg-name', name); } catch {}
    location.replace(next);
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
    $('#go').disabled = false;
  }
});
