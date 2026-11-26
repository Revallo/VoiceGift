// Voice moods: a friend records normally, then may pick a mood (Sad, Angry, Dangdut, Toa…).
// Each mood is a little show: an intro sound, the voice with an effect, and something happening on the gift.
// The mood is ONLY applied while playing, in the browser (Web Audio). The stored WAV stays the clean,
// untouched recording, because it is ASR training data (see AImustRead.md). The message just keeps `mood`.
// Keys must match MOOD_KEYS in lib/gifts.js.

export const MOODS = {
  normal: { label: 'Normal', emoji: '🙂' },
  sad: { label: 'Sad', emoji: '😭', lead: 1.9, rate: 0.92 },
  angry: { label: 'Angry', emoji: '😡', lead: 0.9, rate: 0.88 },
  dangdut: { label: 'Dangdut', emoji: '💃', lead: 0.95 },
  toa: { label: 'Toa', emoji: '📢', lead: 1.6 },
  horror: { label: 'Horror', emoji: '👻', lead: 1.2, rate: 0.82 },
  helium: { label: 'Helium', emoji: '🎈', lead: 0.5, rate: 1.55 },
  alien: { label: 'Alien', emoji: '👽', lead: 0.95 },
  arcade: { label: '8-bit', emoji: '👾', lead: 0.5 },
  // Local moods (added 2026-11-26, ideas in `ide local.md`). `local` = the country (local.js LOCAL_KEYS): the friend's
  // page lists the gift's own country first. All music here is made up, in the style only (no real songs, no samples).
  bakso: { label: 'Abang Bakso', emoji: '🍜', lead: 1.15, local: 'id' },
  tektek: { label: 'Tek-tek', emoji: '🍳', lead: 0.9, local: 'id' },
  odong: { label: 'Odong-odong', emoji: '🎠', lead: 1.35, local: 'id' },
  angklung: { label: 'Angklung', emoji: '🎋', lead: 1.7, local: 'id' },
  gamelan: { label: 'Gamelan', emoji: '🪘', lead: 1.9, local: 'id' },
  keroncong: { label: 'Keroncong', emoji: '🎻', lead: 1.2, local: 'id' },
  lukthung: { label: 'Luk Thung', emoji: '🎤', lead: 1.6, local: 'th' },
  morlam: { label: 'Mor Lam', emoji: '🎶', lead: 1.6, local: 'th' },
  tuktuk: { label: 'Tuk-tuk', emoji: '🛺', lead: 1.35, local: 'th' },
  songkran: { label: 'Songkran', emoji: '💦', lead: 1.1, local: 'th' },
  videoke: { label: 'Videoke', emoji: '🎙️', lead: 0.7, tail: 1.9, local: 'ph' },
  jeepney: { label: 'Jeepney', emoji: '🚙', lead: 1.2, local: 'ph' },
  taho: { label: 'Taho', emoji: '🥣', lead: 1.4, local: 'ph' },
  rondalla: { label: 'Rondalla', emoji: '🪕', lead: 1.6, local: 'ph' },
  kilig: { label: 'Kilig', emoji: '💗', lead: 1.0, local: 'ph' },
  danbau: { label: 'Đàn bầu', emoji: '🌕', lead: 1.9, local: 'vn' },
  banhmi: { label: 'Bánh mì!', emoji: '🥖', lead: 1.5, local: 'vn' },
  honk: { label: 'Honk', emoji: '🛵', lead: 1.0, local: 'vn' },
  lion: { label: 'Lion dance', emoji: '🦁', lead: 1.1, local: 'vn' }
};
// The moods in the order the friend sees them: Normal, the gift's own country, the others, then the other countries.
export function moodsFor(local) {
  const all = Object.entries(MOODS);
  return [...all.filter(([k]) => k === DEFAULT_MOOD), ...all.filter(([, m]) => local && m.local === local),
    ...all.filter(([k, m]) => k !== DEFAULT_MOOD && !m.local), ...all.filter(([, m]) => m.local && m.local !== local)];
}
export const DEFAULT_MOOD = 'normal';
export const moodOf = (k) => (MOODS[k] ? k : DEFAULT_MOOD);

