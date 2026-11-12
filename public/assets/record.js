import { $, $$, h, api, icon, showScreen, slugFromPath, copyText, toast, initials, colorFor } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { startRecording, micSupported, micErrorHelp } from './recorder.js';
import { requireLogin } from './auth.js';
import { loadDraft, clearDraft } from './draft.js';

$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon](18)));
$('#editBadge').innerHTML = `${icon.edit(12)} <span>Edit</span>`;

const slug = slugFromPath();
let gift, t, count = 0, first = '';
let rec = null, recorded = null, sent = null, sentDone = false; // sent = { id, token, asrText, asrTypos, waveform }
let lastCorrections = [];
let speechRec = null, speechHint = '';
let draft = null; // a voice recorded on the Record tab ("?draft=1"): used instead of recording here

window.addEventListener('pagehide', () => {
  if (sent && !sentDone) {
    try {
      fetch('/api/message', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, id: sent.id, token: sent.token }),
        keepalive: true
      }).catch(() => {});
    } catch {}
  }
});

function err(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }

async function load() {
  const user = await requireLogin(); // friends log in, then their name is already filled in
  if (!user) return;
  try {
    const data = await api(`/api/gift?slug=${encodeURIComponent(slug)}&invite=1`); // remembered as invited: it shows on their home page
    gift = data.gift;
    count = data.count;
  } catch (e) {
    $('#errorText').textContent = e.status === 404 ? 'This gift link doesn’t exist. Check the link and try again.' : e.message;
    return showScreen('error');
  }
  t = applyTheme(gift.occasion);
  first = t.callName(gift.recipient);
  document.title = t.inviteTitle(first);
  $('#invitedBy').textContent = `${gift.organizer} invited you`;
  $('#inviteTitle').textContent = t.inviteTitle(first);
  $('#startBtn').innerHTML = icon.mic(48);
  $$('[data-private]').forEach((p) => (p.textContent = `Only you and ${first} can hear this voice.`));
  $('#recEyebrow').textContent = `For ${first} · max 15 seconds`;
  $('#name').value = user.name;
  $('#signedIn').textContent = `Logged in as ${user.email}`;
  $('#signedIn').hidden = false;
  if (new URLSearchParams(location.search).get('draft')) draft = await loadDraft();
  if (draft) {
    // the recording is already made: the big button becomes one line of words
    const b = $('#startBtn');
    b.className = 'btn';
    b.removeAttribute('aria-label');
    b.textContent = 'Add my voice';
    $('#startHint').textContent = `Your recording (0:${String(Math.round(draft.durationSec)).padStart(2, '0')}) is on this phone. Nothing is sent until you tap.`;
    $('#startHint').classList.remove('center');
  }
  showScreen('invite');
}

// ---------- invite → record ----------
$('#inviteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  if (!name) return err($('#inviteError'), 'Please enter your name.');
  if (!$('#consent').checked) return err($('#inviteError'), 'Please tick the box to continue.');
  err($('#inviteError'), '');
  if (draft) {
    recorded = { wav: draft.wav, durationSec: draft.durationSec };
    speechHint = '';
    return upload();
  }
  await beginRecording();
});

const bars = [];
for (let i = 0; i < 28; i++) { const b = h('i'); bars.push(b); $('#meter').append(b); }
let levelIdx = 0;

async function beginRecording() {
  if (!micSupported()) return showMicHelp();
  $('#stopBtn').innerHTML = icon.stop(34);
  $('#timer').textContent = '0:00';
  bars.forEach((b) => (b.style.height = '6px'));
  speechHint = '';
  let autoStopped = false;
  try {
    rec = await startRecording({
      maxSec: 15,
      onLevel: (lv) => { bars[levelIdx++ % bars.length].style.height = `${Math.round(6 + lv * 80)}px`; },
      onTick: (s) => { $('#timer').textContent = `0:${String(Math.min(15, Math.floor(s))).padStart(2, '0')}`; },
      onAutoStop: () => { if (!autoStopped) { autoStopped = true; finishRecording(); } }
    });
    // Optional browser SpeechRecognition to capture real spoken words when supported
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        speechRec = new SR();
        speechRec.lang = 'id-ID';
        speechRec.continuous = true;
        speechRec.interimResults = true;
        speechRec.onresult = (ev) => {
          let txt = '';
          for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript + ' ';
          if (txt.trim()) speechHint = txt.trim();
        };
        speechRec.onerror = () => {};
        speechRec.start();
      }
    } catch {}
  } catch (e) {
    return showMicHelp(e);
  }
  showScreen('record');
}

