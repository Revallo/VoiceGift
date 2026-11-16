// Voices between friends, in the browser: the card a voice is shown as (always with its words), and the
// sheet that sends one: pick who → record → check the words → pick a mood → send.
// A voice can't be sent without its words: the caption step is where the speaker makes them right.
import { h, api, icon, toast, fmtAgo, openSheet, closeSheet } from './common.js';
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
  const me = { btn, voice: null, raf: 0, done: () => { cancelAnimationFrame(me.raf); btn.innerHTML = icon.play(14); wrap?.classList.remove('playing'); spans.forEach((w) => (w.className = '')); } };
  playing = me;
  btn.innerHTML = icon.pause(14);
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
  const btn = h('button', { type: 'button', class: 'seen-play', 'aria-label': `Play ${v.mine ? 'your' : `${v.from}’s`} voice`, html: icon.play(14) });
  const meta = [fmtAgo(v.at), secs(v.durationSec), v.mood !== 'normal' && `${MOODS[moodOf(v.mood)].label} voice`].filter(Boolean).join(' · ');
  const card = h('article', { class: 'voice-card' + (v.heard ? '' : ' new') },
    h('div', { class: 'voice-head' }, h('b', {}, who), h('small', {}, meta)),
    v.replyTo && h('p', { class: 'voice-quote' }, `${v.replyTo.from}: ${v.replyTo.text}`),
    h('p', { class: 'voice-words' }, spans),
    h('div', { class: 'voice-actions' }, btn, h('span', { class: 'voice-listen' }, 'Listen'),
      !v.mine && onReply && h('button', { type: 'button', class: 'linkbtn voice-reply', onclick: () => onReply(v) }, 'Reply')));
  btn.onclick = () => play(
    async () => { const r = await fetch(`/api/voice?id=${v.id}`); if (!r.ok) throw new Error(); return r.arrayBuffer(); },
    v.mood, btn, spans, v.words || [],
    () => {
      if (v.heard) return;
      v.heard = true;
      card.classList.remove('new');
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
    const row = (name, sub, to) => h('button', { type: 'button', class: 'pick-friend', 'data-to': to, onclick: () => { st.to = to; st.toName = name; recordStep(); } },
      h('b', {}, name), sub && h('small', {}, sub));
    const list = h('div', { class: 'rows' });
    const draw = (q = '') => list.replaceChildren(
      ...(!q && friends.length > 1 ? [row('All friends', `${friends.length} people`, 'all')] : []),
      ...friends.filter((f) => f.name.toLowerCase().includes(q)).map((f) => row(f.name, '', f.id)));
    draw();
    const search = friends.length > 7 && h('input', { class: 'input', type: 'search', placeholder: 'Search', 'aria-label': 'Search a friend', oninput: (e) => draw(e.target.value.trim().toLowerCase()) });
    render(search, list);
  }

  function recordStep() {
    stopVoices();
    const title = document.querySelector('.bottom-sheet .sheet-title');
    if (title && !reply) title.textContent = `To ${st.toName}`;
    const consent = h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: consentOk }), h('span', {}, 'Save my voice and its words for this message and for ASR training.'));
    const mic = h('button', { type: 'button', class: 'mic-big', id: 'voiceMic', 'aria-label': 'Start recording', html: icon.mic(34) });
    const timer = h('div', { class: 'timer' }, '0:00');
    mic.onclick = async () => {
      consentOk = consent.querySelector('input').checked;
      if (!consentOk) return fail(new Error('Please tick the box to continue.'));
      if (!micSupported()) return fail(new Error(micErrorHelp()));
      audio();
      try {
        st.rec = await startRecording({ maxSec: 15, onTick: (s) => { timer.textContent = `0:${String(Math.min(15, Math.floor(s))).padStart(2, '0')}`; }, onAutoStop: () => finish() });
      } catch (e) { return fail(new Error(micErrorHelp(e))); }
      render(timer,
        h('button', { type: 'button', class: 'mic-big stop', id: 'voiceStop', 'aria-label': 'Stop recording', html: icon.stop(28), onclick: () => finish() }),
        h('p', { class: 'hint center' }, 'Tap to finish. Up to 15 seconds.'));
    };
    render(reply && h('p', { class: 'voice-quote' }, `${reply.from}: ${reply.text}`),
      mic,
      h('p', { class: 'hint center' }, 'Tap to record. Up to 15 seconds.'),
      consent,
      !reply && friends.length > 1 && h('button', { type: 'button', class: 'linkbtn', onclick: pickStep }, 'Send to someone else'));
  }

  async function finish() {
    if (!st.rec) return;
    const r = st.rec;
    st.rec = null;
    const take = await r.stop();
    if (take.durationSec < 1) { recordStep(); return fail(new Error('That was too short. Please record again.')); }
    render(h('div', { class: 'loading', style: { flex: '0', minHeight: '120px' } }, h('div', { class: 'spinner' })), h('p', { class: 'hint center' }, 'Writing down your words…'));
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
      const b = h('button', { type: 'button', class: 'typo-pill' }, h('span', { class: 'wrong' }, t.wrong), h('span', { class: 'right' }, t.right));
      b.onclick = () => {
        const at = text.value.toLowerCase().indexOf(t.wrong.toLowerCase());
        if (at >= 0) text.value = text.value.slice(0, at) + t.right + text.value.slice(at + t.wrong.length);
        b.classList.add('applied');
      };
      return b;
    });
    const listen = h('button', { type: 'button', class: 'seen-play', 'aria-label': 'Listen to yourself', html: icon.play(14) });
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
    const again = h('button', { type: 'button', class: 'btn ghost', onclick: () => { stopVoices(); dropDraft(); recordStep(); } }, 'Record again');
    const sendBtn = h('button', { type: 'button', class: 'btn', id: 'voiceSend' }, 'Send');
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
    render(
      h('div', { class: 'field' }, h('label', { for: 'voiceWords' }, `${st.toName === 'All friends' ? 'Your friends' : st.toName} will read this. Make it match what you said.`), text),
      pills.length ? h('div', { class: 'field' }, h('label', {}, 'Not sure about these. Tap to fix.'), h('div', { class: 'typo-pills' }, pills)) : '',
      h('div', { class: 'field' }, h('label', {}, 'Voice'), moods),
      h('div', { class: 'voice-actions' }, listen, h('span', { class: 'voice-listen' }, 'Listen')),
      h('div', { class: 'row send-row' }, again, sendBtn));
  }

  if (reply || friends.length === 1) {
    if (!reply) { st.to = friends[0].id; st.toName = friends[0].name; }
    recordStep();
  } else pickStep();
  openSheet({
    title: reply ? `Reply to ${reply.from}` : 'New voice', content: box,
    onClose: () => { stopVoices(); const r = st.rec; st.rec = null; if (r) r.stop().catch(() => {}); dropDraft(); }
  });
}
