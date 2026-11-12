// POST   /api/message?slug=…&name=…&consent=1&dur=…   body: WAV (application/octet-stream)
//        → stores the recording, runs ASR, returns the caption + suspected ASR typos for the friend to check
// PATCH  /api/message   { slug, id, token, text }  → saves the caption the friend corrected + word-level diffs
// DELETE /api/message   { slug, id, token }        → "record again"
import { route, send, query, rawBody, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { loadGift, createMessage, findMessage, updateMessage, deleteMessage, analyzeWav, CONSENT_VERSION, isSlug } from '../lib/gifts.js';
import { transcribe, asrProvider, evenWords, computeCorrections } from '../lib/asr.js';
import { requireUser, addSent } from '../lib/accounts.js';

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
    if (q.consent !== '1') throw new HttpError(400, 'Please allow saving your voice first.');
    const wav = await rawBody(req);
    const info = analyzeWav(wav);
    if (!info) throw new HttpError(400, 'The recording could not be read. Please record again.');
    const { durationSec, peak, waveform, speechStartSec, speechEndSec } = info;
    if (durationSec < 0.8) throw new HttpError(400, 'That was too short. Please record again.');
    if (durationSec > 20) throw new HttpError(400, 'Recordings can be up to 15 seconds.');
    if (peak < 0.005) throw new HttpError(400, 'No voice detected. Speak a little louder.');

    let asr;
    try {
      asr = await transcribe({
        wav,
        durationSec,
        recipient: gift.recipient,
        occasion: gift.occasion,
        speechStartSec,
        speechEndSec,
        clientHint: cleanText(q.hint, 300)
      });
    } catch (e) {
      console.error(e);
      asr = { text: '', words: [], typos: [] }; // never lose the recording because ASR failed
    }

    const msg = await createMessage(gift.slug, {
      sender: name,
      userId: user.id,
      durationSec: +durationSec.toFixed(2),
      speechStartSec,
      speechEndSec,
      waveform,
      asrProvider,
      asrText: asr.text,
      asrWords: asr.words,
      asrTypos: asr.typos || [],
      finalText: null,
      edited: false,
      corrections: [],
      consent: true,
      consentVersion: CONSENT_VERSION,
      userAgent: cleanText(req.headers['user-agent'], 300)
    }, wav);

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
    const text = cleanText(body.text, 400);
    if (!text) throw new HttpError(400, 'The caption is empty.');
    msg.finalText = text;
    msg.edited = text !== (msg.asrText || '').trim();
    msg.corrections = computeCorrections(msg.asrText, text, msg.asrTypos);
    msg.finalWords = msg.edited
      ? evenWords(text, msg.durationSec, new Set(), msg.speechStartSec || 0, msg.speechEndSec || null)
      : msg.asrWords;
    const firstSend = !msg.sentAt;
    msg.sentAt = new Date().toISOString();
    await updateMessage(path, msg);
    if (firstSend && msg.userId) await addSent(msg.userId, { slug: body.slug, id: msg.id }).catch((e) => console.error(e)); // the count on their home page
    send(res, 200, { ok: true, edited: msg.edited, corrections: msg.corrections });
  },

  async DELETE(req, res) {
    const body = await jsonBody(req);
    const { msg, path } = await authorized(body);
    await deleteMessage(path, msg);
    send(res, 200, { ok: true });
  }
});