function showMicHelp(e) {
  $('#micHelp').textContent = micErrorHelp(e);
  $('#pageLink').textContent = location.href.replace(/^https?:\/\//, '');
  const b = $('#copyPage');
  b.innerHTML = icon.copy(14);
  b.append(h('span', {}, 'Copy'));
  b.onclick = () => copyText(location.href);
  showScreen('mic');
}
$('#retryMic').addEventListener('click', beginRecording);
$('#stopBtn').addEventListener('click', finishRecording);

async function finishRecording() {
  if (!rec) return;
  const r = rec;
  rec = null;
  if (speechRec) { try { speechRec.stop(); } catch {} speechRec = null; }
  recorded = await r.stop();
  if (recorded.durationSec < 1) {
    err($('#inviteError'), 'That was too short. Please record again.');
    return showScreen('invite');
  }
  await upload();
}

async function upload() {
  showScreen('uploading');
  try {
    const qs = new URLSearchParams({ slug, name: $('#name').value.trim(), consent: '1' });
    if (speechHint) qs.set('hint', speechHint);
    const res = await api(`/api/message?${qs}`, { method: 'POST', body: recorded.wav });
    sent = {
      id: res.id,
      token: res.token,
      asrText: res.asrText || '',
      asrTypos: Array.isArray(res.asrTypos) ? res.asrTypos : [],
      waveform: Array.isArray(res.waveform) && res.waveform.length ? res.waveform : null
    };
    sentDone = false;
    if (draft) { // it's with the gift now; from here on, recording happens on this page
      draft = null;
      clearDraft();
      const b = $('#startBtn');
      b.className = 'mic-big';
      b.setAttribute('aria-label', 'Start recording');
      b.innerHTML = icon.mic(48);
      $('#startHint').textContent = 'Tap to record · up to 15 seconds';
      $('#startHint').classList.add('center');
    }
    $('#captionText').value = sent.asrText;
    $('#seenLabel').textContent = `How ${first} will see it`;
    $('#seenHint').textContent = `This is your ${t.item}. Tap it to try what ${first} will hear.`;
    showSeenScene();
    $('#seenAvatar').textContent = initials($('#name').value.trim());
    $('#seenAvatar').style.background = colorFor(count);
    $('#seenName').textContent = $('#name').value.trim();
    const note = $('#mockNote');
    note.hidden = true;
    $('#ownDur').textContent = `0:${String(Math.round(recorded.durationSec)).padStart(2, '0')}`;
    $('#againBtn').innerHTML = icon.redo(15);
    $('#againBtn').append(h('span', {}, 'Record again'));
    setupPlayer();
    refreshTypoStudio();
    showScreen('caption');
  } catch (e) {
    err($('#inviteError'), e.message);
    showScreen('invite');
  }
}

// ---------- ASR Typo Correction Studio ----------
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replacePhrase(text, from, to) {
  const re = new RegExp(`(^|[^a-zA-Z0-9])(${escapeRe(from)})(?=$|[^a-zA-Z0-9])`, 'i');
  return text.replace(re, (m, pre) => `${pre}${to}`);
}

function hasPhrase(text, phrase) {
  if (!phrase) return false;
  const re = new RegExp(`(^|[^a-zA-Z0-9])(${escapeRe(phrase)})(?=$|[^a-zA-Z0-9])`, 'i');
  return re.test(text);
}

// Compute live word-level diffs between original ASR text and current textarea content
function computeLiveDiffs(asrText, currentText, knownTypos = []) {
  const raw = String(asrText || '').trim();
  const cur = String(currentText || '').trim();
  if (!raw || !cur || raw === cur) return [];

  const diffs = [];
  const seen = new Set();

  for (const tp of knownTypos) {
    if (tp.wrong && tp.right && hasPhrase(raw, tp.wrong) && hasPhrase(cur, tp.right) && !hasPhrase(cur, tp.wrong)) {
      diffs.push({ from: tp.wrong, to: tp.right });
      seen.add(tp.right.toLowerCase());
    }
  }

  const clean = (w) => w.replace(/^[.,!?""''()]+|[.,!?""''()]+$/g, '');
  const a = raw.split(/\s+/).map(clean).filter(Boolean);
  const b = cur.split(/\s+/).map(clean).filter(Boolean);
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (i + 1 < a.length && (a[i] + a[i + 1]).toLowerCase() === b[j].toLowerCase()) {
      if (!seen.has(b[j].toLowerCase())) {
        diffs.push({ from: `${a[i]} ${a[i + 1]}`, to: b[j] });
        seen.add(b[j].toLowerCase());
      }
      i += 2; j += 1; continue;
    }
    if (i + 1 < a.length && j + 1 < b.length && a[i + 1].toLowerCase() === b[j + 1].toLowerCase()) {
      if (!seen.has(b[j].toLowerCase())) {
        diffs.push({ from: a[i], to: b[j] });
        seen.add(b[j].toLowerCase());
      }
      i++; j++; continue;
    }
    i++; j++;
  }

  if (!diffs.length && raw !== cur) {
    diffs.push({ from: raw.split(/\s+/).slice(0, 3).join(' ') + '…', to: cur.split(/\s+/).slice(0, 3).join(' ') + '…' });
  }
  return diffs;
}

