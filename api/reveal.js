// GET  /api/reveal?slug=…&k=…&pin=…  → the messages, only for a logged-in account with the recipient's key
// (the link the organizer sends) and the gift's 4-digit PIN.
// The organizer's own account previewing it ("Preview what Dimas sees") gets the demo voices only (preview: true).
// POST /api/reveal { slug, k, pin, text } → the recipient thanks everyone once; each friend who recorded finds it on their home page.
import { route, send, query, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { loadGift, saveGift, publicGift, canOpen, checkVerifyPin, loadMessages } from '../lib/gifts.js';
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
    const preview = isOrganizer(gift, user);
    const messages = (await loadMessages(gift.slug))
      .filter((m) => m.finalText || m.asrText) // skip recordings abandoned before the caption step
      .filter((m) => !preview || m.demo)
      .map((m) => {
        const text = m.finalText || m.asrText;
        return {
          id: m.id,
          sender: m.sender,
          text,
          words: (m.finalWords && m.finalWords.length ? m.finalWords : null) || evenWords(text, m.durationSec),
          durationSec: m.durationSec
        };
      });
    send(res, 200, {
      gift: publicGift(gift),
      messages,
      preview,
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
    if (!text) throw new HttpError(400, 'Please write a short thank-you.');

    const at = new Date().toISOString();
    gift.thanks = { text, at, byUserId: user.id };
    await saveGift(gift);
    const friends = new Set((await loadMessages(gift.slug))
      .filter((m) => m.finalText && !m.demo && m.userId && m.userId !== user.id)
      .map((m) => m.userId));
    await Promise.all([...friends].map((id) => addThanks(id, { slug: gift.slug, from: gift.recipient, occasion: gift.occasion, text, at })));
    send(res, 200, { sent: friends.size });
  }
});
