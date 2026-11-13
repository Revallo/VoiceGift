// GET  /api/manage?slug=…&key=…             → organizer dashboard: who has recorded (not what they said) + the recipient's key
// POST /api/manage { slug, key, action }    → action "update-delivery": change the PIN
//                                            action "delete" + id: removes that message and its audio from storage
//                                            action "delete-gift": removes the whole gift from storage
//                                            action "add-demo": 10 demo voices (TTS, demo/) to show the gift without real people
//                                            action "remove-demo": takes the demo voices out again
import fs from 'node:fs/promises';
import path from 'node:path';
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, saveGift, publicGift, loadMessages, createMessage, findMessage, deleteMessage, deleteGift, wavDuration, CONSENT_VERSION } from '../lib/gifts.js';
import { evenWords } from '../lib/asr.js';
import { forgetGift } from '../lib/accounts.js';

// Demo voices: made once with TTS (demo/voices.json + demo/<occasion>-NN.wav). Stored with demo: true, so they are never
// training data (the export and the stats leave them out) and get no thank-you. No ASR call: the caption is the script.
// Each one gets a mood and a candle, so a demo shows those off too.
const DEMO_DIR = path.join(process.cwd(), 'demo');
const DEMO_COUNT = 10;
const DEMO_MOODS = ['normal', 'dangdut', 'sad', 'helium', 'toa', 'normal', 'angry', 'alien', 'horror', 'arcade'];
const DEMO_CANDLES = [
  { body: 'stripe', flame: 'classic', shape: 'drop' }, { body: 'gold', flame: 'rainbow', shape: 'sparkler' },
  { body: 'dots', flame: 'blue', shape: 'round' }, { body: 'swirl', flame: 'pink', shape: 'heart' },
  { body: 'plain', flame: 'green', shape: 'tall' }, { body: 'tall', flame: 'purple', shape: 'star' },
  { body: 'chunky', flame: 'classic', shape: 'twin' }, { body: 'stripe', flame: 'ice', shape: 'drop' },
  { body: 'gold', flame: 'classic', shape: 'heart' }, { body: 'dots', flame: 'rainbow', shape: 'star' }
];

async function addDemo(gift) {
  const have = new Set((await loadMessages(gift.slug)).filter((m) => m.demo).map((m) => m.sender));
  const all = JSON.parse(await fs.readFile(path.join(DEMO_DIR, 'voices.json'), 'utf8'));
  const occasion = Array.isArray(all[gift.occasion]) ? gift.occasion : 'birthday';
  // only the ones not there yet, all at once (one by one may take longer than a serverless function may run)
  const todo = all[occasion].slice(0, DEMO_COUNT).map((p, i) => ({ ...p, i })).filter((p) => !have.has(p.name));
  if (!todo.length) throw new HttpError(400, 'The demo voices are already in this gift.');
  await Promise.all(todo.map(async (p) => {
    const wav = await fs.readFile(path.join(DEMO_DIR, `${occasion}-${String(p.i + 1).padStart(2, '0')}.wav`));
    const durationSec = +wavDuration(wav).toFixed(2);
    const words = evenWords(p.text, durationSec);
    await createMessage(gift.slug, {
      sender: p.name, durationSec, asrProvider: 'demo', asrText: p.text, asrWords: words,
      finalText: p.text, finalWords: words, edited: false, corrections: [],
      mood: DEMO_MOODS[p.i % DEMO_MOODS.length], candle: DEMO_CANDLES[p.i % DEMO_CANDLES.length],
      consent: true, consentVersion: CONSENT_VERSION, demo: true, sentAt: new Date().toISOString()
    }, wav);
  }));
  return todo.length;
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
      id: m.id,
      sender: m.sender,
      createdAt: m.createdAt,
      sent: Boolean(m.finalText),
      edited: Boolean(m.edited),
      fixes: Array.isArray(m.corrections) && m.corrections.length ? m.corrections.length : (m.edited ? 1 : 0),
      demo: Boolean(m.demo),
      candle: m.candle || null, // how their candle looks (not what they said)
      durationSec: m.durationSec
    }));
    send(res, 200, {
      gift: {
        ...publicGift(gift),
        verifyPin: gift.verifyPin || '1234'
      },
      openKey: gift.openKey,
      messages
    });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    const gift = await authed(b.slug, b.key);
    if (b.action === 'update-delivery') {
      const rawPin = String(b.verifyPin || b.verifyAnswer || '1234').replace(/\D/g, '').slice(0, 4);
      gift.verifyPin = rawPin.length === 4 ? rawPin : '1234';
      gift.updatedAt = new Date().toISOString();
      await saveGift(gift);
    } else if (b.action === 'delete') {
      const { msg, path } = await findMessage(gift.slug, String(b.id || ''));
      await deleteMessage(path, msg);
    } else if (b.action === 'delete-gift') {
      await deleteGift(gift.slug);
      if (gift.ownerId) await forgetGift(gift.ownerId, gift.slug); // off the organizer's account page too
    } else if (b.action === 'add-demo') {
      return send(res, 200, { ok: true, added: await addDemo(gift) });
    } else if (b.action === 'remove-demo') {
      const demos = (await loadMessages(gift.slug)).filter((m) => m.demo);
      await Promise.all(demos.map((m) => deleteMessage(m._path, m)));
      return send(res, 200, { ok: true, removed: demos.length });
    } else throw new HttpError(400, 'Unknown action');
    send(res, 200, { ok: true });
  }
});
