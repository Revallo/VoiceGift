// The recipient's thank-you voices (one for everyone, or one per friend).
// POST   /api/thanks?slug=…&k=…&pin=…&consent=1   body: WAV → stores it, runs ASR → { id, token, asrText, asrTypos, durationSec }
// PATCH  /api/thanks  { slug, k, pin, id, token, text } → the caption the recipient corrected
// DELETE /api/thanks  { slug, k, pin, id, token }       → "record again"
// GET    /api/thanks?slug=…&id=…                         → the WAV, only to a friend whose thank-you note holds this voice
//                                                          (or to the recipient who recorded it), and only until the note expires
// Sending them is POST /api/reveal (with `voices`).
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, canOpen, createThanksVoice, findThanksVoice, deleteThanksVoice } from '../lib/gifts.js';
import { requireUser, findThanksNote } from '../lib/accounts.js';
import { getObject, putJSON } from '../lib/store.js';
import { readWav, asrFields, applyCaption, sendWav } from '../lib/voices.js';

// Only the recipient (key + PIN, logged in, not the organizer), and only before the thank-you was sent.
async function recipientOf(req, { slug, k, pin }) {
  const user = await requireUser(req, 'Please log in first.');
  const gift = await loadGift(slug);
  if (!canOpen(gift, k, { pin }) || (gift.ownerId && gift.ownerId === user.id)) throw new HttpError(403, 'Only the person who received this gift can do this.');
  if (gift.thanks) throw new HttpError(409, 'You already sent your thank-you.');
  return { user, gift };
}

async function ownVoice(req, body) {
  const { user, gift } = await recipientOf(req, body);
  const found = await findThanksVoice(gift.slug, String(body.id || ''));
  if (!body.token || body.token !== found.voice.token || found.voice.userId !== user.id) throw new HttpError(403, 'Not allowed');
  return found;
}

export default route({
  async POST(req, res) {
    const q = query(req);
    const { user, gift } = await recipientOf(req, q);
    const rec = await readWav(req, q);
    const fields = await asrFields(req, user, rec, { recipient: gift.recipient, occasion: gift.occasion, hint: q.hint });
    const voice = await createThanksVoice(gift.slug, { sender: gift.recipient, ...fields }, rec.wav);
    send(res, 201, { id: voice.id, token: voice.token, asrText: voice.asrText, asrTypos: voice.asrTypos, durationSec: voice.durationSec });
  },

  async PATCH(req, res) {
    const body = await jsonBody(req);
    const { voice, path } = await ownVoice(req, body);
    applyCaption(voice, body.text, 300);
    await putJSON(path, voice, { overwrite: true });
    send(res, 200, { ok: true, edited: voice.edited });
  },

  async DELETE(req, res) {
    const body = await jsonBody(req);
    const { voice, path } = await ownVoice(req, body);
    await deleteThanksVoice(path, voice);
    send(res, 200, { ok: true });
  },

  async GET(req, res) {
    const user = await requireUser(req);
    const q = query(req);
    const gift = await loadGift(q.slug);
    const { voice } = await findThanksVoice(gift.slug, String(q.id || ''));
    if (voice.userId !== user.id) {
      const note = await findThanksNote(user.id, gift.slug); // null once it expired
      if (!note || note.voiceId !== voice.id) throw new HttpError(403, 'Not allowed');
    }
    const buf = await getObject(voice.audioPath);
    if (!buf) throw new HttpError(404, 'Recording not found');
    sendWav(req, res, buf, 600);
  }
});
