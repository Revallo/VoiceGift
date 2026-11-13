// GET  /api/reveal?slug=…&k=…&pin=…  → the messages, only for a logged-in account with the recipient's key
// (the link the organizer sends) and the gift's 4-digit PIN.
// The organizer can't open it: the voices are for the recipient only.
// POST /api/reveal { slug, k, pin, text?, voices? } → the recipient thanks everyone once; each friend who recorded finds it on
//      their home page. voices = { all: voiceId } (one voice for everyone) or { each: { friendKey: voiceId } } (one per friend),
//      recorded first with /api/thanks. A friend gets their own voice, else the one for everyone, else the text.
import { route, send, query, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { loadGift, saveGift, publicGift, canOpen, checkVerifyPin, loadMessages, loadThanksVoices, deleteThanksVoice, friendsOf } from '../lib/gifts.js';
import { requireUser, addThanks } from '../lib/accounts.js';
import { evenWords } from '../lib/asr.js';

const isOrganizer = (gift, user) => Boolean(gift.ownerId && user.id === gift.ownerId);

export default route({
  async GET(req, res) {
    const user = await requireUser(req, 'Please log in to open this gift.');
    const { slug, k, pin } = query(req);
    const gift = await loadGift(slug);
    if (k && k === gift.openKey && pin && !checkVerifyPin(gift, pin)) {
      throw new HttpError(403, 'That PIN isn’t right. Please try again.');
    }
    if (!canOpen(gift, k, { pin })) {
      throw new HttpError(403, `This link isn’t complete. Ask ${gift.organizer} for the link or PIN to the gift.`);
    }
    if (isOrganizer(gift, user)) throw new HttpError(403, `This gift is for ${gift.recipient}. Only they can open it.`);
    const all = await loadMessages(gift.slug);
    const messages = all
      .filter((m) => m.finalText || m.asrText) // skip recordings abandoned before the caption step
      .map((m) => {
        const text = m.finalText || m.asrText;
        return {
          id: m.id,
          sender: m.sender,
          text,
          words: (m.finalWords && m.finalWords.length ? m.finalWords : null) || evenWords(text, m.durationSec),
          durationSec: m.durationSec,
          mood: m.mood || 'normal',
          candle: m.candle || null
        };
      });
    send(res, 200, {
      gift: publicGift(gift),
      messages,
      friends: friendsOf(all, user.id).map(({ key, name }) => ({ key, name })), // who a thank-you can go to
      thanked: Boolean(gift.thanks)
    });
  },

  async POST(req, res) {
    const user = await requireUser(req);
    const b = await jsonBody(req);
    const gift = await loadGift(b.slug);
    if (!canOpen(gift, b.k, { pin: b.pin }) || isOrganizer(gift, user)) throw new HttpError(403, 'Only the person who received this gift can send the thank-you.');
    if (gift.thanks) throw new HttpError(409, 'You already sent your thank-you.');
    const text = cleanText(b.text, 200);
    const voices = (await loadThanksVoices(gift.slug)).filter((v) => v.userId === user.id);
    const ready = new Map(voices.filter((v) => v.finalText).map((v) => [v.id, v]));
    const pick = (id) => (typeof id === 'string' && ready.get(id)) || null;
    const forAll = pick(b.voices?.all);
    const each = b.voices?.each && typeof b.voices.each === 'object' ? b.voices.each : {};
    const friends = friendsOf(await loadMessages(gift.slug), user.id);
    const at = new Date().toISOString();
    const notes = friends.map((f) => {
      const v = pick(each[f.key]) || forAll;
      if (!v && !text) return null;
      return [f.userId, v
        ? { slug: gift.slug, from: gift.recipient, occasion: gift.occasion, text: v.finalText, voiceId: v.id, words: v.finalWords || [], durationSec: v.durationSec, at }
        : { slug: gift.slug, from: gift.recipient, occasion: gift.occasion, text, at }];
    }).filter(Boolean);
    if (!text && !ready.size) throw new HttpError(400, 'Please record or write a short thank-you.');
    gift.thanks = { text: text || forAll?.finalText || '', at, byUserId: user.id, voices: [...ready.keys()] };
    await saveGift(gift);
    await Promise.all(notes.map(([id, note]) => addThanks(id, note)));
    // recordings never finished (no caption) are removed; finished ones stay as training data
    await Promise.all(voices.filter((v) => !v.finalText).map((v) => deleteThanksVoice(v._path, v)));
    send(res, 200, { sent: notes.length });
  }
});
