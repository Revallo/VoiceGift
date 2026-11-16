// Voices between friends. A voice is never without its words: it reaches a friend only once its caption is saved.
// GET    /api/voice                → { inbox: [...], sent: [...] }: my voices, newest first, each with its words
// GET    /api/voice?id=…           → the WAV, only to the sender and the friends it was sent to
// POST   /api/voice?to=<friendId|all|reply>&consent=1[&replyTo=<voiceId>]   body: WAV   (to=reply: the sender of replyTo)
//        → stores it, runs ASR → { id, token, asrText, asrWords, asrTypos, durationSec } for the speaker to check
// POST   /api/voice { action: "heard", id }   (JSON) → that voice was played
// PATCH  /api/voice { id, token, text, mood? } → the corrected caption: now the voice is sent
// DELETE /api/voice { id, token }              → "record again"
import { route, send, query, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { cleanMood } from '../lib/gifts.js';
import { requireUser, listFriends } from '../lib/accounts.js';
import { readWav, asrFields, applyCaption, sendWav, createVoice, findVoice, canHear, loadVoiceAudio, deleteVoice, sendVoice, listVoices, markHeard } from '../lib/voices.js';

// The speaker's own draft (their account and the recording's token).
async function ownVoice(req, body) {
  const user = await requireUser(req);
  const voice = await findVoice(String(body.id || ''));
  if (voice.fromId !== user.id || !body.token || body.token !== voice.token) throw new HttpError(403, 'Not allowed');
  return voice;
}

export default route({
  async GET(req, res) {
    const user = await requireUser(req);
    const { id } = query(req);
    if (!id) {
      const [inbox, sent] = await Promise.all([listVoices(user.id, 'inbox'), listVoices(user.id, 'sent')]);
      return send(res, 200, { inbox, sent });
    }
    const voice = await findVoice(id);
    if (!canHear(voice, user.id)) throw new HttpError(403, 'This voice isn’t for you.');
    const buf = await loadVoiceAudio(voice);
    if (!buf) throw new HttpError(404, 'Recording not found');
    sendWav(req, res, buf);
  },

  async POST(req, res) {
    const user = await requireUser(req, 'Please log in to send a voice.');
    const q = query(req);
    if (!q.to) { // JSON actions
      const b = await jsonBody(req);
      if (b.action !== 'heard') throw new HttpError(400, 'Unknown action');
      const voice = await findVoice(String(b.id || ''));
      if (!canHear(voice, user.id)) throw new HttpError(403, 'This voice isn’t for you.');
      await markHeard(user.id, voice.id);
      return send(res, 200, { ok: true });
    }
    const rec = await readWav(req, q);
    // a reply quotes the voice it answers (only one you were allowed to hear) and goes to its sender
    let reply = null;
    if (q.replyTo) {
      reply = await findVoice(q.replyTo);
      if (!canHear(reply, user.id)) throw new HttpError(403, 'This voice isn’t for you.');
    }
    // who it goes to: one friend, or every friend the account has right now. Never someone who isn't a friend.
    const friends = await listFriends(user.id);
    const one = q.to === 'reply' ? reply?.fromId : q.to;
    const to = q.to === 'all' ? friends : friends.filter((f) => f.id === one);
    if (!to.length) throw new HttpError(403, q.to === 'all' ? 'Add a friend first, then send them a voice.' : 'You can only send a voice to a friend.');
    const fields = await asrFields(req, user, rec, { recipient: q.to === 'all' ? 'Teman' : to[0].name, occasion: 'voice', hint: q.hint });
    const voice = await createVoice({
      ...fields,
      fromId: user.id,
      fromName: user.name,
      to: to.map((f) => f.id),
      toNames: to.map((f) => f.name),
      toAll: q.to === 'all',
      ...(reply && { replyTo: reply.id, replyFrom: reply.fromName, replyText: cleanText(reply.finalText, 120) })
    }, rec.wav);
    send(res, 201, { id: voice.id, token: voice.token, asrText: voice.asrText, asrWords: voice.asrWords, asrTypos: voice.asrTypos, durationSec: voice.durationSec });
  },

  async PATCH(req, res) {
    const body = await jsonBody(req);
    const voice = await ownVoice(req, body);
    applyCaption(voice, body.text, 300);
    voice.mood = cleanMood(body.mood);
    await sendVoice(voice);
    send(res, 200, { ok: true, edited: voice.edited, corrections: voice.corrections, sent: voice.to.length });
  },

  async DELETE(req, res) {
    const body = await jsonBody(req);
    const voice = await ownVoice(req, body);
    if (voice.sentAt) throw new HttpError(409, 'This voice was already sent.');
    await deleteVoice(voice);
    send(res, 200, { ok: true });
  }
});
