import { $, $$, h, api, icon, showScreen, slugFromPath, copyText, toast, initials, colorFor } from './common.js';
import { createScene, applyTheme } from './themes.js';
import { startRecording, micSupported, micErrorHelp } from './recorder.js';
import { requireLogin } from './auth.js';
import { MOODS, playVoice, moodShow } from './voicefx.js';
import { CANDLES, FLAMES, FLAME_SHAPES, miniCandle, styleCandle } from './cake.js';

$$('[data-logo]').forEach((el) => (el.innerHTML = icon.gift(15)));
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon](18)));
$('#editBadge').innerHTML = `${icon.edit(12)} <span>Edit</span>`;

const slug = slugFromPath();
let gift, t, count = 0, first = '';
let rec = null, recorded = null, sent = null, sentDone = false; // sent = { id, token, asrText, asrTypos, waveform }
let lastCorrections = [];
let speechRec = null, speechHint = '';
// The twist the friend adds after recording (kept when they record again).
let mood = 'normal', candleStyle = { body: 'stripe', flame: 'classic', shape: 'drop' };

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
    const data = await api(`/api/gift?slug=${encodeURIComponent(slug)}`);
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
  $$('[data-private]').forEach((p) => (p.textContent = `🔒 Only you and ${first} can hear this voice.`));
  $('#recEyebrow').textContent = `Recording for ${first}`;
  $('#nameFor').textContent = first;
  $('#name').value = user.name;
  $('#signedIn').textContent = `Logged in as ${user.email}`;
  $('#signedIn').hidden = false;
  showScreen('invite');
}

// ---------- invite → record ----------
$('#inviteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  if (!name) return err($('#inviteError'), 'Please enter your name.');
  if (!$('#consent').checked) { // point at the box instead of only saying so
    const box = $('#consent').closest('.check');
    box.classList.remove('nudge');
    void box.offsetWidth;
    box.classList.add('nudge');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return err($('#inviteError'), 'Please tick the box to continue.');
  }
  err($('#inviteError'), '');
  await beginRecording();
});

// The mic waits for the consent box: dim until it's ticked, and the line under it says what to do.
function syncConsent() {
  const ok = $('#consent').checked;
  $('#startBtn').classList.toggle('waiting', !ok);
  $('#micHint').textContent = ok ? 'Tap to record · up to 15 seconds' : 'Tick the box above, then tap to record';
  if (ok) { err($('#inviteError'), ''); $('#consent').closest('.check').classList.remove('nudge'); }
}
$('#consent').addEventListener('change', syncConsent);
syncConsent();

// The recording screen: how much of the 15 seconds is left.
function showLeft(s) {
  const left = Math.max(0, 15 - Math.floor(s));
  $('#recBar').style.width = `${Math.min(100, (s / 15) * 100)}%`;
  $('#recLeft').textContent = left === 1 ? '1 second left' : `${left} seconds left`;
  $('[data-screen="record"]').classList.toggle('ending', left <= 3);
}

const bars = [];
for (let i = 0; i < 28; i++) { const b = h('i'); bars.push(b); $('#meter').append(b); }
let levelIdx = 0;

