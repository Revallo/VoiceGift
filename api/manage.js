// GET  /api/manage?slug=…&key=…             → organizer dashboard: who has recorded (not what they said)
// POST /api/manage { slug, key, action }    → action "unlock-now" (for demos) or "set-unlock" with unlockAt
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, saveGift, publicGift, loadMessages } from '../lib/gifts.js';

async function authed(slug, key) {
  const gift = await loadGift(slug);
  if (!key || key !== gift.manageKey) throw new HttpError(403, 'This dashboard link is not valid.');
  return gift;
}

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await authed(q.slug, q.key);
    const messages = (await loadMessages(gift.slug)).map((m) => ({
      sender: m.sender,
      createdAt: m.createdAt,
      sent: Boolean(m.finalText),
      edited: Boolean(m.edited),
      durationSec: m.durationSec
    }));
    send(res, 200, { gift: publicGift(gift), messages, now: new Date().toISOString() });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    const gift = await authed(b.slug, b.key);
    if (b.action === 'unlock-now') {
      gift.unlockAt = new Date(Date.now() - 1000).toISOString();
    } else if (b.action === 'set-unlock') {
      const t = Date.parse(b.unlockAt);
      if (!Number.isFinite(t)) throw new HttpError(400, 'Invalid time');
      gift.unlockAt = new Date(t).toISOString();
    } else {
      throw new HttpError(400, 'Unknown action');
    }
    await saveGift(gift);
    send(res, 200, { gift: publicGift(gift) });
  }
});
