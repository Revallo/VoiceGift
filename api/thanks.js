// The recipient's thank-you voices (one for everyone, or one per friend).
// POST   /api/thanks?slug=…&k=…&pin=…&consent=1   body: WAV → stores it, runs ASR → { id, token, asrText, asrTypos, durationSec }
// PATCH  /api/thanks  { slug, k, pin, id, token, text } → the caption the recipient corrected
// DELETE /api/thanks  { slug, k, pin, id, token }       → "record again"
// GET    /api/thanks?slug=…&id=…                         → the WAV, only to a friend whose thank-you note holds this voice
//                                                          (or to the recipient who recorded it), and only until the note expires
// Sending them is POST /api/reveal (with `voices`).
import { route, send, query, rawBody, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { loadGift, canOpen, analyzeWav, CONSENT_VERSION, createThanksVoice, findThanksVoice, deleteThanksVoice } from '../lib/gifts.js';
import { requireUser, findThanksNote } from '../lib/accounts.js';
import { getObject, putJSON } from '../lib/store.js';
import { transcribe, asrProvider, evenWords, computeCorrections } from '../lib/asr.js';
import { countRecording } from '../lib/limits.js';

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
    if (q.consent !== '1') throw new HttpError(400, 'Please allow saving your voice first.');
    const wav = await rawBody(req);
    const info = analyzeWav(wav);
    if (!info) throw new HttpError(400, 'The recording could not be read. Please record again.');
    const { durationSec, peak, waveform, speechStartSec, speechEndSec } = info;
    if (durationSec < 0.8) throw new HttpError(400, 'That was too short. Please record again.');
    if (durationSec > 20) throw new HttpError(400, 'Recordings can be up to 15 seconds.');
    if (peak < 0.005) throw new HttpError(400, 'No voice detected. Speak a little louder.');
    await countRecording(user.id);
    let asr;
    try {
      asr = await transcribe({ wav, durationSec, recipient: gift.recipient, occasion: gift.occasion, speechStartSec, speechEndSec, clientHint: cleanText(q.hint, 300) });
    } catch (e) {
      console.error(e);
      asr = { text: '', words: [], typos: [] };
    }
    const voice = await createThanksVoice(gift.slug, {
      userId: user.id,
      sender: gift.recipient,
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
    send(res, 201, { id: voice.id, token: voice.token, asrText: voice.asrText, asrTypos: voice.asrTypos, durationSec: voice.durationSec });
  },

  async PATCH(req, res) {
    const body = await jsonBody(req);
    const { voice, path } = await ownVoice(req, body);
    const text = cleanText(body.text, 300);
    if (!text) throw new HttpError(400, 'The caption is empty.');
    voice.finalText = text;
    voice.edited = text !== (voice.asrText || '').trim();
    voice.corrections = computeCorrections(voice.asrText, text, voice.asrTypos);
    voice.finalWords = voice.edited ? evenWords(text, voice.durationSec, new Set(), voice.speechStartSec || 0, voice.speechEndSec || null) : voice.asrWords;
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
    send(res, 200, buf, { 'Content-Type': 'audio/wav', 'Content-Length': String(buf.length), 'Cache-Control': 'private, max-age=600' });
  }
});
