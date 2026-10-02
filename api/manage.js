// GET  /api/manage?slug=…&key=…             → organizer dashboard: who has recorded (not what they said) + the recipient's key
// POST /api/manage { slug, key, action }    → action "add-demo": 12 demo voices (TTS, public/demo/) so the gift can be shown
import fs from 'node:fs/promises';
import path from 'node:path';
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, publicGift, loadMessages, createMessage, wavDuration, CONSENT_VERSION } from '../lib/gifts.js';
import { transcribe, asrProvider, evenWords } from '../lib/asr.js';

const DEMO_DIR = path.join(process.cwd(), 'public', 'demo');

// Adds the demo voices for the gift's occasion, as if 12 people had recorded and fixed their caption.
// Stored with demo: true so the ASR export leaves them out.
async function addDemo(gift) {
  if ((await loadMessages(gift.slug)).some((m) => m.demo)) throw new HttpError(400, 'The demo voices are already added.');
  const all = JSON.parse(await fs.readFile(path.join(DEMO_DIR, 'voices.json'), 'utf8'));
  const occasion = all[gift.occasion] ? gift.occasion : 'birthday';
  for (const [i, p] of all[occasion].entries()) {
    const wav = await fs.readFile(path.join(DEMO_DIR, `${occasion}-${String(i + 1).padStart(2, '0')}.wav`));
    const durationSec = +wavDuration(wav).toFixed(2);
    const asr = await transcribe({ wav, durationSec, recipient: gift.recipient, occasion: gift.occasion }).catch(() => ({ text: '', words: [] }));
    await createMessage(gift.slug, {
      sender: p.name, durationSec, asrProvider, asrText: asr.text, asrWords: asr.words,
      finalText: p.text, finalWords: evenWords(p.text, durationSec), edited: p.text !== asr.text,
      consent: true, consentVersion: CONSENT_VERSION, demo: true, sentAt: new Date().toISOString()
    }, wav);
  }
}

async function authed(slug, key) {
  const gift = await loadGift(slug);
  if (!key || key !== gift.manageKey) throw new HttpError(403, 'This dashboard link is not valid.');
  return gift;
}

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await authed(q.slug, q.key);
    const messages = (await loadMessages(gift.slug)).map((m) => ({
      sender: m.sender,
      createdAt: m.createdAt,
      sent: Boolean(m.finalText),
      edited: Boolean(m.edited),
      demo: Boolean(m.demo),
      durationSec: m.durationSec
    }));
    send(res, 200, { gift: publicGift(gift), openKey: gift.openKey, messages });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    const gift = await authed(b.slug, b.key);
    if (b.action !== 'add-demo') throw new HttpError(400, 'Unknown action');
    await addDemo(gift);
    send(res, 200, { ok: true });
  }
});
