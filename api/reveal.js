// GET /api/reveal?slug=…  → the messages, but only once the gift is unlocked
import { route, send, query } from '../lib/http.js';
import { loadGift, publicGift, isUnlocked, loadMessages, countMessages } from '../lib/gifts.js';
import { evenWords } from '../lib/asr.js';

export default route({
  async GET(req, res) {
    const { slug } = query(req);
    const gift = await loadGift(slug);
    if (!isUnlocked(gift)) {
      const count = await countMessages(gift.slug);
      return send(res, 200, { locked: true, gift: publicGift(gift), count, now: new Date().toISOString() });
    }
    const messages = (await loadMessages(gift.slug))
      .filter((m) => m.finalText || m.asrText) // skip recordings abandoned before the caption step
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
    send(res, 200, { locked: false, gift: publicGift(gift), messages, now: new Date().toISOString() });
  }
});
