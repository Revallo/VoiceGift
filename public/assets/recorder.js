// Records the microphone as 16 kHz mono 16-bit WAV — the format speech recognition wants,
// and it plays on every browser (no conversion needed on the server).

const TARGET_RATE = 16000;

export function micSupported() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
}

// Call this directly inside a click handler (iOS needs the AudioContext created during the tap).
export async function startRecording({ maxSec = 15, onLevel, onTick, onAutoStop } = {}) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    ctx.close();
    throw e;
  }
  if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

  const source = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  let samples = 0;
  let stopped = false;

  proc.onaudioprocess = (e) => {
    if (stopped) return;
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    samples += data.length;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += data[i] * data[i];
    onLevel?.(Math.min(1, Math.sqrt(sum / (data.length / 4)) * 4));
    const sec = samples / ctx.sampleRate;
    onTick?.(sec);
    if (sec >= maxSec) onAutoStop?.();
  };
  source.connect(proc);
  proc.connect(ctx.destination); // output is silent; ScriptProcessor only runs when connected

  function cleanup() {
    stopped = true;
    try { proc.disconnect(); source.disconnect(); } catch {}
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  }

  return {
    async stop() {
      const rate = ctx.sampleRate;
      cleanup();
      const all = new Float32Array(samples);
      let off = 0;
      for (const c of chunks) { all.set(c, off); off += c.length; }
      const pcm = downsample(all, rate, TARGET_RATE);
      return { wav: encodeWav(pcm, TARGET_RATE), durationSec: pcm.length / TARGET_RATE };
    },
    cancel: cleanup
  };
}

function downsample(input, fromRate, toRate) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// Explains why the mic didn't start, including in-app browsers that block it.
export function micErrorHelp(err) {
  const ua = navigator.userAgent;
  const inApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|MicroMessenger|; wv\)/i.test(ua);
  if (inApp) return 'This app’s built-in browser blocks the microphone. Open the link in Chrome or Safari.';
  if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) return 'Microphone access was blocked. Allow the microphone in your browser settings, then try again.';
  if (err && err.name === 'NotFoundError') return 'No microphone was found on this device.';
  if (!window.isSecureContext) return 'The microphone only works on a secure (https) link.';
  return 'The microphone could not start. Try opening the link in Chrome or Safari.';
}