// ---------- small sound helpers ----------
function noiseBuffer(ac, sec) {
  const len = Math.max(1, Math.floor(ac.sampleRate * sec));
  const b = ac.createBuffer(1, len, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// A made-up room echo: noise that fades out over `sec` seconds.
function impulse(ac, sec, decay) {
  const len = Math.floor(ac.sampleRate * sec);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function filter(ac, type, freq, gain = 0, Q = 0.8) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.gain.value = gain;
  f.Q.value = Q;
  return f;
}

function gain(ac, v) { const g = ac.createGain(); g.gain.value = v; return g; }

function shaper(ac, curveFn) {
  const ws = ac.createWaveShaper();
  const n = 2048, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = curveFn((i * 2) / n - 1);
  ws.curve = curve;
  return ws;
}
const drive = (amount) => (x) => ((1 + amount) * x) / (1 + amount * Math.abs(x));

function reverb(ac, input, out, { sec, decay, wet }) {
  const conv = ac.createConvolver();
  conv.buffer = impulse(ac, sec, decay);
  input.connect(conv).connect(gain(ac, wet)).connect(out);
}

function echo(ac, input, out, { time, feedback, wet, tone = 3000 }) {
  const d = ac.createDelay(2);
  d.delayTime.value = time;
  const fb = gain(ac, feedback);
  const lp = filter(ac, 'lowpass', tone);
  input.connect(d);
  d.connect(lp).connect(fb).connect(d);
  lp.connect(gain(ac, wet)).connect(out);
}

// A note that starts at `t` and fades: osc type, frequency (or [from, to] glide), volume, length.
function note(ac, out, x, t, { type = 'sine', f, vol = 0.1, dur = 0.5, attack = 0.01 }) {
  const o = ac.createOscillator();
  o.type = type;
  if (Array.isArray(f)) { o.frequency.setValueAtTime(f[0], t); o.frequency.exponentialRampToValueAtTime(f[1], t + dur * 0.9); }
  else o.frequency.setValueAtTime(f, t);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
  x.push(o);
  return o;
}

function noiseHit(ac, out, x, t, { freq = 1800, Q = 1, vol = 0.3, dur = 0.08, type = 'bandpass' }) {
  const n = ac.createBufferSource();
  n.buffer = noiseBuffer(ac, dur + 0.05);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(filter(ac, type, freq, 0, Q)).connect(g).connect(out);
  n.start(t);
  x.push(n);
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// Calls fn(t, i) every `step` seconds from t0 until `end`.
function beats(t0, end, step, fn) { for (let i = 0, t = t0; t < end; i++, t += step) fn(t, i); }
// A plucked string: a short bright note through a lowpass.
function pluck(ac, out, x, t, { f, vol = 0.1, dur = 0.3, type = 'sawtooth', tone = 2400 }) {
  const lp = filter(ac, 'lowpass', tone);
  lp.connect(out);
  return note(ac, lp, x, t, { type, f, vol, dur, attack: 0.003 });
}
// Something metal struck (a bowl, a gong, a bar): a few out-of-tune partials.
function bell(ac, out, x, t, { f, vol = 0.1, dur = 1.4 }) {
  [[1, 1], [2.76, 0.42], [5.4, 0.18]].forEach(([m, v]) => note(ac, out, x, t, { f: f * m, vol: vol * v, dur: dur / Math.sqrt(m), attack: 0.002 }));
}
function vibrato(ac, x, osc, t, len, rate, depth) {
  const lfo = ac.createOscillator();
  lfo.frequency.value = rate;
  lfo.connect(gain(ac, depth)).connect(osc.frequency);
  lfo.start(t); lfo.stop(t + len);
  x.push(lfo);
}
// A sung vowel without words (a street vendor's call): a buzz through two formants, f = [from, to] Hz.
function sing(ac, out, x, t, { len, f, vowel = [750, 1150], vol = 0.5, vib = 0 }) {
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f[0], t);
  o.frequency.linearRampToValueAtTime(f[1], t + len);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.04);
  g.gain.setValueAtTime(vol, t + Math.max(0.05, len - 0.1));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(filter(ac, 'bandpass', vowel[0], 0, 5)).connect(g);
  o.connect(filter(ac, 'bandpass', vowel[1], 0, 7)).connect(gain(ac, 0.6)).connect(g);
  g.connect(out);
  o.start(t); o.stop(t + len + 0.05);
  x.push(o);
  if (vib) vibrato(ac, x, o, t + len * 0.3, len * 0.7, 5.5, vib);
}
// The hiss and pops of an old record.
function crackle(ac, out, x, t0, sec, vol = 0.05) {
  const len = Math.max(1, Math.floor(ac.sampleRate * sec));
  const b = ac.createBuffer(1, len, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0005 ? Math.random() * 2 - 1 : (Math.random() * 2 - 1) * 0.03;
  const s = ac.createBufferSource();
  s.buffer = b;
  s.connect(filter(ac, 'highpass', 1200)).connect(gain(ac, vol)).connect(out);
  s.start(t0);
  x.push(s);
}
// A held sound (an engine, a drone) that fades in, drops to `under` once the voice starts, and fades out after it.
function bed(ac, out, { t0, v0, v1 }, loud, under) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(loud, t0 + 0.15);
  g.gain.setValueAtTime(loud, Math.max(t0 + 0.16, v0 - 0.3));
  g.gain.linearRampToValueAtTime(under, v0);
  g.gain.setValueAtTime(under, v1);
  g.gain.linearRampToValueAtTime(0.0001, v1 + 0.6);
  g.connect(out);
  return g;
}
function hold(ac, x, osc, t0, end) { osc.start(t0); osc.stop(end); x.push(osc); return osc; }
const kick = (ac, out, x, t, vol = 0.3) => note(ac, out, x, t, { f: [140, 48], vol, dur: 0.2, attack: 0.003 });
const horn = (ac, out, x, t, f, len, vol = 0.06) => {
  const d = shaper(ac, drive(4));
  d.connect(filter(ac, 'lowpass', 2600)).connect(out);
  f.forEach((hz) => note(ac, d, x, t, { type: 'square', f: hz, vol, dur: len, attack: 0.01 }));
};

// ---------- the moods ----------
// Each one: (ac, voice, out, x, T) where voice is the effect input, x collects nodes to stop,
// and T = { t0: now, v0: when the voice starts, v1: when it ends }.
const MOOD_GRAPHS = {
  normal(ac, voice, out) { voice.connect(out); },

  // the sad trombone (wah… wah… wah… waaah), rain, then a trembling, teary voice
  sad(ac, voice, out, x, { t0, v1 }) {
    const horn = gain(ac, 1);
    horn.connect(filter(ac, 'lowpass', 1100)).connect(out);
    [[311.1, 0.42], [293.7, 0.42], [277.2, 0.42], [261.6, 1.0]].forEach(([f, len], k) => {
      const t = t0 + k * 0.44;
      const o = note(ac, horn, x, t, { type: 'sawtooth', f, vol: 0.13, dur: len, attack: 0.04 });
      if (k === 3) { // the long last note wobbles
        const wob = ac.createOscillator(); wob.frequency.value = 6;
        const amt = gain(ac, 9);
        wob.connect(amt).connect(o.frequency);
        wob.start(t); wob.stop(t + len);
        x.push(wob);
      }
    });
    const rain = ac.createBufferSource();
    rain.buffer = noiseBuffer(ac, v1 - t0 + 0.6);
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.exponentialRampToValueAtTime(0.05, t0 + 1.2);
    rain.connect(filter(ac, 'highpass', 2500)).connect(filter(ac, 'lowpass', 7000)).connect(rg).connect(out);
    rain.start(t0);
    x.push(rain);
    // a trembling voice (vibrato) in a big empty room, a little muffled
    const delay = ac.createDelay(0.05);
    delay.delayTime.value = 0.012;
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.5;
    const depth = gain(ac, 0.0028);
    lfo.connect(depth).connect(delay.delayTime);
    lfo.start(t0); lfo.stop(v1 + 1);
    x.push(lfo);
    const lp = filter(ac, 'lowpass', 2600);
    voice.connect(delay).connect(lp).connect(out);
    reverb(ac, lp, out, { sec: 2.6, decay: 2.2, wet: 0.45 });
  },

  // a growl and a fist on the table (BRAKK!), then a deep, hot, distorted voice
  angry(ac, voice, out, x, { t0 }) {
    note(ac, out, x, t0, { type: 'sawtooth', f: [70, 52], vol: 0.12, dur: 0.55, attack: 0.05 });
    const slam = t0 + 0.5;
    note(ac, out, x, slam, { f: [120, 38], vol: 0.6, dur: 0.35, attack: 0.003 });
    noiseHit(ac, out, x, slam, { freq: 900, Q: 0.7, vol: 0.5, dur: 0.18 });
    noiseHit(ac, out, x, slam + 0.02, { freq: 3500, type: 'highpass', vol: 0.18, dur: 0.12 });
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -26; comp.ratio.value = 8;
    voice.connect(filter(ac, 'lowshelf', 180, 6)).connect(filter(ac, 'peaking', 1600, 8, 1))
      .connect(gain(ac, 2)).connect(shaper(ac, drive(22))).connect(comp).connect(gain(ac, 0.7)).connect(out);
  },

  // kendang "tak-dung" under the voice, like a stage at a kampung party
  dangdut(ac, voice, out, x, { t0, v1 }) {
    const step = 60 / 132 / 2;
    const bar = ['D', '', 'T', 'D', '', 'D', 'T', 't'];
    for (let i = 0, t = t0; t < v1 + 0.4; i++, t += step) {
      const s = bar[i % bar.length];
      if (s === 'D') note(ac, out, x, t, { f: [150, 62], vol: 0.45, dur: 0.24, attack: 0.004 });
      if (s === 'T') noiseHit(ac, out, x, t, { freq: 1900, Q: 1.4, vol: 0.32, dur: 0.07 });
      if (s === 't') noiseHit(ac, out, x, t, { freq: 2600, Q: 2, vol: 0.14, dur: 0.05 });
      if (i % 2 === 0) noiseHit(ac, out, x, t, { freq: 8000, type: 'highpass', vol: 0.05, dur: 0.04 }); // ting
    }
    const comp = ac.createDynamicsCompressor();
    voice.connect(filter(ac, 'peaking', 2500, 4)).connect(comp).connect(gain(ac, 1.2)).connect(out);
    reverb(ac, voice, out, { sec: 1.6, decay: 3, wet: 0.25 });
  },

  // "ding-dong!" then the RT announcement speaker, echoing across the kampung
  toa(ac, voice, out, x, { t0 }) {
    note(ac, out, x, t0, { f: 659.25, vol: 0.22, dur: 0.9 });
    note(ac, out, x, t0, { f: 1318.5, vol: 0.05, dur: 0.5 });
    note(ac, out, x, t0 + 0.55, { f: 523.25, vol: 0.22, dur: 1.1 });
    note(ac, out, x, t0 + 0.55, { f: 1046.5, vol: 0.05, dur: 0.6 });
    const horn = filter(ac, 'peaking', 1800, 9, 1.2);
    voice.connect(filter(ac, 'highpass', 650)).connect(filter(ac, 'lowpass', 3600)).connect(horn);
    const end = gain(ac, 1);
    horn.connect(gain(ac, 2.2)).connect(shaper(ac, drive(30))).connect(end);
    end.connect(gain(ac, 0.42)).connect(out);
    echo(ac, end, out, { time: 0.42, feedback: 0.42, wet: 0.22, tone: 2400 });
    reverb(ac, end, out, { sec: 2, decay: 2.5, wet: 0.12 });
  },

  // a low hum and wind, a slow voice in a haunted hall with a whisper behind it
  horror(ac, voice, out, x, { t0, v1 }) {
    const end = v1 + 1;
    for (const f of [55, 58.3]) {
      const o = ac.createOscillator();
      o.frequency.value = f;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 1);
      g.gain.setValueAtTime(0.09, end - 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g).connect(out);
      o.start(t0); o.stop(end + 0.1);
      x.push(o);
    }
    const wind = ac.createBufferSource();
    wind.buffer = noiseBuffer(ac, end - t0 + 0.2);
    const wf = filter(ac, 'bandpass', 500, 0, 3);
    const lfo = ac.createOscillator(); lfo.frequency.value = 0.35;
    const lfoAmt = gain(ac, 300);
    lfo.connect(lfoAmt).connect(wf.frequency);
    wind.connect(wf).connect(gain(ac, 0.06)).connect(out);
    wind.start(t0); lfo.start(t0);
    x.push(wind, lfo);
    note(ac, out, x, t0 + 0.2, { type: 'triangle', f: 1244.5, vol: 0.04, dur: 1.6 }); // music-box ding
    note(ac, out, x, t0 + 0.65, { type: 'triangle', f: 1174.7, vol: 0.035, dur: 1.6 });
    const dark = filter(ac, 'lowpass', 2800);
    voice.connect(dark).connect(out);
    reverb(ac, dark, out, { sec: 4, decay: 1.8, wet: 0.65 });
    const whisper = ac.createDelay(1); whisper.delayTime.value = 0.11;
    voice.connect(whisper).connect(filter(ac, 'highpass', 2500)).connect(gain(ac, 0.6)).connect(out);
  },

  // a slide whistle up, then a squeaky balloon voice
  helium(ac, voice, out, x, { t0 }) {
    note(ac, out, x, t0, { f: [450, 1900], vol: 0.12, dur: 0.42, attack: 0.03 });
    voice.connect(filter(ac, 'highshelf', 3000, 3)).connect(out);
  },

  // a wobbly theremin, then a voice from another planet
  alien(ac, voice, out, x, { t0, v1 }) {
    const th = note(ac, out, x, t0, { f: [520, 980], vol: 0.11, dur: 0.85, attack: 0.08 });
    const vib = ac.createOscillator(); vib.frequency.value = 9;
    const vibAmt = gain(ac, 45);
    vib.connect(vibAmt).connect(th.frequency);
    vib.start(t0); vib.stop(t0 + 0.9);
    x.push(vib);
    const ring = gain(ac, 0);
    const carrier = ac.createOscillator(); carrier.frequency.value = 85;
    const wob = ac.createOscillator(); wob.frequency.value = 0.8;
    const wobAmt = gain(ac, 45);
    wob.connect(wobAmt).connect(carrier.frequency);
    carrier.connect(ring.gain);
    carrier.start(t0); wob.start(t0);
    carrier.stop(v1 + 1); wob.stop(v1 + 1);
    x.push(carrier, wob);
    const flange = ac.createDelay(0.05); flange.delayTime.value = 0.004;
    const fl = ac.createOscillator(); fl.frequency.value = 0.3;
    const flAmt = gain(ac, 0.003);
    fl.connect(flAmt).connect(flange.delayTime);
    fl.start(t0); fl.stop(v1 + 1);
    x.push(fl);
    const mix = gain(ac, 1);
    voice.connect(ring).connect(gain(ac, 1.4)).connect(mix);
    voice.connect(gain(ac, 0.35)).connect(mix);
    mix.connect(out);
    mix.connect(flange).connect(gain(ac, 0.6)).connect(out);
  },

  // a coin "pling!", then a crunchy video-game voice
  arcade(ac, voice, out, x, { t0 }) {
    note(ac, out, x, t0, { type: 'square', f: 987.8, vol: 0.07, dur: 0.09, attack: 0.002 });
    note(ac, out, x, t0 + 0.08, { type: 'square', f: 1318.5, vol: 0.07, dur: 0.38, attack: 0.002 });
    const levels = 7;
    voice.connect(gain(ac, 3)).connect(shaper(ac, (v) => Math.round(Math.max(-1, Math.min(1, v)) * levels) / levels))
      .connect(filter(ac, 'lowpass', 4500)).connect(gain(ac, 0.42)).connect(out);
  },

  // ----- Indonesia -----
  // the bakso seller's spoon on a bowl, "ting-ting-ting… ting-ting-ting", then a voice out on the street
  bakso(ac, voice, out, x, { t0 }) {
    [0, 0.15, 0.3, 0.62, 0.77, 0.92].forEach((d) => bell(ac, out, x, t0 + d, { f: 2350, vol: 0.09, dur: 0.5 }));
    voice.connect(filter(ac, 'peaking', 1200, 3)).connect(out);
    reverb(ac, voice, out, { sec: 0.9, decay: 3, wet: 0.18 });
  },

  // the nasi goreng cart: the spatula on the wok, "tek tek tek-tek", and a sizzle under the voice
  tektek(ac, voice, out, x, T) {
    const { t0, v1 } = T;
    const hit = (t, v) => { noiseHit(ac, out, x, t, { freq: 3200, Q: 6, vol: v, dur: 0.05 }); note(ac, out, x, t, { type: 'triangle', f: 1450, vol: v * 0.25, dur: 0.12, attack: 0.002 }); };
    [0, 0.22, 0.44, 0.56].forEach((d) => hit(t0 + d, 0.5));
    beats(t0 + 0.9, v1 + 0.2, 0.46, (t, i) => { hit(t, 0.1); if (i % 2) hit(t + 0.12, 0.07); });
    const sizzle = ac.createBufferSource();
    sizzle.buffer = noiseBuffer(ac, v1 - t0 + 0.7);
    sizzle.connect(filter(ac, 'highpass', 5000)).connect(bed(ac, out, T, 0.05, 0.018));
    hold(ac, x, sizzle, t0, v1 + 0.7);
    voice.connect(out);
  },

  // the odong-odong ride: a tinny made-up kiddie tune from a small speaker, the voice through it too
  odong(ac, voice, out, x, { t0, v1 }) {
    const tune = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 74, 79];
    beats(t0, v1 + 0.3, 0.17, (t, i) => {
      const vol = t < t0 + 1.3 ? 0.06 : 0.022;
      note(ac, out, x, t, { type: 'square', f: midi(tune[i % 16]), vol, dur: 0.14, attack: 0.004 });
      if (i % 4 === 0) note(ac, out, x, t, { type: 'triangle', f: midi(tune[i % 16] - 24), vol: vol * 1.6, dur: 0.3 });
    });
    voice.connect(filter(ac, 'highpass', 420)).connect(filter(ac, 'lowpass', 4000)).connect(gain(ac, 1.6))
      .connect(shaper(ac, drive(6))).connect(gain(ac, 0.7)).connect(out);
  },

  // bamboo tubes shaken (the rattle of an angklung), a little phrase, then soft chords under the voice
  angklung(ac, voice, out, x, { t0, v1 }) {
    const shake = (t, f, len, vol, rich = true) => {
      for (let k = 0; k * 0.065 < len; k++) {
        note(ac, out, x, t + k * 0.065, { type: 'triangle', f, vol: vol * (1 - (0.5 * k * 0.065) / len), dur: 0.09, attack: 0.004 });
        if (rich) note(ac, out, x, t + k * 0.065, { f: f * 2, vol: vol * 0.3, dur: 0.06, attack: 0.003 });
      }
    };
    [67, 71, 74, 72, 71, 67].forEach((n, k) => shake(t0 + k * 0.26, midi(n), 0.3, 0.07));
    const chords = [[67, 71, 74], [65, 69, 72], [64, 67, 72], [62, 67, 71]];
    beats(t0 + 1.7, v1 + 0.2, 1.4, (t, i) => chords[i % 4].forEach((n) => shake(t, midi(n), 0.45, 0.016, false)));
    voice.connect(out);
    reverb(ac, voice, out, { sec: 1.2, decay: 3, wet: 0.15 });
  },

  // a big gong, a few metal bars in a pelog-like scale, then a slow soft pattern under the voice
  gamelan(ac, voice, out, x, { t0, v1 }) {
    const sl = [293.7, 311.1, 349.2, 415.3, 440];
    const gong = (t, v) => { bell(ac, out, x, t, { f: 73.4, vol: v, dur: 3.5 }); note(ac, out, x, t, { f: 75, vol: v * 0.6, dur: 3.2, attack: 0.02 }); };
    gong(t0, 0.32);
    [2, 1, 0, 1, 3, 4, 3].forEach((s, k) => bell(ac, out, x, t0 + 0.35 + k * 0.2, { f: sl[s] * 2, vol: 0.09, dur: 0.9 }));
    beats(t0 + 1.95, v1 + 0.3, 0.6, (t, i) => {
      bell(ac, out, x, t, { f: sl[[0, 2, 1, 3, 4, 3, 1, 2][i % 8]] * 2, vol: 0.022, dur: 0.7 });
      if (i % 8 === 7) gong(t + 0.6, 0.08);
    });
    voice.connect(out);
    reverb(ac, voice, out, { sec: 2, decay: 2.5, wet: 0.22 });
  },

  // "crong-cong": the small keroncong strings on the off-beats, a plucked bass, an old record's crackle
  keroncong(ac, voice, out, x, { t0, v1 }) {
    const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
    beats(t0, v1 + 0.3, 0.2, (t, i) => {
      const ch = chords[Math.floor(i / 8) % 4], soft = t < t0 + 1.2 ? 1 : 0.4;
      if (i % 4 === 0) pluck(ac, out, x, t, { f: midi(ch[0] - 24), vol: 0.16 * soft, dur: 0.4, type: 'triangle', tone: 900 });
      else if (i % 2) ch.forEach((n, k) => pluck(ac, out, x, t + k * 0.008, { f: midi(n + 12), vol: 0.035 * soft, dur: 0.16, tone: 3000 }));
    });
    crackle(ac, out, x, t0, v1 - t0 + 0.5, 0.06);
    voice.connect(filter(ac, 'highpass', 300)).connect(filter(ac, 'lowpass', 3400)).connect(filter(ac, 'peaking', 1000, 3)).connect(out);
  },

  // ----- Thailand -----
  // a brassy made-up luk thung lick, then a beat with the little "ching" cymbals and a stage echo on the voice
  lukthung(ac, voice, out, x, { t0, v1 }) {
    const brass = filter(ac, 'lowpass', 2200);
    brass.connect(out);
    [[69, 0.16], [72, 0.16], [74, 0.16], [76, 0.44], [74, 0.16], [72, 0.48]].reduce((t, [n, len]) => {
      const o = note(ac, brass, x, t, { type: 'sawtooth', f: midi(n), vol: 0.075, dur: len, attack: 0.02 });
      vibrato(ac, x, o, t, len, 6, 7);
      return t + len;
    }, t0);
    beats(t0 + 1.6, v1 + 0.3, 0.25, (t, i) => {
      if (i % 2 === 0) kick(ac, out, x, t, 0.22);
      if (i % 4 === 2) noiseHit(ac, out, x, t, { freq: 1800, vol: 0.12, dur: 0.1 });
      if (i % 2) bell(ac, out, x, t, { f: 3100, vol: 0.018, dur: 0.25 });
    });
    voice.connect(out);
    echo(ac, voice, out, { time: 0.13, feedback: 0.25, wet: 0.28 });
    reverb(ac, voice, out, { sec: 1.4, decay: 3, wet: 0.15 });
  },

  // a khaen-like reed drone with a quick phrase on top, and a fast beat under the voice
  morlam(ac, voice, out, x, T) {
    const { t0, v1 } = T;
    const reed = filter(ac, 'lowpass', 1600);
    reed.connect(bed(ac, out, T, 1, 0.35));
    for (const n of [57, 64, 69]) {
      const o = ac.createOscillator();
      o.type = 'square';
      o.frequency.value = midi(n);
      o.connect(gain(ac, 0.022)).connect(reed);
      hold(ac, x, o, t0, v1 + 0.7);
    }
    [[76, 0.15], [74, 0.15], [72, 0.15], [69, 0.3], [72, 0.15], [69, 0.45]].reduce((t, [n, len]) => {
      note(ac, reed, x, t, { type: 'square', f: midi(n), vol: 0.04, dur: len, attack: 0.01 });
      return t + len;
    }, t0 + 0.2);
    beats(t0 + 1.6, v1 + 0.3, 0.2, (t, i) => {
      if (i % 2 === 0) note(ac, out, x, t, { f: [110, 45], vol: 0.16, dur: 0.16, attack: 0.003 });
      else noiseHit(ac, out, x, t, { freq: 6000, type: 'highpass', vol: 0.04, dur: 0.04 });
    });
    voice.connect(out);
    reverb(ac, voice, out, { sec: 1, decay: 3, wet: 0.12 });
  },

  // a tuk-tuk revs up and goes "meep meep", then idles under the voice
  tuktuk(ac, voice, out, x, T) {
    const { t0, v1 } = T;
    const eng = ac.createOscillator();
    eng.type = 'sawtooth';
    eng.frequency.setValueAtTime(32, t0);
    eng.frequency.linearRampToValueAtTime(58, t0 + 0.7);
    eng.frequency.linearRampToValueAtTime(36, t0 + 1.3);
    const chop = gain(ac, 0.5);
    const lfo = ac.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 14;
    lfo.connect(gain(ac, 0.5)).connect(chop.gain);
    eng.connect(filter(ac, 'lowpass', 380)).connect(chop).connect(bed(ac, out, T, 0.4, 0.07));
    hold(ac, x, eng, t0, v1 + 0.7);
    hold(ac, x, lfo, t0, v1 + 0.7);
    [0.72, 0.98].forEach((d) => horn(ac, out, x, t0 + d, [554, 698], 0.18, 0.045));
    voice.connect(out);
  },

  // splash! water thrown three times, drips during the voice, and a watery wobble on it
  songkran(ac, voice, out, x, { t0, v1 }) {
    const splash = (t, v) => {
      const n = ac.createBufferSource();
      n.buffer = noiseBuffer(ac, 0.6);
      const f = filter(ac, 'lowpass', 5000);
      f.frequency.setValueAtTime(5000, t);
      f.frequency.exponentialRampToValueAtTime(350, t + 0.5);
      const g = ac.createGain();
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      n.connect(f).connect(g).connect(out);
      n.start(t);
      x.push(n);
    };
    splash(t0, 0.5); splash(t0 + 0.36, 0.4); splash(t0 + 0.6, 0.45);
    beats(t0 + 1.1, v1, 0.37, (t) => { if (Math.random() < 0.5) note(ac, out, x, t + Math.random() * 0.2, { f: [900 + Math.random() * 500, 2200], vol: 0.035, dur: 0.06, attack: 0.002 }); });
    const wob = ac.createDelay(0.05);
    wob.delayTime.value = 0.008;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 1.3;
    lfo.connect(gain(ac, 0.004)).connect(wob.delayTime);
    hold(ac, x, lfo, t0, v1 + 1);
    voice.connect(filter(ac, 'lowpass', 5200)).connect(out);
    voice.connect(wob).connect(gain(ac, 0.5)).connect(out);
  },

  // ----- the Philippines -----
  // a videoke machine: a little jingle, the voice in the echo of the mic, and the score at the end
  videoke(ac, voice, out, x, { t0, v1 }) {
    [60, 64, 67, 72].forEach((n, k) => note(ac, out, x, t0 + k * 0.12, { type: 'square', f: midi(n), vol: 0.05, dur: 0.5, attack: 0.005 }));
    for (let k = 0; k < 14; k++) noiseHit(ac, out, x, v1 + 0.15 + k * 0.05, { freq: 1500, vol: 0.06 + k * 0.012, dur: 0.05 }); // drum roll…
    [72, 76, 79, 84].forEach((n) => note(ac, out, x, v1 + 0.9, { type: 'square', f: midi(n), vol: 0.04, dur: 0.9, attack: 0.01 })); // …and the score
    const mic = gain(ac, 1);
    voice.connect(ac.createDynamicsCompressor()).connect(mic).connect(out);
    echo(ac, mic, out, { time: 0.26, feedback: 0.38, wet: 0.32, tone: 3500 });
    reverb(ac, mic, out, { sec: 2.2, decay: 2.5, wet: 0.3 });
  },

  // a jeepney's horn, "BEEEP beep", and its diesel rumbling under the voice
  jeepney(ac, voice, out, x, T) {
    const { t0, v1 } = T;
    horn(ac, out, x, t0, [330, 415], 0.55, 0.07);
    horn(ac, out, x, t0 + 0.68, [330, 415], 0.2, 0.07);
    const eng = ac.createOscillator();
    eng.type = 'sawtooth';
    eng.frequency.value = 46;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.7;
    lfo.connect(gain(ac, 5)).connect(eng.frequency);
    eng.connect(filter(ac, 'lowpass', 220)).connect(bed(ac, out, T, 0.3, 0.09));
    hold(ac, x, eng, t0, v1 + 0.7);
    hold(ac, x, lfo, t0, v1 + 0.7);
    voice.connect(out);
  },

  // the taho vendor's morning call, "Ta-hooo!", across the street
  taho(ac, voice, out, x, { t0 }) {
    const call = gain(ac, 1);
    call.connect(out);
    echo(ac, call, out, { time: 0.3, feedback: 0.3, wet: 0.25, tone: 2000 });
    sing(ac, call, x, t0, { len: 0.22, f: [300, 330], vowel: [750, 1150], vol: 0.55 });
    sing(ac, call, x, t0 + 0.26, { len: 1.0, f: [392, 370], vowel: [450, 820], vol: 0.55, vib: 6 });
    voice.connect(out);
    reverb(ac, voice, out, { sec: 1.4, decay: 3, wet: 0.15 });
  },

  // a rondalla: banduria strings in fast tremolo, then a soft waltz strum under the voice
  rondalla(ac, voice, out, x, { t0, v1 }) {
    const trem = (t, f, len, vol) => { for (let k = 0; k * 0.055 < len; k++) pluck(ac, out, x, t + k * 0.055, { f, vol, dur: 0.12, tone: 3200 }); };
    [76, 79, 77, 76, 74].forEach((n, k) => trem(t0 + k * 0.3, midi(n), 0.28, 0.04));
    const chords = [[55, 59, 62], [60, 64, 67], [62, 66, 69], [55, 59, 62]];
    beats(t0 + 1.6, v1 + 0.3, 0.32, (t, i) => {
      const ch = chords[Math.floor(i / 3) % 4];
      if (i % 3 === 0) pluck(ac, out, x, t, { f: midi(ch[0] - 12), vol: 0.07, dur: 0.5, type: 'triangle', tone: 1200 });
      else ch.forEach((n, k) => pluck(ac, out, x, t + k * 0.012, { f: midi(n), vol: 0.018, dur: 0.2 }));
    });
    voice.connect(out);
    reverb(ac, voice, out, { sec: 1.3, decay: 3, wet: 0.14 });
  },

  // kilig: a fluttering heart (lub-dub) and a run of chimes, then a sweet, slightly dreamy voice
  kilig(ac, voice, out, x, { t0, v1 }) {
    const heart = (t, v) => { note(ac, out, x, t, { f: [90, 50], vol: v, dur: 0.14, attack: 0.004 }); note(ac, out, x, t + 0.16, { f: [80, 45], vol: v * 0.7, dur: 0.14, attack: 0.004 }); };
    heart(t0, 0.35);
    [84, 88, 91, 96, 100].forEach((n, k) => note(ac, out, x, t0 + 0.4 + k * 0.08, { type: 'triangle', f: midi(n), vol: 0.04, dur: 0.7 }));
    beats(t0 + 1.1, v1, 0.85, (t) => heart(t, 0.07));
    const sweet = filter(ac, 'highshelf', 3200, 4);
    voice.connect(sweet).connect(out);
    reverb(ac, sweet, out, { sec: 1.8, decay: 2.6, wet: 0.2 });
  },

  // ----- Vietnam -----
  // the đàn bầu's one string: a note that bends up and back with a deep vibrato, and a wistful room
  danbau(ac, voice, out, x, { t0, v1 }) {
    const bend = (t, from, to, len, vol) => {
      const o = note(ac, out, x, t, { type: 'triangle', f: from, vol, dur: len, attack: 0.05 });
      o.frequency.setValueAtTime(from, t + len * 0.25);
      o.frequency.linearRampToValueAtTime(to, t + len * 0.5);
      o.frequency.linearRampToValueAtTime(from, t + len * 0.8);
      vibrato(ac, x, o, t + len * 0.4, len * 0.6, 5, 9);
    };
    bend(t0, midi(69), midi(72), 0.9, 0.14);
    bend(t0 + 0.9, midi(64), midi(66), 1.1, 0.12);
    beats(t0 + 2.6, v1 - 0.5, 2.6, (t, i) => bend(t, midi([69, 67, 64][i % 3]), midi([71, 69, 66][i % 3]), 1.4, 0.03));
    const soft = filter(ac, 'lowpass', 3800);
    voice.connect(soft).connect(out);
    reverb(ac, soft, out, { sec: 2.4, decay: 2.4, wet: 0.3 });
  },

  // the bánh mì cart's loudspeaker: a chime and a sung street cry, then the voice on the same speaker
  banhmi(ac, voice, out, x, { t0 }) {
    note(ac, out, x, t0, { f: 1046.5, vol: 0.12, dur: 0.35 });
    note(ac, out, x, t0 + 0.16, { f: 1318.5, vol: 0.12, dur: 0.5 });
    const cry = gain(ac, 1);
    cry.connect(shaper(ac, drive(8))).connect(filter(ac, 'bandpass', 1500, 0, 0.7)).connect(gain(ac, 0.9)).connect(out);
    [[392, 0], [392, 1], [440, 0], [392, 1], [330, 0], [392, 1]].forEach(([f, v], k) =>
      sing(ac, cry, x, t0 + 0.5 + k * 0.15, { len: 0.14, f: [f, f], vowel: v ? [450, 820] : [750, 1150], vol: 0.6 }));
    const end = gain(ac, 1);
    voice.connect(filter(ac, 'highpass', 600)).connect(filter(ac, 'lowpass', 3500)).connect(gain(ac, 2)).connect(shaper(ac, drive(18))).connect(end);
    end.connect(gain(ac, 0.45)).connect(out);
    echo(ac, end, out, { time: 0.36, feedback: 0.35, wet: 0.2, tone: 2400 });
  },

  // rush hour: scooters buzzing past and horns from every side, still there under the voice
  honk(ac, voice, out, x, T) {
    const { t0, v1 } = T;
    const eng = ac.createOscillator();
    eng.type = 'sawtooth';
    eng.frequency.setValueAtTime(90, t0);
    eng.frequency.linearRampToValueAtTime(150, t0 + 0.6);
    eng.frequency.linearRampToValueAtTime(110, t0 + 1);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.5;
    lfo.connect(gain(ac, 20)).connect(eng.frequency);
    eng.connect(filter(ac, 'lowpass', 900)).connect(bed(ac, out, T, 0.07, 0.025));
    hold(ac, x, eng, t0, v1 + 0.7);
    hold(ac, x, lfo, t0, v1 + 0.7);
    [[0.05, 470], [0.3, 600], [0.42, 600], [0.7, 520]].forEach(([d, f]) => horn(ac, out, x, t0 + d, [f, f * 1.26], 0.14, 0.04));
    beats(t0 + 1.4, v1, 1.1, (t) => { if (Math.random() < 0.6) horn(ac, out, x, t + Math.random() * 0.5, [480 + Math.random() * 200, 640], 0.1, 0.012); });
    voice.connect(out);
  },

  // the lion dance drum, "tùng tùng cheng", with cymbals, louder first, then soft under the voice
  lion(ac, voice, out, x, { t0, v1 }) {
    const drum = (t, v) => { note(ac, out, x, t, { f: [95, 45], vol: v, dur: 0.3, attack: 0.003 }); noiseHit(ac, out, x, t, { freq: 400, vol: v * 0.4, dur: 0.08 }); };
    const cheng = (t, v) => noiseHit(ac, out, x, t, { freq: 5500, type: 'highpass', vol: v, dur: 0.45 });
    beats(t0, v1 + 0.3, 0.18, (t, i) => {
      const v = t < t0 + 1.1 ? 1 : 0.3;
      const s = 'DD.CD.C.'[i % 8];
      if (s === 'D') drum(t, 0.5 * v);
      if (s === 'C') cheng(t, 0.16 * v);
    });
    voice.connect(out);
  }
};

