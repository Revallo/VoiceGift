// GET /api/reveal?slug=…&k=…  → the messages, for a signed-in user only:
//   - the first account that opens the recipient's link (k) claims the gift and becomes its recipient;
//     after that only that account can open it (a forwarded link is useless), with or without k
//   - the organizer may preview it without claiming it, with the demo voices only: real voices are for the recipient
import { route, send, query, HttpError } from '../lib/http.js';
import { loadGift, publicGift, giftAccess, claimGift, loadMessages } from '../lib/gifts.js';
import { requireUser } from '../lib/auth.js';
import { evenWords } from '../lib/asr.js';

export default route({
  async GET(req, res) {
    const user = await requireUser(req);
    const { slug, k } = query(req);
    const gift = await loadGift(slug);
    const role = giftAccess(gift, user, k);
    if (!role) {
      throw new HttpError(403, gift.recipientId
        ? `This gift was already opened by another account. If that wasn’t you, ask ${gift.organizer} to send it again.`
        : `This link isn’t complete. Ask ${gift.organizer} for the link to the gift.`);
    }
    if (role === 'claim') await claimGift(gift, user);

    const messages = (await loadMessages(gift.slug))
      .filter((m) => m.finalText || m.asrText) // skip recordings abandoned before the caption step
      .filter((m) => role !== 'owner' || m.demo)
      .map((m) => {
        const text = m.finalText || m.asrText;
        return {
          id: m.id,
          sender: m.sender,
          text,
          words: (m.finalWords && m.finalWords.length ? m.finalWords : null) || evenWords(text, m.durationSec),
          durationSec: m.durationSec
        };
      });
    send(res, 200, { gift: publicGift(gift), messages, preview: role === 'owner' });
  }
});
