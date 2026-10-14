// Only the organizer's account (gifts made before accounts: the dashboard key in the link).
// GET  /api/manage?slug=…              → dashboard: who has recorded (not what they said), the recipient's key,
//                                        and who opened it (the account that claimed it)
// POST /api/manage { slug, action }    → action "add-demo": 12 demo voices (TTS, public/demo/) so the gift can be shown
//                                        action "delete" + id: removes that message and its audio from storage
//                                        action "delete-gift": removes the whole gift from storage
//                                        action "unclaim": the wrong account opened it → new recipient link
import fs from 'node:fs/promises';
import path from 'node:path';
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, publicGift, loadMessages, createMessage, findMessage, deleteMessage, deleteGift, unclaimGift, wavDuration, CONSENT_VERSION } from '../lib/gifts.js';
import { currentUser } from '../lib/auth.js';
import { transcribe, asrProvider, evenWords } from '../lib/asr.js';

const DEMO_DIR = path.join(process.cwd(), 'public', 'demo');

// Adds the demo voices for the gift's occasion, as if 12 people had recorded and fixed their caption.
// Stored with demo: true so the ASR export leaves them out.
async function addDemo(gift) {
  const have = new Set((await loadMessages(gift.slug)).filter((m) => m.demo).map((m) => m.sender));
  const all = JSON.parse(await fs.readFile(path.join(DEMO_DIR, 'voices.json'), 'utf8'));
  const occasion = all[gift.occasion] ? gift.occasion : 'birthday';
  // Only the ones not there yet (so pressing again finishes an interrupted run), all at once: one by one
  // takes longer than a serverless function may run.
  const todo = all[occasion].map((p, i) => ({ ...p, i })).filter((p) => !have.has(p.name));
  if (!todo.length) throw new HttpError(400, 'The demo voices are already added.');
  await Promise.all(todo.map(async (p) => {
    const wav = await fs.readFile(path.join(DEMO_DIR, `${occasion}-${String(p.i + 1).padStart(2, '0')}.wav`));
    const durationSec = +wavDuration(wav).toFixed(2);
    const asr = await transcribe({ wav, durationSec, recipient: gift.recipient, occasion: gift.occasion }).catch(() => ({ text: '', words: [] }));
    await createMessage(gift.slug, {
      sender: p.name, durationSec, asrProvider, asrText: asr.text, asrWords: asr.words,
      finalText: p.text, finalWords: evenWords(p.text, durationSec), edited: p.text !== asr.text,
      consent: true, consentVersion: CONSENT_VERSION, demo: true, sentAt: new Date().toISOString()
    }, wav);
  }));
}

async function authed(req, slug, key) {
  const gift = await loadGift(slug);
  if (gift.ownerId) {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, 'Please sign in first.');
    if (user.id !== gift.ownerId) throw new HttpError(403, 'Only the person who made this gift can see its dashboard.');
  } else if (!key || key !== gift.manageKey) throw new HttpError(403, 'This dashboard link is not valid.');
  return gift;
}

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await authed(req, q.slug, q.key);
    const messages = (await loadMessages(gift.slug)).map((m) => ({
      id: m.id,
      sender: m.sender,
      createdAt: m.createdAt,
      sent: Boolean(m.finalText),
      edited: Boolean(m.edited),
      demo: Boolean(m.demo),
      durationSec: m.durationSec
    }));
    const opened = gift.recipientId ? { ...gift.recipientAccount, at: gift.claimedAt } : null;
    send(res, 200, { gift: publicGift(gift), openKey: gift.openKey, opened, messages });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    const gift = await authed(req, b.slug, b.key);
    if (b.action === 'add-demo') await addDemo(gift);
    else if (b.action === 'delete') {
      const { msg, path } = await findMessage(gift.slug, String(b.id || ''));
      await deleteMessage(path, msg, gift.slug);
    } else if (b.action === 'delete-gift') await deleteGift(gift);
    else if (b.action === 'unclaim') await unclaimGift(gift);
    else throw new HttpError(400, 'Unknown action');
    send(res, 200, { ok: true });
  }
});