// Plays an AudioBuffer with a mood. Returns { rate, lead, duration, total, stop() }.
// The voice starts `lead` seconds in (after the intro); words light up at
// buffer time = (seconds since start − lead) × rate. `onended` fires after the outro (`tail`).
export function playVoice(ac, buffer, mood, { dest = ac.destination, onended } = {}) {
  const key = moodOf(mood);
  const m = MOODS[key];
  const rate = m.rate || 1, lead = m.lead || 0, tail = m.tail || 0;
  const t0 = ac.currentTime + 0.03;
  const duration = buffer.duration / rate;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const out = ac.createGain();
  out.connect(dest);
  const voice = ac.createGain();
  src.connect(voice);
  const x = [];
  MOOD_GRAPHS[key](ac, voice, out, x, { t0, v0: t0 + lead, v1: t0 + lead + duration });
  let done = false, tailTimer = 0;
  const cleanup = () => {
    if (done) return;
    done = true;
    clearTimeout(tailTimer);
    x.forEach((n) => { try { n.stop(); } catch {} });
    out.gain.setTargetAtTime(0, ac.currentTime + 0.4, 0.2);
    setTimeout(() => { try { out.disconnect(); } catch {} }, 2000);
  };
  src.onended = () => { tailTimer = setTimeout(() => { cleanup(); onended?.(); }, tail * 1000); };
  src.start(t0 + lead);
  return {
    rate, lead, tail, duration, total: lead + duration + tail,
    stop() {
      src.onended = null;
      try { src.stop(); } catch {}
      cleanup();
      out.gain.cancelScheduledValues(ac.currentTime);
      out.gain.value = 0;
    }
  };
}

