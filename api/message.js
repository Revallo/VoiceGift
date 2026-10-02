// POST   /api/message?slug=…&name=…&consent=1&dur=…   body: WAV (application/octet-stream)
//        → stores the recording, runs ASR, returns the caption for the friend to check
// PATCH  /api/message   { slug, id, token, text }  → saves the caption the friend corrected
// DELETE /api/message   { slug, id, token }        → "record again"
import { route, send, query, rawBody, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { loadGift, createMessage, findMessage, updateMessage, deleteMessage, wavDuration, CONSENT_VERSION, isSlug } from '../lib/gifts.js';
import { transcribe, asrProvider, evenWords } from '../lib/asr.js';

async function authorized(body) {
  if (!isSlug(body.slug)) throw new HttpError(404, 'Gift not found');
  const found = await findMessage(body.slug, String(body.id || ''));
  if (!body.token || body.token !== found.msg.token) throw new HttpError(403, 'Not allowed');
  return found;
}

export default route({
  async POST(req, res) {
    const q = query(req);
    const gift = await loadGift(q.slug);
    const name = cleanText(q.name, 40);
    if (!name) throw new HttpError(400, 'Please enter your name.');
    if (q.consent !== '1') throw new HttpError(400, 'Please allow saving your voice first.');
    const wav = await rawBody(req);
    const durationSec = wavDuration(wav);
    if (durationSec === null) throw new HttpError(400, 'The recording could not be read. Please record again.');
    if (durationSec < 0.8) throw new HttpError(400, 'That was too short. Please record again.');
    if (durationSec > 20) throw new HttpError(400, 'Recordings can be up to 15 seconds.');

    let asr;
    try {
      asr = await transcribe({ wav, durationSec, recipient: gift.recipient, occasion: gift.occasion });
    } catch (e) {
      console.error(e);
      asr = { text: '', words: [] }; // never lose the recording because ASR failed
    }

    const msg = await createMessage(gift.slug, {
      sender: name,
      durationSec: +durationSec.toFixed(2),
      asrProvider,
      asrText: asr.text,
      asrWords: asr.words,
      finalText: null,
      edited: false,
      consent: true,
      consentVersion: CONSENT_VERSION,
      userAgent: cleanText(req.headers['user-agent'], 300)
    }, wav);

    send(res, 201, { id: msg.id, token: msg.token, asrText: msg.asrText, asrProvider, durationSec: msg.durationSec });
  },

  async PATCH(req, res) {
    const body = await jsonBody(req);
    const { msg, path } = await authorized(body);
    const text = cleanText(body.text, 400);
    if (!text) throw new HttpError(400, 'The caption is empty.');
    msg.finalText = text;
    msg.edited = text !== (msg.asrText || '').trim();
    msg.finalWords = msg.edited ? evenWords(text, msg.durationSec) : msg.asrWords;
    msg.sentAt = new Date().toISOString();
    await updateMessage(path, msg);
    send(res, 200, { ok: true, edited: msg.edited });
  },

  async DELETE(req, res) {
    const body = await jsonBody(req);
    const { msg, path } = await authorized(body);
    await deleteMessage(path, msg);
    send(res, 200, { ok: true });
  }
});
