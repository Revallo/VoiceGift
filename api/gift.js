// GET /api/gift?slug=…  → public info for the friend and recipient pages (never the messages)
import { route, send, query } from '../lib/http.js';
import { loadGift, publicGift, countMessages } from '../lib/gifts.js';

export default route({
  async GET(req, res) {
    const { slug } = query(req);
    const gift = await loadGift(slug);
    const count = await countMessages(gift.slug);
    send(res, 200, { gift: publicGift(gift), count, now: new Date().toISOString() });
  }
});