// ---------- what happens on the gift while a mood plays ----------
// Adds a class + a few elements on the scene's frame (`wrap` = scene.wrap) for `total` seconds.
// Returns a function that ends it early.
export function moodShow(wrap, mood, { lead = 0, duration = 0 } = {}) {
  const key = moodOf(mood);
  if (key === 'normal' || !wrap) return () => {};
  const fx = document.createElement('div');
  fx.className = `moodfx moodfx-${key}`;
  fx.setAttribute('aria-hidden', 'true');
  fx.style.setProperty('--lead', `${lead}s`);
  fx.style.setProperty('--voice', `${Math.max(0.5, duration)}s`);
  const add = (cls, text, style = {}) => {
    const e = document.createElement('i');
    e.className = cls;
    if (text) e.textContent = text;
    for (const [k, v] of Object.entries(style)) e.style.setProperty(k.startsWith('--') ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), v);
    fx.append(e);
    return e;
  };
  if (key === 'sad') { add('fx-gloom'); for (let k = 0; k < 28; k++) add('fx-rain', '', { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.9}s`, animationDuration: `${0.55 + Math.random() * 0.35}s` }); add('fx-cry', '😭'); }
  if (key === 'angry') { add('fx-red'); add('fx-steam l', '💢'); add('fx-steam r', '💢', { animationDelay: '0.25s' }); add('fx-mad', '😡'); }
  if (key === 'dangdut') { for (let k = 0; k < 6; k++) add('fx-disco', '', { left: `${8 + k * 16}%`, animationDelay: `${-k * 0.23}s`, '--h': `${k * 60}deg` }); add('fx-emoji', '💃', { left: '6%', bottom: '8%' }); add('fx-emoji r', '🕺', { right: '6%', bottom: '8%' }); }
  if (key === 'toa') { add('fx-toa', '📢'); for (let k = 0; k < 3; k++) add('fx-wave', '', { animationDelay: `${lead + k * 0.5}s` }); }
  if (key === 'horror') { add('fx-dark'); add('fx-ghost', '👻'); }
  if (key === 'helium') { for (let k = 0; k < 7; k++) add('fx-balloon', ['🎈', '🎈', '🎈', '🎉'][k % 4], { left: `${6 + k * 14}%`, animationDelay: `${k * 0.25}s`, '--sway': `${(k % 2 ? 1 : -1) * 18}px` }); }
  if (key === 'alien') { add('fx-ufo', '🛸'); add('fx-beam'); }
  if (key === 'arcade') { add('fx-pixels'); add('fx-coin', '+1 UP'); }
  // local moods: a few shared pieces (fx-corner, fx-word, fx-rise, fx-across, fx-tint) in app.css
  const rise = (chars, n, dur = 3) => { for (let k = 0; k < n; k++) add('fx-rise', chars[k % chars.length], { left: `${8 + ((k * 37) % 84)}%`, '--at': `${(k * dur) / n}s`, '--dur': `${dur}s` }); };
  const tint = (c) => add('fx-tint', '', { '--tint': c });
  if (key === 'bakso') { add('fx-corner bob', '🍜'); add('fx-word', 'ting ting ting!'); rise(['♨️'], 4, 2.4); }
  if (key === 'tektek') { add('fx-corner shake', '🍳'); add('fx-word', 'tek tek tek!'); rise(['💨'], 3, 2); }
  if (key === 'odong') { for (let k = 0; k < 6; k++) add('fx-disco', '', { left: `${8 + k * 16}%`, animationDelay: `${-k * 0.23}s`, '--h': `${k * 60}deg` }); add('fx-corner bob', '🎠'); }
  if (key === 'angklung') { add('fx-corner sway', '🎋'); add('fx-corner sway r', '🎋'); rise(['♪', '♫'], 6); }
  if (key === 'gamelan') { tint('rgba(120, 80, 10, 0.32)'); for (let k = 0; k < 3; k++) add('fx-wave mid', '', { animationDelay: `${k * 0.9}s` }); rise(['♪'], 4, 3.4); }
  if (key === 'keroncong') { tint('rgba(110, 80, 40, 0.38)'); add('fx-corner sway', '🎻'); rise(['♪', '♫'], 5, 3.4); }
  if (key === 'lukthung') { for (let k = 0; k < 4; k++) add('fx-disco', '', { left: `${12 + k * 24}%`, animationDelay: `${-k * 0.3}s`, '--h': `${40 + k * 12}deg` }); add('fx-corner bob', '🎤'); rise(['✨'], 6, 2.6); }
  if (key === 'morlam') { tint('rgba(30, 90, 40, 0.3)'); add('fx-corner bob', '🥁'); rise(['🎶', '♪'], 6, 2.6); }
  if (key === 'tuktuk') { add('fx-across', '🛺', { '--y': '58%', '--dur': '3.2s' }); add('fx-across', '💨', { '--y': '66%', '--dur': '3.2s', '--at': '0.25s', fontSize: '22px' }); add('fx-word', 'meep meep!', { '--at': '0.7s' }); }
  if (key === 'songkran') { tint('rgba(40, 120, 200, 0.28)'); for (let k = 0; k < 26; k++) add('fx-rain drop', '', { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.9}s` }); ['16%', '58%', '34%'].forEach((l, k) => add('fx-splash', '💦', { left: l, top: `${18 + k * 22}%`, '--at': `${k * 0.36}s` })); }
  if (key === 'videoke') { add('fx-corner bob', '🎙️'); add('fx-lyrics'); add('fx-score', '💯 100'); }
  if (key === 'jeepney') { add('fx-across', '🚙', { '--y': '60%', '--dur': '3s' }); add('fx-word', 'BEEEP beep!'); }
  if (key === 'taho') { add('fx-corner bob', '🥣'); add('fx-word', 'Tahooo!', { '--at': '0.25s' }); }
  if (key === 'rondalla') { tint('rgba(150, 90, 30, 0.22)'); add('fx-corner sway', '🪕'); rise(['♪', '♫'], 6, 3); }
  if (key === 'kilig') { tint('rgba(255, 110, 170, 0.22)'); rise(['💗', '💕', '💖'], 10, 2.8); }
  if (key === 'danbau') { tint('rgba(20, 40, 90, 0.4)'); add('fx-moon', '🌕'); rise(['♪'], 4, 4); }
  if (key === 'banhmi') { add('fx-corner bob', '🥖'); add('fx-word', 'Bánh mì!', { '--at': '0.5s' }); for (let k = 0; k < 3; k++) add('fx-wave', '', { animationDelay: `${lead + k * 0.5}s` }); }
  if (key === 'honk') { [['🛵', '52%', '2.4s', '0s'], ['🛵', '64%', '2s', '0.5s'], ['🛵', '44%', '2.8s', '1.1s']].forEach(([e, y, d, at]) => add('fx-across', e, { '--y': y, '--dur': d, '--at': at })); add('fx-word', 'BEEP! BEEP!'); }
  if (key === 'lion') { tint('rgba(180, 20, 20, 0.25)'); add('fx-corner bob big', '🦁'); for (let k = 0; k < 24; k++) add('fx-rain confetti', '', { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 1.2}s`, '--h': `${k % 2 ? 45 : 0}deg` }); }
  wrap.append(fx);
  wrap.classList.add(`mood-${key}`);
  const total = (lead + duration + (MOODS[key].tail || 0)) * 1000 + 300;
  let ended = false, paused = false, remaining = total, startedAt = performance.now();
  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    wrap.classList.remove(`mood-${key}`);
    fx.classList.add('out');
    setTimeout(() => fx.remove(), 300);
  };
  let timer = setTimeout(end, remaining);
  // The recipient can pause the audio clock; keep the visual effect for the remaining playback too.
  end.pause = () => {
    if (ended || paused) return;
    paused = true;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
    clearTimeout(timer);
  };
  end.resume = () => {
    if (ended || !paused) return;
    paused = false;
    startedAt = performance.now();
    timer = setTimeout(end, remaining);
  };
  return end;
}
