// /signup and /login: the form. /account: the logged-in organizer's gifts (or the log-in form when nobody is).
import { $, $$, h, api, icon, showScreen, addStars, toast } from './common.js';
import { me, logOut, authForm, giftItem } from './auth.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const WORDS = {
  signup: { path: '/signup', doc: 'Create an account', title: 'Create your account', lead: 'Make voice gifts and find every dashboard on any phone.' },
  login: { path: '/login', doc: 'Log in', title: 'Welcome back', lead: 'Log in to see your gifts.' }
};

function showAuth(mode) {
  // The address follows the form, so a reload (or a shared link) opens the same one.
  const words = (m) => {
    const w = WORDS[m];
    history.replaceState(null, '', w.path);
    document.title = `${w.doc} · Voice Gift`;
    $('#authTitle').textContent = w.title;
    $('#authLead').textContent = w.lead;
  };
  words(mode);
  $('#authBox').replaceChildren(authForm({ mode, onMode: words, onDone: showAccount }));
  showScreen('auth');
}

function showAccount(user) {
  history.replaceState(null, '', '/account');
  document.title = 'Your account · Voice Gift';
  $('#hello').textContent = `Hi, ${user.name}`;
  $('#meEmail').textContent = user.email;
  showScreen('me');
  return loadGifts();
}

async function loadGifts() {
  const list = $('#gifts');
  list.replaceChildren(h('div', { class: 'item small muted' }, 'Loading…'));
  try {
    const { gifts = [] } = await api('/api/account?gifts=1');
    list.replaceChildren(...(gifts.length
      ? gifts.map((g) => giftItem(g, () => { toast('Gift deleted'); loadGifts(); }))
      : [h('div', { class: 'item small muted' }, 'No gifts yet. Make your first one!')]));
  } catch (e) {
    list.replaceChildren(h('div', { class: 'item small muted' }, e.message));
  }
}

$('#logout').addEventListener('click', async () => {
  try {
    await logOut();
  } catch (e) {
    return toast(e.message);
  }
  toast('Logged out');
  showAuth('login');
});

me().then((user) => (user ? showAccount(user) : showAuth(location.pathname === '/signup' ? 'signup' : 'login')));
