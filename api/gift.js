// GET /api/gift?slug=…  → public info for the friend and recipient pages (never the messages)
//     &invite=1 (sent by the recording page): a logged-in visitor is remembered as invited, so the gift shows
//     under "Waiting for your voice" on their home page and Record tab. Not for the gift's own organizer.
import { route, send, query } from '../lib/http.js';
import { loadGift, publicGift, countMessages } from '../lib/gifts.js';
import { currentUser, addInvite } from '../lib/accounts.js';

export default route({
  async GET(req, res) {
    const { slug, invite } = query(req);
    const gift = await loadGift(slug);
    if (invite === '1') {
      const user = await currentUser(req);
      if (user && user.id !== gift.ownerId) await addInvite(user.id, gift.slug).catch(() => {}); // never in the way of the page
    }
    const count = await countMessages(gift.slug);
    send(res, 200, { gift: publicGift(gift), count, now: new Date().toISOString() });
  }
});
