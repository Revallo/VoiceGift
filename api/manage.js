// GET  /api/manage?slug=…&key=…             → organizer dashboard: who has recorded (not what they said) + the recipient's key
// POST /api/manage { slug, key, action }    → action "update-delivery": change the PIN
//                                            action "delete" + id: removes that message and its audio from storage
//                                            action "delete-gift": removes the whole gift from storage
//                                            action "add-demo": DEMO_COUNT demo items from the bundled TTS recordings
//                                            action "remove-demo": takes the demo voices out again
import { route, send, query, jsonBody, HttpError } from '../lib/http.js';
import { loadGift, saveGift, publicGift, loadMessages, findMessage, deleteMessage, deleteGift } from '../lib/gifts.js';
import { DEMO_COUNT, isDemoId } from '../lib/demo.js';
import { forgetGift } from '../lib/accounts.js';

// Demo voices (lib/demo.js) are not stored: adding them is one gift.json write. Adding again brings back the ones
// taken out one by one. Demo messages stored by older versions are cleared first, so nothing is doubled.
async function addDemo(gift) {
  const hidden = gift.demo ? (gift.demo.hidden || []).length : DEMO_COUNT;
  if (!hidden) throw new HttpError(400, 'The demo voices are already in this gift.');
  await removeStoredDemos(gift);
  gift.demo = { at: gift.demo?.at || new Date().toISOString(), hidden: [] };
  await saveGift(gift);
  return hidden;
}

async function removeStoredDemos(gift) {
  const stored = (await loadMessages(gift.slug)).filter((m) => m.demo);
  await Promise.all(stored.map((m) => deleteMessage(m._path, m)));
  return stored.length;
}

async function authed(slug, key) {
  const gift = await loadGift(slug);
  if (!key || key !== gift.manageKey) throw new HttpError(403, 'This dashboard link is not valid.');
  return gift;
}

export default route({
  async GET(req, res) {
    const q = query(req);
    const gift = await authed(q.slug, q.key);
    const messages = (await loadMessages(gift.slug, gift)).map((m) => ({
      id: m.id,
      sender: m.sender,
      createdAt: m.createdAt,
      sent: Boolean(m.finalText),
      edited: Boolean(m.edited),
      fixes: Array.isArray(m.corrections) && m.corrections.length ? m.corrections.length : (m.edited ? 1 : 0),
      demo: Boolean(m.demo),
      candle: m.candle || null, // how their candle looks (not what they said)
      durationSec: m.durationSec
    }));
    send(res, 200, {
      gift: {
        ...publicGift(gift),
        verifyPin: gift.verifyPin || '1234'
      },
      openKey: gift.openKey,
      demoCount: DEMO_COUNT,
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
      const { msg, path } = await findMessage(gift.slug, String(b.id || ''), gift);
      if (path) await deleteMessage(path, msg);
      else if (isDemoId(msg.id)) {
        gift.demo.hidden = [...new Set([...(gift.demo.hidden || []), msg.id])];
        await saveGift(gift);
      }
    } else if (b.action === 'delete-gift') {
      await deleteGift(gift.slug);
      if (gift.ownerId) await forgetGift(gift.ownerId, gift.slug); // off the organizer's account page too
    } else if (b.action === 'add-demo') {
      return send(res, 200, { ok: true, added: await addDemo(gift) });
    } else if (b.action === 'remove-demo') {
      const shown = gift.demo ? DEMO_COUNT - (gift.demo.hidden || []).length : 0;
      const stored = await removeStoredDemos(gift);
      if (gift.demo) {
        delete gift.demo;
        await saveGift(gift);
      }
      return send(res, 200, { ok: true, removed: shown + stored });
    } else throw new HttpError(400, 'Unknown action');
    send(res, 200, { ok: true });
  }
});
