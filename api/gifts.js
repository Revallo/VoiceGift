// POST /api/gifts  → create a gift
import { route, send, jsonBody, cleanText, HttpError } from '../lib/http.js';
import { createGift, FLAVORS, OCCASIONS } from '../lib/gifts.js';

function cleanCake(cake = {}) {
  const flavor = FLAVORS.includes(cake.flavor) ? cake.flavor : 'strawberry';
  const name = cleanText(cake.name, 14);
  const dots = Array.isArray(cake.dots)
    ? cake.dots.slice(0, 2500).filter((d) => Array.isArray(d) && d.length === 3)
        .map(([x, y, c]) => [Math.round(+x) || 0, Math.round(+y) || 0, Math.max(0, Math.min(5, Math.round(+c) || 0))])
        .filter(([x, y]) => x >= 0 && x <= 390 && y >= 0 && y <= 320)
    : [];
  return { flavor, name, dots };
}

export default route({
  async POST(req, res) {
    const b = await jsonBody(req);
    const recipient = cleanText(b.recipient, 40);
    const organizer = cleanText(b.organizer, 40);
    if (!recipient) throw new HttpError(400, 'Please enter who the gift is for.');
    if (!organizer) throw new HttpError(400, 'Please enter your name.');
    const t = Date.parse(b.unlockAt);
    if (!Number.isFinite(t)) throw new HttpError(400, 'Please choose when the gift should open.');
    const occasion = OCCASIONS.includes(b.occasion) ? b.occasion : 'birthday';
    const gift = await createGift({ recipient, organizer, occasion, unlockAt: new Date(t).toISOString(), cake: cleanCake(b.cake) });
    send(res, 201, { slug: gift.slug, manageKey: gift.manageKey });
  }
});
