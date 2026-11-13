// Voice moods: a friend records normally, then may pick a mood (angry, sad, chipmunk…).
// The mood is ONLY applied while playing, in the browser (Web Audio). The stored WAV stays the clean,
// untouched recording, because it is ASR training data (see AImustRead.md). The message just keeps `mood`.
// Keys must match MOOD_KEYS in lib/gifts.js.

export const MOODS = {
  normal: { label: 'Normal', emoji: '🙂' },
  angry: { label: 'Angry', emoji: '😡', rate: 0.86 },
  sad: { label: 'Sad', emoji: '😢', rate: 0.9 },
  chipmunk: { label: 'Chipmunk', emoji: '🐿️', rate: 1.45 },
  giant: { label: 'Giant', emoji: '👹', rate: 0.68 },
  robot: { label: 'Robot', emoji: '🤖' },
  radio: { label: 'Old radio', emoji: '📻' },
  stadium: { label: 'Stadium', emoji: '🏟️' }
};
export const DEFAULT_MOOD = 'normal';
export const moodOf = (k) => (MOODS[k] ? k : DEFAULT_MOOD);

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

function reverb(ac, input, out, { sec, decay, wet }) {
  const conv = ac.createConvolver();
  conv.buffer = impulse(ac, sec, decay);
  const g = ac.createGain();
  g.gain.value = wet;
  input.connect(conv).connect(g).connect(out);
}

function shaper(ac, amount) {
  const ws = ac.createWaveShaper();
  const n = 1024, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  ws.curve = curve;
  ws.oversample = '2x';
  return ws;
}

function filter(ac, type, freq, gain = 0, Q = 0.8) {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.gain.value = gain;
  f.Q.value = Q;
  return f;
}

// Each mood wires src → … → out. `extras` collects oscillators/noise to stop when the voice ends.
const GRAPHS = {
  normal(ac, src, out) { src.connect(out); },
  angry(ac, src, out) {
    const chain = [filter(ac, 'peaking', 1600, 7, 1), shaper(ac, 18), filter(ac, 'lowshelf', 180, 5)];
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -24; comp.ratio.value = 6;
    const g = ac.createGain(); g.gain.value = 0.75;
    src.connect(chain[0]).connect(chain[1]).connect(chain[2]).connect(comp).connect(g).connect(out);
  },
  sad(ac, src, out, extras) {
    // a trembling voice (vibrato) in a big, empty room, a little muffled
    const delay = ac.createDelay(0.05);
    delay.delayTime.value = 0.012;
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.5;
    const depth = ac.createGain(); depth.gain.value = 0.0028;
    lfo.connect(depth).connect(delay.delayTime);
    lfo.start(); extras.push(lfo);
    const lp = filter(ac, 'lowpass', 2600);
    src.connect(delay).connect(lp).connect(out);
    reverb(ac, lp, out, { sec: 2.6, decay: 2.2, wet: 0.45 });
  },
  chipmunk(ac, src, out) { src.connect(filter(ac, 'highshelf', 3000, 3)).connect(out); },
  giant(ac, src, out) {
    src.connect(filter(ac, 'lowshelf', 220, 6)).connect(out);
    reverb(ac, src, out, { sec: 1.4, decay: 3, wet: 0.3 });
  },
  robot(ac, src, out, extras) {
    // ring modulation + a short metallic echo
    const ring = ac.createGain(); ring.gain.value = 0;
    const osc = ac.createOscillator(); osc.frequency.value = 55;
    osc.connect(ring.gain);
    osc.start(); extras.push(osc);
    const comb = ac.createDelay(0.05); comb.delayTime.value = 0.011;
    const fb = ac.createGain(); fb.gain.value = 0.45;
    const g = ac.createGain(); g.gain.value = 1.6;
    src.connect(ring).connect(comb);
    comb.connect(fb).connect(comb);
    ring.connect(g); comb.connect(g); g.connect(out);
  },
  radio(ac, src, out, extras, dur) {
    src.connect(filter(ac, 'highpass', 550)).connect(filter(ac, 'lowpass', 3200)).connect(shaper(ac, 6)).connect(out);
    // crackle under the voice
    const len = Math.floor(ac.sampleRate * Math.max(1, dur + 0.3));
    const nb = ac.createBuffer(1, len, ac.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 6 : 0);
    const noise = ac.createBufferSource(); noise.buffer = nb;
    const ng = ac.createGain(); ng.gain.value = 0.035;
    noise.connect(filter(ac, 'bandpass', 2400, 0, 0.6)).connect(ng).connect(out);
    noise.start(); extras.push(noise);
  },
  stadium(ac, src, out) {
    src.connect(out);
    const echo = ac.createDelay(1); echo.delayTime.value = 0.32;
    const fb = ac.createGain(); fb.gain.value = 0.32;
    const eg = ac.createGain(); eg.gain.value = 0.4;
    src.connect(echo); echo.connect(fb).connect(echo); echo.connect(eg).connect(out);
    reverb(ac, src, out, { sec: 3.6, decay: 2, wet: 0.5 });
  }
};

// Plays an AudioBuffer with a mood. Returns { rate, duration, stop() }.
// `rate` matters for the words lighting up: buffer time = played seconds × rate.
export function playVoice(ac, buffer, mood, { dest = ac.destination, onended } = {}) {
  const key = moodOf(mood);
  const rate = MOODS[key].rate || 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const out = ac.createGain();
  out.connect(dest);
  const extras = [];
  const duration = buffer.duration / rate;
  GRAPHS[key](ac, src, out, extras, duration);
  let stopped = false;
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    extras.forEach((n) => { try { n.stop(); } catch {} });
    // let an echo ring out briefly, then cut it
    out.gain.setTargetAtTime(0, ac.currentTime + 0.6, 0.25);
    setTimeout(() => { try { out.disconnect(); } catch {} }, 2500);
  };
  src.onended = () => { cleanup(); onended?.(); };
  src.start();
  return {
    rate,
    duration,
    stop() { src.onended = null; try { src.stop(); } catch {} cleanup(); out.gain.cancelScheduledValues(ac.currentTime); out.gain.value = 0; }
  };
}
