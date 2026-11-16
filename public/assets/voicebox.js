// Voices between friends, in the browser: the card a voice is shown as (always with its words), and the
// sheet that sends one: pick who → record → check the words → pick a mood → send.
// A voice can't be sent without its words: the caption step is where the speaker makes them right.
import { h, api, icon, toast, fmtAgo, initials, colorFor, openSheet, closeSheet } from './common.js';
import { startRecording, micSupported, micErrorHelp } from './recorder.js';
import { MOODS, moodOf, playVoice } from './voicefx.js';

let ac = null, playing = null, consentOk = false;
// Made inside the tap (iOS).
function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  ac ||= new AC();
  ac.resume().catch(() => {});
  return ac;
}

export function stopVoices() {
  if (!playing) return;
  const p = playing;
  playing = null;
  p.voice?.stop();
  p.done();
}

// Plays a WAV with its mood while the words light up as they are spoken.
async function play(getWav, mood, btn, spans, times, onStart) {
  const same = playing?.btn === btn;
  stopVoices();
  if (same) return;
  const ctx = audio();
  const wrap = spans[0]?.parentElement;
  const me = { btn, voice: null, raf: 0, done: () => { cancelAnimationFrame(me.raf); btn.innerHTML = icon.play(16); wrap?.classList.remove('playing'); spans.forEach((w) => (w.className = '')); } };
  playing = me;
  btn.innerHTML = icon.pause(16);
  let buf;
  try {
    buf = await ctx.decodeAudioData(await getWav());
  } catch {
    if (playing === me) { stopVoices(); toast('This voice couldn’t be played. Please try again.'); }
    return;
  }
  if (playing !== me) return;
  me.voice = playVoice(ctx, buf, mood, { onended: () => { if (playing === me) stopVoices(); } });
  onStart?.();
  wrap?.classList.add('playing');
  const t0 = ctx.currentTime;
  const paint = () => {
    const at = (ctx.currentTime - t0 - me.voice.lead) * me.voice.rate; // seconds into the recording
    let k = -1;
    times.forEach((w, i) => { if (w.start <= at) k = i; });
    spans.forEach((w, i) => { w.className = i < k ? 'done' : i === k ? 'now' : ''; });
    me.raf = requestAnimationFrame(paint);
  };
  if (times.length) me.raf = requestAnimationFrame(paint);
}

const wordSpans = (text, words) => (words?.length ? words.map((w) => w.w) : String(text || '').split(/\s+/)).map((w) => h('span', {}, w + ' '));
const secs = (s) => `0:${String(Math.max(1, Math.round(s))).padStart(2, '0')}`;

// One voice in the list. The words are always there to read; play lights them up as they are spoken.
export function voiceCard(v, { onReply } = {}) {
  const spans = wordSpans(v.text, v.words);
  const who = v.mine ? `To ${v.toAll ? `all friends (${v.to.length})` : v.to.join(', ')}` : v.from;
  const face = v.mine ? 'You' : v.from;
  const btn = h('button', { type: 'button', class: 'seen-play', 'aria-label': `Play ${v.mine ? 'your' : `${v.from}’s`} voice`, html: icon.play(16) });
  const card = h('article', { class: 'voice-card' + (v.heard ? '' : ' new') },
    h('div', { class: 'voice-head' },
      h('span', { class: 'avatar', style: { background: colorFor([...face].reduce((s, c) => s + c.charCodeAt(0), 0)) } }, initials(face)),
      h('div', { class: 'grow' }, h('b', {}, who), h('small', {}, fmtAgo(v.at))),
      v.mood !== 'normal' && h('span', { class: 'mood-tag' }, `${MOODS[moodOf(v.mood)].emoji} ${MOODS[moodOf(v.mood)].label}`),
      !v.heard && h('span', { class: 'thanks-new' }, 'New')),
    v.replyTo && h('p', { class: 'voice-quote' }, `↩ ${v.replyTo.from}: ${v.replyTo.text}`),
    h('p', { class: 'voice-words' }, spans),
    h('div', { class: 'row voice-actions' }, btn, h('span', { class: 'small muted grow' }, secs(v.durationSec)),
      !v.mine && onReply && h('button', { type: 'button', class: 'btn ghost sm voice-reply', onclick: () => onReply(v) }, 'Reply')));
  btn.onclick = () => play(
    async () => { const r = await fetch(`/api/voice?id=${v.id}`); if (!r.ok) throw new Error(); return r.arrayBuffer(); },
    v.mood, btn, spans, v.words || [],
    () => {
      if (v.heard) return;
      v.heard = true;
      card.classList.remove('new');
      card.querySelector('.thanks-new')?.remove();
      api('/api/voice', { method: 'POST', json: { action: 'heard', id: v.id } }).catch(() => {});
    });
  return card;
}

