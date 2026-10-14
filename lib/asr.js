// Speech recognition seam. This is the ONLY place to change when the company ASR API is ready.
//
// Providers, first one configured wins:
//   ASR_URL (+ ASR_API_KEY)  the company API. The request body is the WAV file (16 kHz, mono, 16-bit) with
//     Content-Type audio/wav and ?lang=id; "Authorization: Bearer <ASR_API_KEY>".
//     Expected response: { "text": "...", "words": [{ "w": "...", "start": 0.1, "end": 0.4 }] }  (words optional)
//     If the real API has a different shape, adapt `fromProvider()` below.
//   GROQ_API_KEY             Groq's hosted Whisper large-v3 (free tier), used until the company API is ready.
//   neither                  the mock.

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'whisper-large-v3';

export const asrProvider = process.env.ASR_URL ? 'http' : process.env.GROQ_API_KEY ? `groq:${GROQ_MODEL}` : 'mock';

export function evenWords(text, durationSec) {
  const parts = String(text).split(/\s+/).filter(Boolean);
  const d = Math.max(0.5, Number(durationSec) || 1);
  const step = d / Math.max(1, parts.length);
  return parts.map((w, i) => ({ w, start: +(i * step).toFixed(2), end: +((i + 1) * step).toFixed(2) }));
}

function fromProvider(json, durationSec) {
  const text = String(json.text ?? json.transcript ?? '').trim();
  const words = Array.isArray(json.words) && json.words.length
    ? json.words.map((x) => ({ w: String(x.w ?? x.word ?? ''), start: Number(x.start) || 0, end: Number(x.end) || 0 }))
    : evenWords(text, durationSec);
  return { text, words };
}

// What the mock "hears": the usual greeting for the occasion.
const MOCK_GREETING = { birthday: 'Selamat ulang tahun', graduation: 'Selamat wisuda', wedding: 'Selamat menempuh hidup baru' };

export async function transcribe({ wav, durationSec, recipient, occasion }) {
  if (asrProvider === 'http') {
    const url = new URL(process.env.ASR_URL);
    if (!url.searchParams.has('lang')) url.searchParams.set('lang', 'id');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        ...(process.env.ASR_API_KEY ? { Authorization: `Bearer ${process.env.ASR_API_KEY}` } : {})
      },
      body: wav
    });
    if (!res.ok) throw new Error(`ASR failed: ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
    return fromProvider(await res.json(), durationSec);
  }
  if (process.env.GROQ_API_KEY) {
    // OpenAI-style multipart upload; verbose_json + word granularity gives { text, words: [{word, start, end}] }.
    const form = new FormData();
    form.append('file', new Blob([wav], { type: 'audio/wav' }), 'voice.wav');
    form.append('model', GROQ_MODEL);
    form.append('language', 'id');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    form.append('temperature', '0');
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form
    });
    if (!res.ok) throw new Error(`Groq ASR failed: ${res.status} ${await res.text().catch(() => '')}`.slice(0, 300));
    return fromProvider(await res.json(), durationSec);
  }
  // Mock: a plausible first guess the friend then corrects. Replace with the real API.
  const text = `${MOCK_GREETING[occasion] || MOCK_GREETING.birthday}, ${recipient}!`;
  return { text, words: evenWords(text, durationSec) };
}
