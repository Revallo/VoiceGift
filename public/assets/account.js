// /signup and /login: the form. /account: layered mobile-app profile & settings (progressive disclosure via bottom sheets).
import { $, $$, h, api, icon, showScreen, toast, openSheet, closeSheet, tabBar } from './common.js';
import { me, logOut, authForm, giftItem } from './auth.js';
import { applyTheme } from './themes.js';

$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

// What the person picked on the first page ("/"): from ?occasion= or inside ?next=/new?occasion=…
const THINGS = { birthday: 'cake', graduation: 'bouquet', wedding: 'lanterns' };
const picked = (() => {
  const q = new URLSearchParams(location.search);
  let o = q.get('occasion');
  try { o = o || new URL(q.get('next') || '/', location.origin).searchParams.get('occasion'); } catch {}
  return THINGS[o] ? o : null;
})();

const WORDS = {
  signup: { path: '/signup', doc: 'Create an account', title: 'Create your account' },
  login: { path: '/login', doc: 'Log in', title: 'Log in' }
};

// What happens after logging in, said in one line.
const nextPath = new URLSearchParams(location.search).get('next') || '';
const afterLogin = nextPath.startsWith('/r/') ? 'Then you can open your gift.'
  : nextPath.startsWith('/g/') ? 'Then you can record your message.'
  : picked ? `Then we’ll start on your ${THINGS[picked]}.`
  : 'Make a gift, or open one you received.';

let currentUser = null;
let latestStats = {};

function showAuth(mode) {
  tabBar(false);
  if (picked) applyTheme(picked); // same colors as the thing they picked
  const words = (m) => {
    const w = WORDS[m];
    history.replaceState(null, '', w.path + location.search); // keeps ?next=
    document.title = `${w.doc} · Voice Gift`;
    $('#authTitle').textContent = w.title;
    $('#authLead').textContent = afterLogin;
  };
  words(mode);
  $('#authBack').hidden = !picked;
  $('#authBack').href = picked ? `/new?occasion=${picked}` : '/';
  $('#authBox').replaceChildren(authForm({ mode, onMode: words, onDone: goOn }));
  showScreen('auth');
}

function populateUserUI(user) {
  currentUser = user;
  $('#hello').textContent = user.name || 'You';
  $('#meEmail').textContent = user.email;
  $('#rowProfileSub').textContent = user.bio || 'Your name and a line about you';
  const prefs = user.prefs || {};
  if ($('#rowPrefsVal')) {
    $('#rowPrefsVal').textContent = `${prefs.asrLang || 'id-ID'} · ${prefs.autoHighlight !== false ? 'auto' : 'off'}`;
  }
}

// 1. Bottom Sheet: Edit Personal Profile
function openEditProfileSheet() {
  if (!currentUser) return;
  const nameIn = h('input', { class: 'input', value: currentUser.name || '', maxlength: 60, required: true, placeholder: 'Your name' });
  const bioIn = h('input', { class: 'input', value: currentUser.bio || '', maxlength: 120, placeholder: 'A line about you' });
  const emailIn = h('input', { class: 'input', value: currentUser.email || '', disabled: true, style: { opacity: '0.55', cursor: 'not-allowed' } });
  const saveBtn = h('button', { type: 'submit', class: 'btn' }, 'Save');

  const form = h('form', {
    class: 'stack',
    style: { gap: '12px' },
    onsubmit: async (ev) => {
      ev.preventDefault();
      saveBtn.disabled = true;
      try {
        const { user } = await api('/api/account', {
          method: 'PATCH',
          json: { name: nameIn.value.trim(), bio: bioIn.value.trim() }
        });
        populateUserUI(user);
        closeSheet();
        toast('Profile updated');
      } catch (e) {
        toast(e.message);
      } finally {
        saveBtn.disabled = false;
      }
    }
  },
    h('div', { class: 'field' }, h('label', {}, 'Name'), nameIn),
    h('div', { class: 'field' }, h('label', {}, 'About you'), bioIn),
    h('div', { class: 'field' }, h('label', {}, 'Email'), emailIn),
    saveBtn
  );

  openSheet({
    title: 'Edit profile',
    content: form
  });
}

