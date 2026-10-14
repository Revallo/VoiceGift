// GET /api/me → everything in the signed-in person's account, in one place instead of scattered links:
//   made     gifts they created (→ dashboard)
//   received gifts for them (→ open again any time)
//   recorded messages they recorded for someone (who it was for, sent or not, opened or not; never other people's)
import { route, send } from '../lib/http.js';
import { requireUser, listOf, publicUser } from '../lib/auth.js';
import { getJSON } from '../lib/store.js';
import { countMessages, findMessage } from '../lib/gifts.js';

const giftOf = (slug) => getJSON(`gifts/${slug}/gift.json`).catch(() => null);
const card = (g) => ({ slug: g.slug, recipient: g.recipient, occasion: g.occasion, organizer: g.organizer, opened: Boolean(g.recipientId) });

export default route({
  async GET(req, res) {
    const user = await requireUser(req);
    const [made, got, sent] = await Promise.all(['made', 'got', 'sent'].map((k) => listOf(user.id, k)));
    const newest = (a, b) => String(b.at).localeCompare(String(a.at));

    const out = { user: publicUser(user), made: [], received: [], recorded: [] };
    for (const r of made.sort(newest)) {
      const g = await giftOf(r.slug);
      if (g) out.made.push({ ...card(g), count: await countMessages(g.slug) });
    }
    for (const r of got.sort(newest)) {
      const g = await giftOf(r.slug);
      if (g) out.received.push(card(g));
    }
    for (const r of sent.sort(newest)) {
      const g = await giftOf(r.slug);
      const m = g && (await findMessage(g.slug, r.id).then((f) => f.msg, () => null));
      if (m) out.recorded.push({ ...card(g), id: m.id, sender: m.sender, sent: Boolean(m.finalText), at: m.createdAt });
    }
    send(res, 200, out);
  }
});