async function beginRecording() {
  if (!micSupported()) return showMicHelp();
  $('#stopBtn').innerHTML = icon.stop(34);
  $('#timer').textContent = '0:00';
  showLeft(0);
  bars.forEach((b) => (b.style.height = '6px'));
  speechHint = '';
  let autoStopped = false;
  try {
    rec = await startRecording({
      maxSec: 15,
      onLevel: (lv) => { bars[levelIdx++ % bars.length].style.height = `${Math.round(6 + lv * 80)}px`; },
      onTick: (s) => { $('#timer').textContent = `0:${String(Math.min(15, Math.floor(s))).padStart(2, '0')}`; showLeft(s); },
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
    $('#sendBtn').textContent = `Send to ${first}`;
    setupPlayer();
    buildTwist();
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
// Played with Web Audio, so the picked mood is heard exactly as the recipient will hear it.
let ac = null, buffer = null, playing = null, raf = 0, seenWords = [], seenScene = null;
const isCake = () => typeof seenScene?.setCandleStyle === 'function';

// The gift as the recipient will find it, with this friend's item ready to be tapped.
function showSeenScene() {
  const n = count + 1;
  $('#seenScene').textContent = '';
  seenScene = createScene($('#seenScene'), gift);
  const styles = [];
  styles[count] = candleStyle;
  seenScene.setCandles(n, { spots: Math.max(12, n), styles, onTap: () => $('#playOwn').click() });
  seenScene.stage.classList.add('interactive');
  seenScene.lightAll();
  seenScene.setActive(count);
  if (seenScene.candles[count]) seenScene.candles[count].dataset.mood = mood;
}

function paintSeen(k) {
  // k = -1: all shown (not playing); -2: the intro is playing, no word yet
  seenWords.forEach((w, i) => w.classList.toggle('done', k === -1 || (k >= 0 && i < k)));
  seenWords.forEach((w, i) => w.classList.toggle('now', i === k));
}

function stopOwn() {
  if (!playing) return;
  playing.stop();
  playing.endShow?.();
  playing = null;
  cancelAnimationFrame(raf);
  paintSeen(-1);
  seenScene?.setActive(count, false);
  $('#playOwn').innerHTML = icon.play(16);
}

// Must be called inside a tap (iOS creates the AudioContext only then).
async function playOwn() {
  stopOwn();
  const AC = window.AudioContext || window.webkitAudioContext;
  ac ||= new AC();
  ac.resume().catch(() => {});
  const wav = recorded.wav;
  if (!buffer) {
    try { buffer = await ac.decodeAudioData(await wav.arrayBuffer()); } catch { return toast('Could not play the recording.'); }
    if (recorded.wav !== wav) return; // recorded again meanwhile
  }
  const startAt = ac.currentTime;
  const me = playVoice(ac, buffer, mood, { onended: () => { if (playing === me) stopOwn(); } });
  playing = me;
  me.endShow = moodShow(seenScene?.wrap, mood, me);
  $('#playOwn').innerHTML = icon.pause(16);
  seenScene?.setActive(count, true);
  const paint = () => {
    if (playing !== me) return;
    const n = seenWords.length;
    const pos = ((ac.currentTime - startAt - me.lead) * me.rate) / buffer.duration;
    paintSeen(pos < 0 ? -2 : Math.min(n - 1, Math.floor(pos * n)));
    raf = requestAnimationFrame(paint);
  };
  raf = requestAnimationFrame(paint);
}

function setupPlayer() {
  stopOwn();
  buffer = null;
  $('#playOwn').innerHTML = icon.play(16);
  $('#playOwn').onclick = () => (playing ? stopOwn() : playOwn());
}

// ---------- the twist: a mood for the voice, and (on the cake) their own candle: stick, flame colour, flame shape ----------
function pickRow(row, items, isOn, onPick) {
  row.textContent = '';
  for (const [key, make] of items) {
    const b = h('button', { type: 'button', class: 'pick' + (isOn(key) ? ' on' : ''), 'aria-pressed': String(isOn(key)) });
    b.dataset.key = key;
    make(b);
    b.addEventListener('click', () => {
      [...row.children].forEach((c) => { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', String(c === b)); });
      onPick(key, b);
    });
    row.append(b);
  }
}

// Each pick shows only its own thing: the stick alone, the flame colour alone, the flame shape alone.
function putMini(b, style, only) {
  b.querySelector('.mini-candle')?.remove();
  b.prepend(miniCandle(style, colorFor(count), { h: 40, only }));
}
const igniteMini = (b) => { const c = b.querySelector('.candle'); if (c) styleCandle(c, c._style, { ignite: true }); };

function buildTwist() {
  $('#twistSub').textContent = `Optional. Tap one to hear it. Only the sound ${first} hears changes.`;
  pickRow($('#moodRow'), Object.entries(MOODS).map(([k, m]) => [k, (b) => b.append(h('span', { class: 'pick-emoji' }, m.emoji), h('span', {}, m.label))]),
    (k) => k === mood,
    (k) => {
      mood = k;
      if (seenScene?.candles[count]) seenScene.candles[count].dataset.mood = k;
      $('#seenScene').scrollIntoView({ behavior: 'smooth', block: 'center' });
      playOwn();
    });

  $('#candlePicks').hidden = !isCake();
  if (!isCake()) return;
  const changed = (b) => { seenScene.setCandleStyle(count, candleStyle); igniteMini(b); };
  pickRow($('#candleRow'), Object.entries(CANDLES).map(([k, c]) => [k, (b) => { b.append(h('span', {}, c.label)); putMini(b, { body: k }, 'stick'); }]),
    (k) => k === candleStyle.body,
    (k, b) => { candleStyle = { ...candleStyle, body: k }; changed(b); });
  pickRow($('#flameRow'), Object.entries(FLAMES).map(([k, f]) => [k, (b) => { b.append(h('span', {}, f.label)); putMini(b, { flame: k, shape: 'drop' }, 'flame'); }]),
    (k) => k === candleStyle.flame,
    (k, b) => {
      candleStyle = { ...candleStyle, flame: k };
      // the shapes show the picked colour
      [...$('#shapeRow').children].forEach((s) => putMini(s, { flame: k, shape: s.dataset.key }, 'flame'));
      changed(b);
    });
  pickRow($('#shapeRow'), Object.entries(FLAME_SHAPES).map(([k, f]) => [k, (b) => { b.append(h('span', {}, f.label)); putMini(b, { flame: candleStyle.flame, shape: k }, 'flame'); }]),
    (k) => k === candleStyle.shape,
    (k, b) => { candleStyle = { ...candleStyle, shape: k }; changed(b); });
}

$('#againBtn').addEventListener('click', async () => {
  stopOwn();
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
    const res = await api('/api/message', { method: 'PATCH', json: { slug, id: sent.id, token: sent.token, text, mood, candle: isCake() ? candleStyle : null } });
    sentDone = true;
    if (Array.isArray(res.corrections) && res.corrections.length) lastCorrections = res.corrections;
    stopOwn();
    await showDone();
  } catch (e) {
    err($('#capError'), e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = `Send to ${first}`;
  }
});

async function showDone() {
  let n = count + 1;
  try { n = (await api(`/api/gift?slug=${encodeURIComponent(slug)}`)).count; } catch {}
  $('#doneLead').textContent = `It stays a secret until ${gift.organizer} sends ${first} the gift.`;
  $('#doneTitle').textContent = t.doneTitle;
  $('#doneCake').textContent = '';
  const c = createScene($('#doneCake'), gift);
  const styles = [];
  styles[n - 1] = candleStyle;
  c.setCandles(n, { spots: Math.max(12, n), styles });
  c.lightAll();
  c.mark(n - 1);
  $('#doneCount').textContent = t.doneCount(n);
  const card = $('#asrThanksCard');
  if (card) {
    if (lastCorrections.length > 0) {
      card.hidden = false;
      $('#doneCheckIco').innerHTML = icon.check(10, 3.5);
      const examples = lastCorrections.slice(0, 2).map((d) => `“${d.from}” → “${d.to}”`).join(', ');
      $('#asrThanksText').textContent = `Thanks for fixing ${lastCorrections.length === 1 ? '1 word' : `${lastCorrections.length} words`}: ${examples}. ${first} will read it right.`;
    } else {
      card.hidden = true;
    }
  }
  showScreen('done');
}

load();
