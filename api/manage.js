// GET  /api/manage?slug=…&key=…             → organizer dashboard: who has recorded (not what they said) + the recipient's key
// POST /api/manage { slug, key, action }    → action "update-delivery": change the PIN
//                                            action "delete" + id: removes that message and its audio from storage
//                                            action "delete-gift": removes the whole gift from storage
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, saveGift, publicGift, loadMessages, findMessage, deleteMessage, deleteGift } from '../lib/gifts.js';
import { forgetGift } from '../lib/accounts.js';

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
      id: m.id,
      sender: m.sender,
      createdAt: m.createdAt,
      sent: Boolean(m.finalText),
      edited: Boolean(m.edited),
      fixes: Array.isArray(m.corrections) && m.corrections.length ? m.corrections.length : (m.edited ? 1 : 0),
      durationSec: m.durationSec
    }));
    send(res, 200, {
      gift: {
        ...publicGift(gift),
        verifyPin: gift.verifyPin || '1234'
      },
      openKey: gift.openKey,
      messages
    });
  },

  async POST(req, res) {
    const b = await jsonBody(req);
    const gift = await authed(b.slug, b.key);
    if (b.action === 'update-delivery') {
      const rawPin = String(b.verifyPin || b.verifyAnswer || '1234').replace(/\D/g, '').slice(0, 4);
      gift.verifyPin = rawPin.length === 4 ? rawPin : '1234';
      gift.updatedAt = new Date().toISOString();
      await saveGift(gift);
    } else if (b.action === 'delete') {
      const { msg, path } = await findMessage(gift.slug, String(b.id || ''));
      await deleteMessage(path, msg);
    } else if (b.action === 'delete-gift') {
      await deleteGift(gift.slug);
      if (gift.ownerId) await forgetGift(gift.ownerId, gift.slug); // off the organizer's account page too
    } else throw new HttpError(400, 'Unknown action');
    send(res, 200, { ok: true });
  }
});
