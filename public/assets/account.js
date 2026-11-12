// /signup and /login: "Continue with Google". /account: layered mobile-app profile & settings (bottom sheets).
import { $, $$, h, api, icon, showScreen, addStars, toast, openSheet, closeSheet } from './common.js';
import { me, logOut, loginBox, giftItem } from './auth.js';
import { applyTheme } from './themes.js';

addStars($('#app'), 20, 40);
$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(14)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon]()));

// What the person picked on the first page ("/"): from ?occasion= or inside ?next=/new?occasion=…
const THINGS = { birthday: ['cake', '🎂'], graduation: ['bouquet', '💐'], wedding: ['lanterns', '🏮'] };
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
  : picked ? `Then we’ll start on your ${THINGS[picked][0]}.`
  : 'Make a gift, or open one you received.';

let currentUser = null;
let latestStats = {};

// The simple page around every account form: an emoji, a title, one line, then `box`.
function showPanel({ path, doc, title, lead = '', emoji, box }) {
  if (picked) applyTheme(picked); // same colors as the thing they picked
  $('#authEmoji').textContent = emoji || (picked ? THINGS[picked][1] : '🎁');
  history.replaceState(null, '', path + location.search); // keeps ?next=
  document.title = `${doc} · Voice Gift`;
  $('#authTitle').textContent = title;
  $('#authLead').textContent = lead;
  $('#authBack').hidden = !picked;
  $('#authBack').href = picked ? `/new?occasion=${picked}` : '/';
  if (box) $('#authBox').replaceChildren(box);
  showScreen('auth');
}

function showAuth(mode) {
  showPanel({ ...WORDS[mode], lead: afterLogin, box: loginBox({ onDone: () => goOn() }) });
}

function populateUserUI(user) {
  currentUser = user;
  const initial = (user.name || user.email || 'U').trim()[0].toUpperCase();
  if ($('#acctAvatar')) $('#acctAvatar').textContent = initial;
  $('#hello').textContent = `Hi, ${user.name || 'organizer'}`;
  $('#meEmail').textContent = user.email;
  if ($('#rowProfileSub')) {
    $('#rowProfileSub').textContent = user.bio ? `${user.name} · ${user.bio}` : `${user.name} · ${user.email}`;
  }
  if ($('#rowProfileVal')) {
    $('#rowProfileVal').textContent = 'Edit';
  }
  const prefs = user.prefs || {};
  if ($('#rowPrefsVal')) {
    $('#rowPrefsVal').textContent = `${prefs.asrLang || 'id-ID'} · ${prefs.autoHighlight !== false ? 'auto' : 'off'}`;
  }
}

// 1. Bottom Sheet: Edit Personal Profile
function openEditProfileSheet() {
  if (!currentUser) return;
  const nameIn = h('input', { class: 'input', value: currentUser.name || '', maxlength: 60, required: true, placeholder: 'Your name' });
  const bioIn = h('input', { class: 'input', value: currentUser.bio || '', maxlength: 120, placeholder: 'e.g. Voice Gift Organizer · Jakarta' });
  const emailIn = h('input', { class: 'input', value: currentUser.email || '', disabled: true, style: { opacity: '0.55', cursor: 'not-allowed' } });
  const saveBtn = h('button', { type: 'submit', class: 'btn' }, 'Save profile changes');

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
    h('div', { class: 'field' }, h('label', {}, 'Display name'), nameIn),
    h('div', { class: 'field' }, h('label', {}, 'Role / bio'), bioIn),
    h('div', { class: 'field' }, h('label', {}, 'Verified email'), emailIn),
    saveBtn
  );

  openSheet({
    title: 'Personal profile',
    subtitle: 'Update your organizer display name and bio',
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

$('#openProfileSheetBtn')?.addEventListener('click', openEditProfileSheet);
$('#rowEditProfile')?.addEventListener('click', openEditProfileSheet);
$('#rowAsrPrefs')?.addEventListener('click', openAsrPrefsSheet);
$('#rowAsrCorpus')?.addEventListener('click', openAsrCorpusSheet);

function showAccount(user) {
  const keepHash = location.hash;
  history.replaceState(null, '', `/account${keepHash}`);
  document.title = 'Your account · Voice Gift';
  populateUserUI(user);
  showScreen('me');
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
    if ($('#acctHeroVal')) {
      $('#acctHeroVal').textContent = `${stats.totalRecordings ?? 0} voices`;
    }
    if ($('#rowCorpusVal')) {
      $('#rowCorpusVal').textContent = `${stats.totalRecordings ?? 0} voices · .jsonl`;
    }
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

me().then(async (user) => {
  if (!user) return showAuth(location.pathname === '/signup' ? 'signup' : 'login');
  return location.pathname === '/account' ? showAccount(user) : goOn();
});

// Once logged in, go to ?next= (same site only) or to the home page.
function goOn(next = new URLSearchParams(location.search).get('next') || '') {
  location.replace(/^\/(?![/\\])/.test(next) ? next : '/');
}
