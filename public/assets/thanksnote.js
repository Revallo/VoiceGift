// A thank-you note a friend received (users/<id>/thanks/<slug>.json): the recipient's words, and their voice
// when they recorded one (words light up while it plays). Used by the home page pop-up and the Dashboard archive.
import { h, api, icon, fmtAgo } from './common.js';
import { theme } from './themes.js';

let ac = null, playing = null;
export function stopNoteVoice() {
  if (!playing) return;
  try { playing.src.stop(); } catch {}
  playing.done();
  playing = null;
}

const daysLeft = (iso) => Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 86400000));

// big: the pop-up version (bigger words, a burst on top)
export function noteCard(n, { big = false } = {}) {
  const words = (n.words?.length ? n.words.map((w) => w.w) : String(n.text || '').split(/\s+/)).map((w) => h('span', {}, w + ' '));
  const caption = h('p', { class: 'thanks-words' }, words);
  const card = h('article', { class: 'thanks-card' + (big ? ' big' : '') + (n.read ? '' : ' new') },
    h('div', { class: 'thanks-head' },
      h('span', { class: 'thanks-emoji' }, theme(n.occasion).emoji),
      h('b', {}, `${n.from} says thank you`),
      !n.read && !big && h('span', { class: 'thanks-new' }, 'New')),
    caption);
  if (n.voiceId) {
    const btn = h('button', { type: 'button', class: 'seen-play', 'aria-label': `Play ${n.from}'s voice`, html: icon.play(16) });
    const label = h('span', { class: 'small muted' }, `${n.from}’s voice`);
    btn.onclick = () => (playing?.btn === btn ? stopNoteVoice() : play(n, btn, words));
    card.append(h('div', { class: 'row thanks-voice' }, btn, label));
  }
  card.append(h('small', { class: 'thanks-meta' }, n.expiresAt ? `${fmtAgo(n.at)} · disappears in ${daysLeft(n.expiresAt)} ${daysLeft(n.expiresAt) === 1 ? 'day' : 'days'}` : fmtAgo(n.at)));
  return card;
}

// Inside the tap: the AudioContext is made here (iOS).
async function play(n, btn, words) {
  stopNoteVoice();
  const AC = window.AudioContext || window.webkitAudioContext;
  ac ||= new AC();
  ac.resume().catch(() => {});
  btn.innerHTML = icon.pause(16);
  const me = { btn, src: null, raf: 0, done: () => { cancelAnimationFrame(me.raf); btn.innerHTML = icon.play(16); words.forEach((w) => (w.className = '')); } };
  playing = me;
  let buf;
  try {
    const r = await fetch(`/api/thanks?${new URLSearchParams({ slug: n.slug, id: n.voiceId })}`);
    if (!r.ok) throw new Error();
    buf = await ac.decodeAudioData(await r.arrayBuffer());
  } catch {
    if (playing === me) { me.done(); playing = null; }
    return;
  }
  if (playing !== me) return;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.connect(ac.destination);
  src.onended = () => { if (playing === me) { me.done(); playing = null; } };
  const t0 = ac.currentTime;
  src.start();
  me.src = src;
  const times = n.words || [];
  const paint = () => {
    const el = ac.currentTime - t0;
    let k = -1;
    times.forEach((w, i) => { if (w.start <= el) k = i; });
    words.forEach((w, i) => { w.className = i < k ? 'done' : i === k ? 'now' : ''; });
    me.raf = requestAnimationFrame(paint);
  };
  if (times.length) me.raf = requestAnimationFrame(paint);
}

export const markRead = (slug) => api('/api/account', { method: 'POST', json: { action: 'thanks-read', slug } }).catch(() => {});
