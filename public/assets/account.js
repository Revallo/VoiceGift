// /signup and /login: the form. /account: the logged-in organizer's gifts, profile, and settings.
import { $, $$, h, api, icon, showScreen, addStars, toast } from './common.js';
import { me, logOut, authForm, giftItem } from './auth.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

const WORDS = {
  signup: { path: '/signup', doc: 'Create an account', title: 'create your account', lead: 'keep your gifts, voice messages, and asr corpus synced everywhere.' },
  login: { path: '/login', doc: 'Log in', title: 'welcome back', lead: 'sign in to manage your gifts, profile settings, and asr corpus.' }
};

function showAuth(mode) {
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

function populateUserUI(user) {
  const initial = (user.name || user.email || 'U').trim()[0].toUpperCase();
  if ($('#acctAvatar')) $('#acctAvatar').textContent = initial;
  $('#hello').textContent = `hi, ${(user.name || 'organizer').toLowerCase()}`;
  $('#meEmail').textContent = user.email;
  if ($('#meBioLabel')) {
    $('#meBioLabel').textContent = user.bio ? user.bio.toLowerCase() : 'total asr corpus';
  }
  if ($('#profNameInput')) $('#profNameInput').value = user.name || '';
  if ($('#profBioInput')) $('#profBioInput').value = user.bio || '';
  if ($('#profEmailReadonly')) $('#profEmailReadonly').value = user.email || '';

  const prefs = user.prefs || {};
  if ($('#prefLang')) $('#prefLang').value = prefs.asrLang || 'id-ID';
  if ($('#prefHighlight')) $('#prefHighlight').checked = prefs.autoHighlight !== false;
  if ($('#prefCorpus')) $('#prefCorpus').checked = prefs.shareCorpus !== false;
}

function showAccount(user) {
  const keepHash = location.hash === '#settings' ? '#settings' : '';
  history.replaceState(null, '', `/account${keepHash}`);
  document.title = 'Your account · Voice Gift';
  populateUserUI(user);
  showScreen('me');
  if (keepHash === '#settings') {
    setTimeout(() => $('#settingsPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }
  return loadGifts();
}

$('#scrollSettingsBtn')?.addEventListener('click', () => {
  $('#settingsPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#profileForm')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const btn = $('#saveProfileBtn');
  if (btn) btn.disabled = true;
  try {
    const { user } = await api('/api/account', {
      method: 'PATCH',
      json: {
        name: $('#profNameInput').value.trim(),
        bio: $('#profBioInput').value.trim()
      }
    });
    populateUserUI(user);
    toast('Profile updated');
  } catch (e) {
    toast(e.message);
  } finally {
    if (btn) btn.disabled = false;
  }
});

async function savePrefs() {
  try {
    const { user } = await api('/api/account', {
      method: 'PATCH',
      json: {
        prefs: {
          asrLang: $('#prefLang')?.value || 'id-ID',
          autoHighlight: Boolean($('#prefHighlight')?.checked),
          shareCorpus: Boolean($('#prefCorpus')?.checked)
        }
      }
    });
    populateUserUI(user);
    toast('Preferences saved');
  } catch (e) {
    toast(e.message);
  }
}

$('#prefLang')?.addEventListener('change', savePrefs);
$('#prefHighlight')?.addEventListener('change', savePrefs);
$('#prefCorpus')?.addEventListener('change', savePrefs);

$('#passForm')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const currentPassword = $('#curPassInput').value;
  const newPassword = $('#newPassInput').value;
  try {
    await api('/api/account', {
      method: 'PATCH',
      json: { currentPassword, newPassword }
    });
    $('#curPassInput').value = '';
    $('#newPassInput').value = '';
    toast('Password updated');
  } catch (e) {
    toast(e.message);
  }
});

async function loadGifts() {
  const list = $('#gifts');
  list.replaceChildren(h('div', { class: 'item small muted' }, 'Loading…'));
  try {
    const { gifts = [], stats = {} } = await api('/api/account?gifts=1');
    if ($('#acctHeroVal')) {
      $('#acctHeroVal').textContent = `${stats.totalRecordings ?? 0} voices · ${Math.round(stats.totalAudioSec || 0)}s`;
    }
    list.replaceChildren(...(gifts.length
      ? gifts.map((g) => giftItem(g, () => { toast('Gift deleted'); loadGifts(); }))
      : [h('div', { class: 'item small muted' }, 'No gifts yet. Make your first one!')]));

    const statsBox = $('#acctStats');
    if (statsBox) {
      statsBox.replaceChildren(
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(stats.totalGifts ?? gifts.length)),
          h('span', { class: 'stat-lbl' }, 'gifts created')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(stats.totalRecordings ?? 0)),
          h('span', { class: 'stat-lbl' }, 'real voices collected')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(stats.captionsImproved ?? 0)),
          h('span', { class: 'stat-lbl' }, 'captions corrected')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, `${stats.wordsCorrected ?? 0} · ${Math.round(stats.totalAudioSec || 0)}s`),
          h('span', { class: 'stat-lbl' }, 'asr words fixed · audio')
        )
      );
    }
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

const wantDemo = new URLSearchParams(location.search).get('demo') === '1';
me().then(async (user) => {
  if (!user && wantDemo) {
    try {
      const res = await api('/api/account', { method: 'POST', json: { action: 'login', email: 'sari@voicegift.id', password: 'password123' } });
      return showAccount(res.user);
    } catch {}
  }
  return user ? showAccount(user) : showAuth(location.pathname === '/signup' ? 'signup' : 'login');
});
