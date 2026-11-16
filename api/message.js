// POST   /api/message?slug=…&name=…&consent=1&dur=…   body: WAV (application/octet-stream)
//        → stores the recording, runs ASR, returns the caption + suspected ASR typos for the friend to check
// PATCH  /api/message   { slug, id, token, text, mood?, candle? }  → saves the caption the friend corrected + word-level diffs,
//        plus the playback mood and their candle (the WAV itself is never changed)
// DELETE /api/message   { slug, id, token }        → "record again"
import { route, send, query, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { loadGift, loadMessages, createMessage, findMessage, updateMessage, deleteMessage, isSlug, cleanMood, cleanCandle } from '../lib/gifts.js';
import { asrProvider } from '../lib/asr.js';
import { readWav, asrFields, applyCaption } from '../lib/voices.js';
import { requireUser } from '../lib/accounts.js';
import { LIMITS } from '../lib/limits.js';

async function authorized(body) {
  if (!isSlug(body.slug)) throw new HttpError(404, 'Gift not found');
  const found = await findMessage(body.slug, String(body.id || ''));
  if (!body.token || body.token !== found.msg.token) throw new HttpError(403, 'Not allowed');
  return found;
}

export default route({
  async POST(req, res) {
    const user = await requireUser(req, 'Please log in to record your message.');
    const q = query(req);
    const gift = await loadGift(q.slug);
    const name = cleanText(q.name, 40);
    if (!name) throw new HttpError(400, 'Please enter your name.');
    const rec = await readWav(req, q);
    // Limits: a few voices per friend per gift, and a daily cap per account (each recording is an ASR call).
    const mine = (await loadMessages(gift.slug)).filter((m) => m.userId === user.id).length;
    if (mine >= LIMITS.recordingsPerGift) throw new HttpError(429, `You’ve already sent ${mine} messages to this gift. That’s the most one person can send.`);
    const fields = await asrFields(req, user, rec, { recipient: gift.recipient, occasion: gift.occasion, hint: q.hint });
    const msg = await createMessage(gift.slug, { sender: name, ...fields }, rec.wav);

    send(res, 201, {
      id: msg.id,
      token: msg.token,
      asrText: msg.asrText,
      asrWords: msg.asrWords,
      asrTypos: msg.asrTypos,
      waveform: msg.waveform,
      asrProvider,
      durationSec: msg.durationSec
    });
  },

  async PATCH(req, res) {
    const body = await jsonBody(req);
    const { msg, path } = await authorized(body);
    applyCaption(msg, body.text, 400);
    msg.mood = cleanMood(body.mood);
    msg.candle = cleanCandle(body.candle);
    msg.sentAt = new Date().toISOString();
    await updateMessage(path, msg);
    send(res, 200, { ok: true, edited: msg.edited, corrections: msg.corrections });
  },

  async DELETE(req, res) {
    const body = await jsonBody(req);
    const { msg, path } = await authorized(body);
    await deleteMessage(path, msg);
    send(res, 200, { ok: true });
  }
});
