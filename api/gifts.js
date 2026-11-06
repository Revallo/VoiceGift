// POST  /api/gifts  {recipient, organizer, occasion, cake}               → create a gift (logged in) → { slug, manageKey, openKey }
// PATCH /api/gifts  {slug, key, recipient, organizer, occasion, cake}    → the organizer edits it (back from step 3)
import { route, send, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { createGift, loadGift, saveGift, OCCASIONS } from '../lib/gifts.js';
import { sessionUserId, addGift, sendGiftToEmail } from '../lib/accounts.js';

// cake = the decoration of any scene: { flavor, name, dots: [[x, y, colour]], stickers: [[emoji, x, y]] }
function cleanCake(cake = {}) {
  const flavor = /^[a-z]{2,16}$/.test(cake.flavor) ? cake.flavor : 'strawberry'; // the page falls back if unknown
  const name = cleanText(cake.name, 30); // cake 14, bouquet 18, lantern words 30
  const inStage = ([, x, y]) => x >= 0 && x <= 390 && y >= 0 && y <= 400;
  const dots = Array.isArray(cake.dots)
    ? cake.dots.slice(0, 2500).filter((d) => Array.isArray(d) && d.length === 3)
        .map(([x, y, c]) => [Math.round(+x) || 0, Math.round(+y) || 0, Math.max(0, Math.min(5, Math.round(+c) || 0))])
        .filter(([x, y]) => inStage([0, x, y]))
    : [];
  const stickers = Array.isArray(cake.stickers)
    ? cake.stickers.slice(0, 30).filter((s) => Array.isArray(s) && s.length === 3)
        .map(([e, x, y]) => [cleanText(e, 8), Math.round(+x) || 0, Math.round(+y) || 0])
        .filter((s) => s[0] && inStage(s))
    : [];
  return { flavor, name, dots, stickers };
}

function readGift(b) {
  const recipient = cleanText(b.recipient, 40);
  const organizer = cleanText(b.organizer, 40);
  if (!recipient) throw new HttpError(400, 'Please enter who the gift is for.');
  if (!organizer) throw new HttpError(400, 'Please enter your name.');
  const occasion = OCCASIONS.includes(b.occasion) ? b.occasion : 'birthday';
  const recipientEmail = cleanText(b.recipientEmail || '', 120).toLowerCase();
  const rawPin = String(b.verifyPin || b.verifyAnswer || '1234').replace(/\D/g, '').slice(0, 6);
  const verifyPin = rawPin.length >= 4 ? rawPin : '1234';
  return { recipient, organizer, occasion, recipientEmail, verifyPin, cake: cleanCake(b.cake) };
}

export default route({
  async POST(req, res) {
    // Only with an account: we know who made it, and the account page lists it on any phone.
    const userId = await sessionUserId(req);
    if (!userId) throw new HttpError(401, 'Please log in to create a gift.');
    const input = readGift(await jsonBody(req));
    const gift = await createGift({ ...input, ownerId: userId });
    await addGift(userId, gift.slug);
    if (gift.recipientEmail) await sendGiftToEmail(gift.recipientEmail, gift.slug);
    send(res, 201, { slug: gift.slug, manageKey: gift.manageKey, openKey: gift.openKey });
  },

  async PATCH(req, res) {
    const b = await jsonBody(req);
    const gift = await loadGift(b.slug);
    if (!b.key || b.key !== gift.manageKey) throw new HttpError(403, 'Not allowed');
    const updates = readGift(b);
    Object.assign(gift, updates, { updatedAt: new Date().toISOString() });
    await saveGift(gift);
    if (gift.recipientEmail) await sendGiftToEmail(gift.recipientEmail, gift.slug);
    send(res, 200, { ok: true });
  }
});
