// GET /api/gift?slug=…  → public info for the friend and recipient pages (never the messages)
// `mine` = how many voices the logged-in account already has in this gift (the friend's page stops at the limit).
import { route, send, query } from '../lib/http.js';
import { loadGift, publicGift, loadMessages } from '../lib/gifts.js';
import { currentUser } from '../lib/accounts.js';
import { LIMITS } from '../lib/limits.js';

export default route({
  async GET(req, res) {
    const { slug } = query(req);
    const gift = await loadGift(slug);
    const [msgs, user] = await Promise.all([loadMessages(gift.slug), currentUser(req)]);
    const count = msgs.filter((m) => m.finalText).length || msgs.length;
    const mine = user ? msgs.filter((m) => m.userId === user.id && m.finalText).length : 0;
    send(res, 200, { gift: publicGift(gift), count, mine, max: LIMITS.recordingsPerGift, now: new Date().toISOString() });
  }
});
