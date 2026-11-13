// Voice moods: a friend records normally, then may pick a mood (Sinetron, Dangdut, Toa…).
// Each mood is a little show: an intro sound, the voice with an effect, and something happening on the gift.
// The mood is ONLY applied while playing, in the browser (Web Audio). The stored WAV stays the clean,
// untouched recording, because it is ASR training data (see AImustRead.md). The message just keeps `mood`.
// Keys must match MOOD_KEYS in lib/gifts.js.

export const MOODS = {
  normal: { label: 'Normal', emoji: '🙂' },
  sinetron: { label: 'Sinetron', emoji: '🎬', lead: 1.55 },
  dangdut: { label: 'Dangdut', emoji: '💃', lead: 0.95 },
  toa: { label: 'Toa', emoji: '📢', lead: 1.6 },
  horror: { label: 'Horror', emoji: '👻', lead: 1.2, rate: 0.82 },
  helium: { label: 'Helium', emoji: '🎈', lead: 0.5, rate: 1.55 },
  alien: { label: 'Alien', emoji: '👽', lead: 0.95 },
  concert: { label: 'Concert', emoji: '🎤', lead: 0.2, tail: 2.6 },
  arcade: { label: '8-bit', emoji: '👾', lead: 0.5 }
};
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

// ---------- the moods ----------
// Each one: (ac, voice, out, x, T) where voice is the effect input, x collects nodes to stop,
// and T = { t0: now, v0: when the voice starts, v1: when it ends }.
const MOOD_GRAPHS = {
  normal(ac, voice, out) { voice.connect(out); },

  // JENG… JENG… JENGGG! then the voice in a big dramatic hall
  sinetron(ac, voice, out, x, { t0 }) {
    const bus = gain(ac, 1);
    bus.connect(filter(ac, 'lowpass', 2200)).connect(out);
    const chords = [[98, 146.8, 196], [92.5, 138.6, 185], [82.4, 123.5, 164.8, 246.9]];
    chords.forEach((ch, k) => {
      const t = t0 + k * 0.42;
      const len = k === 2 ? 1.25 : 0.38;
      for (const f of ch) for (const det of [-6, 6]) {
        const o = note(ac, bus, x, t, { type: 'sawtooth', f, vol: 0.05, dur: len, attack: 0.008 });
        o.detune.value = det;
      }
      note(ac, out, x, t, { f: [70, 40], vol: 0.35, dur: len * 0.9 }); // the boom
    });
    voice.connect(out);
    reverb(ac, voice, out, { sec: 2.4, decay: 2.5, wet: 0.35 });
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

  // a stadium: the voice echoes, and when it ends the crowd goes wild
  concert(ac, voice, out, x, { v1 }) {
    voice.connect(out);
    echo(ac, voice, out, { time: 0.32, feedback: 0.3, wet: 0.35 });
    reverb(ac, voice, out, { sec: 3.4, decay: 2, wet: 0.45 });
    const cheer = ac.createBufferSource();
    cheer.buffer = noiseBuffer(ac, 2.8);
    const cg = ac.createGain();
    cg.gain.setValueAtTime(0.0001, v1);
    cg.gain.exponentialRampToValueAtTime(0.32, v1 + 0.35);
    cg.gain.setValueAtTime(0.32, v1 + 1.2);
    cg.gain.exponentialRampToValueAtTime(0.0001, v1 + 2.6);
    cheer.connect(filter(ac, 'bandpass', 1100, 0, 0.5)).connect(cg).connect(out);
    cheer.start(v1);
    x.push(cheer);
    for (let k = 0; k < 34; k++) noiseHit(ac, out, x, v1 + 0.1 + Math.random() * 2.2, { freq: 1600 + Math.random() * 1500, Q: 1.5, vol: 0.12 + Math.random() * 0.12, dur: 0.05 });
    for (let k = 0; k < 4; k++) note(ac, out, x, v1 + 0.2 + k * 0.4 + Math.random() * 0.2, { f: [380 + Math.random() * 120, 760 + Math.random() * 200], vol: 0.035, dur: 0.6, attack: 0.08 }); // "wooo!"
  },

  // a coin "pling!", then a crunchy video-game voice
  arcade(ac, voice, out, x, { t0 }) {
    note(ac, out, x, t0, { type: 'square', f: 987.8, vol: 0.07, dur: 0.09, attack: 0.002 });
    note(ac, out, x, t0 + 0.08, { type: 'square', f: 1318.5, vol: 0.07, dur: 0.38, attack: 0.002 });
    const levels = 7;
    voice.connect(gain(ac, 3)).connect(shaper(ac, (v) => Math.round(Math.max(-1, Math.min(1, v)) * levels) / levels))
      .connect(filter(ac, 'lowpass', 4500)).connect(gain(ac, 0.42)).connect(out);
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
  if (key === 'sinetron') { add('fx-vignette'); ['JENG', 'JENG', 'JENGGG!'].forEach((w, k) => add('fx-jeng', w, { animationDelay: `${k * 0.42}s`, top: `${18 + k * 22}%` })); }
  if (key === 'dangdut') { for (let k = 0; k < 6; k++) add('fx-disco', '', { left: `${8 + k * 16}%`, animationDelay: `${-k * 0.23}s`, '--h': `${k * 60}deg` }); add('fx-emoji', '💃', { left: '6%', bottom: '8%' }); add('fx-emoji r', '🕺', { right: '6%', bottom: '8%' }); }
  if (key === 'toa') { add('fx-toa', '📢'); for (let k = 0; k < 3; k++) add('fx-wave', '', { animationDelay: `${lead + k * 0.5}s` }); }
  if (key === 'horror') { add('fx-dark'); add('fx-ghost', '👻'); }
  if (key === 'helium') { for (let k = 0; k < 7; k++) add('fx-balloon', ['🎈', '🎈', '🎈', '🎉'][k % 4], { left: `${6 + k * 14}%`, animationDelay: `${k * 0.25}s`, '--sway': `${(k % 2 ? 1 : -1) * 18}px` }); }
  if (key === 'alien') { add('fx-ufo', '🛸'); add('fx-beam'); }
  if (key === 'concert') { add('fx-spot l'); add('fx-spot r'); for (let k = 0; k < 26; k++) add('fx-confetti', '', { left: `${Math.random() * 100}%`, background: ['#FF6B6B', '#F6B93B', '#5CC8A8', '#6FB7FF', '#FF7FB0'][k % 5], animationDelay: `${lead + duration + Math.random() * 0.8}s` }); }
  if (key === 'arcade') { add('fx-pixels'); add('fx-coin', '+1 UP'); }
  wrap.append(fx);
  wrap.classList.add(`mood-${key}`);
  const total = (lead + duration + (MOODS[key].tail || 0)) * 1000 + 300;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    wrap.classList.remove(`mood-${key}`);
    fx.classList.add('out');
    setTimeout(() => fx.remove(), 300);
  };
  const timer = setTimeout(end, total);
  return end;
}
