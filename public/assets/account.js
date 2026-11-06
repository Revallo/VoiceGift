// /signup and /login: the form. /account: layered mobile-app profile & settings (progressive disclosure via bottom sheets).
import { $, $$, h, api, icon, showScreen, addStars, toast, openSheet, closeSheet } from './common.js';
import { me, logOut, authForm, giftItem } from './auth.js';
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
  signup: { path: '/signup', doc: 'Create an account', title: 'Create your account', lead: 'Then we’ll start on your gift.' },
  login: { path: '/login', doc: 'Log in', title: 'Log in', lead: 'Then we’ll start on your gift.' }
};

let currentUser = null;
let latestStats = {};

function showAuth(mode) {
  if (picked) {
    applyTheme(picked); // same colors as the thing they picked
    $('#authEmoji').textContent = THINGS[picked][1];
  }
  const words = (m) => {
    const w = WORDS[m];
    history.replaceState(null, '', w.path + location.search); // keeps ?next=
    document.title = `${w.doc} · Voice Gift`;
    $('#authTitle').textContent = w.title;
    $('#authLead').textContent = picked ? `Then we’ll start on your ${THINGS[picked][0]}.` : w.lead;
  };
  words(mode);
  $('#authBox').replaceChildren(authForm({ mode, onMode: words, onDone: goOn }));
  showScreen('auth');
}

function populateUserUI(user) {
  currentUser = user;
  const initial = (user.name || user.email || 'U').trim()[0].toUpperCase();
  if ($('#acctAvatar')) $('#acctAvatar').textContent = initial;
  $('#hello').textContent = `hi, ${(user.name || 'organizer').toLowerCase()}`;
  $('#meEmail').textContent = user.email;
  if ($('#meBioLabel')) {
    $('#meBioLabel').textContent = 'your gifts';
  }
  if ($('#rowProfileSub')) {
    $('#rowProfileSub').textContent = user.bio ? `${user.name} · ${user.bio}` : `${user.name} · ${user.email}`;
  }
  if ($('#rowProfileVal')) {
    $('#rowProfileVal').textContent = (user.name || 'edit').split(' ')[0].toLowerCase();
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
  const saveBtn = h('button', { type: 'submit', class: 'btn' }, 'save profile changes');

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
    h('div', { class: 'field' }, h('label', {}, 'display name'), nameIn),
    h('div', { class: 'field' }, h('label', {}, 'role / bio'), bioIn),
    h('div', { class: 'field' }, h('label', {}, 'verified email'), emailIn),
    saveBtn
  );

  openSheet({
    title: 'personal profile',
    subtitle: 'update your organizer display name and bio',
    content: form
  });
}

// 2. Bottom Sheet: Speech-to-Text & Language Preferences
function openAsrPrefsSheet() {
  if (!currentUser) return;
  const prefs = currentUser.prefs || {};
  const langSel = h('select', {
    class: 'input',
    style: { width: 'auto', minWidth: '152px', minHeight: '40px', padding: '0 12px', borderRadius: '12px', fontSize: '13px', background: '#1B1024' }
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
    title: 'speech-to-text settings',
    subtitle: 'automatic transcription & word-confidence repair',
    content: h('div', { class: 'settings-group' },
      h('div', { class: 'toggle-row', style: { cursor: 'default' } },
        h('div', { class: 't-info' },
          h('b', {}, 'default speech language'),
          h('span', {}, 'primary language for browser + server asr')
        ),
        langSel
      ),
      h('label', { class: 'toggle-row' },
        h('div', { class: 't-info' },
          h('b', {}, 'highlight low-confidence words'),
          h('span', {}, 'flag uncertain asr words in amber for 1-tap repair')
        ),
        h('span', { class: 'switch' }, chkHighlight, h('i'))
      ),
      h('label', { class: 'toggle-row' },
        h('div', { class: 't-info' },
          h('b', {}, 'include verified captions in corpus'),
          h('span', {}, 'pair 16 khz wav segments with human-corrected text')
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
    title: 'asr dataset & metrics',
    subtitle: 'verified 16 khz mono wav + word-level alignments',
    content: [
      h('div', { class: 'stat-grid' },
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(s.totalGifts ?? 0)),
          h('span', { class: 'stat-lbl' }, 'gifts created')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(s.totalRecordings ?? 0)),
          h('span', { class: 'stat-lbl' }, 'real voices collected')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, String(s.captionsImproved ?? 0)),
          h('span', { class: 'stat-lbl' }, 'captions corrected')
        ),
        h('div', { class: 'stat-card' },
          h('span', { class: 'stat-val' }, `${s.wordsCorrected ?? 0} · ${Math.round(s.totalAudioSec || 0)}s`),
          h('span', { class: 'stat-lbl' }, 'asr words fixed · audio')
        )
      ),
      h('a', {
        class: 'btn',
        href: '/api/account?export=1',
        download: 'voice-gift-asr-corpus.jsonl'
      }, 'download verified corpus (.jsonl)')
    ]
  });
}

