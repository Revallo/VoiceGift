import { $, $$, h, api, icon, showScreen, slugFromPath, addStars, copyText } from './common.js';
import { theme, createScene, applyTheme } from './themes.js';
import { startRecording, micSupported, micErrorHelp } from './recorder.js';

addStars($('#app'), 18, 40);
$$('[data-icon]').forEach((el) => (el.innerHTML = icon[el.dataset.icon](18)));

const slug = slugFromPath();
let gift, t, count = 0, first = '';
let rec = null, recorded = null, sent = null; // sent = { id, token }

function err(el, msg) { el.textContent = msg || ''; el.hidden = !msg; }

async function load() {
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
  $('#startBtn').innerHTML = icon.mic(18);
  $('#startBtn').append(h('span', {}, 'Start recording'));
  $('#recEyebrow').textContent = `For ${first} · max 15 seconds`;
  $('#tip').textContent = '';
  $('#tip').append(h('b', { style: { color: '#fff' } }, 'Tip: '), t.tip(first));
  const inviteCake = createScene($('#inviteCake'), gift);
  inviteCake.setCandles(count, { spots: Math.max(12, count + 1) });
  inviteCake.lightAll();
  $('#countLine').textContent = t.countLine(count);
  try { $('#name').value = localStorage.getItem('vg-name') || ''; } catch {}
  showScreen('invite');
}

// ---------- invite → record ----------
$('#inviteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  if (!name) return err($('#inviteError'), 'Please enter your name.');
  if (!$('#consent').checked) return err($('#inviteError'), 'Please tick the box to continue.');
  err($('#inviteError'), '');
  try { localStorage.setItem('vg-name', name); } catch {}
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
  let autoStopped = false;
  try {
    rec = await startRecording({
      maxSec: 15,
      onLevel: (lv) => { bars[levelIdx++ % bars.length].style.height = `${Math.round(6 + lv * 80)}px`; },
      onTick: (s) => { $('#timer').textContent = `0:${String(Math.min(15, Math.floor(s))).padStart(2, '0')}`; },
      onAutoStop: () => { if (!autoStopped) { autoStopped = true; finishRecording(); } }
    });
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
    const res = await api(`/api/message?${qs}`, { method: 'POST', body: recorded.wav });
    sent = { id: res.id, token: res.token };
    $('#capTitle').textContent = `Check what ${first} will read`;
    $('#captionText').value = res.asrText || '';
    $('#mockNote').hidden = res.asrProvider !== 'mock';
    $('#ownDur').textContent = `0:${String(Math.round(recorded.durationSec)).padStart(2, '0')}`;
    $('#againBtn').innerHTML = icon.redo(15);
    $('#againBtn').append(h('span', {}, 'Record again'));
    $('#secretLine').textContent = `Your voice and words stay secret until ${gift.organizer} sends ${first} the gift.`;
    setupPlayer();
    showScreen('caption');
  } catch (e) {
    err($('#inviteError'), e.message);
    showScreen('invite');
  }
}

// ---------- caption ----------
let audio = null, raf = 0;
function setupPlayer() {
  if (audio) { audio.pause(); URL.revokeObjectURL(audio.src); }
  audio = new Audio(URL.createObjectURL(recorded.wav));
  const btn = $('#playOwn');
  const paint = () => {
    $('#ownTrack').style.width = `${(audio.currentTime / (audio.duration || recorded.durationSec)) * 100}%`;
    if (!audio.paused) raf = requestAnimationFrame(paint);
  };
  const setIcon = () => (btn.innerHTML = audio.paused ? icon.play(16) : icon.pause(16));
  setIcon();
  btn.onclick = () => { if (audio.paused) { audio.play(); raf = requestAnimationFrame(paint); } else audio.pause(); };
  audio.onplay = setIcon;
  audio.onpause = setIcon;
  audio.onended = () => { setIcon(); $('#ownTrack').style.width = '0'; };
}

$('#againBtn').addEventListener('click', async () => {
  if (audio) audio.pause();
  if (sent) {
    api('/api/message', { method: 'DELETE', json: { slug, ...sent } }).catch(() => {});
    sent = null;
  }
  await beginRecording();
});

$('#sendBtn').addEventListener('click', async () => {
  const text = $('#captionText').value.trim();
  if (!text) return err($('#capError'), 'Please write what you said.');
  err($('#capError'), '');
  const btn = $('#sendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await api('/api/message', { method: 'PATCH', json: { slug, ...sent, text } });
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
  $('#doneLead').textContent = `It’s a secret until ${gift.organizer} sends ${first} the gift.`;
  $('#doneTitle').textContent = t.doneTitle;
  $('#doneCake').textContent = '';
  const c = createScene($('#doneCake'), gift);
  c.setCandles(n, { spots: Math.max(12, n) });
  c.lightAll();
  c.mark(n - 1);
  $('#doneCount').textContent = t.doneCount(n);
  showScreen('done');
}

load();