function refreshTypoStudio() {
  if (!sent) return;
  const cur = $('#captionText').value;
  const typos = sent.asrTypos || [];
  $('#resetAsrBtn').hidden = cur.trim() === sent.asrText.trim();
  // the box grows with the words, so nothing scrolls inside it
  const ta = $('#captionText');
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight + 2}px`;

  // The recipient's view: the words as they will light up. Words the ASR probably got wrong are marked; tap to fix.
  const suspectMap = new Map();
  for (const tp of typos) for (const w of tp.wrong.toLowerCase().split(/\s+/)) suspectMap.set(w, tp);
  const box = $('#seenCaption');
  box.textContent = '';
  seenWords = cur.trim().split(/\s+/).filter(Boolean).map((word) => {
    const clean = word.replace(/^[.,!?""''()]+|[.,!?""''()]+$/g, '').toLowerCase();
    const tp = suspectMap.get(clean) && hasPhrase(cur, suspectMap.get(clean).wrong) ? suspectMap.get(clean) : null;
    const span = h('span', tp ? { class: 'suspect', role: 'button', tabindex: '0', title: `Fix: “${tp.wrong}” → “${tp.right}”`,
      onclick: () => {
        $('#captionText').value = replacePhrase($('#captionText').value, tp.wrong, tp.right);
        toast(`Fixed: “${tp.wrong}” → “${tp.right}”`);
        refreshTypoStudio();
      } } : {}, word);
    box.append(span, ' ');
    return span;
  });
  paintSeen(-1);

  // Update live diff feedback line
  const diffs = computeLiveDiffs(sent.asrText, cur, typos);
  lastCorrections = diffs;
  const diffEl = $('#diffLine');
  diffEl.textContent = '';
  diffEl.hidden = !diffs.length;
  if (diffs.length > 0) {
    const summary = diffs.slice(0, 3).map((d) => `“${d.from}” → “${d.to}”`).join(', ');
    const more = diffs.length > 3 ? ` (+${diffs.length - 3})` : '';
    diffEl.append(
      h('span', { class: 'diff-check', html: icon.check(10, 3.5) }),
      h('div', { class: 'grow' },
        h('span', {}, `Fixed ${diffs.length}: `),
        h('b', {}, summary + more)
      )
    );
  }
}

$('#resetAsrBtn').addEventListener('click', () => {
  if (!sent) return;
  $('#captionText').value = sent.asrText;
  refreshTypoStudio();
});

$('#captionText').addEventListener('input', refreshTypoStudio);

// ---------- Play it the way the recipient will hear it ----------
// The words light up while the voice plays (spread evenly over the recording, like the reveal page does).
let audio = null, raf = 0, seenWords = [], seenScene = null;

// The gift as the recipient will find it, with this friend's item ready to be tapped.
function showSeenScene() {
  const n = count + 1;
  $('#seenScene').textContent = '';
  seenScene = createScene($('#seenScene'), gift);
  seenScene.setCandles(n, { spots: Math.max(12, n), onTap: () => $('#playOwn').click() });
  seenScene.stage.classList.add('interactive');
  seenScene.lightAll();
  seenScene.setActive(count);
}

function paintSeen(k) {
  seenWords.forEach((w, i) => w.classList.toggle('done', k < 0 || i < k));
  seenWords.forEach((w, i) => w.classList.toggle('now', i === k));
}

function setupPlayer() {
  if (audio) { audio.pause(); URL.revokeObjectURL(audio.src); }
  audio = new Audio(URL.createObjectURL(recorded.wav));
  const btn = $('#playOwn');
  const dur = () => audio.duration || recorded.durationSec || 1;
  const paint = () => {
    const n = seenWords.length;
    paintSeen(Math.min(n - 1, Math.floor((audio.currentTime / dur()) * n)));
    if (!audio.paused) raf = requestAnimationFrame(paint);
  };
  const setIcon = () => (btn.innerHTML = audio.paused ? icon.play(16) : icon.pause(16));
  setIcon();
  btn.onclick = () => { if (audio.paused) { audio.currentTime = audio.ended ? 0 : audio.currentTime; audio.play(); raf = requestAnimationFrame(paint); } else audio.pause(); };
  audio.onplay = () => { setIcon(); seenScene?.setActive(count, true); };
  audio.onpause = () => { setIcon(); seenScene?.setActive(count, false); };
  audio.onended = () => { setIcon(); seenScene?.setActive(count, false); cancelAnimationFrame(raf); paintSeen(-1); };
}

$('#againBtn').addEventListener('click', async () => {
  if (audio) audio.pause();
  if (sent) {
    api('/api/message', { method: 'DELETE', json: { slug: slug, id: sent.id, token: sent.token } }).catch(() => {});
    sent = null;
  }
  await beginRecording();
});

$('#sendBtn').addEventListener('click', async () => {
  const text = $('#captionText').value.trim();
  if (!text) return err($('#capError'), 'Please write what you said.');
  err($('#capError'), '');
  refreshTypoStudio();
  const btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await api('/api/message', { method: 'PATCH', json: { slug, id: sent.id, token: sent.token, text } });
    sentDone = true;
    if (Array.isArray(res.corrections) && res.corrections.length) lastCorrections = res.corrections;
    if (audio) audio.pause();
    await showDone();
  } catch (e) {
    err($('#capError'), e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send';
  }
});

async function showDone() {
  let n = count + 1;
  try { n = (await api(`/api/gift?slug=${encodeURIComponent(slug)}`)).count; } catch {}
  $('#doneLead').textContent = `It stays a secret until ${gift.organizer} sends ${first} the gift.`;
  $('#doneTitle').textContent = t.doneTitle;
  $('#doneCake').textContent = '';
  const c = createScene($('#doneCake'), gift);
  c.setCandles(n, { spots: Math.max(12, n) });
  c.lightAll();
  c.mark(n - 1);
  $('#doneCount').textContent = t.doneCount(n);
  // a gift made from the Record tab: next is its own page, to invite friends
  let after = '';
  try { after = sessionStorage.getItem('vg-after-record') || ''; sessionStorage.removeItem('vg-after-record'); } catch {}
  if (after.startsWith(`/m/${slug}?`)) {
    $('#doneNext').href = after;
    $('#doneNext').textContent = 'Invite friends';
    $('#doneLead').textContent = `Now invite friends to add their voices for ${first}.`;
  }
  const card = $('#asrThanksCard');
  if (card) {
    if (lastCorrections.length > 0) {
      card.hidden = false;
      $('#doneCheckIco').innerHTML = icon.check(10, 3.5);
      const examples = lastCorrections.slice(0, 2).map((d) => `“${d.from}” → “${d.to}”`).join(', ');
      $('#asrThanksText').textContent = `${lastCorrections.length} ASR ${lastCorrections.length === 1 ? 'fix' : 'fixes'} saved (${examples})`;
    } else {
      card.hidden = true;
    }
  }
  showScreen('done');
}

load();
