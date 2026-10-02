// Speech recognition seam. This is the ONLY place to change when the company ASR API is ready.
//
// Set these environment variables to use a real ASR service:
//   ASR_URL      e.g. https://asr.example.com/v1/transcribe
//   ASR_API_KEY  sent as "Authorization: Bearer <key>"
// The request body is the WAV file (16 kHz, mono, 16-bit) with Content-Type audio/wav and ?lang=id.
// Expected response: { "text": "...", "words": [{ "w": "...", "start": 0.1, "end": 0.4 }] }  (words optional)
// If the real API has a different shape, adapt `fromProvider()` below.

export const asrProvider = process.env.ASR_URL ? 'http' : 'mock';

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
  // Mock: a plausible first guess the friend then corrects. Replace with the real API.
  const text = `${MOCK_GREETING[occasion] || MOCK_GREETING.birthday}, ${recipient}!`;
  return { text, words: evenWords(text, durationSec) };
}