// 2. Bottom Sheet: Speech-to-Text & Language Preferences
function openAsrPrefsSheet() {
  if (!currentUser) return;
  const prefs = currentUser.prefs || {};
  const langSel = h('select', {
    class: 'input',
    style: { width: 'auto', minWidth: '152px', minHeight: '40px', padding: '0 12px', borderRadius: '12px', fontSize: '13px', background: 'var(--panel)' }
  },
    h('option', { value: 'id-ID', selected: (prefs.asrLang || 'id-ID') === 'id-ID' }, 'id-ID · Indonesia'),
    h('option', { value: 'en-US', selected: prefs.asrLang === 'en-US' }, 'en-US · English')
  );
  const chkHighlight = h('input', { type: 'checkbox', checked: prefs.autoHighlight !== false });
  const chkCorpus = h('input', { type: 'checkbox', checked: prefs.shareCorpus !== false });

  async function save() {
    try {
      const { user } = await api('/api/account', {
        method: 'PATCH',
        json: {
          prefs: {
            asrLang: langSel.value,
            autoHighlight: Boolean(chkHighlight.checked),
            shareCorpus: Boolean(chkCorpus.checked)
          }
        }
      });
      populateUserUI(user);
      toast('Speech-to-text preferences saved');
    } catch (e) {
      toast(e.message);
    }
  }
  langSel.addEventListener('change', save);
  chkHighlight.addEventListener('change', save);
  chkCorpus.addEventListener('change', save);

  openSheet({
    title: 'Speech-to-text settings',
    subtitle: 'Automatic transcription & word-confidence repair',
    content: h('div', { class: 'settings-group' },
      h('div', { class: 'toggle-row', style: { cursor: 'default' } },
        h('div', { class: 't-info' },
          h('b', {}, 'Default speech language'),
          h('span', {}, 'Primary language for browser + server ASR')
        ),
        langSel
      ),
      h('label', { class: 'toggle-row' },
        h('div', { class: 't-info' },
          h('b', {}, 'Highlight low-confidence words'),
          h('span', {}, 'Flag uncertain ASR words in amber for 1-tap repair')
        ),
        h('span', { class: 'switch' }, chkHighlight, h('i'))
      ),
      h('label', { class: 'toggle-row' },
        h('div', { class: 't-info' },
          h('b', {}, 'Include verified captions in corpus'),
          h('span', {}, 'Pair 16 kHz WAV segments with human-corrected text')
        ),
        h('span', { class: 'switch' }, chkCorpus, h('i'))
      )
    )
  });
}

// 3. Bottom Sheet: ASR Corpus Metrics & .jsonl Export
function openAsrCorpusSheet() {
  const s = latestStats || {};
  openSheet({
    title: 'Asr dataset & metrics',
    subtitle: 'Verified 16 kHz mono WAV + word-level alignments',
    content: [
      h('div', { class: 'stat-grid' },
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(s.totalGifts ?? 0)),
          h('span', { class: 'stat-lbl' }, 'Gifts created')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(s.totalRecordings ?? 0)),
          h('span', { class: 'stat-lbl' }, 'Real voices collected')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(s.captionsImproved ?? 0)),
          h('span', { class: 'stat-lbl' }, 'Captions corrected')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, `${s.wordsCorrected ?? 0} · ${Math.round(s.totalAudioSec || 0)}s`),
          h('span', { class: 'stat-lbl' }, 'Asr words fixed · audio')
        )
      ),
      h('a', {
        class: 'btn',
        href: '/api/account?export=1',
        download: 'voice-gift-ASR-corpus.jsonl'
      }, 'download verified corpus (.jsonl)')
    ]
  });
}

// 4. Bottom Sheet: Security & Password
function openSecuritySheet() {
  const curIn = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Current password', required: true });
  const newIn = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', minlength: 8, placeholder: 'At least 8 characters', required: true });
  const btn = h('button', { type: 'submit', class: 'btn' }, 'Update password');

  const form = h('form', {
    class: 'stack',
    style: { gap: '12px' },
    onsubmit: async (ev) => {
      ev.preventDefault();
      btn.disabled = true;
      try {
        await api('/api/account', {
          method: 'PATCH',
          json: { currentPassword: curIn.value, newPassword: newIn.value }
        });
        closeSheet();
        toast('Password updated');
      } catch (e) {
        toast(e.message);
      } finally {
        btn.disabled = false;
      }
    }
  },
    h('div', { class: 'field' }, h('label', {}, 'Current password'), curIn),
    h('div', { class: 'field' }, h('label', {}, 'New password'), newIn),
    btn
  );

  openSheet({
    title: 'Change password',
    content: form
  });
}

$('#openProfileSheetBtn')?.addEventListener('click', openEditProfileSheet);
$('#rowEditProfile')?.addEventListener('click', openEditProfileSheet);
$('#rowAsrPrefs')?.addEventListener('click', openAsrPrefsSheet);
$('#rowAsrCorpus')?.addEventListener('click', openAsrCorpusSheet);
$('#rowSecurity')?.addEventListener('click', openSecuritySheet);

function showAccount(user) {
  const keepHash = location.hash;
  history.replaceState(null, '', `/account${keepHash}`);
  document.title = 'Your account · Voice Gift';
  populateUserUI(user);
  showScreen('me');
  tabBar('profile');
  return loadGifts().then(() => {
    if (keepHash === '#settings') openEditProfileSheet();
    else if (keepHash === '#ASR') openAsrPrefsSheet();
  });
}

async function loadGifts() {
  const list = $('#gifts');
  list.replaceChildren(h('div', { class: 'item small muted' }, 'Loading…'));
  try {
    const { gifts = [], stats = {} } = await api('/api/account?gifts=1');
    latestStats = stats;
    if ($('#rowCorpusVal')) {
      $('#rowCorpusVal').textContent = `${stats.totalRecordings ?? 0} voices · .jsonl`;
    }
    list.replaceChildren(...(gifts.length
      ? gifts.map((g) => giftItem(g, () => { toast('Gift deleted'); loadGifts(); }))
      : [h('div', { class: 'item small muted' }, 'No gifts yet.')]));
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

me().then(async (user) => {
  if (!user) return showAuth(location.pathname === '/signup' ? 'signup' : 'login');
  return location.pathname === '/account' ? showAccount(user) : goOn();
});

// Once logged in, go to ?next= (same site only) or to the home page.
function goOn() {
  const next = new URLSearchParams(location.search).get('next') || '';
  location.replace(/^\/(?![/\\])/.test(next) ? next : '/');
}