// The sheet that sends a voice. `reply` = the voice being answered (then it goes to its sender).
export function openSend({ friends = [], reply = null, onSent } = {}) {
  const box = h('div', { class: 'stack voice-flow', style: { gap: '12px' } });
  const errBox = h('p', { class: 'small err', hidden: true });
  const st = { to: reply ? 'reply' : null, toName: reply ? reply.from : '', rec: null, take: null, mood: 'normal' };
  const render = (...kids) => { errBox.hidden = true; box.replaceChildren(...kids.filter(Boolean), errBox); };
  const fail = (e) => { errBox.textContent = e.message; errBox.hidden = false; };
  const dropDraft = () => {
    if (st.take) api('/api/voice', { method: 'DELETE', json: { id: st.take.id, token: st.take.token } }).catch(() => {});
    st.take = null;
  };

  function pickStep() {
    stopVoices();
    const row = (emoji, name, sub, to) => h('button', { type: 'button', class: 'thanks-opt', 'data-to': to, onclick: () => { st.to = to; st.toName = name; recordStep(); } },
      h('span', { class: 'thanks-opt-emoji' }, emoji), h('span', { class: 'grow' }, h('b', {}, name), sub && h('small', {}, sub)));
    const list = h('div', { class: 'stack', style: { gap: '8px' } });
    const draw = (q = '') => list.replaceChildren(...friends.filter((f) => f.name.toLowerCase().includes(q)).map((f) => row(initials(f.name), f.name, '', f.id)));
    draw();
    const search = friends.length > 7 && h('input', { class: 'input', type: 'search', placeholder: 'Search a friend', 'aria-label': 'Search a friend', oninput: (e) => draw(e.target.value.trim().toLowerCase()) });
    render(friends.length > 1 && row('👥', 'All friends', `One voice for all ${friends.length} of them.`, 'all'), search, list);
  }

  function recordStep() {
    stopVoices();
    const consent = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: consentOk }), h('span', {}, 'Save my voice & its words for this message and ASR training.'));
    const mic = h('button', { type: 'button', class: 'mic-big', id: 'voiceMic', 'aria-label': 'Start recording', html: icon.mic(44), style: { alignSelf: 'center', margin: '6px 0' } });
    const timer = h('div', { class: 'timer', style: { fontSize: '40px', textAlign: 'center' } }, '0:00');
    mic.onclick = async () => {
      consentOk = consent.querySelector('input').checked;
      if (!consentOk) return fail(new Error('Please tick the box to continue.'));
      if (!micSupported()) return fail(new Error(micErrorHelp()));
      audio();
      try {
        st.rec = await startRecording({ maxSec: 15, onTick: (s) => { timer.textContent = `0:${String(Math.min(15, Math.floor(s))).padStart(2, '0')}`; }, onAutoStop: () => finish() });
      } catch (e) { return fail(new Error(micErrorHelp(e))); }
      render(h('b', {}, `For ${st.toName}`), timer,
        h('button', { type: 'button', class: 'recbtn', id: 'voiceStop', 'aria-label': 'Stop recording', html: icon.stop(30), style: { alignSelf: 'center' }, onclick: () => finish() }),
        h('p', { class: 'center small muted', style: { margin: '0' } }, 'Tap to finish · up to 15 seconds'));
    };
    render(h('b', {}, `For ${st.toName}`),
      reply && h('p', { class: 'voice-quote' }, `↩ ${reply.from}: ${reply.text}`),
      h('p', { class: 'small muted', style: { margin: '0' } }, `Say it in your own words, up to 15 seconds. ${st.toName === 'All friends' ? 'They' : st.toName} will hear it and read it.`),
      consent, mic,
      !reply && friends.length > 1 && h('button', { type: 'button', class: 'linkbtn small', onclick: pickStep }, '← Someone else'));
  }

  async function finish() {
    if (!st.rec) return;
    const r = st.rec;
    st.rec = null;
    const take = await r.stop();
    if (take.durationSec < 1) { recordStep(); return fail(new Error('That was too short. Please record again.')); }
    render(h('div', { class: 'loading', style: { flex: '0', minHeight: '120px' } }, h('div', { class: 'spinner' })), h('p', { class: 'small muted center', style: { margin: '0' } }, 'Writing down your words…'));
    try {
      const q = new URLSearchParams({ to: st.to, consent: '1', ...(reply && { replyTo: reply.id }) });
      const res = await api(`/api/voice?${q}`, { method: 'POST', body: take.wav });
      st.take = { ...res, wav: take.wav };
      checkStep();
    } catch (e) { recordStep(); fail(e); }
  }

  // The words exactly as the friend will read them. Nothing is sent before this step.
  function checkStep() {
    const text = h('textarea', { class: 'input', maxlength: '300', id: 'voiceWords', 'aria-label': 'Your words', placeholder: 'Write what you said' }, st.take.asrText || '');
    // words the ASR wasn't sure about: tap to fix
    const pills = (st.take.asrTypos || []).filter((t) => t.wrong && t.right).map((t) => {
      const b = h('button', { type: 'button', class: 'typo-pill' }, h('span', { class: 'wrong' }, t.wrong), h('span', { class: 'arrow' }, '→'), h('span', { class: 'right' }, t.right));
      b.onclick = () => {
        const at = text.value.toLowerCase().indexOf(t.wrong.toLowerCase());
        if (at >= 0) text.value = text.value.slice(0, at) + t.right + text.value.slice(at + t.wrong.length);
        b.classList.add('applied');
      };
      return b;
    });
    const listen = h('button', { type: 'button', class: 'seen-play', 'aria-label': 'Listen to yourself', html: icon.play(16) });
    const hear = () => play(() => st.take.wav.arrayBuffer(), st.mood, listen, [], []);
    listen.onclick = hear;
    const moods = h('div', { class: 'pick-row', id: 'voiceMoods' }, Object.entries(MOODS).map(([k, m]) => {
      const b = h('button', { type: 'button', class: 'pick' + (k === st.mood ? ' on' : ''), 'data-key': k }, h('span', { class: 'pick-emoji' }, m.emoji), h('span', {}, m.label));
      b.onclick = () => {
        st.mood = k;
        [...moods.children].forEach((c) => c.classList.toggle('on', c === b));
        stopVoices();
        hear(); // heard exactly as the friend will hear it
      };
      return b;
    }));
    const again = h('button', { type: 'button', class: 'btn ghost grow', onclick: () => { stopVoices(); dropDraft(); recordStep(); } }, 'Record again');
    const sendBtn = h('button', { type: 'button', class: 'btn grow', id: 'voiceSend' }, `Send to ${st.toName}`);
    sendBtn.onclick = async () => {
      if (!text.value.trim()) return fail(new Error('Please write what you said.'));
      sendBtn.disabled = true;
      stopVoices();
      try {
        const res = await api('/api/voice', { method: 'PATCH', json: { id: st.take.id, token: st.take.token, text: text.value, mood: st.mood } });
        st.take = null;
        closeSheet();
        toast(res.corrections?.length ? `Sent. Thanks for fixing ${res.corrections.length === 1 ? '1 word' : `${res.corrections.length} words`}!` : `Sent to ${st.toName}`);
        onSent?.();
      } catch (e) { fail(e); sendBtn.disabled = false; }
    };
    render(h('b', {}, 'Check your words'),
      h('p', { class: 'small muted', style: { margin: '0' } }, `${st.toName === 'All friends' ? 'Your friends' : st.toName} will read this under your voice. Make it match what you said.`),
      h('div', { class: 'row' }, listen, h('span', { class: 'small muted' }, 'Listen to yourself')),
      text,
      pills.length ? h('span', { class: 'pick-label' }, 'The AI wasn’t sure. Tap to fix:') : '',
      pills.length ? h('div', { class: 'typo-pills' }, pills) : '',
      h('span', { class: 'pick-label' }, 'A mood for your voice (optional)'), moods,
      h('div', { class: 'row' }, again, sendBtn));
  }

  if (reply || friends.length === 1) {
    if (!reply) { st.to = friends[0].id; st.toName = friends[0].name; }
    recordStep();
  } else pickStep();
  openSheet({
    title: reply ? `Reply to ${reply.from}` : 'Send a voice', subtitle: 'Your voice, with its words.', content: box,
    onClose: () => { stopVoices(); const r = st.rec; st.rec = null; if (r) r.stop().catch(() => {}); dropDraft(); }
  });
}