// 4. Bottom Sheet: Security & Password
function openSecuritySheet() {
  const curIn = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Current password', required: true });
  const newIn = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', minlength: 8, placeholder: 'At least 8 characters', required: true });
  const btn = h('button', { type: 'submit', class: 'btn' }, 'update password');

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
    h('div', { class: 'field' }, h('label', {}, 'current password'), curIn),
    h('div', { class: 'field' }, h('label', {}, 'new password'), newIn),
    btn
  );

  openSheet({
    title: 'security & password',
    subtitle: 'scrypt N=32768 · HttpOnly encrypted session',
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
  return loadGifts().then(() => {
    if (keepHash === '#settings') openEditProfileSheet();
    else if (keepHash === '#asr') openAsrPrefsSheet();
  });
}

async function loadGifts() {
  const list = $('#gifts');
  list.replaceChildren(h('div', { class: 'item small muted' }, 'Loading…'));
  try {
    const { gifts = [], receivedGifts = [], stats = {} } = await api('/api/account?gifts=1');
    latestStats = stats;
    if ($('#acctHeroVal')) {
      $('#acctHeroVal').textContent = `${stats.totalRecordings ?? 0} voices`;
    }
    if ($('#rowCorpusVal')) {
      $('#rowCorpusVal').textContent = `${stats.totalRecordings ?? 0} voices · .jsonl`;
    }
    const recSec = $('#receivedSection');
    const recList = $('#receivedList');
    if (recSec && recList) {
      recSec.hidden = !receivedGifts.length;
      recList.replaceChildren(...receivedGifts.map((rg) =>
        h('a', { class: 'nav-row', href: `/r/${rg.slug}?k=${rg.openKey}` },
          h('span', { class: 'nav-ico', html: icon.gift(16) }),
          h('div', { class: 'nav-info' },
            h('b', {}, `for ${rg.recipient}`),
            h('small', {}, `from ${rg.organizer} · ${rg.occasion} · ${rg.count || 0} voices`)
          ),
          h('span', { class: 'nav-val', style: { color: '#FFD166', fontWeight: '600' } }, 'buka langsung'),
          h('span', { class: 'nav-chev', html: icon.chevronRight(16) })
        )
      ));
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

const wantDemo = new URLSearchParams(location.search).get('demo') === '1';
me().then(async (user) => {
  if (!user && wantDemo) {
    try {
      const res = await api('/api/account', { method: 'POST', json: { action: 'login', email: 'sari@voicegift.id', password: 'password123' } });
      return showAccount(res.user);
    } catch {}
  }
  if (!user) return showAuth(location.pathname === '/signup' ? 'signup' : 'login');
  return location.pathname === '/account' ? showAccount(user) : goOn();
});

// The app starts at the login page; once logged in, go to ?next= (same site only) or straight to "Create gift".
function goOn() {
  const next = new URLSearchParams(location.search).get('next') || '';
  location.replace(/^\/(?![/\\])/.test(next) ? next : '/new');
}
