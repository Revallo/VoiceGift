// GET /api/gift?slug=…  → public info for the friend and recipient pages (never the messages)
// Kept by Vercel's edge for 30 s: counting the voices lists the gift's folder, a costly Blob operation, and this
// is asked on every visit to a friend's or the recipient's page. Nothing secret is in it.
import { route, send, query } from '../lib/http.js';
import { loadGift, publicGift, countMessages } from '../lib/gifts.js';

export default route({
  async GET(req, res) {
    const { slug } = query(req);
    const gift = await loadGift(slug);
    const count = await countMessages(gift);
    send(res, 200, { gift: publicGift(gift), count, now: new Date().toISOString() }, {
      'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60'
    });
  }
});
